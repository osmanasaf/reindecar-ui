<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { branchesApi, vehiclesApi } from '@/api'
import { useToast, useReferenceData } from '@/composables'
import { validators, validate, formatPhoneInput } from '@/utils/validation'
import { SearchableSelect } from '@/components/common'
import type { Branch } from '@/types'
import type { District } from '@/types/reference'

interface BranchWithCount extends Branch {
  vehicleCount?: number
}

const branches = ref<BranchWithCount[]>([])
const loading = ref(true)
const showForm = ref(false)
const editingBranch = ref<Branch | null>(null)

const toast = useToast()

const { cities, loadCities, loadDistrictsByCity } = useReferenceData()
const selectedCityId = ref<number | null>(null)
const selectedDistrictId = ref<number | null>(null)
const districts = ref<District[]>([])

const searchQuery = ref('')
const filterStatus = ref<'all' | 'active' | 'inactive'>('all')

const totalBranches = computed(() => branches.value.length)
const activeBranches = computed(() => branches.value.filter(b => b.active).length)
const inactiveBranches = computed(() => branches.value.filter(b => !b.active).length)
const totalVehicles = computed(() => branches.value.reduce((s, b) => s + (b.vehicleCount ?? 0), 0))

const hasFilters = computed(() => !!searchQuery.value.trim() || filterStatus.value !== 'all')

const filteredBranches = computed(() => {
  let result = [...branches.value]
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(b =>
      b.name.toLowerCase().includes(q) ||
      (b.branchCode ?? b.code ?? '').toLowerCase().includes(q) ||
      (b.city ?? '').toLowerCase().includes(q)
    )
  }
  if (filterStatus.value === 'active') result = result.filter(b => b.active)
  if (filterStatus.value === 'inactive') result = result.filter(b => !b.active)
  return result
})

const cityOptions = computed(() =>
  cities.value.map(c => ({ value: c.id as number, label: c.name }))
)
const districtOptions = computed(() =>
  districts.value.map(d => ({ value: d.id as number, label: d.name }))
)

watch(selectedCityId, async (cityId) => {
  if (!cityId) {
    districts.value = []
    selectedDistrictId.value = null
    formData.value.city = ''
    formData.value.district = ''
    return
  }
  const c = cities.value.find(x => x.id === cityId)
  formData.value.city = c ? c.name : ''
  formData.value.district = ''
  selectedDistrictId.value = null
  districts.value = await loadDistrictsByCity(cityId)
})

watch(selectedDistrictId, (districtId) => {
  if (!districtId) {
    formData.value.district = ''
    return
  }
  const d = districts.value.find(x => x.id === districtId)
  formData.value.district = d ? d.name : ''
})

const formData = ref({
  code: '',
  branchCode: '',
  name: '',
  address: '',
  city: '',
  district: '',
  phone: '',
  active: true
})

const formErrors = ref<Record<string, string>>({})
const touchedFields = ref<Set<string>>(new Set())

