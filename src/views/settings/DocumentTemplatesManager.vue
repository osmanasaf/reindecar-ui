<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { contractTemplatesApi } from '@/api'
import { useToast } from '@/composables'
import { RcButton, RcModal, RcField, RcInput } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDate } from '@/utils/format'
import { CONTRACT_DOCUMENT_TYPE_LABELS } from '@/types/contract'
import type { ContractDocumentType, ContractTemplateDetail } from '@/types/contract'

const router = useRouter()
const toast = useToast()

const loading = ref(true)
const workingId = ref<number | null>(null)
const templates = ref<ContractTemplateDetail[]>([])

const DOCUMENT_TYPES: ContractDocumentType[] = ['PRICE_OFFER', 'RENTAL_CONTRACT', 'HANDOVER', 'COMPLETION']
const DEFAULT_RENTAL_TYPE = 'MONTHLY'
const CODE_MAX_LENGTH = 50

const showNewModal = ref(false)
const creating = ref(false)
const newName = ref('')
const newType = ref<ContractDocumentType>('PRICE_OFFER')
const newSource = ref<'copy' | 'blank'>('copy')

const sortedTemplates = computed(() =>
  [...templates.value].sort((a, b) => {
    const typeDiff = DOCUMENT_TYPES.indexOf(a.documentType) - DOCUMENT_TYPES.indexOf(b.documentType)
    if (typeDiff !== 0) return typeDiff
    return Number(b.active) - Number(a.active)
  }),
)

const copySourceTemplate = computed(
  () =>
    templates.value.find((t) => t.documentType === newType.value && t.active) ??
    templates.value.find((t) => t.documentType === newType.value) ??
    null,
)

async function fetchTemplates() {
  loading.value = true
  try {
    await contractTemplatesApi.bootstrapDefaults()
    templates.value = await contractTemplatesApi.findAll()
  } catch (err) {
    toast.apiError(err, 'Şablonlar yüklenemedi')
  } finally {
    loading.value = false
  }
}

function editTemplate(template: ContractTemplateDetail) {
  void router.push({ name: 'template-editor', params: { templateId: template.id } })
}

function buildCode(name: string): string {
  const slug = name
    .toLocaleUpperCase('tr')
    .replace(/[ÇĞİÖŞÜ]/g, (c) => ({ Ç: 'C', Ğ: 'G', İ: 'I', Ö: 'O', Ş: 'S', Ü: 'U' })[c] ?? c)
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const suffix = `_${Date.now().toString(36).toUpperCase()}`
  return `${slug.slice(0, CODE_MAX_LENGTH - suffix.length)}${suffix}`
}

async function duplicateTemplate(template: ContractTemplateDetail) {
  workingId.value = template.id
  try {
    const copy = await contractTemplatesApi.create({
      code: buildCode(`${template.code}_COPY`),
      name: `${template.name} (kopya)`,
      rentalType: template.rentalType || DEFAULT_RENTAL_TYPE,
      documentType: template.documentType,
      content: template.content,
    })
    toast.success(`Şablon kopyalandı: "${copy.name}"`)
    await fetchTemplates()
    editTemplate(copy)
  } catch (err) {
    toast.apiError(err, 'Kopyalama başarısız')
  } finally {
    workingId.value = null
  }
}

async function toggleActive(template: ContractTemplateDetail) {
  workingId.value = template.id
  try {
    if (template.active) {
      await contractTemplatesApi.deactivate(template.id)
      toast.success('Şablon pasifleştirildi')
    } else {
      await contractTemplatesApi.activate(template.id)
      toast.success('Şablon aktif edildi. Yeni belgeler bunu kullanır.')
    }
    templates.value = await contractTemplatesApi.findAll()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  } finally {
    workingId.value = null
  }
}

