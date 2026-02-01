<script setup lang="ts">
import { ref } from 'vue'
import { damagesApi } from '@/api'
import { useToast } from '@/composables'
import { DamageType, DamageLocation, DamageSeverity } from '@/types'
import type { CreateDamageReportForm } from '@/types'

const props = defineProps<{
  vehicleId: number
}>()

const emit = defineEmits<{
  close: []
  created: []
}>()

const toast = useToast()
const submitting = ref(false)

const form = ref<CreateDamageReportForm>({
  vehicleId: props.vehicleId,
  reportDate: new Date().toISOString().split('T')[0],
  damageType: DamageType.SCRATCH,
  location: DamageLocation.FRONT_BUMPER,
  severity: DamageSeverity.MINOR,
  description: '',
  estimatedCostAmount: undefined,
  estimatedCostCurrency: 'TRY',
  reportedBy: ''
})

const damageTypes = [
  { value: DamageType.SCRATCH, label: 'Çizik' },
  { value: DamageType.DENT, label: 'Göçük' },
  { value: DamageType.CRACK, label: 'Çatlak' },
  { value: DamageType.BROKEN_GLASS, label: 'Kırık Cam' },
  { value: DamageType.TIRE_DAMAGE, label: 'Lastik Hasarı' },
  { value: DamageType.INTERIOR_DAMAGE, label: 'İç Mekan Hasarı' },
  { value: DamageType.ENGINE_DAMAGE, label: 'Motor Hasarı' },
  { value: DamageType.ELECTRICAL, label: 'Elektrik' },
  { value: DamageType.ACCIDENT, label: 'Kaza' },
  { value: DamageType.OTHER, label: 'Diğer' }
]

const locations = [
  { value: DamageLocation.FRONT_BUMPER, label: 'Ön Tampon' },
  { value: DamageLocation.REAR_BUMPER, label: 'Arka Tampon' },
  { value: DamageLocation.HOOD, label: 'Kaput' },
  { value: DamageLocation.TRUNK, label: 'Bagaj' },
  { value: DamageLocation.ROOF, label: 'Tavan' },
  { value: DamageLocation.FRONT_LEFT_FENDER, label: 'Sol Ön Çamurluk' },
  { value: DamageLocation.FRONT_RIGHT_FENDER, label: 'Sağ Ön Çamurluk' },
  { value: DamageLocation.REAR_LEFT_FENDER, label: 'Sol Arka Çamurluk' },
  { value: DamageLocation.REAR_RIGHT_FENDER, label: 'Sağ Arka Çamurluk' },
  { value: DamageLocation.LEFT_FRONT_DOOR, label: 'Sol Ön Kapı' },
  { value: DamageLocation.LEFT_REAR_DOOR, label: 'Sol Arka Kapı' },
  { value: DamageLocation.RIGHT_FRONT_DOOR, label: 'Sağ Ön Kapı' },
  { value: DamageLocation.RIGHT_REAR_DOOR, label: 'Sağ Arka Kapı' },
  { value: DamageLocation.WINDSHIELD, label: 'Ön Cam' },
  { value: DamageLocation.REAR_WINDOW, label: 'Arka Cam' },
  { value: DamageLocation.LEFT_MIRROR, label: 'Sol Ayna' },
  { value: DamageLocation.RIGHT_MIRROR, label: 'Sağ Ayna' },
  { value: DamageLocation.INTERIOR, label: 'İç Mekan' },
  { value: DamageLocation.WHEEL_FRONT_LEFT, label: 'Sol Ön Tekerlek' },
  { value: DamageLocation.WHEEL_FRONT_RIGHT, label: 'Sağ Ön Tekerlek' },
  { value: DamageLocation.WHEEL_REAR_LEFT, label: 'Sol Arka Tekerlek' },
  { value: DamageLocation.WHEEL_REAR_RIGHT, label: 'Sağ Arka Tekerlek' }
]

const severities = [
  { value: DamageSeverity.MINOR, label: 'Küçük', color: '#FFC107' },
  { value: DamageSeverity.MODERATE, label: 'Orta', color: '#FF9800' },
  { value: DamageSeverity.MAJOR, label: 'Büyük', color: '#F44336' },
  { value: DamageSeverity.CRITICAL, label: 'Kritik', color: '#B71C1C' }
]

async function handleSubmit() {
  if (!form.value.description.trim()) {
    toast.error('Lütfen hasar açıklaması girin')
    return
  }

  submitting.value = true
  try {
    await damagesApi.create(form.value)
    toast.success('Hasar raporu oluşturuldu')
    emit('created')
  } catch (err) {
    toast.apiError(err, 'Hasar raporu oluşturulamadı')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Yeni Hasar Raporu</h2>
        <button class="close-btn" @click="emit('close')">×</button>
      </div>

      <form @submit.prevent="handleSubmit" class="damage-form">
        <div class="form-grid">
          <div class="form-group">
            <label for="damageType">Hasar Tipi *</label>
            <select id="damageType" v-model="form.damageType" required>
              <option v-for="type in damageTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="location">Lokasyon *</label>
            <select id="location" v-model="form.location" required>
              <option v-for="loc in locations" :key="loc.value" :value="loc.value">
                {{ loc.label }}
              </option>
            </select>
          </div>

          <div class="form-group full-width">
            <label>Şiddet *</label>
            <div class="severity-options">
              <label
                v-for="sev in severities"
                :key="sev.value"
                class="severity-option"
                :class="{ selected: form.severity === sev.value }"
              >
                <input
                  type="radio"
                  :value="sev.value"
                  v-model="form.severity"
                  required
                />
                <span class="severity-indicator" :style="{ backgroundColor: sev.color }"></span>
                <span>{{ sev.label }}</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label for="reportDate">Rapor Tarihi *</label>
            <input
              id="reportDate"
              type="date"
              v-model="form.reportDate"
              required
            />
          </div>

          <div class="form-group">
            <label for="reportedBy">Rapor Eden</label>
            <input
              id="reportedBy"
              type="text"
              v-model="form.reportedBy"
              placeholder="İsim"
            />
          </div>

          <div class="form-group">
            <label for="estimatedCost">Tahmini Maliyet</label>
            <input
              id="estimatedCost"
              type="number"
              v-model.number="form.estimatedCostAmount"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>

          <div class="form-group">
            <label for="currency">Para Birimi</label>
            <select id="currency" v-model="form.estimatedCostCurrency">
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div class="form-group full-width">
            <label for="description">Açıklama *</label>
            <textarea
              id="description"
              v-model="form.description"
              rows="4"
              placeholder="Hasar detaylarını yazın..."
              required
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

.damage-form {
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

.severity-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.severity-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.severity-option:hover {
  border-color: var(--color-primary);
}

.severity-option.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.severity-option input[type="radio"] {
  margin: 0;
}

.severity-indicator {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 0 1px var(--color-border);
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
}
</style>
