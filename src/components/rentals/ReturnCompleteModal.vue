<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { rentalsApi } from '@/api'
import { useValidation, rules, useToast } from '@/composables'
import type { Rental, VehicleReturnForm } from '@/types'
import { FuelLevel } from '@/types'

interface Props {
  visible: boolean
  rentalId: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  completed: [rental: Rental]
}>()

const toast = useToast()
const loading = ref(false)
const saving = ref(false)
const rental = ref<Rental | null>(null)
const step = ref<'info' | 'form'>('info')

const form = ref<VehicleReturnForm>({
  endKm: 0,
  fuelLevel: FuelLevel.FULL,
  damageNotes: '',
  extraCharges: 0
})

const startKmRef = computed(() => rental.value?.startKm || 0)
const { validateForm, getError, hasError, touch, reset } = useValidation()

const formRules = computed(() => ({
  endKm: { 
    value: form.value.endKm, 
    rules: [
      rules.required(), 
      rules.minValue(startKmRef.value, `KM değeri başlangıç KM'den (${startKmRef.value}) büyük olmalıdır`)
    ] 
  },
  fuelLevel: { value: form.value.fuelLevel, rules: [rules.required()] }
}))

const fuelLevelOptions = [
  { value: FuelLevel.EMPTY, label: 'Boş' },
  { value: FuelLevel.QUARTER, label: '1/4' },
  { value: FuelLevel.HALF, label: '1/2' },
  { value: FuelLevel.THREE_QUARTERS, label: '3/4' },
  { value: FuelLevel.FULL, label: 'Dolu' }
]

const totalKm = computed(() => {
  if (!rental.value?.startKm) return 0
  return Math.max(0, form.value.endKm - rental.value.startKm)
})

async function fetchRental() {
  if (!props.rentalId) return
  
  loading.value = true
  try {
    rental.value = await rentalsApi.getById(props.rentalId)
    form.value.endKm = rental.value.startKm || 0
  } catch {
    toast.error('Kiralama bilgileri yüklenemedi')
    emit('close')
  } finally {
    loading.value = false
  }
}

async function startReturn() {
  if (!props.rentalId) return
  
  saving.value = true
  try {
    await rentalsApi.startReturn(props.rentalId)
    step.value = 'form'
    toast.info('İade süreci başlatıldı')
  } catch {
    toast.error('İade başlatılamadı')
  } finally {
    saving.value = false
  }
}

async function completeReturn() {
  if (!validateForm(formRules.value)) {
    toast.error('Lütfen formdaki hataları düzeltin')
    return
  }

  if (!props.rentalId) return

  saving.value = true
  try {
    const updatedRental = await rentalsApi.complete(props.rentalId, form.value)
    toast.success('Kiralama başarıyla tamamlandı')
    emit('completed', updatedRental)
    handleClose()
  } catch {
    toast.error('İade tamamlanamadı')
  } finally {
    saving.value = false
  }
}

function handleClose() {
  reset()
  step.value = 'info'
  rental.value = null
  form.value = {
    endKm: 0,
    fuelLevel: FuelLevel.FULL,
    damageNotes: '',
    extraCharges: 0
  }
  emit('close')
}

function handleBlur(field: string) {
  touch(field)
}

