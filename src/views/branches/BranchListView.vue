<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { branchesApi, vehiclesApi } from '@/api'
import { useToast } from '@/composables'
import { validators, validate, formatPhoneInput } from '@/utils/validation'
import type { Branch } from '@/types'

interface BranchWithCount extends Branch {
  vehicleCount?: number
}

const branches = ref<BranchWithCount[]>([])
const loading = ref(true)
const showForm = ref(false)
const editingBranch = ref<Branch | null>(null)

const toast = useToast()

const formData = ref({
  code: '',
  branchCode: '',
  name: '',
  address: '',
  city: '',
  phone: '',
  active: true
})

const formErrors = ref<Record<string, string>>({})
const touchedFields = ref<Set<string>>(new Set())

const activeBranches = computed(() => branches.value.filter(b => b.active))
const inactiveBranches = computed(() => branches.value.filter(b => !b.active))

async function fetchBranches() {
  loading.value = true
  try {
    const response = await branchesApi.getAll()
    branches.value = response.content
    
    
    await fetchVehicleCounts()
  } catch {
    toast.error('Şubeler yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

async function fetchVehicleCounts() {
  const promises = branches.value.map(async (branch) => {
    try {
      const response = await vehiclesApi.getByBranch(branch.id)
      branch.vehicleCount = Array.isArray(response) ? response.length : 0
    } catch {
      branch.vehicleCount = 0
    }
  })
  
  await Promise.all(promises)
}

function openCreateForm() {
  editingBranch.value = null
  formData.value = { code: '', branchCode: '', name: '', address: '', city: '', phone: '', active: true }
  formErrors.value = {}
  touchedFields.value = new Set()
  showForm.value = true
}

function openEditForm(branch: Branch) {
  editingBranch.value = branch
  formData.value = {
    code: branch.code,
    branchCode: branch.branchCode ?? '',
    name: branch.name,
    address: branch.address,
    city: branch.city,
    phone: branch.phone,
    active: branch.active
  }
  formErrors.value = {}
  touchedFields.value = new Set()
  showForm.value = true
}

function validateField(field: keyof typeof formData.value) {
  const value = formData.value[field]
  let rules: any[] = []

  switch (field) {
    case 'branchCode':
      rules = [
        validators.required('Şube kodu zorunludur'),
        validators.alphanumeric('Sadece harf ve rakam kullanılabilir'),
        validators.minLength(2, 'En az 2 karakter olmalıdır'),
        validators.maxLength(10, 'En fazla 10 karakter olmalıdır')
      ]
      break
    case 'name':
      rules = [
        validators.required('Şube adı zorunludur'),
        validators.minLength(3, 'En az 3 karakter olmalıdır')
      ]
      break
    case 'address':
      rules = [validators.required('Adres zorunludur')]
      break
    case 'city':
      rules = [validators.required('Şehir zorunludur')]
      break
    case 'phone':
      rules = [
        validators.required('Telefon zorunludur'),
        validators.phone()
      ]
      break
  }

  const result = validate(value, rules)
  if (result.valid) {
    delete formErrors.value[field]
  } else {
    formErrors.value[field] = result.errors[0]
  }
}

function handleBlur(field: keyof typeof formData.value) {
  touchedFields.value.add(field)
  validateField(field)
}

function handlePhoneInput(event: Event) {
  const input = event.target as HTMLInputElement
  const formatted = formatPhoneInput(input.value)
  formData.value.phone = formatted
  if (touchedFields.value.has('phone')) {
    validateField('phone')
  }
}

function validateForm(): boolean {
  const fields: Array<keyof typeof formData.value> = ['branchCode', 'name', 'address', 'city', 'phone']
  fields.forEach(field => {
    touchedFields.value.add(field)
    validateField(field)
  })
  return Object.keys(formErrors.value).length === 0
}

async function handleSubmit() {
  if (!validateForm()) {
    toast.error('Lütfen tüm alanları doğru doldurun')
    return
  }

  try {
    if (editingBranch.value) {
      await branchesApi.update(editingBranch.value.id, formData.value)
      toast.success('Şube güncellendi')
    } else {
      await branchesApi.create(formData.value)
      toast.success('Şube oluşturuldu')
    }
    showForm.value = false
    fetchBranches()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

async function toggleStatus(branch: Branch) {
  try {
    await branchesApi.updateStatus(branch.id, !branch.active)
    toast.success(branch.active ? 'Şube pasifleştirildi' : 'Şube aktifleştirildi')
    fetchBranches()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

onMounted(fetchBranches)
</script>

<template>
  <div class="branches-page">
    <header class="page-header">
      <div class="header-left">
        <h1>Şubeler</h1>
        <span class="count">{{ branches.length }} şube</span>
      </div>
      <button class="btn btn-primary" @click="openCreateForm">
        ➕ Yeni Şube
      </button>
    </header>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <template v-else>
      <div class="branches-grid">
        <div 
          v-for="branch in branches" 
          :key="branch.id"
          :class="['branch-card', { inactive: !branch.active }]"
        >
          <div class="card-header">
            <h3>{{ branch.name }}</h3>
            <span :class="['status-badge', branch.active ? 'active' : 'inactive']">
              {{ branch.active ? 'Aktif' : 'Pasif' }}
            </span>
          </div>
          
          <div class="card-body">
            <div class="info-row">
              <span class="icon">📍</span>
              <span>{{ branch.address }}, {{ branch.city }}</span>
            </div>
            <div class="info-row">
              <span class="icon">📞</span>
              <span>{{ branch.phone }}</span>
            </div>
            <div class="info-row">
              <span class="icon">🚗</span>
              <span>{{ branch.vehicleCount || 0 }} araç</span>
            </div>
          </div>

          <div class="card-footer">
            <button class="btn-action" @click="openEditForm(branch)">
              ✏️ Düzenle
            </button>
            <button 
              :class="['btn-action', branch.active ? 'danger' : 'success']"
              @click="toggleStatus(branch)"
            >
              {{ branch.active ? '⏸️ Pasifleştir' : '▶️ Aktifleştir' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="branches.length === 0" class="empty-state">
        <p>Henüz şube eklenmemiş</p>
      </div>
    </template>

    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal">
        <h2>{{ editingBranch ? 'Şube Düzenle' : 'Yeni Şube' }}</h2>
        
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label>Şube Kodu <span class="required">*</span></label>
            <input 
              v-model="formData.branchCode" 
              type="text" 
              :class="{ 'error': touchedFields.has('branchCode') && formErrors.branchCode }"
              @blur="handleBlur('branchCode')"
              @input="touchedFields.has('branchCode') && validateField('branchCode')"
              placeholder="Örn: IST01"
            />
            <span v-if="touchedFields.has('branchCode') && formErrors.branchCode" class="error-message">
              {{ formErrors.branchCode }}
            </span>
          </div>

          <div class="form-group">
            <label>Şube Adı <span class="required">*</span></label>
            <input 
              v-model="formData.name" 
              type="text" 
              :class="{ 'error': touchedFields.has('name') && formErrors.name }"
              @blur="handleBlur('name')"
              @input="touchedFields.has('name') && validateField('name')"
              placeholder="Örn: İstanbul Merkez"
            />
            <span v-if="touchedFields.has('name') && formErrors.name" class="error-message">
              {{ formErrors.name }}
            </span>
          </div>
          
          <div class="form-group">
            <label>Adres <span class="required">*</span></label>
            <input 
              v-model="formData.address" 
              type="text" 
              :class="{ 'error': touchedFields.has('address') && formErrors.address }"
              @blur="handleBlur('address')"
              @input="touchedFields.has('address') && validateField('address')"
              placeholder="Tam adres"
            />
            <span v-if="touchedFields.has('address') && formErrors.address" class="error-message">
              {{ formErrors.address }}
            </span>
          </div>
          
          <div class="form-group">
            <label>Şehir <span class="required">*</span></label>
            <input 
              v-model="formData.city" 
              type="text" 
              :class="{ 'error': touchedFields.has('city') && formErrors.city }"
              @blur="handleBlur('city')"
              @input="touchedFields.has('city') && validateField('city')"
              placeholder="Örn: İstanbul"
            />
            <span v-if="touchedFields.has('city') && formErrors.city" class="error-message">
              {{ formErrors.city }}
            </span>
          </div>
          
          <div class="form-group">
            <label>Telefon <span class="required">*</span></label>
            <input 
              v-model="formData.phone" 
              type="tel" 
              :class="{ 'error': touchedFields.has('phone') && formErrors.phone }"
              @blur="handleBlur('phone')"
              @input="handlePhoneInput"
              placeholder="(555) 123 45 67"
            />
            <span v-if="touchedFields.has('phone') && formErrors.phone" class="error-message">
              {{ formErrors.phone }}
            </span>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-outline" @click="showForm = false">
              İptal
            </button>
            <button type="submit" class="btn btn-primary">
              {{ editingBranch ? 'Güncelle' : 'Oluştur' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.branches-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 0;
}

.count {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary { background: var(--color-primary); color: white; }
.btn-outline { background: transparent; border: 1px solid var(--color-border); color: var(--color-text); }

.loading,
.empty-state {
  text-align: center;
  padding: 60px;
  color: var(--color-text-secondary);
}

.branches-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.branch-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
}

.branch-card.inactive {
  opacity: 0.7;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
}

.card-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background: var(--color-success-light);
  color: var(--color-success);
}

.status-badge.inactive {
  background: var(--color-bg-secondary);
  color: var(--color-text-muted);
}

.card-body {
  padding: 20px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.info-row:last-child {
  margin-bottom: 0;
}

.icon {
  font-size: 16px;
}

.card-footer {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  background: var(--color-bg-secondary);
}

.btn-action {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  background: var(--color-surface);
  color: var(--color-text);
  transition: all 0.2s;
}

.btn-action:hover {
  background: var(--color-primary-light);
}

.btn-action.danger:hover {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.btn-action.success:hover {
  background: var(--color-success-light);
  color: var(--color-success);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 32px;
  width: 100%;
  max-width: 480px;
}

.modal h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 24px 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--color-text-secondary);
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-group input.error {
  border-color: var(--color-danger);
  background: var(--color-danger-light);
}

.required {
  color: var(--color-danger);
}

.error-message {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-danger);
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 32px;
}

.form-actions .btn {
  flex: 1;
}
</style>