async function samplePdf(template: ContractTemplateDetail) {
  workingId.value = template.id
  try {
    const blob = await contractTemplatesApi.previewSamplePdf(template.id)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (err) {
    toast.apiError(err, 'PDF önizleme başarısız')
  } finally {
    workingId.value = null
  }
}

function openNewModal(type?: ContractDocumentType) {
  newName.value = ''
  newType.value = type ?? 'PRICE_OFFER'
  newSource.value = 'copy'
  showNewModal.value = true
}

async function createTemplate() {
  const name = newName.value.trim()
  if (!name) {
    toast.error('Şablon adı zorunludur')
    return
  }
  creating.value = true
  try {
    const source = newSource.value === 'copy' ? copySourceTemplate.value : null
    const content = source
      ? source.content
      : `[[TITLE]]\n${name.toLocaleUpperCase('tr')}\n[[BODY]]\nMetin eklemek için blokları kullanın.`
    const created = await contractTemplatesApi.create({
      code: buildCode(name),
      name,
      rentalType: source?.rentalType || DEFAULT_RENTAL_TYPE,
      documentType: newType.value,
      content,
    })
    showNewModal.value = false
    toast.success('Şablon oluşturuldu — örnek verilerle düzenliyorsunuz.')
    await fetchTemplates()
    editTemplate(created)
  } catch (err) {
    toast.apiError(err, 'Şablon oluşturulamadı')
  } finally {
    creating.value = false
  }
}

onMounted(fetchTemplates)
</script>

<template>
  <div class="rcs-tpl">
    <div class="rcs-tpl__head">
      <p class="rcs-tpl__hint">
        Firmanıza özel belge şablonlarını buradan yönetin. Değişiklikler yalnızca yeni belgelere uygulanır.
      </p>
      <RcButton variant="accent" size="sm" @click="openNewModal()">
        <RcIcon name="plus" :size="14" />
        Yeni şablon
      </RcButton>
    </div>

    <div v-if="loading" class="rc-skeleton" style="height: 260px; border-radius: 10px" />

    <div v-else class="rcs-tpl__grid">
      <div v-for="template in sortedTemplates" :key="template.id" class="rcs-tpl-card">
        <div class="rcs-tpl-card__body">
          <div class="rce-thumb rce-thumb--lg" :style="template.active ? '' : 'opacity:0.6'">
            <span class="rce-thumb__line rce-thumb__line--bold" style="width: 72%" />
            <span class="rce-thumb__line" style="width: 100%" />
            <span
              v-if="template.documentType === 'PRICE_OFFER'"
              class="rce-thumb__line rce-thumb__line--box"
              style="height: 16px"
            />
            <span v-else class="rce-thumb__line rce-thumb__line--wide-box" />
            <span class="rce-thumb__line" style="width: 80%" />
            <span class="rce-thumb__line" style="width: 60%" />
          </div>
          <div class="rcs-tpl-card__info">
            <div class="rcs-tpl-card__namerow">
              <b class="rcs-tpl-card__name">{{ template.name }}</b>
              <span
                class="rcs-tpl-card__state"
                :class="{ 'rcs-tpl-card__state--active': template.active }"
              >
                {{ template.active ? 'Aktif' : 'Pasif' }}
              </span>
            </div>
            <div class="rcs-tpl-card__type">
              {{ CONTRACT_DOCUMENT_TYPE_LABELS[template.documentType] }} · v{{ template.version }}
            </div>
            <div class="rcs-tpl-card__code">{{ template.code }}</div>
            <div class="rcs-tpl-card__date">
              {{ template.active ? `Oluşturma ${formatDate(template.createdAt)}` : 'Yeni belgelerde kullanılmaz' }}
            </div>
          </div>
        </div>
        <div class="rcs-tpl-card__actions">
          <RcButton variant="secondary" size="sm" @click="editTemplate(template)">Düzenle</RcButton>
          <RcButton
            variant="ghost"
            size="sm"
            :disabled="workingId === template.id"
            @click="duplicateTemplate(template)"
          >
            Kopyala ve türet
          </RcButton>
          <span class="rc-spacer" />
          <RcButton
            v-if="template.active"
            variant="ghost"
            size="sm"
            :disabled="workingId === template.id"
            @click="samplePdf(template)"
          >
            Örnek PDF
          </RcButton>
          <RcButton
            variant="ghost"
            size="sm"
            :disabled="workingId === template.id"
            @click="toggleActive(template)"
          >
            {{ template.active ? 'Pasifleştir' : 'Aktif et' }}
          </RcButton>
        </div>
      </div>

      <button type="button" class="rcs-tpl-new" @click="openNewModal()">
        <RcIcon name="plus" :size="22" />
        <span class="rcs-tpl-new__title">Yeni şablon</span>
        <span class="rcs-tpl-new__desc">Boş başlayın ya da mevcut şablondan türetin</span>
      </button>
    </div>

    <RcModal :open="showNewModal" @close="showNewModal = false">
      <template #header>
        <div>
          <h2 class="rc-modal__title">Yeni şablon</h2>
          <div class="rc-modal__sub">Boş başlayın ya da mevcut bir şablonu kopyalayın</div>
        </div>
      </template>

      <div class="rcs-tpl-modal">
        <RcField label="Şablon adı">
          <RcInput v-model="newName" placeholder="örn. Kurumsal fiyat teklifi" />
        </RcField>
        <RcField label="Belge türü">
          <select v-model="newType" class="rc-select">
            <option v-for="type in DOCUMENT_TYPES" :key="type" :value="type">
              {{ CONTRACT_DOCUMENT_TYPE_LABELS[type] }}
            </option>
          </select>
        </RcField>
        <div class="rcs-tpl-modal__sources">
          <span class="rcs-tpl-modal__label">Nereden başlansın?</span>
          <label
            class="rcs-tpl-modal__source"
            :class="{ 'rcs-tpl-modal__source--selected': newSource === 'copy', 'rcs-tpl-modal__source--disabled': !copySourceTemplate }"
          >
            <input v-model="newSource" type="radio" value="copy" :disabled="!copySourceTemplate" />
            <span>
              <b>{{ copySourceTemplate ? `${copySourceTemplate.name} (v${copySourceTemplate.version})` : 'Kopyalanacak şablon yok' }}</b>
              <small>Mevcut şablonun kopyası oluşturulur</small>
            </span>
          </label>
          <label class="rcs-tpl-modal__source" :class="{ 'rcs-tpl-modal__source--selected': newSource === 'blank' }">
            <input v-model="newSource" type="radio" value="blank" />
            <span>
              <b>Boş şablon</b>
              <small>Blokları sıfırdan siz ekleyin</small>
            </span>
          </label>
        </div>
      </div>

      <template #footer>
        <span class="rc-spacer" />
        <RcButton variant="ghost" @click="showNewModal = false">Vazgeç</RcButton>
        <RcButton variant="accent" :loading="creating" @click="createTemplate">Oluştur ve düzenle</RcButton>
      </template>
    </RcModal>
  </div>
</template>

<style scoped>
.rcs-tpl__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin: 4px 0 16px;
}

