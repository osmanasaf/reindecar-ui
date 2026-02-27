<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { penaltiesApi, rentalsApi, vehiclesApi, customersApi } from '@/api'
import { useToast, useEnumTranslations } from '@/composables'
import { SearchableSelect } from '@/components/common'
import type { Rental, Vehicle, Customer, RentalDriver, ViolationType } from '@/types'

interface Props {
  show: boolean
  rentalId?: number
  vehicleId?: number
  customerId?: number
  driverId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const toast = useToast()
const { violationTypes } = useEnumTranslations()

const isSubmitting = ref(false)
const rentals = ref<Rental[]>([])
const vehicles = ref<Vehicle[]>([])
const customers = ref<Customer[]>([])
const drivers = ref<RentalDriver[]>([])
const loadingRentals = ref(false)
const loadingVehicles = ref(false)

const selectedRentalId = ref<number | undefined>(props.rentalId)
const selectedVehicleId = ref<number | undefined>(props.vehicleId)
const selectedCustomerId = ref<number | undefined>(props.customerId)
const selectedDriverId = ref<number | undefined>(props.driverId)

const violationType = ref<string>('SPEED')
const violationDate = ref('')
const violationLocation = ref('')
const penaltyAmount = ref<number>(0)
const dueDate = ref('')
const ticketNumber = ref('')
const description = ref('')
const notes = ref('')

const isRentalLocked = computed(() => !!props.rentalId)

const rentalOptions = computed(() =>
  rentals.value.map(r => ({
    value: r.id as number,
    label: `${r.rentalNumber} - ${r.customerName || 'Müşteri'} (${r.vehiclePlate || 'Araç'}) [${r.status}]`
  }))
)

const driverOptions = computed(() =>
  drivers.value.map(d => ({
    value: d.driverId as number,
    label: `${d.driverName}${d.primary ? ' (Ana Sürücü)' : ''}`
  }))
)

const violationTypeOptions = computed(() =>
  Object.entries(violationTypes.value).map(([value, label]) => ({ value, label: label as string }))
)

const selectedRental = computed(() =>
  rentals.value.find(r => r.id === selectedRentalId.value)
)

const selectedVehicleDisplay = computed(() => {
  if (!selectedVehicleId.value) return ''
  const v = vehicles.value.find(v => v.id === selectedVehicleId.value)
  return v ? `${v.plateNumber} - ${v.brand} ${v.model}` : ''
})

const selectedCustomerDisplay = computed(() => {
  if (!selectedCustomerId.value) return ''
  const c = customers.value.find(c => c.id === selectedCustomerId.value)
  return c?.displayName || ''
})

watch(selectedRentalId, async (rentalId) => {
  if (!rentalId) {
    if (!isRentalLocked.value) {
      selectedVehicleId.value = undefined
      selectedCustomerId.value = undefined
      selectedDriverId.value = undefined
      drivers.value = []
    }
    return
  }

  const rental = rentals.value.find(r => r.id === rentalId)
  if (rental) {
    selectedVehicleId.value = rental.vehicleId
    selectedCustomerId.value = rental.customerId

    if (!vehicles.value.some(v => v.id === rental.vehicleId)) {
      try {
        const v = await vehiclesApi.getById(rental.vehicleId)
        vehicles.value.push(v)
      } catch { /* ignore */ }
    }
    if (!customers.value.some(c => c.id === rental.customerId)) {
      try {
        const c = await customersApi.getById(rental.customerId)
        customers.value.push(c)
      } catch { /* ignore */ }
    }

    try {
      drivers.value = await rentalsApi.getDrivers(rentalId)
      if (drivers.value.length > 0) {
        const primary = drivers.value.find(d => d.primary)
        selectedDriverId.value = primary?.driverId || drivers.value[0].driverId
      }
    } catch {
      drivers.value = []
    }
  }
})

async function loadRentals() {
  loadingRentals.value = true
  try {
    const response = await rentalsApi.getAll({ size: 200 })
    rentals.value = response.content.filter(r =>
      r.status === 'ACTIVE' || r.status === 'OVERDUE' || r.status === 'RETURN_PENDING' || r.status === 'RESERVED'
    )
  } catch {
    rentals.value = []
  } finally {
    loadingRentals.value = false
  }
}

async function loadInitialData() {
  if (props.vehicleId && !vehicles.value.some(v => v.id === props.vehicleId)) {
    try {
      const v = await vehiclesApi.getById(props.vehicleId)
      vehicles.value.push(v)
    } catch { /* ignore */ }
  }
  if (props.customerId && !customers.value.some(c => c.id === props.customerId)) {
    try {
      const c = await customersApi.getById(props.customerId)
      customers.value.push(c)
    } catch { /* ignore */ }
  }
}

function validate(): boolean {
  if (!selectedRentalId.value) {
    toast.error('Lütfen bir kiralama seçin')
    return false
  }
  if (!violationType.value) {
    toast.error('İhlal türü seçilmelidir')
    return false
  }
  if (!violationDate.value) {
    toast.error('İhlal tarihi zorunludur')
    return false
  }
  if (!penaltyAmount.value || penaltyAmount.value <= 0) {
    toast.error('Ceza tutarı 0\'dan büyük olmalıdır')
    return false
  }
  return true
}

async function handleSubmit() {
  if (!validate()) return

  isSubmitting.value = true
  try {
    await penaltiesApi.create({
      rentalId: selectedRentalId.value!,
      vehicleId: selectedVehicleId.value!,
      customerId: selectedCustomerId.value!,
      driverId: selectedDriverId.value,
      violationType: violationType.value as ViolationType,
      violationDate: violationDate.value,
      violationLocation: violationLocation.value || undefined,
      penaltyAmount: penaltyAmount.value,
      dueDate: dueDate.value || undefined,
      ticketNumber: ticketNumber.value || undefined,
      description: description.value || undefined,
      notes: notes.value || undefined,
    })
    toast.success('Trafik cezası başarıyla oluşturuldu')
    emit('success')
    emit('close')
    resetForm()
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Ceza oluşturulurken hata oluştu'
    toast.error(msg)
  } finally {
    isSubmitting.value = false
  }
}

function resetForm() {
  violationType.value = 'SPEED'
  violationDate.value = ''
  violationLocation.value = ''
  penaltyAmount.value = 0
  dueDate.value = ''
  ticketNumber.value = ''
  description.value = ''
  notes.value = ''
  if (!isRentalLocked.value) {
    selectedRentalId.value = undefined
    selectedVehicleId.value = undefined
    selectedCustomerId.value = undefined
    selectedDriverId.value = undefined
    drivers.value = []
  }
}

function handleClose() {
  resetForm()
  emit('close')
}

watch(() => props.show, async (newVal) => {
  if (newVal) {
    selectedRentalId.value = props.rentalId
    selectedVehicleId.value = props.vehicleId
    selectedCustomerId.value = props.customerId
    selectedDriverId.value = props.driverId
    await loadRentals()
    await loadInitialData()
  }
})
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Yeni Trafik Cezası</h2>
        <button class="close-btn" @click="handleClose">&times;</button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="modal-body">
          <div class="form-group full-width">
            <label class="form-label">
              Kiralama <span class="required">*</span>
            </label>
            <SearchableSelect
              v-if="!isRentalLocked"
              :model-value="selectedRentalId ?? null"
              :options="rentalOptions"
              placeholder="Kiralama seçin..."
              search-placeholder="Kiralama ara..."
              clearable
              :loading="loadingRentals"
              @update:model-value="(v) => selectedRentalId = v ?? undefined"
            />
            <div v-else class="locked-field">
              {{ selectedRental?.rentalNumber || `Kiralama #${selectedRentalId}` }}
            </div>
            <div v-if="loadingRentals" class="field-hint">Kiralamalar yükleniyor...</div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Araç</label>
              <div class="locked-field">
                {{ selectedVehicleDisplay || 'Kiralama seçildiğinde otomatik dolar' }}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Müşteri</label>
              <div class="locked-field">
                {{ selectedCustomerDisplay || 'Kiralama seçildiğinde otomatik dolar' }}
              </div>
            </div>
          </div>

