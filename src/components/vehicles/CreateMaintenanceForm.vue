<script setup lang="ts">
import { ref } from 'vue'
import { maintenancesApi } from '@/api'
import { useToast } from '@/composables'
import { MaintenanceType } from '@/types'
import type { CreateMaintenanceRecordForm } from '@/types'

const props = defineProps<{
  vehicleId: number
}>()

const emit = defineEmits<{
  close: []
  created: []
}>()

const toast = useToast()
const submitting = ref(false)

const form = ref<CreateMaintenanceRecordForm>({
  vehicleId: props.vehicleId,
  maintenanceType: MaintenanceType.SERVICE,
  maintenanceDate: new Date().toISOString().split('T')[0],
  currentKm: 0,
  costAmount: undefined,
  costCurrency: 'TRY',
  serviceProvider: '',
  description: '',
  affectedZones: [],
  partsReplaced: [],
  paintColor: ''
})

const newPart = ref('')

const maintenanceTypes = [
  { value: MaintenanceType.REPAIR, label: 'Tamir' },
  { value: MaintenanceType.PAINT, label: 'Boyama' },
  { value: MaintenanceType.PART_REPLACEMENT, label: 'Parça Değişimi' },
  { value: MaintenanceType.SERVICE, label: 'Servis Bakımı' },
  { value: MaintenanceType.INSPECTION, label: 'Muayene' },
  { value: MaintenanceType.TIRE_CHANGE, label: 'Lastik Değişimi' },
  { value: MaintenanceType.OIL_CHANGE, label: 'Yağ Değişimi' },
  { value: MaintenanceType.FILTER_CHANGE, label: 'Filtre Değişimi' },
  { value: MaintenanceType.BRAKE_SERVICE, label: 'Fren Servisi' },
  { value: MaintenanceType.ELECTRICAL_REPAIR, label: 'Elektrik Tamiri' },
  { value: MaintenanceType.BODY_WORK, label: 'Kaporta İşi' },
  { value: MaintenanceType.OTHER, label: 'Diğer' }
]

const zones = [
  { id: 1, name: 'Sağ Ön Köşe' },
  { id: 2, name: 'Ön Cam' },
  { id: 3, name: 'Kaput' },
  { id: 4, name: 'Sol Ön Köşe' },
  { id: 6, name: 'Sol Kapılar' },
  { id: 7, name: 'Arka Sol Tekerlek' },
  { id: 8, name: 'Bagaj' },
  { id: 9, name: 'Arka Cam' },
  { id: 10, name: 'Sağ Arka Köşe' },
  { id: 12, name: 'Sağ Kapılar' },
  { id: 13, name: 'İç Mekan/Tavan' }
]

function toggleZone(zoneId: number) {
  const index = form.value.affectedZones!.indexOf(zoneId)
  if (index > -1) {
    form.value.affectedZones!.splice(index, 1)
  } else {
    form.value.affectedZones!.push(zoneId)
  }
}

function addPart() {
  if (newPart.value.trim()) {
    form.value.partsReplaced!.push(newPart.value.trim())
    newPart.value = ''
  }
}

function removePart(index: number) {
  form.value.partsReplaced!.splice(index, 1)
}

async function handleSubmit() {
  if (!form.value.currentKm || form.value.currentKm <= 0) {
    toast.error('Lütfen geçerli bir KM değeri girin')
    return
  }

  submitting.value = true
  try {
    await maintenancesApi.create(form.value)
    toast.success('Bakım kaydı oluşturuldu')
    emit('created')
  } catch (err) {
    toast.apiError(err, 'Bakım kaydı oluşturulamadı')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Yeni Bakım Kaydı</h2>
        <button class="close-btn" @click="emit('close')">×</button>
      </div>

      <form @submit.prevent="handleSubmit" class="maintenance-form">
        <div class="form-grid">
          <div class="form-group">
            <label for="maintenanceType">Bakım Tipi *</label>
            <select id="maintenanceType" v-model="form.maintenanceType" required>
              <option v-for="type in maintenanceTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="maintenanceDate">Bakım Tarihi *</label>
            <input
              id="maintenanceDate"
              type="date"
              v-model="form.maintenanceDate"
              required
            />
          </div>

          <div class="form-group">
            <label for="currentKm">Güncel KM *</label>
            <input
              id="currentKm"
              type="number"
              v-model.number="form.currentKm"
              placeholder="50000"
              min="0"
              required
            />
          </div>

          <div class="form-group">
            <label for="serviceProvider">Servis Sağlayıcı</label>
            <input
              id="serviceProvider"
              type="text"
              v-model="form.serviceProvider"
              placeholder="Yetkili servis adı"
            />
          </div>

          <div class="form-group">
            <label for="costAmount">Maliyet</label>
            <input
              id="costAmount"
              type="number"
              v-model.number="form.costAmount"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>

          <div class="form-group">
            <label for="currency">Para Birimi</label>
            <select id="currency" v-model="form.costCurrency">
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div v-if="form.maintenanceType === 'PAINT'" class="form-group full-width">
            <label for="paintColor">Boya Rengi</label>
            <input
              id="paintColor"
              type="text"
              v-model="form.paintColor"
              placeholder="Beyaz, Siyah, vb."
            />
          </div>

          <div class="form-group full-width">
            <label>Etkilenen Bölgeler</label>
            <div class="zone-selector">
              <label
                v-for="zone in zones"
                :key="zone.id"
                class="zone-checkbox"
              >
                <input
                  type="checkbox"
                  :checked="form.affectedZones!.includes(zone.id)"
                  @change="toggleZone(zone.id)"
                />
                <span>{{ zone.name }}</span>
              </label>
            </div>
          </div>

          <div class="form-group full-width">
            <label>Değiştirilen Parçalar</label>
            <div class="parts-manager">
              <div class="parts-input">
                <input
                  v-model="newPart"
                  type="text"
                  placeholder="Parça adı girin"
                  @keyup.enter="addPart"
                />
                <button type="button" class="btn btn-sm btn-outline" @click="addPart">
                  Ekle
                </button>
              </div>
              <div v-if="form.partsReplaced!.length > 0" class="parts-list">
                <div
                  v-for="(part, index) in form.partsReplaced"
                  :key="index"
                  class="part-item"
                >
                  <span>{{ part }}</span>
                  <button
                    type="button"
                    class="btn-remove"
                    @click="removePart(index)"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="form-group full-width">
            <label for="description">Açıklama</label>
            <textarea
              id="description"
              v-model="form.description"
              rows="4"
              placeholder="Bakım detaylarını yazın..."
            ></textarea>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-outline" @click="emit('close')">
            İptal
          </button>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? 'Kaydediliyor...' : 'Kaydet' }}
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
}

.modal-content {
  background: var(--color-surface);
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
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
  border-radius: 4px;
}

.close-btn:hover {
  background: var(--color-bg-secondary);
}

.maintenance-form {
  padding: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-bg-secondary);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.zone-selector {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}

.zone-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
}

.zone-checkbox:hover {
  background: var(--color-surface);
}

.zone-checkbox input[type="checkbox"] {
  margin: 0;
}

.parts-manager {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.parts-input {
  display: flex;
  gap: 8px;
}

.parts-input input {
  flex: 1;
}

.parts-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.part-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--color-primary-light);
  border-radius: 16px;
  font-size: 13px;
}

.btn-remove {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.btn-remove:hover {
  background: rgba(0, 0, 0, 0.1);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 14px;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-outline:hover {
  background: var(--color-bg-secondary);
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .zone-selector {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
