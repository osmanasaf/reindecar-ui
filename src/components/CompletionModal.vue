<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal completion-modal">
      <div class="modal-header">
        <h2>{{ title }}</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <!-- Cost Section -->
        <div class="section">
          <h3>Maliyet Bilgileri</h3>
          
          <div v-if="estimatedCost" class="form-group">
            <label>Tahmini Maliyet (Başlangıç)</label>
            <input 
              type="text" 
              :value="formatCurrency(estimatedCost)" 
              disabled
              class="readonly"
            />
            <span class="hint">{{ type === 'damage' ? 'Hasar' : 'Bakım' }} oluşturulurken girilen tahmini tutar</span>
          </div>

          <div class="form-group">
            <label>Gerçek Maliyet <span class="required">*</span></label>
            <input 
              v-model.number="form.costAmount" 
              type="number" 
              step="0.01"
              min="0"
              placeholder="Gerçek maliyeti giriniz"
              :class="{ error: errors.costAmount }"
            />
            <span v-if="errors.costAmount" class="error-message">
              {{ errors.costAmount }}
            </span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Para Birimi</label>
              <select v-model="form.costCurrency">
                <option value="TRY">TRY (₺)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            <div class="form-group">
              <label>Tamamlanma Tarihi <span class="required">*</span></label>
              <input 
                v-model="form.completionDate" 
                type="date"
                :max="today"
              />
            </div>
          </div>
        </div>

        <!-- Service Provider Section -->
        <div class="section">
          <h3>Servis Sağlayıcı {{ type === 'maintenance' ? '(Zorunlu)' : '(Opsiyonel)' }}</h3>
          <p class="description">
            {{ type === 'damage' ? 'Onarımı yapan servisi seçerseniz' : 'Bakımı yapan servisi seçin,' }}
            otomatik olarak <strong>borç kaydı</strong> oluşturulur.
          </p>

          <div class="form-group">
            <label>Servis Sağlayıcı {{ type === 'maintenance' ? '*' : '' }}</label>
            <select v-model="form.serviceProviderId" :class="{ error: errors.serviceProviderId }">
              <option :value="null">Seçilmedi</option>
              <option v-for="provider in serviceProviders" :key="provider.id" :value="provider.id">
                {{ provider.name }}
              </option>
            </select>
            <span v-if="errors.serviceProviderId" class="error-message">
              {{ errors.serviceProviderId }}
            </span>
          </div>

          <div class="provider-actions">
            <button type="button" class="btn btn-outline btn-sm" @click="openServiceProviders">
              + Servis Saglayici Ekle / Yonet
            </button>
            <span class="hint">Servis saglayicilar yeni sekmede acilir.</span>
          </div>

          <div v-if="form.serviceProviderId" class="provider-details">
            <div class="form-group">
              <label>Fatura No</label>
              <input v-model="form.invoiceNumber" type="text" placeholder="Fatura numarası" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Fatura Tarihi</label>
                <input v-model="form.invoiceDate" type="date" />
              </div>

              <div class="form-group">
                <label>Ödeme Vadesi</label>
                <input v-model="form.paymentDueDate" type="date" />
              </div>
            </div>
          </div>
        </div>

        <!-- Customer Charge Section (only for damage) -->
        <div v-if="type === 'damage' && hasRental" class="section">
          <h3>Müşteri Faturalandırma</h3>
          
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input 
                v-model="form.chargeCustomer" 
                type="checkbox"
              />
              <span>Müşteriye fatura kes</span>
            </label>
            <span class="hint">
              Müşteriye otomatik <strong>alacak kaydı</strong> oluşturulur
            </span>
          </div>
        </div>

        <!-- Summary Section -->
        <div class="section summary-section">
          <h3>Özet</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="label">{{ type === 'damage' ? 'Onarım' : 'Bakım' }} Maliyeti:</span>
              <strong>{{ formatCurrency(form.costAmount || 0) }}</strong>
            </div>
            <div v-if="form.serviceProviderId" class="summary-item payable">
              <span class="label">📤 Borç Kaydı:</span>
              <strong>{{ selectedProviderName }}</strong>
            </div>
            <div v-if="type === 'damage' && form.chargeCustomer" class="summary-item receivable">
              <span class="label">📥 Alacak Kaydı:</span>
              <strong>Müşteri</strong>
            </div>
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
          :disabled="!isFormValid || processing"
        >
          {{ processing ? 'İşleniyor...' : 'Tamamla' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { CompleteMaintenanceForm, MarkDamageRepairedForm } from '@/types'

interface Props {
  show: boolean
  type: 'damage' | 'maintenance'
  title: string
  estimatedCost?: number
  hasRental?: boolean
  serviceProviders: Array<{ id: number; name: string }>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  submit: [form: MarkDamageRepairedForm | CompleteMaintenanceForm]
}>()
const router = useRouter()

const processing = ref(false)
const errors = ref<Record<string, string>>({})

const form = ref({
  completionDate: new Date().toISOString().split('T')[0],
  costAmount: 0,
  costCurrency: 'TRY',
  serviceProviderId: null as number | null,
  invoiceNumber: '',
  invoiceDate: '',
  paymentDueDate: '',
  chargeCustomer: true
})

const today = computed(() => new Date().toISOString().split('T')[0])

const isFormValid = computed(() => {
  if (!form.value.costAmount || form.value.costAmount <= 0) return false
  if (!form.value.completionDate) return false
  if (props.type === 'maintenance' && !form.value.serviceProviderId) return false
  return true
})

const selectedProviderName = computed(() => {
  const provider = props.serviceProviders.find(p => p.id === form.value.serviceProviderId)
  return provider?.name || ''
})

watch(() => props.show, (show) => {
  if (show) {
    // Reset form
    form.value.completionDate = new Date().toISOString().split('T')[0]
    form.value.costAmount = props.estimatedCost || 0
    form.value.costCurrency = 'TRY'
    form.value.serviceProviderId = null
    form.value.invoiceNumber = ''
    form.value.invoiceDate = ''
    form.value.chargeCustomer = true
    
    // Set default due date (30 days from now)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)
    form.value.paymentDueDate = dueDate.toISOString().split('T')[0]
    
    errors.value = {}
  }
})

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: form.value.costCurrency || 'TRY'
  }).format(amount)
}