          <div v-if="drivers.length > 0" class="form-group full-width">
            <label class="form-label">Sürücü</label>
            <SearchableSelect
              :model-value="selectedDriverId ?? null"
              :options="driverOptions"
              placeholder="Sürücü seçin (opsiyonel)"
              search-placeholder="Sürücü ara..."
              clearable
              @update:model-value="(v) => selectedDriverId = v ?? undefined"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">
                İhlal Türü <span class="required">*</span>
              </label>
              <SearchableSelect
                v-model="violationType"
                :options="violationTypeOptions"
                placeholder="Seçiniz"
                search-placeholder="İhlal türü ara..."
              />
            </div>

            <div class="form-group">
              <label class="form-label">
                İhlal Tarihi <span class="required">*</span>
              </label>
              <input
                v-model="violationDate"
                type="date"
                class="form-input"
                :max="new Date().toISOString().split('T')[0]"
              />
            </div>
          </div>

          <div class="form-group full-width">
            <label class="form-label">İhlal Yeri</label>
            <input
              v-model="violationLocation"
              type="text"
              class="form-input"
              maxlength="200"
              placeholder="İhlal yapılan yer"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">
                Ceza Tutarı (TL) <span class="required">*</span>
              </label>
              <input
                v-model.number="penaltyAmount"
                type="number"
                step="0.01"
                class="form-input"
                placeholder="0.00"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Ödeme Vadesi</label>
              <input
                v-model="dueDate"
                type="date"
                class="form-input"
              />
            </div>
          </div>

