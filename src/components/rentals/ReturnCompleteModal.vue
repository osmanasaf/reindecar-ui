<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { rentalsApi, vehiclesApi } from '@/api'
import { useValidation, rules, useToast } from '@/composables'
import type { Rental, Vehicle, VehicleReturnForm, ReturnPreviewResponse } from '@/types'

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
const calculating = ref(false)
const saving = ref(false)
const downloadingPdf = ref(false)
const rental = ref<Rental | null>(null)
const vehicle = ref<Vehicle | null>(null)
const step = ref<'input' | 'preview' | 'completed'>('input')
const preview = ref<ReturnPreviewResponse | null>(null)

const form = ref<{
  endKm: number
  actualReturnDate: string
}>({
  endKm: 0,
  actualReturnDate: ''
})

const startKmRef = computed(() => rental.value?.startKm || 0)
const { validateForm, getError, hasError, touch, reset } = useValidation()

const minReturnDate = computed(() => rental.value?.startDate ?? '')
const plannedEndDate = computed(() => rental.value?.endDate ?? '')

const returnDateStatus = computed(() => {
  if (!form.value.actualReturnDate || !plannedEndDate.value) return null
  const actual = new Date(form.value.actualReturnDate)
  const planned = new Date(plannedEndDate.value)
  if (actual > planned) {
    const days = Math.ceil((actual.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24))
    return { type: 'late', days }
  }
  if (actual < planned) {
    const days = Math.ceil((planned.getTime() - actual.getTime()) / (1000 * 60 * 60 * 24))
    return { type: 'early', days }
  }
  return { type: 'ontime', days: 0 }
})

const inputRules = computed(() => ({
  endKm: { 
    value: form.value.endKm, 
    rules: [
      rules.required(), 
      rules.minValue(startKmRef.value, `KM değeri başlangıç KM'den (${startKmRef.value}) büyük olmalıdır`)
    ] 
  },
  actualReturnDate: { 
    value: form.value.actualReturnDate, 
    rules: [
      rules.required(),
      {
        validate: (v: unknown) => !v || !minReturnDate.value || String(v) >= minReturnDate.value,
        message: `İade tarihi kiralama başlangıç tarihinden (${formatDate(minReturnDate.value)}) önce olamaz`
      }
    ]
  }
}))

const totalKm = computed(() => {
  if (!rental.value?.startKm) return 0
  return Math.max(0, form.value.endKm - rental.value.startKm)
})

async function fetchRental() {
  if (!props.rentalId) return

  loading.value = true
  vehicle.value = null
  try {
    rental.value = await rentalsApi.getById(props.rentalId)
    form.value.endKm = rental.value.startKm ?? 0
    const today = new Date()
    form.value.actualReturnDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    if (rental.value.vehicleId) {
      vehicle.value = await vehiclesApi.getById(rental.value.vehicleId)
    }
  } catch {
    toast.error('Kiralama bilgileri yüklenemedi')
    emit('close')
  } finally {
    loading.value = false
  }
}

async function calculatePreview() {
  if (!validateForm(inputRules.value)) {
    toast.error('Lütfen formdaki hataları düzeltin')
    return
  }

  if (!props.rentalId) return

  calculating.value = true
  try {
    preview.value = await rentalsApi.previewReturn(
      props.rentalId,
      form.value.endKm,
      form.value.actualReturnDate
    )
    step.value = 'preview'
  } catch (err) {
    toast.apiError(err, 'Hesaplama yapılamadı')
  } finally {
    calculating.value = false
  }
}

async function completeReturn() {
  if (!props.rentalId) return

  saving.value = true
  try {
    const completeRequest: VehicleReturnForm = {
      endKm: form.value.endKm,
      actualReturnDate: form.value.actualReturnDate,
      notes: ''
    }
    const updatedRental = await rentalsApi.complete(props.rentalId, completeRequest)
    toast.success('Kiralama başarıyla sonlandırıldı')
    emit('completed', updatedRental)
    step.value = 'completed'
  } catch (err) {
    toast.apiError(err, 'Kiralama sonlandırılamadı')
  } finally {
    saving.value = false
  }
}

