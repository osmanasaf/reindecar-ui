<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { kmPackagesApi } from '@/api/km-packages.api'
import { useToast } from '@/composables'
import { RentalType } from '@/types'
import type { KmPackage, CreateKmPackageForm, UpdateKmPackageForm } from '@/types'
import { RcPageHeader, RcButton, RcEmpty, RcSegTab, RcModal, RcBadge, RcTableSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'

const toast = useToast()

const packages = ref<KmPackage[]>([])
const loading = ref(true)
const activeTab = ref<RentalType | 'ALL'>('ALL')
const showModal = ref(false)
const editingPackage = ref<KmPackage | null>(null)
const saving = ref(false)

const form = ref<CreateKmPackageForm>({
  name: '',
  includedKm: 0,
  extraKmPrice: 0,
  applicableTypes: [],
  unlimited: false,
  categoryId: undefined,
})

const rentalTypes: { value: RentalType; label: string }[] = [
  { value: RentalType.DAILY, label: 'Günlük' },
  { value: RentalType.WEEKLY, label: 'Haftalık' },
  { value: RentalType.MONTHLY, label: 'Aylık' },
  { value: RentalType.LEASING, label: 'Leasing' },
]

const tabs = computed(() => [
  { id: 'ALL', label: 'Tümü', count: packages.value.length },
  ...rentalTypes.map(t => ({
    id: t.value,
    label: t.label,
    count: packages.value.filter(p => p.applicableTypes.includes(t.value)).length,
  })),
])

const filteredPackages = computed(() => {
  if (activeTab.value === 'ALL') return packages.value
  return packages.value.filter(p => p.applicableTypes.includes(activeTab.value as RentalType))
})

const activeCount = computed(() => packages.value.filter(p => p.active).length)

async function fetchPackages() {
  loading.value = true
  try {
    packages.value = await kmPackagesApi.getAll()
  } catch (err) {
    toast.apiError(err, 'KM paketleri yüklenemedi')
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingPackage.value = null
  form.value = {
    name: '',
    includedKm: 0,
    extraKmPrice: 0,
    applicableTypes: [],
    unlimited: false,
    categoryId: undefined,
  }
  showModal.value = true
}

function openEditModal(pkg: KmPackage) {
  editingPackage.value = pkg
  form.value = {
    name: pkg.name,
    includedKm: pkg.includedKm,
    extraKmPrice: pkg.extraKmPrice,
    applicableTypes: [...pkg.applicableTypes],
    unlimited: pkg.unlimited,
    categoryId: pkg.categoryId ?? undefined,
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingPackage.value = null
}

function toggleType(type: RentalType) {
  const idx = form.value.applicableTypes.indexOf(type)
  if (idx >= 0) {
    form.value.applicableTypes.splice(idx, 1)
  } else {
    form.value.applicableTypes.push(type)
  }
}

async function savePackage() {
  if (!form.value.name || form.value.applicableTypes.length === 0) {
    toast.error('Paket adı ve uygulanacak kiralama tipleri zorunludur')
    return
  }

  saving.value = true
  try {
    if (editingPackage.value) {
      const updateForm: UpdateKmPackageForm = {
        name: form.value.name,
        includedKm: form.value.includedKm,
        extraKmPrice: form.value.extraKmPrice,
        applicableTypes: form.value.applicableTypes,
        unlimited: form.value.unlimited,
        categoryId: form.value.categoryId,
      }
      await kmPackagesApi.update(editingPackage.value.id, updateForm)
      toast.success('KM paketi güncellendi')
    } else {
      await kmPackagesApi.create(form.value)
      toast.success('KM paketi oluşturuldu')
    }
    closeModal()
    await fetchPackages()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  } finally {
    saving.value = false
  }
}

async function toggleActive(pkg: KmPackage) {
  try {
    if (pkg.active) {
      await kmPackagesApi.deactivate(pkg.id)
      toast.success('Paket pasife alındı')
    } else {
      await kmPackagesApi.activate(pkg.id)
      toast.success('Paket aktifleştirildi')
    }
    await fetchPackages()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

function formatMoney(amount: number, currency = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount)
}

function rentalTypeLabel(type: RentalType): string {
  return rentalTypes.find(t => t.value === type)?.label ?? type
}

onMounted(fetchPackages)
</script>

<template>
  <div class="rc-page rca-km">
    <RcPageHeader
      title="KM Paketleri"
      subtitle="Kiralama türlerine göre KM paketlerini yönetin"
    >
      <template #actions>
        <RcButton variant="accent" @click="openCreateModal">
          <RcIcon name="plus" :size="14" />
          Yeni paket
        </RcButton>
      </template>
    </RcPageHeader>

    <div class="rca-stats rca-stats--payables">
      <div class="rca-stat">
        <div class="rca-stat__label">Toplam paket</div>
        <div class="rca-stat__value rc-num">{{ packages.length }}</div>
      </div>
      <div class="rca-stat">
        <div class="rca-stat__label">Aktif</div>
        <div class="rca-stat__value rca-stat__value--success rc-num">{{ activeCount }}</div>
      </div>
    </div>

    <div class="rc-segtabs" style="margin-bottom: 14px">
      <RcSegTab
        v-for="tab in tabs"
        :key="tab.id"
        :id="tab.id"
        :active="activeTab"
        :count="tab.count"
        @select="(id) => activeTab = id as RentalType | 'ALL'"
      >
        {{ tab.label }}
      </RcSegTab>
    </div>

    <RcTableSkeleton v-if="loading" :rows="6" :cols="4" />

    <RcEmpty
      v-else-if="filteredPackages.length === 0"
      title="KM paketi yok"
      description="Bu filtre için paket bulunmuyor"
    >
      <template #icon><RcIcon name="bolt" :size="32" /></template>
      <template #action>
        <RcButton variant="accent" @click="openCreateModal">İlk paketi oluştur</RcButton>
      </template>
    </RcEmpty>

    <div v-else class="rca-km-grid">
      <article
        v-for="pkg in filteredPackages"
        :key="pkg.id"
        class="rca-km-card"
        :class="{ 'rca-km-card--inactive': !pkg.active }"
      >
        <div class="rca-km-card__head">
          <h3 class="rca-km-card__title">{{ pkg.name }}</h3>
          <RcBadge :variant="pkg.active ? 'success' : 'default'">
            {{ pkg.active ? 'Aktif' : 'Pasif' }}
          </RcBadge>
        </div>

        <div class="rca-meta-row">
          <span class="rca-meta-row__label">Dahil KM</span>
          <span class="rca-meta-row__value">
            {{ pkg.unlimited ? 'Sınırsız' : `${pkg.includedKm.toLocaleString('tr-TR')} km` }}
          </span>
        </div>
        <div v-if="!pkg.unlimited" class="rca-meta-row">
          <span class="rca-meta-row__label">Aşım ücreti</span>
          <span class="rca-meta-row__value">{{ formatMoney(pkg.extraKmPrice, pkg.currency) }}/km</span>
        </div>
        <div class="rca-meta-row">
          <span class="rca-meta-row__label">Geçerli</span>
          <span class="rca-meta-row__value">
            <span v-for="type in pkg.applicableTypes" :key="type" class="rc-chip" style="margin-left: 4px">
              {{ rentalTypeLabel(type) }}
            </span>
          </span>
        </div>
        <div v-if="pkg.categoryName" class="rca-meta-row">
          <span class="rca-meta-row__label">Kategori</span>
          <span class="rca-meta-row__value">{{ pkg.categoryName }}</span>
        </div>
        <div v-if="pkg.global" class="rca-meta-row">
          <span class="rca-meta-row__value">Tüm kategoriler</span>
        </div>

        <div class="rca-km-card__actions">
          <RcButton variant="secondary" size="sm" @click="openEditModal(pkg)">Düzenle</RcButton>
          <RcButton :variant="pkg.active ? 'ghost' : 'accent'" size="sm" @click="toggleActive(pkg)">
            {{ pkg.active ? 'Pasif yap' : 'Aktif yap' }}
          </RcButton>
        </div>
      </article>
    </div>

    <RcModal
      :open="showModal"
      :title="editingPackage ? 'KM paketi düzenle' : 'Yeni KM paketi'"
      @close="closeModal"
    >
      <div class="rc-form">
        <label class="rc-field">
          <span class="rc-field__label">Paket adı *</span>
          <input v-model="form.name" type="text" class="rc-input" placeholder="Örn: Standart 1000 KM" />
        </label>

        <div class="rc-form__row">
          <label class="rc-field">
            <span class="rc-field__label">Dahil KM</span>
            <input
              v-model.number="form.includedKm"
              type="number"
              min="0"
              class="rc-input"
              :disabled="form.unlimited"
            />
          </label>
          <label class="rc-field">
            <span class="rc-field__label">Aşım ücreti (km)</span>
            <input
              v-model.number="form.extraKmPrice"
              type="number"
              step="0.01"
              min="0"
              class="rc-input"
              :disabled="form.unlimited"
            />
          </label>
        </div>

        <label class="rca-filter-check">
          <input v-model="form.unlimited" type="checkbox" />
          Sınırsız KM
        </label>

        <div class="rc-field">
          <span class="rc-field__label">Uygulanacak kiralama tipleri *</span>
          <div class="rc-filterbar" style="padding: 0; border: none; margin: 0">
            <button
              v-for="type in rentalTypes"
              :key="type.value"
              type="button"
              class="rc-chip"
              :class="{ 'rc-chip--on': form.applicableTypes.includes(type.value) }"
              @click="toggleType(type.value)"
            >
              {{ type.label }}
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <RcButton variant="secondary" @click="closeModal">İptal</RcButton>
        <RcButton variant="accent" :disabled="saving" @click="savePackage">
          {{ saving ? 'Kaydediliyor…' : (editingPackage ? 'Güncelle' : 'Oluştur') }}
        </RcButton>
      </template>
    </RcModal>
  </div>
</template>

<style scoped>
.rc-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rc-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 640px) {
  .rc-form__row {
    grid-template-columns: 1fr;
  }
}
</style>
