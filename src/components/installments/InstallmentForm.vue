<script setup lang="ts">
import { ref, computed } from 'vue'
import { useInstallmentStore } from '@/stores/installment.store'
import { validateStartDate, validatePositiveNumber, validateInstallmentCount } from '@/utils/installmentHelpers'
import type { CreateVehicleInstallmentRequest } from '@/types'
import { RcButton } from '@/components/rc'
import DatePicker from '@/components/base/DatePicker.vue'

interface Props {
  vehicleId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  success: []
  cancel: []
}>()

const installmentStore = useInstallmentStore()

const formData = ref<CreateVehicleInstallmentRequest>({
  totalAmount: 0,
  monthlyPayment: 0,
  numberOfInstallments: 1,
  startDate: '',
  notes: ''
})

const errors = ref<Record<string, string>>({})
const submitting = ref(false)
const lastEditedField = ref<'total' | 'monthly'>('monthly')

const calculatedMonthly = computed(() => {
  if (formData.value.numberOfInstallments === 0) return 0
  return formData.value.totalAmount / formData.value.numberOfInstallments
})

const calculatedTotal = computed(() => {
  return formData.value.monthlyPayment * formData.value.numberOfInstallments
})

function validateForm(): boolean {
  errors.value = {}

  if (!validatePositiveNumber(formData.value.totalAmount)) {
    errors.value.totalAmount = 'Toplam tutar pozitif bir sayı olmalıdır'
  }

  if (!validatePositiveNumber(formData.value.monthlyPayment)) {
    errors.value.monthlyPayment = 'Aylık ödeme pozitif bir sayı olmalıdır'
  }

  if (!validateInstallmentCount(formData.value.numberOfInstallments)) {
    errors.value.numberOfInstallments = 'Taksit sayısı en az 1 olmalıdır'
  }

  if (!formData.value.startDate) {
    errors.value.startDate = 'Başlangıç tarihi gereklidir'
  } else if (!validateStartDate(formData.value.startDate)) {
    errors.value.startDate = 'Başlangıç tarihi geçmişte olamaz'
  }

  return Object.keys(errors.value).length === 0
}

async function handleSubmit(): Promise<void> {
  if (!validateForm()) return

  submitting.value = true
  try {
    const result = await installmentStore.createInstallment(props.vehicleId, formData.value)
    if (result) {
      emit('success')
      resetForm()
    }
  } finally {
    submitting.value = false
  }
}

function resetForm(): void {
  formData.value = {
    totalAmount: 0,
    monthlyPayment: 0,
    numberOfInstallments: 1,
    startDate: '',
    notes: ''
  }
  errors.value = {}
  lastEditedField.value = 'monthly'
}

function handleCancel(): void {
  resetForm()
  emit('cancel')
}

function onTotalChange(): void {
  lastEditedField.value = 'total'
  if (formData.value.totalAmount > 0 && formData.value.numberOfInstallments > 0) {
    formData.value.monthlyPayment = Math.round(calculatedMonthly.value * 100) / 100
  }
}

function onMonthlyChange(): void {
  lastEditedField.value = 'monthly'
  if (formData.value.monthlyPayment > 0 && formData.value.numberOfInstallments > 0) {
    formData.value.totalAmount = Math.round(calculatedTotal.value * 100) / 100
  }
}

function onInstallmentCountChange(): void {
  if (formData.value.numberOfInstallments > 0) {
    if (lastEditedField.value === 'total' && formData.value.totalAmount > 0) {
      formData.value.monthlyPayment = Math.round(calculatedMonthly.value * 100) / 100
    } else if (lastEditedField.value === 'monthly' && formData.value.monthlyPayment > 0) {
      formData.value.totalAmount = Math.round(calculatedTotal.value * 100) / 100
    }
  }
}
</script>

<template>
  <div class="rc-veh-modal-form">
    <form @submit.prevent="handleSubmit">
      <div class="form-grid">
        <div class="form-group full-width">
          <label for="totalAmount">
            Toplam Tutar <span style="color: var(--rc-danger-500)">*</span>
          </label>
          <input
            id="totalAmount"
            v-model.number="formData.totalAmount"
            type="number"
            step="0.01"
            min="0"
            :class="{ error: errors.totalAmount }"
            @input="onTotalChange"
            placeholder="Örn: 500000"
          />
          <span v-if="errors.totalAmount" class="error-text">{{ errors.totalAmount }}</span>
        </div>

        <div class="form-group">
          <label for="numberOfInstallments">
            Taksit Sayısı <span style="color: var(--rc-danger-500)">*</span>
          </label>
          <input
            id="numberOfInstallments"
            v-model.number="formData.numberOfInstallments"
            type="number"
            min="1"
            :class="{ error: errors.numberOfInstallments }"
            @input="onInstallmentCountChange"
            placeholder="Örn: 50"
          />
          <span v-if="errors.numberOfInstallments" class="error-text">{{ errors.numberOfInstallments }}</span>
        </div>

        <div class="form-group">
          <label for="monthlyPayment">
            Aylık Ödeme <span style="color: var(--rc-danger-500)">*</span>
          </label>
          <input
            id="monthlyPayment"
            v-model.number="formData.monthlyPayment"
            type="number"
            step="0.01"
            min="0"
            :class="{ error: errors.monthlyPayment }"
            @input="onMonthlyChange"
            placeholder="Örn: 10000"
          />
          <span v-if="errors.monthlyPayment" class="error-text">{{ errors.monthlyPayment }}</span>
          <span
            v-if="lastEditedField === 'total' && formData.monthlyPayment > 0"
            class="error-text"
            style="color: var(--rc-success-600)"
          >
            Otomatik hesaplandı
          </span>
        </div>

        <div class="form-group full-width">
          <DatePicker
            v-model="formData.startDate"
            label="Başlangıç Tarihi *"
            placeholder="Başlangıç tarihi"
            :class="{ 'error': errors.startDate }"
          />
          <span v-if="errors.startDate" class="error-text">{{ errors.startDate }}</span>
        </div>

        <div class="form-group full-width">
          <label for="notes">Notlar</label>
          <textarea
            id="notes"
            v-model="formData.notes"
            rows="3"
            maxlength="1000"
            placeholder="Opsiyonel notlar..."
          />
        </div>
      </div>

      <div class="form-actions">
        <RcButton type="button" variant="secondary" :disabled="submitting" @click="handleCancel">
          İptal
        </RcButton>
        <RcButton type="submit" variant="accent" :disabled="submitting">
          {{ submitting ? 'Oluşturuluyor…' : 'Oluştur' }}
        </RcButton>
      </div>
    </form>
  </div>
</template>