async function downloadCompletionPdf() {
  if (!props.rentalId || !rental.value) return

  downloadingPdf.value = true
  try {
    const blob = await rentalsApi.downloadCompletionPdf(props.rentalId)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `kiralama-teslim-tutanagi-${rental.value.rentalNumber}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    toast.success('Teslim tutanağı indirildi')
  } catch (err) {
    toast.apiError(err, 'PDF indirilemedi')
  } finally {
    downloadingPdf.value = false
  }
}

function handleClose() {
  reset()
  step.value = 'input'
  preview.value = null
  rental.value = null
  vehicle.value = null
  form.value = {
    endKm: 0,
    actualReturnDate: ''
  }
  emit('close')
}

function handleBack() {
  step.value = 'input'
  preview.value = null
}

function handleBlur(field: string) {
  touch(field)
}

function formatCurrency(amount: number | { amount: number; currency: string }): string {
  const num = typeof amount === 'number' ? amount : amount.amount
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(num)
}

function formatDate(date: unknown): string {
  if (!date) return '-'
  const d = new Date(String(date))
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

watch(() => props.visible, (isVisible) => {
  if (isVisible && props.rentalId) {
    reset()
    step.value = 'input'
    preview.value = null
    fetchRental()
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="handleClose">
      <div class="modal">
        <header class="modal-header">
          <h2>Kiralamayı Sonlandır</h2>
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
                <span class="value">
                  {{ vehicle ? `${vehicle.plateNumber} - ${vehicle.brand} ${vehicle.model}` : (rental.vehiclePlate && rental.vehicleName ? `${rental.vehiclePlate} - ${rental.vehicleName}` : '-') }}
                </span>
              </div>
              <div class="info-row">
                <span class="label">Müşteri</span>
                <span class="value">{{ rental.customerName }}</span>
              </div>
              <div class="info-row">
                <span class="label">Planlanan Bitiş</span>
                <span class="value">{{ formatDate(rental.endDate) }}</span>
              </div>
              <div class="info-row" v-if="rental.startKm">
                <span class="label">Başlangıç KM</span>
                <span class="value">{{ rental.startKm.toLocaleString('tr-TR') }} km</span>
              </div>
            </div>

            <div v-if="rental.isOverdue" class="overdue-warning">
              <span class="warning-icon">⚠️</span>
              <p>Bu kiralama <strong>{{ rental.overdueDays }} gün</strong> gecikmiş durumda!</p>
            </div>

            <template v-if="step === 'input'">
              <div class="divider"></div>

              <form class="return-form" @submit.prevent="calculatePreview">
                <h3>İade Bilgileri</h3>

                <div class="form-grid">
                  <div class="form-group" :class="{ error: hasError('endKm') }">
                    <label for="endKm">Bitiş KM <span class="required">*</span></label>
                    <input 
                      id="endKm"
                      v-model.number="form.endKm" 
                      @blur="handleBlur('endKm')"
                      type="number"
                      :min="rental.startKm || 0"
                      placeholder="Bitiş KM değerini girin"
                    />
                    <span class="error-text">{{ getError('endKm') }}</span>
                    <span v-if="totalKm > 0" class="helper-text">
                      Kullanılan: {{ totalKm.toLocaleString('tr-TR') }} km
                    </span>
                  </div>

                  <div class="form-group" :class="{ error: hasError('actualReturnDate') }">
                    <label for="actualReturnDate">Gerçek İade Tarihi <span class="required">*</span></label>
                    <input 
                      id="actualReturnDate"
                      v-model="form.actualReturnDate" 
                      @blur="handleBlur('actualReturnDate')"
                      type="date"
                      :min="minReturnDate"
                    />
                    <span class="error-text">{{ getError('actualReturnDate') }}</span>
                    <span
                      v-if="returnDateStatus && !hasError('actualReturnDate')"
                      :class="['return-date-hint', returnDateStatus.type]"
                    >
                      <template v-if="returnDateStatus.type === 'late'">
                        ⚠️ Planlanan tarihten {{ returnDateStatus.days }} gün geç — geç iade ücreti uygulanacak
                      </template>
                      <template v-else-if="returnDateStatus.type === 'early'">
                        ✓ Planlanan tarihten {{ returnDateStatus.days }} gün erken iade
                      </template>
                      <template v-else>
                        ✓ Planlanan tarihte iade
                      </template>
                    </span>
                  </div>
                </div>
              </form>
            </template>

            <template v-else-if="step === 'preview' && preview">
              <div class="divider"></div>

              <div class="preview-section">
                <h3>Hesaplanan Ek Kalemler</h3>

                <div class="preview-grid">
                  <div class="preview-item">
                    <span class="label">Kullanılan KM</span>
                    <span class="value">{{ preview.kmUsed.toLocaleString('tr-TR') }} km</span>
                  </div>

                  <div v-if="preview.kmOverage > 0" class="preview-item highlight">
                    <span class="label">KM Aşımı</span>
                    <span class="value">{{ preview.kmOverage.toLocaleString('tr-TR') }} km</span>
                  </div>

                  <div v-if="preview.kmPenalty.amount > 0" class="preview-item highlight">
                    <span class="label">KM Ceza Ücreti</span>
                    <span class="value">{{ formatCurrency(preview.kmPenalty) }}</span>
                  </div>

                  <div v-if="preview.lateDays > 0" class="preview-item highlight">
                    <span class="label">Geç İade Günü</span>
                    <span class="value">{{ preview.lateDays }} gün</span>
                  </div>

                  <div v-if="preview.lateFee.amount > 0" class="preview-item highlight">
                    <span class="label">Geç İade Ücreti</span>
                    <span class="value">{{ formatCurrency(preview.lateFee) }}</span>
                  </div>

                  <template v-if="preview.penalties?.length">
                    <div class="preview-subtitle">Trafik Cezaları</div>
                    <div
                      v-for="(p, i) in preview.penalties"
                      :key="i"
                      :class="['preview-item', p.paid ? 'preview-item-paid' : 'highlight']"
                    >
                      <span class="label">
                        {{ p.penaltyNumber }} ({{ p.violationType }})
                        <span v-if="p.paid" class="paid-badge">Ödendi</span>
                      </span>
                      <span class="value">{{ formatCurrency(p.amount) }}</span>
                    </div>
                    <div v-if="preview.penaltyTotal?.amount > 0" class="preview-item highlight">
                      <span class="label">Ceza Toplamı (ödenmemiş)</span>
                      <span class="value">{{ formatCurrency(preview.penaltyTotal) }}</span>
                    </div>
                  </template>

                  <template v-if="preview.tolls?.length">
                    <div class="preview-subtitle">HGS/OGS Geçişler</div>
                    <div
                      v-for="(t, i) in preview.tolls"
                      :key="'toll-' + i"
                      class="preview-item highlight"
                    >
                      <span class="label">{{ t.tollNumber }} ({{ t.tollType }}) {{ t.passageLocation ? '– ' + t.passageLocation : '' }}</span>
                      <span class="value">{{ formatCurrency(t.amount) }}</span>
                    </div>
                    <div v-if="preview.tollTotal?.amount > 0" class="preview-item highlight">
                      <span class="label">HGS/OGS Toplamı</span>
                      <span class="value">{{ formatCurrency(preview.tollTotal) }}</span>
                    </div>
                  </template>

                  <template v-if="preview.damages?.length">
                    <div class="preview-subtitle">Hasar Bedelleri</div>
                    <div
                      v-for="(d, i) in preview.damages"
                      :key="i"
                      class="preview-item highlight"
                    >
                      <span class="label">{{ d.description }} ({{ d.severity }}) {{ d.repaired ? '– Onarıldı' : '' }}</span>
                      <span class="value">{{ formatCurrency(d.estimatedCost) }}</span>
                    </div>
                    <div v-if="preview.damageTotal?.amount > 0" class="preview-item highlight">
                      <span class="label">Hasar Toplamı</span>
                      <span class="value">{{ formatCurrency(preview.damageTotal) }}</span>
                    </div>
                  </template>

                  <div
                    class="preview-item total"
                    :class="{ success: preview.grandTotal?.amount === 0 }"
                  >
                    <span class="label">Genel Toplam</span>
                    <span class="value">
                      {{ preview.grandTotal?.amount === 0 ? 'Yok' : formatCurrency(preview.grandTotal) }}
                    </span>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="step === 'completed'">
              <div class="divider"></div>

              <div class="completed-section">
                <div class="completed-icon">✅</div>
                <h3>Kiralama Başarıyla Sonlandırıldı</h3>
                <p>Teslim tutanağını PDF olarak indirip müşteriye imzalatabilirsiniz.</p>

                <button
                  type="button"
                  class="btn btn-pdf"
                  :disabled="downloadingPdf"
                  @click="downloadCompletionPdf"
                >
                  <span v-if="downloadingPdf" class="spinner-sm"></span>
                  <span v-else>📄</span>
                  {{ downloadingPdf ? 'İndiriliyor...' : 'Teslim Tutanağı İndir (PDF)' }}
                </button>
              </div>
            </template>
          </div>

          <footer class="modal-footer">
            <button type="button" class="btn btn-outline" @click="handleClose">
              {{ step === 'completed' ? 'Kapat' : 'İptal' }}
            </button>
            
            <button 
              v-if="step === 'input'"
              type="button" 
              class="btn btn-primary"
              :disabled="calculating"
              @click="calculatePreview"
            >
              {{ calculating ? 'Hesaplanıyor...' : 'Hesapla' }}
            </button>

            <button 
              v-if="step === 'preview'"
              type="button" 
              class="btn btn-outline"
              :disabled="saving"
              @click="handleBack"
            >
              Geri
            </button>

            <button 
              v-if="step === 'preview'"
              type="button" 
              class="btn btn-success"
              :disabled="saving"
              @click="completeReturn"
            >
              {{ saving ? 'Sonlandırılıyor...' : 'Kiralamayı Sonlandır' }}
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

.return-form h3,
.preview-section h3 {
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

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.required {
  color: var(--color-danger);
}

.form-group input {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-bg-secondary);
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.form-group.error input {
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

.return-date-hint {
  font-size: 12px;
  font-weight: 500;
}

.return-date-hint.late {
  color: #b45309;
}

.return-date-hint.early {
  color: #059669;
}

.return-date-hint.ontime {
  color: #059669;
}

.preview-section {
  margin-top: 8px;
}

.preview-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-top: 16px;
  margin-bottom: 8px;
}

.preview-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.preview-item.highlight {
  background: #fef3c7;
  border: 1px solid #f59e0b;
}

.preview-item.total {
  background: var(--color-primary-light);
  border: 1px solid var(--color-primary);
  font-weight: 600;
}

.preview-item.success {
  background: #dcfce7;
  border: 1px solid #10b981;
}

.preview-item-paid {
  opacity: 0.85;
}

.preview-item-paid .label {
  text-decoration: line-through;
  color: var(--color-text-muted);
}

.paid-badge {
  margin-left: 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-success);
  text-decoration: none;
}

.preview-item .label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.preview-item.total .label,
.preview-item.highlight .label {
  color: var(--color-text);
  font-weight: 500;
}

.preview-item .value {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.preview-item.total .value {
  font-size: 18px;
  color: var(--color-primary);
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
  border: none;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-success {
  background: var(--color-success);
  color: white;
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

.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

.completed-section {
  text-align: center;
  padding: 24px 0;
}

.completed-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.completed-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 8px 0;
}

.completed-section p {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 24px 0;
}

.btn-pdf {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-pdf:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-pdf:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 500px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