          <div class="form-group full-width">
            <label class="form-label">Ceza Makbuzu No</label>
            <input
              v-model="ticketNumber"
              type="text"
              class="form-input"
              maxlength="50"
              placeholder="Makbuz numarası"
            />
          </div>

          <div class="form-group full-width">
            <label class="form-label">Açıklama</label>
            <textarea
              v-model="description"
              class="form-input"
              rows="3"
              maxlength="1000"
              placeholder="İhlal detayları..."
            ></textarea>
          </div>

          <div class="form-group full-width">
            <label class="form-label">Notlar</label>
            <textarea
              v-model="notes"
              class="form-input"
              rows="2"
              maxlength="500"
              placeholder="Ek notlar..."
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="handleClose">
            İptal
          </button>
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting || !selectedRentalId">
            {{ isSubmitting ? 'Kaydediliyor...' : 'Kaydet' }}
          </button>
        </div>
      </form>
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
  padding: 1rem;
}

.modal-content {
  background: var(--color-surface, white);
  border-radius: 12px;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--color-text-secondary, #6b7280);
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
}

.close-btn:hover {
  background: var(--color-bg-secondary, #f3f4f6);
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.required {
  color: #dc2626;
}

.form-input {
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: var(--color-bg-secondary, #f9fafb);
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary, #2563eb);
  background: var(--color-surface, white);
}

textarea.form-input {
  resize: vertical;
  min-height: 4rem;
}

.locked-field {
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: var(--color-bg-secondary, #f3f4f6);
  color: var(--color-text-secondary, #6b7280);
  min-height: 38px;
  display: flex;
  align-items: center;
}

.field-hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #9ca3af);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-surface, white);
  border: 1px solid var(--color-border, #d1d5db);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-bg-secondary, #f3f4f6);
}

.btn-primary {
  background: var(--color-primary, #2563eb);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark, #1d4ed8);
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
