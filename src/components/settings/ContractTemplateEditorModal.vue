<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { contractsApi, contractTemplatesApi } from '@/api'
import { useToast } from '@/composables'
import { RcModal, RcButton, RcField, RcInput, RcBadge } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { RentalType } from '@/types/enums'
import { CONTRACT_DOCUMENT_TYPE_LABELS } from '@/types/contract'
import type { ContractDocumentType, ContractTemplateDetail, ContractTermSummary } from '@/types/contract'

const props = defineProps<{
  open: boolean
  templateId?: number | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const toast = useToast()
const loading = ref(false)
const saving = ref(false)
const showPlaceholders = ref(false)
const placeholderKeys = ref<string[]>([])

const isEditMode = computed(() => props.templateId != null)

const code = ref('')
const name = ref('')
const rentalType = ref<RentalType>(RentalType.DAILY)
const documentType = ref<ContractDocumentType>('RENTAL_CONTRACT')
const content = ref('')
const terms = ref<ContractTermSummary[]>([])
const savedTemplateId = ref<number | null>(null)

const newTermTitle = ref('')
const newTermContent = ref('')
const newTermRequired = ref(true)

const rentalTypeOptions: { value: RentalType; label: string }[] = [
  { value: RentalType.DAILY, label: 'Günlük' },
  { value: RentalType.WEEKLY, label: 'Haftalık' },
  { value: RentalType.MONTHLY, label: 'Aylık' },
  { value: RentalType.LEASING, label: 'Leasing' },
  { value: RentalType.SERVICE, label: 'Servis' },
]

const title = computed(() => (isEditMode.value ? 'Şablonu düzenle' : 'Yeni sözleşme şablonu'))

function resetForm() {
  code.value = ''
  name.value = ''
  rentalType.value = RentalType.DAILY
  documentType.value = 'RENTAL_CONTRACT'
  content.value = ''
  terms.value = []
  savedTemplateId.value = null
}

async function loadPlaceholders() {
  try {
    placeholderKeys.value = await contractsApi.listPlaceholders()
  } catch {
    placeholderKeys.value = []
  }
}

async function loadTemplate() {
  if (!props.templateId) {
    resetForm()
    return
  }
  loading.value = true
  try {
    const template = await contractTemplatesApi.findById(props.templateId)
    code.value = template.code
    name.value = template.name
    rentalType.value = template.rentalType
    documentType.value = template.documentType
    content.value = template.content
    terms.value = template.terms
    savedTemplateId.value = template.id
  } catch (err) {
    toast.apiError(err, 'Şablon yüklenemedi')
    emit('close')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.templateId] as const,
  ([isOpen]) => {
    if (!isOpen) return
    void loadPlaceholders()
    void loadTemplate()
  },
  { immediate: true },
)

async function save() {
  if (!code.value.trim() || !name.value.trim() || !content.value.trim()) {
    toast.error('Kod, isim ve içerik zorunludur')
    return
  }

  saving.value = true
  try {
    if (savedTemplateId.value) {
      await contractTemplatesApi.updateContent(savedTemplateId.value, content.value)
    } else {
      const created: ContractTemplateDetail = await contractTemplatesApi.create({
        code: code.value.trim(),
        name: name.value.trim(),
        rentalType: rentalType.value,
        documentType: documentType.value,
        content: content.value,
      })
      savedTemplateId.value = created.id
    }
    toast.success('Şablon kaydedildi')
    emit('saved')
  } catch (err) {
    toast.apiError(err, 'Şablon kaydedilemedi')
  } finally {
    saving.value = false
  }
}

async function addTerm() {
  if (!savedTemplateId.value) {
    toast.error('Önce şablonu kaydedin')
    return
  }
  if (!newTermTitle.value.trim() || !newTermContent.value.trim()) {
    toast.error('Madde başlığı ve içeriği zorunludur')
    return
  }
  try {
    const term = await contractTemplatesApi.addTerm(savedTemplateId.value, {
      title: newTermTitle.value.trim(),
      content: newTermContent.value.trim(),
      required: newTermRequired.value,
      sortOrder: terms.value.length,
    })
    terms.value.push(term)
    newTermTitle.value = ''
    newTermContent.value = ''
    newTermRequired.value = true
  } catch (err) {
    toast.apiError(err, 'Madde eklenemedi')
  }
}

async function removeTerm(termId: number) {
  if (!savedTemplateId.value) return
  try {
    await contractTemplatesApi.removeTerm(savedTemplateId.value, termId)
    terms.value = terms.value.filter((t) => t.id !== termId)
  } catch (err) {
    toast.apiError(err, 'Madde silinemedi')
  }
}

function placeholderToken(key: string): string {
  return `{{${key}}}`
}
</script>

<template>
  <RcModal :open="open" wide @close="emit('close')">
    <template #header>
      <div>
        <h2 class="rc-modal__title">{{ title }}</h2>
        <div class="rc-modal__sub">Placeholder'lar sözleşme oluşturulurken kiralama verisiyle doldurulur</div>
      </div>
    </template>

    <div v-if="loading" class="rc-skeleton" style="height: 320px" />
    <template v-else>
      <div class="rc-form-grid" style="margin-bottom: 16px">
        <RcField label="Kod *">
          <RcInput v-model="code" placeholder="STANDARD_RENTAL_CONTRACT" :disabled="isEditMode" />
        </RcField>
        <RcField label="İsim *">
          <RcInput v-model="name" placeholder="Standart Kiralama Sözleşmesi" />
        </RcField>
        <RcField label="Kiralama türü">
          <select v-model="rentalType" class="rc-input" :disabled="isEditMode">
            <option v-for="opt in rentalTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </RcField>
        <RcField label="Belge tipi">
          <select v-model="documentType" class="rc-input" :disabled="isEditMode">
            <option v-for="[value, label] in Object.entries(CONTRACT_DOCUMENT_TYPE_LABELS)" :key="value" :value="value">
              {{ label }}
            </option>
          </select>
        </RcField>
      </div>

      <div class="rcr-contract-editor__toolbar">
        <RcButton variant="ghost" size="sm" @click="showPlaceholders = !showPlaceholders">
          <RcIcon name="info" :size="14" />
          Placeholder yardımı
        </RcButton>
      </div>

      <div v-if="showPlaceholders && placeholderKeys.length > 0" class="rcr-contract-editor__placeholders">
        <div v-for="key in placeholderKeys" :key="key" class="rcr-contract-editor__ph-row">
          <code>{{ placeholderToken(key) }}</code>
        </div>
      </div>

      <textarea
        v-model="content"
        class="rc-input rcr-contract-editor__textarea"
        rows="14"
        spellcheck="false"
        placeholder="Sözleşme metni... {{customerName}}, {{vehiclePlate}} gibi placeholder'lar kullanabilirsiniz"
      />

      <div class="rc-card" style="margin-top: 16px; padding: 16px">
        <div class="rc-card__title" style="margin-bottom: 12px">Sözleşme maddeleri</div>

        <div v-if="!savedTemplateId" class="rc-veh-maintenance-section__empty">
          Maddeler eklemek için önce şablonu kaydedin
        </div>
        <template v-else>
          <div v-for="term in terms" :key="term.id" class="rcr-term-row">
            <div>
              <b>{{ term.title }}</b>
              <RcBadge v-if="term.required" variant="warning" style="margin-left: 6px">Zorunlu</RcBadge>
              <div class="rcr-row__secondary">{{ term.content }}</div>
            </div>
            <RcButton variant="ghost" size="xs" @click="removeTerm(term.id)">
              <RcIcon name="trash" :size="14" />
            </RcButton>
          </div>

          <div class="rcr-term-form">
            <RcInput v-model="newTermTitle" placeholder="Madde başlığı" />
            <textarea v-model="newTermContent" class="rc-input" rows="2" placeholder="Madde içeriği" />
            <label class="rcf-toggle">
              <input v-model="newTermRequired" type="checkbox" />
              Zorunlu
            </label>
            <RcButton variant="secondary" size="sm" @click="addTerm">
              <RcIcon name="plus" :size="14" />
              Madde ekle
            </RcButton>
          </div>
        </template>
      </div>
    </template>

    <template #footer>
      <span class="rc-spacer" />
      <RcButton variant="ghost" @click="emit('close')">Kapat</RcButton>
      <RcButton variant="accent" :disabled="loading || saving" @click="save">
        <RcIcon name="check" :size="14" />
        Kaydet
      </RcButton>
    </template>
  </RcModal>
</template>

<style scoped>
.rc-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.rcr-contract-editor__toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.rcr-contract-editor__placeholders {
  max-height: 160px;
  overflow: auto;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-radius-md);
  background: var(--rc-surface-muted);
  font-size: 12.5px;
}
.rcr-contract-editor__ph-row {
  padding: 3px 0;
}
.rcr-contract-editor__ph-row code {
  color: var(--rc-blue-600);
}
.rcr-contract-editor__textarea {
  width: 100%;
  min-height: 280px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
}
.rcr-term-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--rc-border-subtle);
}
.rcr-term-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--rc-border);
}
.rcf-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--rc-text-muted);
  cursor: pointer;
}
</style>
