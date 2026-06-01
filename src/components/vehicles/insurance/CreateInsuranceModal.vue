<script setup lang="ts">
import { watch, computed, ref } from 'vue'
import { vehicleInsurancesApi } from '@/api'
import { useForm, useToast, useEnumTranslations } from '@/composables'
import { SearchableSelect } from '@/components/common'
import DocumentsSection from '@/components/shared/DocumentsSection.vue'
import DatePicker from '@/components/base/DatePicker.vue'
import { RcModal, RcButton } from '@/components/rc'
import { formatPhoneInput, isValidPhoneNumber, normalizePhoneDigits } from '@/utils/phone'
import { InsuranceType } from '@/types'
import type { CreateVehicleInsuranceRequest } from '@/types'

interface Props {
  show: boolean
  vehicleId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const toast = useToast()
const { insuranceTypes } = useEnumTranslations()
const step = ref<'form' | 'documents'>('form')
const createdInsuranceId = ref<number | null>(null)

const insuranceTypeOptions = computed(() =>
  Object.entries(insuranceTypes).map(([value, label]) => ({ value, label: label as string }))
)

const initialValues: CreateVehicleInsuranceRequest = {
  vehicleId: props.vehicleId,
  insuranceType: InsuranceType.KASKO,
  policyNumber: '',
  company: '',
  startDate: '',
  endDate: '',
  premium: undefined,
  coverage: undefined,
  contactPhone: '',
  notes: ''
}

function validate(
  formValues: CreateVehicleInsuranceRequest
): Partial<Record<keyof CreateVehicleInsuranceRequest, string>> {
  const err: Partial<Record<keyof CreateVehicleInsuranceRequest, string>> = {}
  if (!formValues.insuranceType) err.insuranceType = 'Sigorta türü seçilmelidir'
  if (!formValues.startDate) err.startDate = 'Başlangıç tarihi zorunludur'
  if (!formValues.endDate) {
    err.endDate = 'Bitiş tarihi zorunludur'
  } else if (formValues.startDate && formValues.endDate < formValues.startDate) {
    err.endDate = 'Bitiş tarihi başlangıçtan sonra olmalıdır'
  }
  if (formValues.policyNumber && formValues.policyNumber.length > 50) {
    err.policyNumber = 'Poliçe numarası en fazla 50 karakter olabilir'
  }
  if (formValues.company && formValues.company.length > 100) {
    err.company = 'Şirket adı en fazla 100 karakter olabilir'
  }
  if (formValues.contactPhone && !isValidPhoneNumber(formValues.contactPhone)) {
    err.contactPhone = 'Telefon 10 haneli olmalidir'
  }
  if (formValues.notes && formValues.notes.length > 500) {
    err.notes = 'Notlar en fazla 500 karakter olabilir'
  }
  return err
}

const { values, errors, touched, handleSubmit, validateField, reset, isSubmitting } = useForm({
  initialValues,
  validate,
  async onSubmit(data) {
    try {
      const created = await vehicleInsurancesApi.create({
        ...data,
        contactPhone: data.contactPhone ? normalizePhoneDigits(data.contactPhone) : ''
      })
      toast.success('Sigorta poliçesi başarıyla eklendi')
      createdInsuranceId.value = created.id
      step.value = 'documents'
      reset()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Poliçe oluşturulurken hata oluştu')
      throw err
    }
  }
})

const handleClose = () => {
  reset()
  step.value = 'form'
  createdInsuranceId.value = null
  emit('close')
}

const handleDocumentsDone = () => {
  emit('success')
  handleClose()
}

function handleContactPhoneInput(event: Event) {
  const target = event.target as HTMLInputElement
  values.contactPhone = formatPhoneInput(target.value)
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    values.vehicleId = props.vehicleId
    step.value = 'form'
    createdInsuranceId.value = null
  }
})
</script>

