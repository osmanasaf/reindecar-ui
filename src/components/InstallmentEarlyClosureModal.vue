<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal early-closure-modal">
      <div class="modal-header">
        <h2>Taksit Erken Kapatma</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <!-- Info Section -->
        <div class="info-section">
          <div class="info-item">
            <span class="label">Toplam Tutar:</span>
            <strong>{{ formatCurrency(installment.totalAmount) }}</strong>
          </div>
          <div class="info-item">
            <span class="label">Aylık Ödeme:</span>
            <strong>{{ formatCurrency(installment.monthlyPayment) }}</strong>
          </div>
          <div class="info-item">
            <span class="label">Kalan Taksit:</span>
            <strong>{{ installment.remainingInstallments }} adet</strong>
          </div>
          <div class="info-item highlight">
            <span class="label">Kalan Bakiye:</span>
            <strong class="amount">{{ formatCurrency(installment.outstandingBalance) }}</strong>
          </div>
        </div>

        <!-- Discount Section -->
        <div class="section">
          <h3>İndirim Oranı (Opsiyonel)</h3>
          <p class="description">
            Erken ödeme indirimi uygulamak isterseniz aşağıdan oran girebilirsiniz.
          </p>

          <div class="form-group">
            <label>İndirim Oranı (%)</label>
            <input 
              v-model.number="discountPercentage" 
              type="number" 
              min="0" 
              max="100"
              step="0.1"
              placeholder="0"
            />
            <span class="hint">0-100 arası bir değer giriniz</span>
          </div>
        </div>

        <!-- Calculation Preview -->
        <div class="calculation-preview">
          <h3>Hesap Özeti</h3>
          <div class="calc-row">
            <span>Kalan Bakiye:</span>
            <span class="value">{{ formatCurrency(installment.outstandingBalance) }}</span>
          </div>
          <div v-if="discountAmount > 0" class="calc-row discount">
            <span>İndirim ({{ discountPercentage }}%):</span>
            <span class="value">-{{ formatCurrency(discountAmount) }}</span>
          </div>
          <div class="calc-row total">
            <span>Ödenecek Tutar:</span>
            <strong class="value">{{ formatCurrency(finalAmount) }}</strong>
          </div>
        </div>

        <!-- Notes Section -->
        <div class="section">
          <div class="form-group">
            <label>Notlar (Opsiyonel)</label>
            <textarea 
              v-model="notes" 
              rows="3"
              placeholder="Erken kapama ile ilgili notlarınız..."
            ></textarea>
          </div>
        </div>

        <!-- Warning -->
        <div class="warning-box">
          <span class="icon">⚠️</span>
          <div>
            <strong>Dikkat:</strong> Erken kapama işlemi geri alınamaz. 
            Tüm kalan taksitler ödendi olarak işaretlenecektir.
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" @click="$emit('close')">
          İptal
        </button>
        <button 
          class="btn btn-primary" 
          @click="handleSubmit"
          :disabled="processing"
        >
          {{ processing ? 'İşleniyor...' : `${formatCurrency(finalAmount)} Öde ve Kapat` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { VehicleInstallmentResponse } from '@/types'

interface Props {
  show: boolean
  installment: VehicleInstallmentResponse
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  submit: [paymentAmount: number, discountPercentage: number | undefined, notes: string]
}>()

const processing = ref(false)
const discountPercentage = ref(0)
const notes = ref('')

const discountAmount = computed(() => {
  if (!discountPercentage.value || discountPercentage.value <= 0) return 0
  return props.installment.outstandingBalance * (discountPercentage.value / 100)
})

const finalAmount = computed(() => {
  return props.installment.outstandingBalance - discountAmount.value
})

watch(() => props.show, (show) => {
  if (show) {
    discountPercentage.value = 0
    notes.value = ''
  }
})

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: props.installment.outstandingCurrency || props.installment.totalCurrency || 'TRY'
  }).format(amount)
}

function handleSubmit() {
  const discount = discountPercentage.value > 0 ? discountPercentage.value : undefined
  emit('submit', finalAmount.value, discount, notes.value)
}
</script>

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

.modal {
  background: var(--color-surface);
  border-radius: 12px;
  width: 100%;
}

.early-closure-modal {
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
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
}

.close-btn:hover {
  color: var(--color-text);
}

.modal-body {
  padding: 20px;
}

.info-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item.highlight {
  grid-column: 1 / -1;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border-left: 4px solid var(--color-primary);
}

.info-item .label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.info-item strong {
  font-size: 16px;
}

.info-item.highlight .amount {
  font-size: 20px;
  color: var(--color-primary);
}

.section {
  margin-bottom: 24px;
}

.section h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.description {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 14px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
}

.hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.calculation-preview {
  padding: 16px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  margin-bottom: 24px;
}

.calculation-preview h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}

.calc-row:last-child {
  border-bottom: none;
}

.calc-row.discount {
  color: var(--color-success);
}

.calc-row.total {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 2px solid var(--color-border);
  font-size: 16px;
}

.calc-row .value {
  font-weight: 500;
}

.warning-box {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  margin-bottom: 24px;
}

.warning-box .icon {
  font-size: 20px;
}

.warning-box strong {
  display: block;
  margin-bottom: 4px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline {
  background: white;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-outline:hover {
  background: var(--color-bg-secondary);
}

.btn-primary {
  background: var(--color-primary);
  border: none;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
