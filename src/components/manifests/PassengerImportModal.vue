<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { serviceManifestsApi } from '@/api'
import { useToast } from '@/composables'
import { RcModal, RcButton, RcField } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { downloadBlob } from '@/utils/download'
import type { CreateUetdsPassengerRequest, PassengerImportRowResult } from '@/types/manifest'

const props = defineProps<{
  open: boolean
  manifestId: number
}>()

const emit = defineEmits<{
  close: []
  imported: []
}>()

const toast = useToast()
const importing = ref(false)
const importRows = ref<PassengerImportRowResult[]>([])
const importSelection = ref<Set<number>>(new Set())
const selectedCount = computed(() => importSelection.value.size)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      importRows.value = []
      importSelection.value = new Set()
    }
  },
)

function downloadCsvTemplate() {
  const csv = 'Ad Soyad,Koltuk No,Uyruk,Kimlik No\nAhmet Yılmaz,1,T.C.,12345678901\n'
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, 'yolcu-listesi-sablon.csv')
}

async function downloadExcelTemplate() {
  try {
    const blob = await serviceManifestsApi.downloadPassengerImportTemplateXlsx()
    downloadBlob(blob, 'yolcu-listesi-sablon.xlsx')
  } catch (err) {
    toast.apiError(err, 'Şablon indirilemedi')
  }
}

async function handleImportFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  importing.value = true
  try {
    const preview = await serviceManifestsApi.previewPassengerImport(props.manifestId, file)
    importRows.value = preview.rows
    importSelection.value = new Set(
      preview.rows.filter((row) => row.passenger !== null).map((row) => row.rowNumber),
    )
    if (preview.errorCount > 0) {
      toast.error(`${preview.errorCount} satırda hata var, hatalı satırlar listeden çıkarıldı`)
    }
  } catch (err) {
    toast.apiError(err, 'Dosya ayrıştırılamadı')
  } finally {
    importing.value = false
    ;(event.target as HTMLInputElement).value = ''
  }
}

function toggleRow(rowNumber: number) {
  if (importSelection.value.has(rowNumber)) {
    importSelection.value.delete(rowNumber)
  } else {
    importSelection.value.add(rowNumber)
  }
  importSelection.value = new Set(importSelection.value)
}

async function confirmImport() {
  const selected = importRows.value
    .filter((row) => row.passenger !== null && importSelection.value.has(row.rowNumber))
    .map((row) => row.passenger as CreateUetdsPassengerRequest)

  if (selected.length === 0) {
    toast.error('Kaydedilecek yolcu seçilmedi')
    return
  }

  importing.value = true
  try {
    await serviceManifestsApi.replacePassengers(props.manifestId, selected)
    toast.success(`${selected.length} yolcu kaydedildi (mevcut liste değiştirildi)`)
    emit('imported')
    emit('close')
  } catch (err) {
    toast.apiError(err, 'Yolcu listesi kaydedilemedi')
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <RcModal :open="open" title="Toplu yolcu listesi yükle" @close="emit('close')">
    <div class="rcs-import">
      <p class="rcr-row__secondary">
        "Ad Soyad, Koltuk No, Uyruk, Kimlik No" başlıklı bir CSV veya Excel (.xlsx) dosyası yükleyin.
        Bu işlem <strong>mevcut yolcu listesinin tamamının yerine geçer.</strong>
      </p>
      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px">
        <RcButton variant="ghost" size="sm" @click="downloadCsvTemplate">
          <RcIcon name="download" :size="14" />
          CSV şablon indir
        </RcButton>
        <RcButton variant="ghost" size="sm" @click="downloadExcelTemplate">
          <RcIcon name="download" :size="14" />
          Excel şablon indir
        </RcButton>
      </div>
      <RcField label="CSV veya Excel dosyası">
        <input
          type="file"
          accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          class="rc-input"
          :disabled="importing"
          @change="handleImportFile"
        />
      </RcField>

      <template v-if="importRows.length > 0">
        <p class="rcr-row__secondary" style="margin-top: 12px">
          {{ selectedCount }} / {{ importRows.length }} satır seçili
        </p>
        <table class="rc-table rcv-table--slim">
          <thead>
            <tr>
              <th />
              <th>#</th>
              <th>Ad soyad</th>
              <th>Koltuk</th>
              <th>Uyruk</th>
              <th>Kimlik</th>
              <th>Hata</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in importRows" :key="row.rowNumber" :class="{ 'rcs-import-row--error': row.error }">
              <td>
                <input
                  type="checkbox"
                  :disabled="!row.passenger"
                  :checked="importSelection.has(row.rowNumber)"
                  @change="toggleRow(row.rowNumber)"
                />
              </td>
              <td>{{ row.rowNumber }}</td>
              <td>{{ row.passenger?.fullName ?? '—' }}</td>
              <td>{{ row.passenger?.seatNumber ?? '—' }}</td>
              <td>{{ row.passenger?.nationality ?? '—' }}</td>
              <td>{{ row.passenger?.idNumber ?? '—' }}</td>
              <td class="rcs-import-row__error">{{ row.error ?? '' }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </div>

    <template #footer>
      <RcButton variant="secondary" @click="emit('close')">Vazgeç</RcButton>
      <RcButton
        variant="primary"
        :disabled="importing || selectedCount === 0"
        :loading="importing"
        @click="confirmImport"
      >
        {{ selectedCount }} yolcuyu kaydet
      </RcButton>
    </template>
  </RcModal>
</template>

<style scoped>
.rcs-import-row--error {
  background: var(--rc-danger-50);
}

.rcs-import-row__error {
  color: var(--rc-danger-700);
  font-size: 12px;
}
</style>
