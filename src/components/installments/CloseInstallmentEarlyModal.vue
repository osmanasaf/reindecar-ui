<script setup lang="ts">
import { ref, computed } from 'vue'
import { installmentsApi } from '@/api'
import { useToast } from '@/composables'
import type { VehicleInstallmentResponse } from '@/types'

const props = defineProps<{
  installment: VehicleInstallmentResponse
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success'): void
}>()

const toast = useToast()
const loading = ref(false)
const discountPercentage = ref<number>(0)
const notes = ref('')

const outstandingBalance = computed(() => props.installment.outstandingBalance || 0)

const discountAmount = computed(() => {
  if (!discountPercentage.value) return 0
  return outstandingBalance.value * (discountPercentage.value / 100)
})

const finalAmount = computed(() => {
  return outstandingBalance.value - discountAmount.value
})

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('tr-TR', { 
    style: 'currency', 
    currency: props.installment.totalCurrency || 'TRY' 
  }).format(amount)
}

async function handleSubmit() {
  if (confirm('Taksit planını erken kapatmak üzeresiniz. Bu işlem geri alınamaz. Onaylıyor musunuz?')) {
    loading.value = true
    try {
      await installmentsApi.closeEarly(props.installment.id, {
        paymentAmount: finalAmount.value,
        paymentCurrency: props.installment.outstandingCurrency || 'TRY',
        discountPercentage: discountPercentage.value,
        notes: notes.value
      })
      toast.success('Taksit planı başarıyla kapatıldı')
      emit('success')
    } catch (err) {
      toast.apiError(err, 'İşlem başarısız')
    } finally {
      loading.value = false
    }
  }
}
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Taksit Erken Kapatma</h3>
        <button class="close-btn" @click="emit('close')">×</button>
      </div>

      <div class="modal-body">
        <div class="info-box">
          <div class="info-row">
            <span class="label">Kalan Bakiye:</span>
            <span class="value">{{ formatCurrency(outstandingBalance) }}</span>
          </div>
          <p class="info-note">
            Kalan {{ props.installment.remainingInstallments }} taksit toplu olarak ödenecek ve plan kapatılacaktır.
          </p>
        </div>

        <div class="form-group">
          <label>İndirim Oranı (%)</label>
          <div class="input-with-suffix">
            <input 
              v-model.number="discountPercentage" 
              type="number" 
              min="0" 
              max="100" 
              step="0.1"
              placeholder="0"
            />
            <span class="suffix">%</span>
          </div>
        </div>

        <div class="calculation-summary">
          <div class="calc-row">
            <span>Kalan Tutar</span>
            <span>{{ formatCurrency(outstandingBalance) }}</span>
          </div>
          <div class="calc-row discount" v-if="discountAmount > 0">
            <span>İndirim ({{ discountPercentage }}%)</span>
            <span>-{{ formatCurrency(discountAmount) }}</span>
          </div>
          <div class="calc-row total">
            <span>Ödenecek Tutar</span>
            <span>{{ formatCurrency(finalAmount) }}</span>
          </div>
        </div>

        <div class="form-group">
          <label>Notlar</label>
          <textarea 
            v-model="notes" 
            placeholder="Erken kapama ile ilgili notlar..."
            rows="3"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" @click="emit('close')">İptal</button>
        <button 
          class="btn btn-primary" 
          :disabled="loading" 
          @click="handleSubmit"
        >
          <span v-if="loading" class="spinner-sm"></span>
          Ödemeyi Onayla ve Kapat
        </button>
      </div>
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
  padding: 20px;
}

.modal-content {
  background: var(--color-surface);
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
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

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-box {
  background: var(--color-bg-secondary);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.info-row .label {
  font-weight: 500;
  color: var(--color-text-secondary);
}

.info-row .value {
  font-weight: 700;
  font-size: 18px;
  color: var(--color-text);
}

.info-note {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.form-group input,
.form-group textarea {
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
}

.input-with-suffix {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-suffix input {
  width: 100%;
  padding-right: 32px;
}

.suffix {
  position: absolute;
  right: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.calculation-summary {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin-bottom: 8px;
  color: var(--color-text-secondary);
}

.calc-row.discount {
  color: var(--color-success);
}

.calc-row.total {
  margin-top: 12px;
  margin-bottom: 0;
  padding-top: 12px;
  border-top: 1px dashed var(--color-border);
  font-weight: 700;
  font-size: 16px;
  color: var(--color-primary);
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: var(--color-bg-secondary);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-outline {
  background: white;
  border-color: var(--color-border);
  color: var(--color-text);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
