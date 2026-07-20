<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { contractTemplatesApi } from '@/api'
import { useToast } from '@/composables'
import { RcButton, RcEmpty, RcBadge, RcTableSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { RentalType } from '@/types/enums'
import { CONTRACT_DOCUMENT_TYPE_LABELS } from '@/types/contract'
import type { ContractTemplateDetail } from '@/types/contract'
import ContractTemplateEditorModal from '@/components/settings/ContractTemplateEditorModal.vue'

const toast = useToast()
const loading = ref(true)
const templates = ref<ContractTemplateDetail[]>([])
const editorOpen = ref(false)
const editingTemplateId = ref<number | null>(null)

const RENTAL_TYPE_LABELS: Record<RentalType, string> = {
  [RentalType.DAILY]: 'Günlük',
  [RentalType.WEEKLY]: 'Haftalık',
  [RentalType.MONTHLY]: 'Aylık',
  [RentalType.LEASING]: 'Leasing',
  [RentalType.SERVICE]: 'Servis',
}

async function loadTemplates() {
  loading.value = true
  try {
    templates.value = await contractTemplatesApi.findAll()
  } catch (err) {
    toast.apiError(err, 'Şablonlar yüklenemedi')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingTemplateId.value = null
  editorOpen.value = true
}

function openEdit(template: ContractTemplateDetail) {
  editingTemplateId.value = template.id
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
  editingTemplateId.value = null
}

function handleSaved() {
  void loadTemplates()
}

async function toggleActive(template: ContractTemplateDetail) {
  try {
    if (template.active) {
      await contractTemplatesApi.deactivate(template.id)
    } else {
      await contractTemplatesApi.activate(template.id)
    }
    toast.success(template.active ? 'Şablon pasifleştirildi' : 'Şablon aktifleştirildi')
    void loadTemplates()
  } catch (err) {
    toast.apiError(err, 'Durum değiştirilemedi')
  }
}

async function removeTemplate(template: ContractTemplateDetail) {
  if (!confirm(`"${template.name}" şablonunu silmek istediğinize emin misiniz?`)) return
  try {
    await contractTemplatesApi.remove(template.id)
    toast.success('Şablon silindi')
    void loadTemplates()
  } catch (err) {
    toast.apiError(err, 'Şablon silinemedi')
  }
}

async function bootstrapDefaults() {
  try {
    await contractTemplatesApi.bootstrapDefaults()
    toast.success('Varsayılan şablonlar oluşturuldu')
    void loadTemplates()
  } catch (err) {
    toast.apiError(err, 'Varsayılan şablonlar oluşturulamadı')
  }
}

onMounted(() => {
  void loadTemplates()
})
</script>

<template>
  <div class="rc-settings-section">
    <div class="rc-card__head" style="margin-bottom: 16px">
      <div>
        <div class="rc-card__title">Sözleşme Şablonları</div>
        <div class="rcv-veh-damage-map__sub">Fiyat teklifi ve kiralama sözleşmesi metinlerini düzenleyin</div>
      </div>
      <div style="display: flex; gap: 8px">
        <RcButton variant="ghost" size="sm" @click="bootstrapDefaults">
          <RcIcon name="sparkle" :size="14" />
          Varsayılanları oluştur
        </RcButton>
        <RcButton variant="accent" size="sm" @click="openCreate">
          <RcIcon name="plus" :size="14" />
          Yeni şablon
        </RcButton>
      </div>
    </div>

    <RcTableSkeleton v-if="loading" :rows="4" :cols="5" />

    <RcEmpty
      v-else-if="templates.length === 0"
      title="Şablon yok"
      description="Henüz sözleşme şablonu oluşturulmadı"
    >
      <template #icon><RcIcon name="folder" :size="32" /></template>
    </RcEmpty>

    <div v-else class="rc-card" style="overflow: hidden">
      <table class="rc-table rcv-table--slim">
        <thead>
          <tr>
            <th>Kod / İsim</th>
            <th>Kiralama türü</th>
            <th>Belge tipi</th>
            <th>Versiyon</th>
            <th>Durum</th>
            <th class="rc-right" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="template in templates" :key="template.id">
            <td>
              <div class="rcr-row__primary rcr-row__mono">{{ template.code }}</div>
              <div class="rcr-row__secondary">{{ template.name }}</div>
            </td>
            <td>{{ RENTAL_TYPE_LABELS[template.rentalType] }}</td>
            <td>{{ CONTRACT_DOCUMENT_TYPE_LABELS[template.documentType] }}</td>
            <td class="rc-mono">v{{ template.version }}</td>
            <td>
              <RcBadge :variant="template.active ? 'success' : 'default'">
                {{ template.active ? 'Aktif' : 'Pasif' }}
              </RcBadge>
            </td>
            <td class="rc-right">
              <RcButton variant="ghost" size="xs" @click="openEdit(template)">
                <RcIcon name="edit" :size="14" />
              </RcButton>
              <RcButton variant="ghost" size="xs" @click="toggleActive(template)">
                <RcIcon :name="template.active ? 'close' : 'check'" :size="14" />
              </RcButton>
              <RcButton variant="ghost" size="xs" @click="removeTemplate(template)">
                <RcIcon name="trash" :size="14" />
              </RcButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ContractTemplateEditorModal
      :open="editorOpen"
      :template-id="editingTemplateId"
      @close="closeEditor"
      @saved="handleSaved"
    />
  </div>
</template>
