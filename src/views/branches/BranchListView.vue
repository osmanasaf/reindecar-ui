<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { branchesApi, vehiclesApi } from '@/api'
import { useToast, useReferenceData } from '@/composables'
import { validators, validate, formatPhoneInput } from '@/utils/validation'
import { SearchableSelect } from '@/components/common'
import BranchesTable from '@/components/branches/BranchesTable.vue'
import { RcPageHeader, RcButton, RcEmpty, RcModal, RcTableSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
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

onMounted(fetchBranches)
</script>

<template>
  <div class="rc-page rca-branches">
    <RcPageHeader
      title="Şubeler"
      subtitle="Kiralama noktaları ve şube yönetimi"
    >
      <template #actions>
        <RcButton variant="accent" @click="openCreateForm">
          <RcIcon name="plus" :size="14" />
          Yeni şube
        </RcButton>
      </template>
    </RcPageHeader>

    <RcTableSkeleton v-if="loading" :rows="8" :cols="5" />

    <template v-else>
      <div class="rca-stats rca-stats--claims">
        <div class="rca-stat">
          <div class="rca-stat__label">Toplam şube</div>
          <div class="rca-stat__value rc-num">{{ totalBranches }}</div>
        </div>
        <div class="rca-stat">
          <div class="rca-stat__label">Aktif</div>
          <div class="rca-stat__value rca-stat__value--success rc-num">{{ activeBranches }}</div>
        </div>
        <div class="rca-stat">
          <div class="rca-stat__label">Pasif</div>
          <div class="rca-stat__value rc-num">{{ inactiveBranches }}</div>
        </div>
        <div class="rca-stat">
          <div class="rca-stat__label">Toplam araç</div>
          <div class="rca-stat__value rc-num">{{ totalVehicles }}</div>
        </div>
      </div>

      <div class="rc-filterbar rcv-filterbar--slim">
        <div class="rc-input-group" style="flex: 1; min-width: 240px">
          <RcIcon name="search" class="rc-icon" :size="16" />
          <input v-model="searchQuery" type="search" placeholder="Şube adı, kodu veya şehir…" />
        </div>
        <button
          type="button"
          class="rc-chip"
          :class="{ 'rc-chip--on': filterStatus === 'all' }"
          @click="filterStatus = 'all'"
        >
          Tümü
        </button>
        <button
          type="button"
          class="rc-chip"
          :class="{ 'rc-chip--on': filterStatus === 'active' }"
          @click="filterStatus = 'active'"
        >
          Aktif
        </button>
        <button
          type="button"
          class="rc-chip"
          :class="{ 'rc-chip--on': filterStatus === 'inactive' }"
          @click="filterStatus = 'inactive'"
        >
          Pasif
        </button>
        <RcButton v-if="hasFilters" variant="ghost" size="sm" @click="clearFilters">Temizle</RcButton>
      </div>

      <RcEmpty
        v-if="filteredBranches.length === 0"
        :title="hasFilters ? 'Sonuç bulunamadı' : 'Şube yok'"
        :description="hasFilters ? 'Filtreleri değiştirmeyi deneyin' : 'İlk şubeyi oluşturarak başlayın'"
      >
        <template #icon><RcIcon name="building" :size="32" /></template>
        <template v-if="!hasFilters" #action>
          <RcButton variant="accent" @click="openCreateForm">İlk şubeyi ekle</RcButton>
        </template>
      </RcEmpty>

      <BranchesTable
        v-else
        :branches="filteredBranches"
        @edit="openEditForm"
        @toggle="toggleStatus"
      />
    </template>

    <RcModal
      :open="showForm"
      :title="editingBranch ? 'Şube düzenle' : 'Yeni şube'"
      wide
      @close="showForm = false"
    >
      <form class="rca-branch-form" @submit.prevent="handleSubmit">
        <div class="rca-branch-form__row">
          <label
            class="rc-field"
            :class="{ 'rc-field--error': touchedFields.has('branchCode') && formErrors.branchCode }"
          >
            <span class="rc-field__label">Şube kodu *</span>
            <input
              id="field-branchCode"
              v-model="formData.branchCode"
              type="text"
              class="rc-input"
              placeholder="Örn: IST01"
              @blur="handleBlur('branchCode')"
              @input="touchedFields.has('branchCode') && validateField('branchCode')"
            />
            <span v-if="touchedFields.has('branchCode') && formErrors.branchCode" class="rc-field__error">
              {{ formErrors.branchCode }}
            </span>
          </label>

          <label
            class="rc-field"
            :class="{ 'rc-field--error': touchedFields.has('name') && formErrors.name }"
          >
            <span class="rc-field__label">Şube adı *</span>
            <input
              id="field-name"
              v-model="formData.name"
              type="text"
              class="rc-input"
              placeholder="Örn: İstanbul Merkez"
              @blur="handleBlur('name')"
              @input="touchedFields.has('name') && validateField('name')"
            />
            <span v-if="touchedFields.has('name') && formErrors.name" class="rc-field__error">
              {{ formErrors.name }}
            </span>
          </label>
        </div>

        <label
          class="rc-field"
          :class="{ 'rc-field--error': touchedFields.has('address') && formErrors.address }"
        >
          <span class="rc-field__label">Adres *</span>
          <input
            id="field-address"
            v-model="formData.address"
            type="text"
            class="rc-input"
            placeholder="Tam adres"
            @blur="handleBlur('address')"
            @input="touchedFields.has('address') && validateField('address')"
          />
          <span v-if="touchedFields.has('address') && formErrors.address" class="rc-field__error">
            {{ formErrors.address }}
          </span>
        </label>

        <div class="rca-branch-form__row">
          <label class="rc-field">
            <span class="rc-field__label">Şehir *</span>
            <SearchableSelect
              v-model="selectedCityId"
              :options="cityOptions"
              placeholder="İl seçin"
              search-placeholder="İl ara..."
              clearable
              :error="!!(touchedFields.has('city') && formErrors.city)"
              @blur="handleBlur('city')"
            />
            <span v-if="touchedFields.has('city') && formErrors.city" class="rc-field__error">
              {{ formErrors.city }}
            </span>
          </label>

          <label class="rc-field">
            <span class="rc-field__label">İlçe</span>
            <SearchableSelect
              v-model="selectedDistrictId"
              :options="districtOptions"
              :placeholder="selectedCityId ? 'İlçe seçin (opsiyonel)' : 'Önce il seçin'"
              search-placeholder="İlçe ara..."
              clearable
              :disabled="!selectedCityId"
            />
          </label>
        </div>

        <label
          class="rc-field"
          :class="{ 'rc-field--error': touchedFields.has('phone') && formErrors.phone }"
        >
          <span class="rc-field__label">Telefon *</span>
          <input
            id="field-phone"
            v-model="formData.phone"
            type="tel"
            inputmode="numeric"
            maxlength="13"
            class="rc-input"
            placeholder="555 111 11 11"
            @blur="handleBlur('phone')"
            @input="handlePhoneInput"
          />
          <span v-if="touchedFields.has('phone') && formErrors.phone" class="rc-field__error">
            {{ formErrors.phone }}
          </span>
        </label>
      </form>

      <template #footer>
        <RcButton variant="secondary" @click="showForm = false">İptal</RcButton>
        <RcButton variant="accent" @click="handleSubmit">
          {{ editingBranch ? 'Güncelle' : 'Oluştur' }}
        </RcButton>
      </template>
    </RcModal>
  </div>
</template>

<style scoped>
.rca-stats--claims {
  grid-template-columns: repeat(4, 1fr);
}

.rca-branch-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rca-branch-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 640px) {
  .rca-stats--claims {
    grid-template-columns: repeat(2, 1fr);
  }

  .rca-branch-form__row {
    grid-template-columns: 1fr;
  }
}
</style>
