<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { serviceManifestsApi } from '@/api'
import { useToast } from '@/composables'
import { RcModal, RcButton } from '@/components/rc'
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
const dragOver = ref(false)
const importRows = ref<PassengerImportRowResult[]>([])
const importSelection = ref<Set<number>>(new Set())
const fileInput = ref<HTMLInputElement | null>(null)

const hasPreview = computed(() => importRows.value.length > 0)
const selectedCount = computed(() => importSelection.value.size)
const validCount = computed(() => importRows.value.filter((r) => r.passenger !== null).length)
const errorCount = computed(() => importRows.value.filter((r) => r.passenger === null).length)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      importRows.value = []
      importSelection.value = new Set()
      dragOver.value = false
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

function openPicker() {
  fileInput.value?.click()
}

async function processFile(file: File) {
  importing.value = true
  try {
    const preview = await serviceManifestsApi.previewPassengerImport(props.manifestId, file)
    importRows.value = preview.rows
    importSelection.value = new Set(
      preview.rows.filter((row) => row.passenger !== null).map((row) => row.rowNumber),
    )
    if (preview.errorCount > 0) {
      toast.warning(`${preview.errorCount} satırda hata var — hatalı satırlar seçilemez`)
    }
  } catch (err) {
    toast.apiError(err, 'Dosya ayrıştırılamadı')
  } finally {
    importing.value = false
  }
}

async function onFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) await processFile(file)
}

async function onDrop(event: DragEvent) {
  dragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) await processFile(file)
}

function toggleRow(rowNumber: number) {
  const next = new Set(importSelection.value)
  next.has(rowNumber) ? next.delete(rowNumber) : next.add(rowNumber)
  importSelection.value = next
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
    toast.success(`${selected.length} yolcu içe aktarıldı (mevcut liste değiştirildi)`)
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
  <RcModal
    :open="open"
    wide
    title="Toplu yolcu listesi yükle"
    subtitle="Yüklenen liste mevcut yolcuların yerine geçer"
    @close="emit('close')"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      style="display: none"
      @change="onFileInput"
    />

    <div class="pi-templates">
      <RcButton variant="ghost" size="sm" @click="downloadCsvTemplate">
        <RcIcon name="download" :size="14" />
        CSV şablon
      </RcButton>
      <RcButton variant="ghost" size="sm" @click="downloadExcelTemplate">
        <RcIcon name="download" :size="14" />
        Excel şablon
      </RcButton>
    </div>

    <!-- Önizleme -->
    <template v-if="hasPreview">
      <div class="pi-summary">
        <span class="pi-chip pi-chip--ok">
          <RcIcon name="check" :size="13" :stroke-width="2" />
          {{ validCount }} geçerli satır
        </span>
        <span v-if="errorCount > 0" class="pi-chip pi-chip--err">
          <RcIcon name="close" :size="13" :stroke-width="2" />
          {{ errorCount }} hatalı satır
        </span>
      </div>
      <div class="pi-table">
        <div class="pi-row pi-row--head">
          <span />
          <span>#</span>
          <span>Ad soyad</span>
          <span>Klt.</span>
          <span>Uyruk</span>
          <span>Durum</span>
        </div>
        <div
          v-for="row in importRows"
          :key="row.rowNumber"
          class="pi-row pi-row--body"
          :class="{ 'pi-row--error': !row.passenger, 'pi-row--selected': importSelection.has(row.rowNumber) }"
        >
          <button
            type="button"
            class="pi-check"
            :class="{ 'pi-check--on': importSelection.has(row.rowNumber), 'pi-check--disabled': !row.passenger }"
            :disabled="!row.passenger"
            @click="toggleRow(row.rowNumber)"
          >
            <RcIcon v-if="importSelection.has(row.rowNumber)" name="check" :size="11" :stroke-width="3" />
          </button>
          <span class="rc-mono pi-num">{{ row.rowNumber }}</span>
          <span class="pi-name">{{ row.passenger?.fullName || '—' }}</span>
          <span class="rc-mono">{{ row.passenger?.seatNumber ?? '—' }}</span>
          <span>{{ row.passenger?.nationality ?? '—' }}</span>
          <span class="pi-status" :class="row.error ? 'pi-status--err' : 'pi-status--ok'">
            {{ row.error || 'Geçerli' }}
          </span>
        </div>
      </div>
    </template>

    <!-- Boş durum: dropzone -->
    <div
      v-else
      class="pi-dropzone"
      :class="{ 'pi-dropzone--over': dragOver, 'pi-dropzone--busy': importing }"
      role="button"
      tabindex="0"
      @click="openPicker"
      @keydown.enter="openPicker"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
    >
      <span class="pi-dropzone__icon"><RcIcon name="upload" :size="20" /></span>
      <div class="pi-dropzone__text">
        <div class="pi-dropzone__title">{{ importing ? 'Dosya işleniyor…' : 'Dosyayı buraya sürükle veya seç' }}</div>
        <div class="pi-dropzone__hint">CSV veya Excel (.xlsx)</div>
      </div>
    </div>

    <template #footer>
      <span class="pi-footnote">
        {{ hasPreview
          ? `${selectedCount} / ${importRows.length} satır seçili · mevcut liste değiştirilir`
          : 'Yüklenen liste mevcut yolcuların yerine geçer' }}
      </span>
      <div class="pi-footer-actions">
        <RcButton variant="secondary" @click="emit('close')">Vazgeç</RcButton>
        <RcButton
          variant="primary"
          :disabled="importing || selectedCount === 0"
          :loading="importing"
          @click="confirmImport"
        >
          {{ hasPreview ? `${selectedCount} yolcuyu kaydet` : 'Önce dosya yükle' }}
        </RcButton>
      </div>
    </template>
  </RcModal>
</template>

<style scoped>
.pi-templates { display: flex; gap: 8px; margin-bottom: 16px; }

.pi-summary { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.pi-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--rc-r-full);
}
.pi-chip--ok { background: var(--rc-success-50); color: var(--rc-success-700); }
.pi-chip--err { background: var(--rc-danger-50); color: var(--rc-danger-700); }