.rcs-tpl__hint {
  color: var(--rc-text-muted);
  font-size: 13px;
  margin: 0;
}

.rcs-tpl__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.rcs-tpl-card {
  border: 1px solid var(--rc-border);
  border-radius: 10px;
  background: var(--rc-surface);
  overflow: hidden;
  transition: border-color var(--rc-dur-fast) var(--rc-ease-out);
}

.rcs-tpl-card:hover {
  border-color: var(--rc-border-strong);
}

.rcs-tpl-card__body {
  display: flex;
  gap: 14px;
  padding: 16px;
}

.rcs-tpl-card__info {
  min-width: 0;
  flex: 1;
}

.rcs-tpl-card__namerow {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.rcs-tpl-card__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--rc-text);
}

.rcs-tpl-card__state {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  font-size: 10.5px;
  font-weight: 500;
  border-radius: 4px;
  background: var(--rc-surface-hover);
  color: var(--rc-text-muted);
}

.rcs-tpl-card__state--active {
  background: var(--rc-success-50);
  color: var(--rc-success-700);
}

.rcs-tpl-card__type {
  font-size: 12px;
  color: var(--rc-text-muted);
  margin-top: 4px;
}

.rcs-tpl-card__code {
  font-size: 11.5px;
  color: var(--rc-text-faint);
  margin-top: 2px;
  font-family: var(--rc-font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rcs-tpl-card__date {
  font-size: 12px;
  color: var(--rc-text-muted);
  margin-top: 8px;
}

.rcs-tpl-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--rc-border-subtle);
  background: var(--rc-surface-2);
  flex-wrap: wrap;
}

.rcs-tpl-new {
  border: 1px dashed var(--rc-border-strong);
  border-radius: 10px;
  background: transparent;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--rc-text-muted);
  cursor: pointer;
  font-family: inherit;
  transition: border-color var(--rc-dur-fast) var(--rc-ease-out), color var(--rc-dur-fast) var(--rc-ease-out),
    background var(--rc-dur-fast) var(--rc-ease-out);
}

.rcs-tpl-new:hover {
  border-color: var(--rc-accent);
  color: var(--rc-accent);
  background: var(--rc-accent-subtle);
}

.rcs-tpl-new__title {
  font-size: 13.5px;
  font-weight: 600;
}

.rcs-tpl-new__desc {
  font-size: 12px;
}

.rcs-tpl-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rcs-tpl-modal__sources {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rcs-tpl-modal__label {
  font-size: 12px;
  font-weight: 500;
  color: var(--rc-text-soft);
}

.rcs-tpl-modal__source {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid var(--rc-border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color var(--rc-dur-fast) var(--rc-ease-out);
}

.rcs-tpl-modal__source:hover {
  border-color: var(--rc-border-strong);
}

.rcs-tpl-modal__source--selected {
  border-color: var(--rc-accent);
  background: var(--rc-accent-subtle);
}

.rcs-tpl-modal__source--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.rcs-tpl-modal__source input {
  margin-top: 2px;
  accent-color: var(--rc-blue-500);
}

.rcs-tpl-modal__source b {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--rc-text);
}

.rcs-tpl-modal__source small {
  color: var(--rc-text-soft);
  font-size: 12px;
}
</style>