<template>
  <RcModal
    :open="show"
    xl
    wide
    :title="step === 'form' ? 'Yeni Sigorta Poliçesi' : 'Poliçe Belgeleri'"
    @close="handleClose"
  >
    <template v-if="step === 'documents' && createdInsuranceId">
      <DocumentsSection
        reference-type="INSURANCE"
        :reference-id="createdInsuranceId"
        title="Poliçe belgeleri (isteğe bağlı)"
      />
    </template>

    <form v-else id="create-insurance-form" @submit.prevent="handleSubmit" class="rc-veh-modal-form">
      <div class="form-grid">
        <div class="form-group full-width">
          <label>Sigorta Türü <span class="required">*</span></label>
          <SearchableSelect
            v-model="values.insuranceType"
            :options="insuranceTypeOptions"
            placeholder="Seçiniz"
            search-placeholder="Sigorta türü ara..."
            :error="!!(touched.insuranceType && errors.insuranceType)"
            @blur="validateField('insuranceType')"
          />
          <span v-if="touched.insuranceType && errors.insuranceType" class="error-text">
            {{ errors.insuranceType }}
          </span>
        </div>

        <div class="form-group">
          <label>Poliçe Numarası</label>
          <input
            v-model="values.policyNumber"
            type="text"
            :class="{ error: touched.policyNumber && errors.policyNumber }"
            maxlength="50"
            @blur="validateField('policyNumber')"
          />
          <span v-if="touched.policyNumber && errors.policyNumber" class="error-text">
            {{ errors.policyNumber }}
          </span>
        </div>

        <div class="form-group">
          <label>Sigorta Şirketi</label>
          <input
            v-model="values.company"
            type="text"
            :class="{ error: touched.company && errors.company }"
            maxlength="100"
            @blur="validateField('company')"
          />
          <span v-if="touched.company && errors.company" class="error-text">
            {{ errors.company }}
          </span>
        </div>

        <div class="form-group">
          <DatePicker
            v-model="values.startDate"
            label="Başlangıç Tarihi *"
            placeholder="Başlangıç tarihi"
            :class="{ error: touched.startDate && errors.startDate }"
            @closed="validateField('startDate')"
          />
          <span v-if="touched.startDate && errors.startDate" class="error-text">
            {{ errors.startDate }}
          </span>
        </div>

        <div class="form-group">
          <DatePicker
            v-model="values.endDate"
            label="Bitiş Tarihi *"
            placeholder="Bitiş tarihi"
            :class="{ error: touched.endDate && errors.endDate }"
            @closed="validateField('endDate')"
          />
          <span v-if="touched.endDate && errors.endDate" class="error-text">
            {{ errors.endDate }}
          </span>
        </div>

        <div class="form-group">
          <label>Prim Tutarı (TL)</label>
          <input
            v-model.number="values.premium"
            type="number"
            step="0.01"
            placeholder="0.00"
          />
        </div>

        <div class="form-group">
          <label>Teminat Tutarı (TL)</label>
          <input
            v-model.number="values.coverage"
            type="number"
            step="0.01"
            placeholder="0.00"
          />
        </div>

        <div class="form-group full-width">
          <label>İletişim Telefonu</label>
          <input
            v-model="values.contactPhone"
            type="tel"
            inputmode="numeric"
            :class="{ error: touched.contactPhone && errors.contactPhone }"
            maxlength="13"
            placeholder="555 111 11 11"
            @input="handleContactPhoneInput"
            @blur="validateField('contactPhone')"
          />
          <span v-if="touched.contactPhone && errors.contactPhone" class="error-text">
            {{ errors.contactPhone }}
          </span>
        </div>

        <div class="form-group full-width">
          <label>Notlar</label>
          <textarea
            v-model="values.notes"
            :class="{ error: touched.notes && errors.notes }"
            rows="3"
            maxlength="500"
            placeholder="Ek notlar..."
            @blur="validateField('notes')"
          ></textarea>
          <span v-if="touched.notes && errors.notes" class="error-text">
            {{ errors.notes }}
          </span>
        </div>
      </div>
    </form>

    <template #footer>
      <RcButton v-if="step === 'documents'" variant="accent" @click="handleDocumentsDone">
        Tamamla
      </RcButton>
      <template v-else>
        <RcButton variant="ghost" @click="handleClose">İptal</RcButton>
        <RcButton variant="accent" type="submit" form="create-insurance-form" :disabled="isSubmitting">
          {{ isSubmitting ? 'Kaydediliyor...' : 'Kaydet' }}
        </RcButton>
      </template>
    </template>
  </RcModal>
</template>

<style scoped>
.required { color: var(--rc-danger-500); }
.error-text { font-size: 12px; color: var(--rc-danger-600); }
</style>
