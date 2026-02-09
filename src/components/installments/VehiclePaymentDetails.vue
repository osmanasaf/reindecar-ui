<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useInstallmentStore } from '@/stores/installment.store'
import { formatCurrency, calculateProgress } from '@/utils/installmentHelpers'
import PaymentScheduleTable from './PaymentScheduleTable.vue'
import InstallmentForm from './InstallmentForm.vue'
import CloseInstallmentEarlyModal from './CloseInstallmentEarlyModal.vue'

interface Props {
  vehicleId: number
}

const props = defineProps<Props>()

const installmentStore = useInstallmentStore()
const details = ref<any>(null)
const showForm = ref(false)
const showCloseModal = ref(false)

const hasInstallment = computed(() => details.value?.hasInstallment ?? false)
const installment = computed(() => details.value?.installment)
const payments = computed(() => details.value?.payments ?? [])
const paidCount = computed(() => payments.value.filter((p: any) => p.status === 'PAID').length)
const progress = computed(() => {
  if (!installment.value) return 0
  return calculateProgress(paidCount.value, installment.value.numberOfInstallments)
})

onMounted(async () => {
  await loadDetails()
})

async function loadDetails(): Promise<void> {
  details.value = await installmentStore.fetchVehicleDetails(props.vehicleId, true)
}

function handleFormSuccess(): void {
  showForm.value = false
  loadDetails()
}

function handleCloseSuccess(): void {
  showCloseModal.value = false
  loadDetails()
}
</script>

<template>
  <div class="vehicle-payment-details">
    <div v-if="!hasInstallment" class="empty-state">
      <p>Bu araç için taksit planı bulunmuyor</p>
      <button class="btn btn-primary" @click="showForm = true">
        + Taksit Planı Oluştur
      </button>
    </div>

    <template v-else-if="installment">
      <div class="installment-summary">
        <div class="header-row">
            <h3>Taksit Özeti</h3>
            <button 
                v-if="installment.outstandingBalance > 0"
                class="btn btn-outline-danger btn-sm"
                @click="showCloseModal = true"
            >
                Erken Kapat
            </button>
        </div>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">Toplam Tutar</span>
            <span class="value">{{ formatCurrency(installment.totalAmount, installment.totalCurrency) }}</span>
          </div>
          <div class="summary-item">
            <span class="label">Aylık Ödeme</span>
            <span class="value">{{ formatCurrency(installment.monthlyPayment, installment.monthlyPaymentCurrency) }}</span>
          </div>
          <div class="summary-item">
            <span class="label">Kalan Taksit</span>
            <span class="value">{{ installment.remainingInstallments }} / {{ installment.numberOfInstallments }}</span>
          </div>
          <div class="summary-item">
            <span class="label">Kalan Bakiye</span>
            <span class="value">{{ formatCurrency(installment.outstandingBalance, installment.outstandingCurrency) }}</span>
          </div>
          <div class="summary-item">
            <span class="label">Başlangıç Tarihi</span>
            <span class="value">{{ new Date(installment.startDate).toLocaleDateString('tr-TR') }}</span>
          </div>
          <div class="summary-item">
            <span class="label">Bitiş Tarihi</span>
            <span class="value">{{ new Date(installment.endDate).toLocaleDateString('tr-TR') }}</span>
          </div>
          <div class="summary-item highlight">
            <span class="label">Sonraki Ödeme</span>
            <span class="value next-payment">{{ new Date(installment.nextPaymentDueDate).toLocaleDateString('tr-TR') }}</span>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
        <p class="progress-text">{{ paidCount }} / {{ installment.numberOfInstallments }} ödeme tamamlandı (%{{ progress }})</p>
      </div>

      <div class="payment-schedule">
        <h3>Ödeme Planı</h3>
        <PaymentScheduleTable :payments="payments" @payment-recorded="loadDetails" />
      </div>
    </template>

    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal-content">
        <InstallmentForm :vehicle-id="vehicleId" @success="handleFormSuccess" @cancel="showForm = false" />
      </div>
    </div>

    <CloseInstallmentEarlyModal
        v-if="installment"
        :installment="installment"
        :visible="showCloseModal"
        @close="showCloseModal = false"
        @success="handleCloseSuccess"
    />
  </div>
</template>

<style scoped>
.vehicle-payment-details {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: var(--color-bg-secondary);
  border-radius: 12px;
  border: 1px dashed var(--color-border);
}

.empty-state p {
  margin: 0 0 20px 0;
  color: var(--color-text-secondary);
}

.installment-summary {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
}

.installment-summary h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.btn-outline-danger {
    background: transparent;
    border: 1px solid var(--color-danger);
    color: var(--color-danger);
}

.btn-outline-danger:hover {
    background: var(--color-danger-light);
}

.btn-sm {
    padding: 6px 12px;
    font-size: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-item .label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.summary-item .value {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.summary-item.highlight {
  background: var(--color-primary-light);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--color-primary);
}

.summary-item.highlight .label {
  color: var(--color-primary);
  font-weight: 600;
}

.summary-item.highlight .value.next-payment {
  color: var(--color-primary);
}

.progress-bar {
  height: 8px;
  background: var(--color-bg-secondary);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: var(--color-success);
  transition: width 0.3s;
}

.progress-text {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
}

.payment-schedule {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
}

.payment-schedule h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  font-weight: 600;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

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
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}
</style>
