<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { customersApi } from '@/api'
import { useValidation, rules, useToast } from '@/composables'
import type { Customer, CreatePersonalCustomerForm } from '@/types'

interface Props {
  visible: boolean
  rentalEndDate: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  created: [customer: Customer]
}>()

const toast = useToast()
const saving = ref(false)

const rentalEndDateRef = computed(() => props.rentalEndDate)

const form = ref({
  firstName: '',
  lastName: '',
  nationalId: '',
  phone: '',
  birthDate: '',
  licenseNumber: '',
  licenseClass: 'B',
  licenseExpiryDate: ''
})

const { validateForm, getError, hasError, touch, reset } = useValidation()

const formRules = computed(() => ({
  firstName: { value: form.value.firstName, rules: [rules.required()] },
  lastName: { value: form.value.lastName, rules: [rules.required()] },
  nationalId: { value: form.value.nationalId, rules: [rules.required(), rules.tckn()] },
  phone: { value: form.value.phone, rules: [rules.required(), rules.phone()] },
  birthDate: { value: form.value.birthDate, rules: [rules.required(), rules.minAge(18)] },
  licenseNumber: { value: form.value.licenseNumber, rules: [rules.required()] },
  licenseClass: { value: form.value.licenseClass, rules: [rules.required()] },
  licenseExpiryDate: { 
    value: form.value.licenseExpiryDate, 
    rules: [
      rules.required(), 
      rules.futureDate(),
      rules.licenseValidFor(rentalEndDateRef, 3)
    ] 
  }
}))

const licenseClassOptions = ['A1', 'A2', 'A', 'B1', 'B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE']

async function handleSubmit() {
  if (!validateForm(formRules.value)) {
    toast.error('Lütfen formdaki hataları düzeltin')
    return
  }

  saving.value = true
  try {
    const payload: CreatePersonalCustomerForm = {
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      nationalId: form.value.nationalId,
      phone: form.value.phone,
      email: '',
      address: '',
      city: '',
      birthDate: form.value.birthDate,
      licenseNumber: form.value.licenseNumber,
      licenseClass: form.value.licenseClass,
      licenseExpiryDate: form.value.licenseExpiryDate
    }

    const customer = await customersApi.createPersonal(payload)
    toast.success('Müşteri başarıyla oluşturuldu')
    emit('created', customer)
    handleClose()
  } catch (err) {
    toast.apiError(err, 'Müşteri oluşturulamadı')
  } finally {
    saving.value = false
  }
}

function handleClose() {
  resetForm()
  emit('close')
}

function resetForm() {
  form.value = {
    firstName: '',
    lastName: '',
    nationalId: '',
    phone: '',
    birthDate: '',
    licenseNumber: '',
    licenseClass: 'B',
    licenseExpiryDate: ''
  }
  reset()
}

function handleBlur(field: string) {
  touch(field)
}

watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    resetForm()
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="handleClose">
      <div class="modal">
        <header class="modal-header">
          <h2>Hızlı Müşteri Ekle</h2>
          <button class="close-btn" @click="handleClose">&times;</button>
        </header>

        <form class="modal-body" @submit.prevent="handleSubmit">
          <p class="form-hint">
            Kiralama için minimum bilgilerle yeni bireysel müşteri ekleyin.
          </p>

          <div class="form-grid">
            <div class="form-group" :class="{ error: hasError('firstName') }">
              <label>Ad <span class="required">*</span></label>
              <input 
                v-model="form.firstName" 
                @blur="handleBlur('firstName')" 
                type="text"
                placeholder="Ad"
              />
              <span class="error-text">{{ getError('firstName') }}</span>
            </div>

            <div class="form-group" :class="{ error: hasError('lastName') }">
              <label>Soyad <span class="required">*</span></label>
              <input 
                v-model="form.lastName" 
                @blur="handleBlur('lastName')" 
                type="text"
                placeholder="Soyad"
              />
              <span class="error-text">{{ getError('lastName') }}</span>
            </div>

            <div class="form-group" :class="{ error: hasError('nationalId') }">
              <label>TC Kimlik No <span class="required">*</span></label>
              <input 
                v-model="form.nationalId" 
                @blur="handleBlur('nationalId')" 
                type="text"
                maxlength="11"
                placeholder="11 haneli TC No"
              />
              <span class="error-text">{{ getError('nationalId') }}</span>
            </div>

            <div class="form-group" :class="{ error: hasError('phone') }">
              <label>Telefon <span class="required">*</span></label>
              <input 
                v-model="form.phone" 
                @blur="handleBlur('phone')" 
                type="tel"
                placeholder="05XX..."
              />
              <span class="error-text">{{ getError('phone') }}</span>
            </div>

            <div class="form-group" :class="{ error: hasError('birthDate') }">
              <label>Doğum Tarihi <span class="required">*</span></label>
              <input 
                v-model="form.birthDate" 
                @blur="handleBlur('birthDate')" 
                type="date"
              />
              <span class="error-text">{{ getError('birthDate') }}</span>
            </div>

            <div class="form-group" :class="{ error: hasError('licenseNumber') }">
              <label>Ehliyet No <span class="required">*</span></label>
              <input 
                v-model="form.licenseNumber" 
                @blur="handleBlur('licenseNumber')" 
                type="text"
              />
              <span class="error-text">{{ getError('licenseNumber') }}</span>
            </div>

            <div class="form-group" :class="{ error: hasError('licenseClass') }">
              <label>Ehliyet Sınıfı <span class="required">*</span></label>
              <select v-model="form.licenseClass" @blur="handleBlur('licenseClass')">
                <option v-for="cls in licenseClassOptions" :key="cls" :value="cls">
                  {{ cls }}
                </option>
              </select>
              <span class="error-text">{{ getError('licenseClass') }}</span>
            </div>

            <div class="form-group" :class="{ error: hasError('licenseExpiryDate') }">
              <label>Ehliyet Geçerlilik <span class="required">*</span></label>
              <input 
                v-model="form.licenseExpiryDate" 
                @blur="handleBlur('licenseExpiryDate')" 
                type="date"
              />
              <span class="error-text">{{ getError('licenseExpiryDate') }}</span>
            </div>
          </div>

          <div v-if="rentalEndDate" class="info-box">
            Kiralama bitiş tarihi: <strong>{{ new Date(rentalEndDate).toLocaleDateString('tr-TR') }}</strong>
            <br>
            Ehliyet en az bu tarihten <strong>3 ay sonrasına</strong> kadar geçerli olmalıdır.
          </div>
        </form>

        <footer class="modal-footer">
          <button type="button" class="btn btn-outline" @click="handleClose">İptal</button>
          <button 
            type="button" 
            class="btn btn-primary" 
            :disabled="saving"
            @click="handleSubmit"
          >
            {{ saving ? 'Kaydediliyor...' : 'Müşteri Oluştur' }}
          </button>
        </footer>
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
  max-width: 540px;
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

.close-btn:hover {
  color: var(--color-text);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.form-hint {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 20px 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
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

.form-group input,
.form-group select {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-bg-secondary);
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus {
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

.info-box {
  margin-top: 20px;
  padding: 12px 16px;
  background: var(--color-info-light);
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-info);
  line-height: 1.5;
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

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-primary:disabled {
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

@media (max-width: 540px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
