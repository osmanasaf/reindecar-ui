<script setup lang="ts">
import { ref } from 'vue'
import { tollsApi } from '@/api'
import { useToast } from '@/composables'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'
import { TollType } from '@/types'
import type { CreateTollRecordRequest } from '@/api'

const props = defineProps<{
  rentalId: number
  vehicleId: number
  customerId: number
}>()

const emit = defineEmits<{
  close: []
  created: []
}>()

const toast = useToast()
const submitting = ref(false)

const tollTypes = [
  { value: TollType.HGS, label: 'HGS Geçiş' },
  { value: TollType.OGS, label: 'OGS Geçiş' },
  { value: TollType.BRIDGE, label: 'Köprü Geçiş' },
  { value: TollType.TUNNEL, label: 'Tünel Geçiş' },
  { value: TollType.OTHER, label: 'Diğer' }
]

const form = ref({
  tollType: TollType.HGS as TollType,
  passageDate: new Date().toISOString().slice(0, 10),
  passageLocation: '',
  tollAmount: null as number | null,
  hgsTagNumber: '',
  description: ''
})

async function handleSubmit() {
  if (!form.value.tollAmount || form.value.tollAmount <= 0) {
    toast.error('Geçiş ücreti girilmelidir')
    return
  }

  submitting.value = true
  try {
    const request: CreateTollRecordRequest = {
      rentalId: props.rentalId,
      vehicleId: props.vehicleId,
      customerId: props.customerId,
      tollType: form.value.tollType,
      passageDate: form.value.passageDate ? `${form.value.passageDate}T00:00:00` : '',
      passageLocation: form.value.passageLocation || undefined,
      tollAmount: form.value.tollAmount,
      hgsTagNumber: form.value.hgsTagNumber || undefined,
      description: form.value.description || undefined
    }
    await tollsApi.create(request)
    toast.success('Geçiş kaydı oluşturuldu ve alacak olarak müşteriye yansıtıldı')
    emit('created')
  } catch (err: unknown) {
    toast.apiError(err, 'Geçiş kaydı oluşturulamadı')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>HGS/OGS Geçiş Kaydı</h2>
        <button class="close-btn" @click="emit('close')">&times;</button>
      </div>

      <form @submit.prevent="handleSubmit" class="toll-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Geçiş Tipi *</label>
            <SearchableSelect
              v-model="form.tollType"
              :options="tollTypes"
              placeholder="Geçiş tipi seçin"
              search-placeholder="Ara..."
            />
          </div>

          <div class="form-group">
            <DatePicker
              v-model="form.passageDate"
              label="Geçiş Tarihi *"
              placeholder="Tarih seçin"
            />
          </div>

          <div class="form-group">
            <label for="passageLocation">Geçiş Noktası</label>
            <input
              id="passageLocation"
              type="text"
              v-model="form.passageLocation"
              placeholder="Örn: FSM Köprüsü, Osmangazi Köprüsü"
            />
          </div>

          <div class="form-group">
            <label for="tollAmount">Geçiş Ücreti (TRY) *</label>
            <input
              id="tollAmount"
              type="number"
              v-model.number="form.tollAmount"
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div class="form-group">
            <label for="hgsTagNumber">HGS Etiket No</label>
            <input
              id="hgsTagNumber"
              type="text"
              v-model="form.hgsTagNumber"
              placeholder="HGS-123456789"
            />
          </div>

          <div class="form-group full-width">
            <label for="description">Açıklama</label>
            <textarea
              id="description"
              v-model="form.description"
              rows="3"
              placeholder="Ek bilgi..."
            ></textarea>
          </div>
        </div>

        <div class="info-box">
          Geçiş kaydı oluşturulduğunda otomatik olarak müşteriye alacak olarak yansıtılır.
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-outline" @click="emit('close')">
            İptal
          </button>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? 'Kaydediliyor...' : 'Kaydet' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--color-surface);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: var(--color-bg-secondary);
}

.toll-form {
  padding: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-bg-secondary);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.info-box {
  margin-top: 16px;
  padding: 12px 16px;
  background: var(--color-info-bg, #e8f4fd);
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-info-text, #1565c0);
  border-left: 3px solid var(--color-info, #2196f3);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-outline:hover {
  background: var(--color-bg-secondary);
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