function validate(): boolean {
  errors.value = {}
  
  if (!form.value.costAmount || form.value.costAmount <= 0) {
    errors.value.costAmount = 'Maliyet girilmelidir'
  }
  
  if (props.type === 'maintenance' && !form.value.serviceProviderId) {
    errors.value.serviceProviderId = 'Servis sağlayıcı seçilmelidir'
  }
  
  return Object.keys(errors.value).length === 0
}

function handleSubmit() {
  if (!validate()) return
  
  if (props.type === 'damage') {
    const damageForm: MarkDamageRepairedForm = {
      repairedDate: form.value.completionDate,
      repairCostAmount: form.value.costAmount,
      repairCostCurrency: form.value.costCurrency || undefined,
      serviceProviderId: form.value.serviceProviderId || undefined,
      invoiceNumber: form.value.invoiceNumber || undefined,
      invoiceDate: form.value.invoiceDate || undefined,
      paymentDueDate: form.value.paymentDueDate || undefined,
      chargeCustomer: form.value.chargeCustomer
    }
    emit('submit', damageForm)
  } else {
    const maintenanceForm: CompleteMaintenanceForm = {
      completionDate: form.value.completionDate,
      costAmount: form.value.costAmount,
      costCurrency: form.value.costCurrency || undefined,
      serviceProviderId: form.value.serviceProviderId!,
      invoiceNumber: form.value.invoiceNumber || undefined,
      invoiceDate: form.value.invoiceDate || undefined,
      paymentDueDate: form.value.paymentDueDate || undefined
    }
    emit('submit', maintenanceForm)
  }
}

function openServiceProviders() {
  const route = router.resolve({
    name: 'service-providers',
    query: { create: '1' }
  })
  const popup = window.open(route.href, '_blank', 'noopener')
  if (!popup) {
    emit('close')
    router.push({ name: 'service-providers', query: { create: '1' } })
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  background: var(--color-surface);
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
}

.completion-modal {
  max-width: 700px;
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

.section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--color-border);
}

.section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.section h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
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
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
}

.form-group input.readonly {
  background: var(--color-bg-secondary);
  cursor: not-allowed;
  color: var(--color-text-secondary);
}

.form-group input.error,
.form-group select.error {
  border-color: var(--color-danger);
}

.error-message {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-danger);
}

.hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.required {
  color: var(--color-danger);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.provider-details {
  margin-top: 16px;
  padding: 16px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.provider-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: -4px;
  margin-bottom: 12px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

.summary-section {
  background: var(--color-bg-secondary);
  padding: 16px;
  border-radius: 8px;
}

.summary-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: white;
  border-radius: 6px;
}

.summary-item.payable {
  background: #fee;
  border-left: 4px solid var(--color-danger);
}

.summary-item.receivable {
  background: #efe;
  border-left: 4px solid var(--color-success);
}

.summary-item .label {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.summary-item strong {
  font-size: 14px;
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

.btn-sm {
  padding: 8px 12px;
  font-size: 13px;
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