function safeNumber(value: unknown, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

function formatCurrency(amount: unknown): string {
  const num = safeNumber(amount)
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(num)
}

function formatDate(date: unknown): string {
  if (!date) return '-'
  const d = new Date(String(date))
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

watch(() => props.visible, (isVisible) => {
  if (isVisible && props.rentalId) {
    reset()
    step.value = 'info'
    fetchRental()
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="handleClose">
      <div class="modal">
        <header class="modal-header">
          <h2>Araç İadesi</h2>
          <button class="close-btn" @click="handleClose">&times;</button>
        </header>

        <div v-if="loading" class="modal-loading">
          <div class="spinner"></div>
          <span>Yükleniyor...</span>
        </div>

        <template v-else-if="rental">
          <div class="modal-body">
            <div class="rental-info">
              <div class="info-row">
                <span class="label">Kiralama No</span>
                <span class="value">{{ rental.rentalNumber }}</span>
              </div>
              <div class="info-row">
                <span class="label">Araç</span>
                <span class="value">{{ rental.vehiclePlate }} - {{ rental.vehicleName }}</span>
              </div>
              <div class="info-row">
                <span class="label">Müşteri</span>
                <span class="value">{{ rental.customerName }}</span>
              </div>
              <div class="info-row">
                <span class="label">Tarih Aralığı</span>
                <span class="value">{{ formatDate(rental.startDate) }} - {{ formatDate(rental.endDate) }}</span>
              </div>
              <div class="info-row" v-if="rental.startKm">
                <span class="label">Teslim KM</span>
                <span class="value">{{ rental.startKm.toLocaleString('tr-TR') }} km</span>
              </div>
            </div>

            <div v-if="rental.isOverdue" class="overdue-warning">
              <span class="warning-icon">⚠️</span>
              <p>Bu kiralama <strong>{{ rental.overdueDays }} gün</strong> gecikmiş durumda!</p>
            </div>

            <template v-if="step === 'form'">
              <div class="divider"></div>

              <form class="return-form" @submit.prevent="completeReturn">
                <h3>İade Bilgileri</h3>

                <div class="form-grid">
                  <div class="form-group" :class="{ error: hasError('endKm') }">
                    <label>İade KM <span class="required">*</span></label>
                    <input 
                      v-model.number="form.endKm" 
                      @blur="handleBlur('endKm')"
                      type="number"
                      :min="rental.startKm || 0"
                    />
                    <span class="error-text">{{ getError('endKm') }}</span>
                    <span v-if="totalKm > 0" class="helper-text">
                      Toplam: {{ totalKm.toLocaleString('tr-TR') }} km
                    </span>
                  </div>

                  <div class="form-group" :class="{ error: hasError('fuelLevel') }">
                    <label>Yakıt Seviyesi <span class="required">*</span></label>
                    <select v-model="form.fuelLevel" @blur="handleBlur('fuelLevel')">
                      <option v-for="opt in fuelLevelOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                    <span class="error-text">{{ getError('fuelLevel') }}</span>
                  </div>

                  <div class="form-group full">
                    <label>Hasar Notları</label>
                    <textarea 
                      v-model="form.damageNotes" 
                      rows="3"
                      placeholder="Varsa hasar veya eksiklik notları..."
                    ></textarea>
                  </div>

                  <div class="form-group">
                    <label>Ekstra Ücretler (₺)</label>
                    <input 
                      v-model.number="form.extraCharges" 
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                    <span class="helper-text">Hasar, yakıt farkı vb. için</span>
                  </div>
                </div>
              </form>
            </template>
          </div>

          <footer class="modal-footer">
            <button type="button" class="btn btn-outline" @click="handleClose">İptal</button>
            
            <button 
              v-if="step === 'info'"
              type="button" 
              class="btn btn-primary"
              :disabled="saving"
              @click="startReturn"
            >
              {{ saving ? 'Başlatılıyor...' : 'İade Başlat' }}
            </button>

            <button 
              v-if="step === 'form'"
              type="button" 
              class="btn btn-success"
              :disabled="saving"
              @click="completeReturn"
            >
              {{ saving ? 'Tamamlanıyor...' : 'İadeyi Tamamla' }}
            </button>
          </footer>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.modal {
  background: var(--color-surface);
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-loading {
  padding: 60px;
  text-align: center;
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.rental-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-row .label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.info-row .value {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.overdue-warning {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 14px 16px;
  background: var(--color-danger-light);
  border-radius: 10px;
}

.warning-icon {
  font-size: 20px;
}

.overdue-warning p {
  margin: 0;
  font-size: 14px;
  color: var(--color-danger);
}

.divider {
  height: 1px;
  background: var(--color-border);
  margin: 24px 0;
}

.return-form h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 16px 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full {
  grid-column: span 2;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.required {
  color: var(--color-danger);
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-bg-secondary);
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.form-group.error input,
.form-group.error select {
  border-color: var(--color-danger);
  background: #fff5f5;
}

.error-text {
  font-size: 12px;
  color: var(--color-danger);
  min-height: 16px;
}

.helper-text {
  font-size: 12px;
  color: var(--color-text-muted);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border: none;
}

.btn-success {
  background: var(--color-success);
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled),
.btn-success:hover:not(:disabled) {
  opacity: 0.9;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-outline:hover {
  background: var(--color-bg-secondary);
}

@media (max-width: 500px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-group.full {
    grid-column: span 1;
  }
}
</style>