async function fetchBranches() {
  loading.value = true
  try {
    const response = await branchesApi.getAll()
    const content = Array.isArray(response?.content) ? response.content : []
    branches.value = content.map(branch => ({
      ...branch,
      branchCode: branch.branchCode ?? branch.code ?? '',
      address: branch.address ?? '',
      city: branch.city ?? '',
      phone: typeof branch.phone === 'string' ? formatPhoneInput(branch.phone) : ''
    }))
    await fetchVehicleCounts()
  } catch {
    toast.error('Şubeler yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

async function fetchVehicleCounts() {
  const promises = branches.value.map(async (branch) => {
    if (typeof branch.vehicleCount === 'number') return
    try {
      const response = await vehiclesApi.getByBranch(branch.id)
      if (Array.isArray(response)) {
        branch.vehicleCount = response.length
        return
      }
      if (response && typeof response === 'object' && 'content' in response) {
        const paginated = response as { content?: unknown; totalElements?: unknown }
        if (Array.isArray(paginated.content)) {
          branch.vehicleCount = paginated.content.length
          return
        }
        if (typeof paginated.totalElements === 'number') {
          branch.vehicleCount = paginated.totalElements
          return
        }
      }
      branch.vehicleCount = 0
    } catch {
      branch.vehicleCount = 0
    }
  })
  await Promise.all(promises)
}

async function openCreateForm() {
  editingBranch.value = null
  await loadCities()
  formData.value = { code: '', branchCode: '', name: '', address: '', city: '', district: '', phone: '', active: true }
  selectedCityId.value = null
  selectedDistrictId.value = null
  districts.value = []
  formErrors.value = {}
  touchedFields.value = new Set()
  showForm.value = true
}

async function openEditForm(branch: Branch) {
  editingBranch.value = branch
  await loadCities()
  const cityMatch = cities.value.find(c => c.name === (branch.city ?? ''))
  if (cityMatch) {
    selectedCityId.value = cityMatch.id
    const distList = await loadDistrictsByCity(cityMatch.id)
    districts.value = distList
    const districtMatch = distList.find(d => d.name === (branch.district ?? ''))
    if (districtMatch) selectedDistrictId.value = districtMatch.id
  } else {
    selectedCityId.value = null
    selectedDistrictId.value = null
    districts.value = []
  }
  formData.value = {
    code: branch.code,
    branchCode: branch.branchCode ?? branch.code ?? '',
    name: branch.name,
    address: branch.address ?? '',
    city: branch.city ?? '',
    district: branch.district ?? '',
    phone: branch.phone ?? '',
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
    formErrors.value[field] = result.errors[0] ?? 'Geçersiz değer'
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

  const normalizedCode = formData.value.branchCode.trim()
  const payload = {
    ...formData.value,
    code: normalizedCode,
    branchCode: normalizedCode
  }

  try {
    if (editingBranch.value) {
      await branchesApi.update(editingBranch.value.id, payload)
      toast.success('Şube güncellendi')
    } else {
      await branchesApi.create(payload)
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

function clearFilters() {
  searchQuery.value = ''
  filterStatus.value = 'all'
}

function branchLocation(branch: BranchWithCount): string {
  const parts = [branch.address]
  if (branch.district) parts.push(branch.district)
  if (branch.city) parts.push(branch.city)
  return parts.filter(Boolean).join(', ')
}

onMounted(fetchBranches)
</script>

<template>
  <div class="branches-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Şubeler</h1>
        <p class="page-subtitle">Kiralama noktaları ve şube yönetimi</p>
      </div>
      <button class="btn btn-primary" @click="openCreateForm">
        + Yeni Şube
      </button>
    </header>

    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <span>Yükleniyor...</span>
    </div>

    <template v-else>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon stat-icon-blue">🏢</div>
          <div class="stat-body">
            <div class="stat-value">{{ totalBranches }}</div>
            <div class="stat-label">Toplam Şube</div>
          </div>
        </div>
        <div class="stat-card stat-card--active">
          <div class="stat-icon stat-icon-green">✓</div>
          <div class="stat-body">
            <div class="stat-value text-green">{{ activeBranches }}</div>
            <div class="stat-label">Aktif</div>
          </div>
        </div>
        <div class="stat-card stat-card--inactive">
          <div class="stat-icon stat-icon-gray">—</div>
          <div class="stat-body">
            <div class="stat-value text-gray">{{ inactiveBranches }}</div>
            <div class="stat-label">Pasif</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-purple">🚗</div>
          <div class="stat-body">
            <div class="stat-value">{{ totalVehicles }}</div>
            <div class="stat-label">Toplam Araç</div>
          </div>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Şube adı, kodu veya şehir ara..."
          />
        </div>
        <div class="status-chips">
          <button
            :class="['chip', { active: filterStatus === 'all' }]"
            @click="filterStatus = 'all'"
          >
            Tümü
          </button>
          <button
            :class="['chip', { active: filterStatus === 'active' }]"
            @click="filterStatus = 'active'"
          >
            Aktif
          </button>
          <button
            :class="['chip', { active: filterStatus === 'inactive' }]"
            @click="filterStatus = 'inactive'"
          >
            Pasif
          </button>
        </div>
        <button v-if="hasFilters" class="btn btn-ghost btn-sm" @click="clearFilters">
          Temizle
        </button>
      </div>

      <p v-if="hasFilters && filteredBranches.length > 0" class="result-count">
        {{ filteredBranches.length }} şube listeleniyor
      </p>

      <div v-if="filteredBranches.length === 0" class="empty-state">
        <div v-if="hasFilters">
          <p class="empty-title">Sonuç bulunamadı</p>
          <p class="empty-sub">Arama kriterlerine uygun şube bulunamadı.</p>
          <button class="btn btn-outline" @click="clearFilters">Filtreleri Temizle</button>
        </div>
        <div v-else>
          <p class="empty-title">Henüz şube eklenmemiş</p>
          <p class="empty-sub">İlk şubeyi oluşturmak için aşağıdaki butona tıklayın.</p>
          <button class="btn btn-primary" @click="openCreateForm">İlk Şubeyi Ekle</button>
        </div>
      </div>

      <div v-else class="branches-grid">
        <div
          v-for="branch in filteredBranches"
          :key="branch.id"
          :class="['branch-card', { 'branch-card--inactive': !branch.active }]"
        >
          <div class="card-header">
            <div class="card-header-left">
              <h3 class="branch-name">{{ branch.name }}</h3>
              <span class="branch-code">{{ branch.branchCode || branch.code }}</span>
            </div>
            <span :class="['status-badge', branch.active ? 'status-badge--active' : 'status-badge--inactive']">
              {{ branch.active ? 'Aktif' : 'Pasif' }}
            </span>
          </div>

          <div class="card-body">
            <div class="info-row">
              <span class="info-icon">📍</span>
              <span class="info-text">{{ branchLocation(branch) }}</span>
            </div>
            <div class="info-row">
              <span class="info-icon">📞</span>
              <span class="info-text">{{ branch.phone || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-icon">🚗</span>
              <span class="info-text">{{ branch.vehicleCount ?? 0 }} araç</span>
            </div>
          </div>

          <div class="card-footer">
            <button class="btn-action" @click="openEditForm(branch)">
              Düzenle
            </button>
            <button
              :class="['btn-action', branch.active ? 'btn-action--danger' : 'btn-action--success']"
              @click="toggleStatus(branch)"
            >
              {{ branch.active ? 'Pasifleştir' : 'Aktifleştir' }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingBranch ? 'Şube Düzenle' : 'Yeni Şube' }}</h2>
          <button class="modal-close" @click="showForm = false">✕</button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="form-row">
            <div class="form-group">
              <label for="field-branchCode">Şube Kodu <span class="required">*</span></label>
              <input
                id="field-branchCode"
                v-model="formData.branchCode"
                type="text"
                :class="{ 'input-error': touchedFields.has('branchCode') && formErrors.branchCode }"
                @blur="handleBlur('branchCode')"
                @input="touchedFields.has('branchCode') && validateField('branchCode')"
                placeholder="Örn: IST01"
              />
              <span v-if="touchedFields.has('branchCode') && formErrors.branchCode" class="error-message">
                {{ formErrors.branchCode }}
              </span>
            </div>

            <div class="form-group">
              <label for="field-name">Şube Adı <span class="required">*</span></label>
              <input
                id="field-name"
                v-model="formData.name"
                type="text"
                :class="{ 'input-error': touchedFields.has('name') && formErrors.name }"
                @blur="handleBlur('name')"
                @input="touchedFields.has('name') && validateField('name')"
                placeholder="Örn: İstanbul Merkez"
              />
              <span v-if="touchedFields.has('name') && formErrors.name" class="error-message">
                {{ formErrors.name }}
              </span>
            </div>
          </div>

          <div class="form-group">
            <label for="field-address">Adres <span class="required">*</span></label>
            <input
              id="field-address"
              v-model="formData.address"
              type="text"
              :class="{ 'input-error': touchedFields.has('address') && formErrors.address }"
              @blur="handleBlur('address')"
              @input="touchedFields.has('address') && validateField('address')"
              placeholder="Tam adres"
            />
            <span v-if="touchedFields.has('address') && formErrors.address" class="error-message">
              {{ formErrors.address }}
            </span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="field-city">Şehir <span class="required">*</span></label>
              <SearchableSelect
                v-model="selectedCityId"
                :options="cityOptions"
                placeholder="İl seçin"
                search-placeholder="İl ara..."
                clearable
                :error="!!(touchedFields.has('city') && formErrors.city)"
                @blur="handleBlur('city')"
              />
              <span v-if="touchedFields.has('city') && formErrors.city" class="error-message">
                {{ formErrors.city }}
              </span>
            </div>

            <div class="form-group">
              <label for="field-district">İlçe</label>
              <SearchableSelect
                v-model="selectedDistrictId"
                :options="districtOptions"
                :placeholder="selectedCityId ? 'İlçe seçin (opsiyonel)' : 'Önce il seçin'"
                search-placeholder="İlçe ara..."
                clearable
                :disabled="!selectedCityId"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="field-phone">Telefon <span class="required">*</span></label>
            <input
              id="field-phone"
              v-model="formData.phone"
              type="tel"
              inputmode="numeric"
              maxlength="13"
              :class="{ 'input-error': touchedFields.has('phone') && formErrors.phone }"
              @blur="handleBlur('phone')"
              @input="handlePhoneInput"
              placeholder="555 111 11 11"
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
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--color-text, #111827);
  margin: 0 0 0.375rem 0;
}

.page-subtitle {
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
  font-size: 0.9375rem;
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-card--active { border-left: 3px solid #22c55e; }
.stat-card--inactive { border-left: 3px solid #9ca3af; }

.stat-icon {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  flex-shrink: 0;
}

.stat-icon-blue { background: #eff6ff; }
.stat-icon-green { background: #f0fdf4; }
.stat-icon-gray { background: #f3f4f6; font-weight: 700; color: #6b7280; }
.stat-icon-purple { background: #faf5ff; }

.stat-body { display: flex; flex-direction: column; gap: 0.125rem; }
.stat-value { font-size: 1.5rem; font-weight: 700; color: var(--color-text, #111827); }
.stat-label { font-size: 0.8125rem; color: var(--color-text-secondary, #6b7280); }
.text-green { color: #15803d !important; }
.text-gray { color: #6b7280 !important; }

/* Filter bar */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 0.875rem 1.25rem;
  margin-bottom: 1rem;
}

.search-box { flex: 1; min-width: 220px; }

.search-input {
  width: 100%;
  padding: 0.5rem 0.875rem;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.status-chips {
  display: flex;
  gap: 0.375rem;
}

.chip {
  padding: 0.375rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--color-border, #e5e7eb);
  background: transparent;
  color: var(--color-text-secondary, #6b7280);
  transition: all 0.15s;
}

.chip:hover { background: #f3f4f6; }
.chip.active { background: var(--color-primary, #2563eb); color: white; border-color: var(--color-primary, #2563eb); }

.result-count {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 1rem;
}

/* Loading */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem;
  color: var(--color-text-secondary, #6b7280);
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--color-border, #e5e7eb);
  border-top-color: var(--color-primary, #2563eb);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Empty state */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.empty-title {
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--color-text, #111827);
  margin: 0 0 0.375rem 0;
}

.empty-sub {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  margin: 0 0 1.25rem 0;
}

/* Grid */
.branches-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
}

/* Branch card */
.branch-card {
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
  overflow: hidden;
  transition: all 0.2s;
}

.branch-card:hover {
  box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.08);
}

.branch-card--inactive {
  opacity: 0.75;
  border-left: 3px solid #9ca3af;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.25rem 1.25rem 1rem;
  border-bottom: 1px solid var(--color-border, #f3f4f6);
}

.card-header-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.branch-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text, #111827);
  margin: 0;
}

.branch-code {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary, #2563eb);
  background: #eff6ff;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  letter-spacing: 0.05em;
}

.status-badge {
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  flex-shrink: 0;
}

.status-badge--active {
  background: #dcfce7;
  color: #15803d;
}

.status-badge--inactive {
  background: #f3f4f6;
  color: #6b7280;
}

.card-body {
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
}

.info-icon {
  font-size: 0.9375rem;
  flex-shrink: 0;
  margin-top: 0.0625rem;
}

.info-text {
  line-height: 1.4;
}

.card-footer {
  display: flex;
  gap: 0.5rem;
  padding: 0.875rem 1.25rem;
  background: #f9fafb;
  border-top: 1px solid var(--color-border, #f3f4f6);
}

.btn-action {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  background: white;
  color: var(--color-text, #111827);
  transition: all 0.15s;
}

.btn-action:hover {
  background: #f3f4f6;
}

.btn-action--danger:hover {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fca5a5;
}

.btn-action--success:hover {
  background: #f0fdf4;
  color: #15803d;
  border-color: #86efac;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal {
  background: white;
  border-radius: 1rem;
  padding: 1.75rem;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-text, #111827);
}

.modal-close {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: var(--color-text-secondary, #6b7280);
  padding: 0.25rem;
  border-radius: 0.25rem;
  line-height: 1;
}

.modal-close:hover { color: var(--color-text, #111827); }

/* Form */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  margin-bottom: 1.125rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--color-text, #111827);
}

.form-group input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-group input.input-error {
  border-color: #dc2626;
  background: #fef2f2;
}

.required { color: #dc2626; }

.error-message {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #dc2626;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.form-actions .btn { flex: 1; }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary { background: var(--color-primary, #2563eb); color: white; }
.btn-primary:hover { background: var(--color-primary-dark, #1d4ed8); }
.btn-outline { background: transparent; border: 1px solid var(--color-border, #e5e7eb); color: var(--color-text, #111827); }
.btn-outline:hover { background: #f3f4f6; }
.btn-ghost { background: transparent; border: 1px solid var(--color-border, #e5e7eb); color: var(--color-text-secondary, #6b7280); }
.btn-ghost:hover { background: #f3f4f6; }
.btn-sm { padding: 0.375rem 0.875rem; font-size: 0.8125rem; }

@media (max-width: 640px) {
  .branches-page { padding: 1rem; }
  .page-header { flex-direction: column; gap: 1rem; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .filter-bar { flex-direction: column; align-items: stretch; }
  .branches-grid { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
