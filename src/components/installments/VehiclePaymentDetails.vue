<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useInstallmentStore } from '@/stores/installment.store'
import { formatCurrency, formatDate, calculateProgress } from '@/utils/installmentHelpers'
import { RcButton, RcEmpty, RcModal } from '@/components/rc'
import { RcIcon } from '@/components/icons'
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

function isInvalidOrEpochDate(date: string | number | null | undefined): boolean {
  if (date === null || date === undefined) return true
  if (
    typeof date === 'string' &&
    (date === '' || date.startsWith('1970-01-01') || date.startsWith('1970'))
  )
    return true
  if (typeof date === 'number' && (date === 0 || date < 86400000)) return true
  const d = new Date(date as string)
  if (Number.isNaN(d.getTime())) return true
  const y = d.getUTCFullYear()
  return y < 1980 || y === 1970
}

const isCompleted = computed(() => {
  if (!installment.value) return false
  const rem = Number(installment.value.remainingInstallments)
  const bal = Number(installment.value.outstandingBalance ?? 0)
  return rem === 0 || bal <= 0 || !!installment.value.earlyClosedAt
})

const nextPaymentDisplay = computed(() => {
  if (!installment.value) return '—'
  if (isCompleted.value) return 'Tamamlandı'
  const date = installment.value.nextPaymentDueDate
  if (isInvalidOrEpochDate(date ?? undefined)) return '—'
  return formatDate(date)
})

const displayPaidCount = computed(() => {
  if (!installment.value) return 0
  const total = installment.value.numberOfInstallments ?? 0
  if (total > 0 && isCompleted.value) return total
  return paidCount.value
})

const remainingDisplay = computed(() => {
  if (!installment.value) return '0 / 0'
  const total = Number(installment.value.numberOfInstallments) || 0
  return `${displayPaidCount.value} / ${total}`
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
  <div class="rc-veh-installment">
    <RcEmpty
      v-if="!hasInstallment"
      title="Taksit planı yok"
      description="Bu araç için henüz taksit planı oluşturulmamış."
    >
      <template #icon>
        <RcIcon name="card" :size="28" />
      </template>
      <template #action>
        <RcButton variant="accent" size="sm" @click="showForm = true">
          <RcIcon name="plus" />
          Taksit Planı Oluştur
        </RcButton>
      </template>
    </RcEmpty>

    <template v-else-if="installment">
      <div class="rc-card">
        <div class="rc-card__body">
          <div class="rc-veh-installment__head">
            <h3>Taksit Özeti</h3>
            <RcButton
              v-if="installment.outstandingBalance > 0"
              variant="ghost"
              size="xs"
              @click="showCloseModal = true"
            >
              Erken Kapat
            </RcButton>
          </div>

          <div class="rc-veh-installment__summary">
            <div class="rc-veh-installment__stat">
              <span class="rc-veh-installment__stat-label">Toplam Tutar</span>
              <span class="rc-veh-installment__stat-value">
                {{ formatCurrency(installment.totalAmount, installment.totalCurrency) }}
              </span>
            </div>
            <div class="rc-veh-installment__stat">
              <span class="rc-veh-installment__stat-label">Aylık Ödeme</span>
              <span class="rc-veh-installment__stat-value">
                {{ formatCurrency(installment.monthlyPayment, installment.monthlyPaymentCurrency) }}
              </span>
            </div>
            <div class="rc-veh-installment__stat">
              <span class="rc-veh-installment__stat-label">Ödenen Taksit</span>
              <span class="rc-veh-installment__stat-value">{{ remainingDisplay }}</span>
            </div>
            <div class="rc-veh-installment__stat">
              <span class="rc-veh-installment__stat-label">Kalan Bakiye</span>
              <span class="rc-veh-installment__stat-value">
                {{
                  formatCurrency(
                    installment.outstandingBalance,
                    installment.outstandingCurrency
                  )
                }}
              </span>
            </div>
            <div class="rc-veh-installment__stat">
              <span class="rc-veh-installment__stat-label">Başlangıç</span>
              <span class="rc-veh-installment__stat-value">
                {{ new Date(installment.startDate).toLocaleDateString('tr-TR') }}
              </span>
            </div>
            <div class="rc-veh-installment__stat">
              <span class="rc-veh-installment__stat-label">Bitiş</span>
              <span class="rc-veh-installment__stat-value">
                {{ new Date(installment.endDate).toLocaleDateString('tr-TR') }}
              </span>
            </div>
            <div
              v-if="installment.earlyClosedAt"
              class="rc-veh-installment__stat rc-veh-installment__stat--highlight"
            >
              <span class="rc-veh-installment__stat-label">Erken Kapatma</span>
              <span class="rc-veh-installment__stat-value">
                {{ new Date(installment.earlyClosedAt).toLocaleDateString('tr-TR') }}
              </span>
            </div>
            <div class="rc-veh-installment__stat rc-veh-installment__stat--highlight">
              <span class="rc-veh-installment__stat-label">Sonraki Ödeme</span>
              <span class="rc-veh-installment__stat-value">{{ nextPaymentDisplay }}</span>
            </div>
          </div>

          <div class="rc-veh-installment__progress">
            <div
              class="rc-veh-installment__progress-fill"
              :style="{ width: `${progress}%` }"
            />
          </div>
          <p class="rc-veh-installment__progress-text">
            {{ paidCount }} / {{ installment.numberOfInstallments }} ödeme tamamlandı (%{{
              progress
            }})
          </p>
        </div>
      </div>

      <div class="rc-card">
        <div class="rc-card__body">
          <div class="rc-veh-installment__head">
            <h3>Ödeme Planı</h3>
          </div>
          <PaymentScheduleTable
            :payments="payments"
            :installment="installment"
            @payment-recorded="loadDetails"
          />
        </div>
      </div>
    </template>

    <RcModal
      :open="showForm"
      title="Taksit Planı Oluştur"
      wide
      @close="showForm = false"
    >
      <InstallmentForm
        :vehicle-id="vehicleId"
        @success="handleFormSuccess"
        @cancel="showForm = false"
      />
    </RcModal>

    <CloseInstallmentEarlyModal
      v-if="installment"
      :installment="installment"
      :visible="showCloseModal"
      @close="showCloseModal = false"
      @success="handleCloseSuccess"
    />
  </div>
</template>
