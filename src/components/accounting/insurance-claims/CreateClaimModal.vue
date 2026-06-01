<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { vehicleInsurancesApi } from '@/api'
import { ClaimType } from '@/types'
import type { CreateClaimRequest, VehicleInsuranceResponse } from '@/types'
import { useForm, useToast } from '@/composables'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'
import { RcModal, RcButton, RcField } from '@/components/rc'

interface Props {
  show: boolean
  vehicleId: number
  damageReportId: number
  vehicleInsuranceId?: number
  defaultAmount?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  submit: [data: CreateClaimRequest]
}>()

const toast = useToast()

const insurances = ref<VehicleInsuranceResponse[]>([])
const loadingInsurances = ref(false)

const insuranceOptions = computed(() =>
  insurances.value.map(ins => ({
    value: ins.id as number,
    label: ins.coverage
      ? `${ins.company} - ${ins.policyNumber} (Teminat: ${ins.coverage.toLocaleString('tr-TR')} ${ins.coverageCurrency})`
      : `${ins.company} - ${ins.policyNumber}`
  }))
)

const claimTypes: { value: ClaimType; label: string }[] = [
  { value: ClaimType.ACCIDENT, label: 'Kaza' },
  { value: ClaimType.THEFT, label: 'Hırsızlık' },
  { value: ClaimType.NATURAL_DISASTER, label: 'Doğal Afet' },
  { value: ClaimType.VANDALISM, label: 'Vandalizm' },
  { value: ClaimType.GLASS_DAMAGE, label: 'Cam Hasarı' },
  { value: ClaimType.OTHER, label: 'Diğer' }
]

function validate(formValues: CreateClaimRequest): Partial<Record<keyof CreateClaimRequest, string>> {
  const err: Partial<Record<keyof CreateClaimRequest, string>> = {}
  if (!formValues.vehicleInsuranceId) err.vehicleInsuranceId = 'Sigorta poliçesi seçilmelidir'
  if (!formValues.claimType) err.claimType = 'Başvuru türü seçilmelidir'
  if (!formValues.incidentDate) {
    err.incidentDate = 'Olay tarihi zorunludur'
  } else if (new Date(formValues.incidentDate) > new Date()) {
    err.incidentDate = 'Olay tarihi gelecekte olamaz'
  }
  if (!formValues.claimedAmount || formValues.claimedAmount <= 0) {
    err.claimedAmount = 'Talep edilen tutar 0\'dan büyük olmalıdır'
  }
  if (formValues.description && formValues.description.length > 1000) {
    err.description = 'Açıklama 1000 karakterden uzun olamaz'
  }
  if (formValues.notes && formValues.notes.length > 500) {
    err.notes = 'Notlar 500 karakterden uzun olamaz'
  }
  return err
}

const { values, errors, touched, handleSubmit, validateField, reset, isSubmitting } = useForm({
  initialValues: {
    vehicleInsuranceId: props.vehicleInsuranceId || 0,
    damageReportId: props.damageReportId,
    vehicleId: props.vehicleId,
    claimType: ClaimType.ACCIDENT,
    incidentDate: new Date().toISOString().split('T')[0] ?? '',
    description: '',
    claimedAmount: props.defaultAmount || 0,
    notes: ''
  } satisfies CreateClaimRequest,
  validate,
  async onSubmit(data) {
    emit('submit', data)
    reset()
  }
})

const selectedInsurance = computed(() => {
  return insurances.value.find(ins => ins.id === values.vehicleInsuranceId)
})

const loadInsurances = async () => {
  loadingInsurances.value = true
  try {
    const allInsurances = await vehicleInsurancesApi.getByVehicle(props.vehicleId)
    insurances.value = allInsurances.filter(
      ins => ins.insuranceType === 'KASKO' && ins.isValid
    )

    const first = insurances.value[0]
    if (first && !values.vehicleInsuranceId) {
      values.vehicleInsuranceId = first.id
    }
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Sigorta poliçeleri yüklenemedi')
  } finally {
    loadingInsurances.value = false
  }
}

const onSubmit = () => handleSubmit()

const handleClose = () => {
  reset()
  emit('close')
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    values.vehicleId = props.vehicleId
    values.damageReportId = props.damageReportId
    if (props.defaultAmount) {
      values.claimedAmount = props.defaultAmount
    }
    loadInsurances()
  }
})
</script>