.pi-table { border: 1px solid var(--rc-border-subtle); border-radius: var(--rc-r-10); overflow: hidden; }
.pi-row {
  display: grid;
  grid-template-columns: 36px 40px 1fr 60px 100px 1.2fr;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--rc-border-subtle);
}
.pi-row:last-child { border-bottom: none; }
.pi-row--head {
  background: var(--rc-surface-2);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: var(--rc-tracking-wide);
  text-transform: uppercase;
  color: var(--rc-text-faint);
}
.pi-row--body { font-size: 12.5px; }
.pi-row--selected { background: var(--rc-accent-subtle); }
.pi-row--error { background: var(--rc-danger-50); }

.pi-check {
  width: 18px;
  height: 18px;
  border-radius: var(--rc-r-4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  border: 1.5px solid var(--rc-border-strong);
  background: transparent;
}
.pi-check--on { border-color: var(--rc-accent); background: var(--rc-accent); }
.pi-check--disabled { opacity: 0.5; cursor: not-allowed; border-color: var(--rc-border-subtle); background: var(--rc-surface-2); }

.pi-num { color: var(--rc-text-muted); }
.pi-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--rc-text); }
.pi-status { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pi-status--ok { color: var(--rc-success-700); }
.pi-status--err { color: var(--rc-danger-700); }

.pi-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  border: 2px dashed var(--rc-border-strong);
  border-radius: var(--rc-r-12);
  background: var(--rc-surface-2);
  text-align: center;
  transition: border-color var(--rc-dur-base), background var(--rc-dur-base);
}
.pi-dropzone--over { border-color: var(--rc-accent); background: var(--rc-accent-subtle); }
.pi-dropzone--busy { opacity: 0.7; pointer-events: none; }
.pi-dropzone__icon {
  width: 44px;
  height: 44px;
  border-radius: var(--rc-r-12);
  background: var(--rc-surface);
  color: var(--rc-accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--rc-shadow-sm);
}
.pi-dropzone__title { font-size: 13.5px; font-weight: 600; color: var(--rc-text); }
.pi-dropzone__hint { font-size: 12.5px; color: var(--rc-text-muted); margin-top: 2px; }

.pi-footnote { font-size: 12.5px; color: var(--rc-text-muted); flex: 1; }
.pi-footer-actions { display: flex; gap: 8px; }
</style>