<template>
  <RcModal :open="show" title="Kasko başvurusu oluştur" wide @close="handleClose">
    <form id="create-claim-form" @submit.prevent="onSubmit">
      <div class="rca-pay-alert rca-pay-alert--info" style="margin-bottom: 16px">
        Bu hasar için sigorta şirketine tazminat başvurusu yapabilirsiniz.
      </div>

      <div v-if="loadingInsurances" class="rc-field__hint">Poliçeler yükleniyor…</div>

      <div v-else-if="insurances.length === 0" class="rca-pay-alert rca-pay-alert--warn" style="margin-bottom: 16px">
        Bu araç için aktif kasko poliçesi bulunamadı. Lütfen önce bir kasko poliçesi ekleyin.
      </div>

      <template v-else>
        <RcField label="Sigorta poliçesi">
          <SearchableSelect
            :model-value="values.vehicleInsuranceId || null"
            :options="insuranceOptions"
            placeholder="Seçiniz"
            search-placeholder="Poliçe ara…"
            :loading="loadingInsurances"
            :error="!!(touched.vehicleInsuranceId && errors.vehicleInsuranceId)"
            @update:model-value="(v) => values.vehicleInsuranceId = v ?? 0"
            @blur="validateField('vehicleInsuranceId')"
          />
          <span v-if="touched.vehicleInsuranceId && errors.vehicleInsuranceId" class="rc-field__error">
            {{ errors.vehicleInsuranceId }}
          </span>
          <span v-if="selectedInsurance && selectedInsurance.coverage" class="rc-field__hint">
            Teminat: {{ selectedInsurance.coverage.toLocaleString('tr-TR') }} {{ selectedInsurance.coverageCurrency }}
          </span>
        </RcField>

        <RcField label="Başvuru türü">
          <SearchableSelect
            v-model="values.claimType"
            :options="claimTypes"
            placeholder="Seçiniz"
            search-placeholder="Ara…"
            :error="!!(touched.claimType && errors.claimType)"
            @blur="validateField('claimType')"
          />
          <span v-if="touched.claimType && errors.claimType" class="rc-field__error">{{ errors.claimType }}</span>
        </RcField>

        <div class="form-group">
          <DatePicker
            v-model="values.incidentDate"
            label="Olay tarihi *"
            placeholder="Olay tarihi"
            :max="new Date().toISOString().split('T')[0]"
            :class="{ error: touched.incidentDate && errors.incidentDate }"
            @closed="validateField('incidentDate')"
          />
          <span v-if="touched.incidentDate && errors.incidentDate" class="rc-field__error">{{ errors.incidentDate }}</span>
        </div>

        <RcField label="Talep edilen tutar (TL)">
          <input
            v-model.number="values.claimedAmount"
            type="number"
            step="0.01"
            class="rc-input"
            placeholder="0.00"
            @blur="validateField('claimedAmount')"
          />
          <span v-if="touched.claimedAmount && errors.claimedAmount" class="rc-field__error">{{ errors.claimedAmount }}</span>
        </RcField>

        <RcField label="Açıklama">
          <textarea
            v-model="values.description"
            class="rc-input"
            placeholder="Hasar detayları ve olay bilgileri"
            rows="4"
            maxlength="1000"
            style="resize: vertical; min-height: 96px"
            @blur="validateField('description')"
          />
          <span v-if="touched.description && errors.description" class="rc-field__error">{{ errors.description }}</span>
        </RcField>

        <RcField label="Notlar">
          <textarea
            v-model="values.notes"
            class="rc-input"
            placeholder="Ek notlar"
            rows="3"
            maxlength="500"
            style="resize: vertical; min-height: 72px"
            @blur="validateField('notes')"
          />
          <span v-if="touched.notes && errors.notes" class="rc-field__error">{{ errors.notes }}</span>
        </RcField>
      </template>
    </form>
    <template #footer>
      <RcButton variant="secondary" @click="handleClose">İptal</RcButton>
      <RcButton variant="primary" type="submit" form="create-claim-form" :disabled="isSubmitting || insurances.length === 0">
        {{ isSubmitting ? 'Oluşturuluyor…' : 'Başvuru oluştur' }}
      </RcButton>
    </template>
  </RcModal>
</template>
