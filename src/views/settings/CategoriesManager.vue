<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { vehicleCategoriesApi, referenceDataApi } from '@/api'
import { useToast } from '@/composables'
import { AccountingConfirmModal } from '@/components/accounting'
import { SearchableSelect } from '@/components/common'
import { RcButton, RcField, RcModal, RcEmpty, RcTableSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { VehicleCategory, LicenseClass } from '@/types'

const toast = useToast()
const categories = ref<VehicleCategory[]>([])
const loading = ref(true)
const showInactive = ref(false)

const licenseClasses = ref<LicenseClass[]>([])

const licenseClassOptions = computed(() =>
  licenseClasses.value
    .filter((lc) => lc.active !== false)
    .map((lc) => ({ value: lc.id, label: lc.description ? `${lc.code} — ${lc.description}` : lc.code })),
)

function licenseClassCode(id: number | undefined): string | null {
  if (id == null) return null
  return licenseClasses.value.find((lc) => lc.id === id)?.code ?? null
}

const showModal = ref(false)
const editingCategory = ref<VehicleCategory | null>(null)
const form = ref({
  code: '',
  name: '',
  description: '',
  defaultDailyPrice: 0,
  requiredLicenseClassId: undefined as number | undefined,
  sortOrder: 0,
})
const saving = ref(false)

const deactivateTarget = ref<VehicleCategory | null>(null)

async function fetchLicenseClasses() {
  try {
    licenseClasses.value = await referenceDataApi.getLicenseClassesAll()
  } catch {
    licenseClasses.value = []
  }
}

async function fetchCategories() {
  loading.value = true
  try {
    categories.value = showInactive.value
      ? await vehicleCategoriesApi.getAllAll()
      : await vehicleCategoriesApi.getAll()
  } catch {
    toast.error('Kategoriler yüklenemedi')
  } finally {
    loading.value = false
  }
}

async function handleToggleShowInactive() {
  showInactive.value = !showInactive.value
  await fetchCategories()
}

async function doActivate(category: VehicleCategory) {
  try {
    await vehicleCategoriesApi.activate(category.id)
    toast.success(`"${category.name}" tekrar aktif edildi`)
    await fetchCategories()
  } catch (err) {
    toast.apiError(err, 'Aktif edilemedi')
  }
}

function openAdd() {
  editingCategory.value = null
  form.value = {
    code: '',
    name: '',
    description: '',
    defaultDailyPrice: 0,
    requiredLicenseClassId: undefined,
    sortOrder: categories.value.length + 1,
  }
  showModal.value = true
}

function openEdit(category: VehicleCategory) {
  editingCategory.value = category
  form.value = {
    code: category.code,
    name: category.name,
    description: category.description ?? '',
    defaultDailyPrice: category.defaultDailyPrice ?? 0,
    requiredLicenseClassId: category.requiredLicenseClassId,
    sortOrder: category.sortOrder,
  }
  showModal.value = true
}

async function save() {
  if (!form.value.name.trim()) {
    toast.error('Kategori adı zorunludur')
    return
  }
  if (!editingCategory.value && !form.value.code.trim()) {
    toast.error('Kategori kodu zorunludur')
    return
  }
  saving.value = true
  try {
    if (editingCategory.value) {
      await vehicleCategoriesApi.update(editingCategory.value.id, {
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        defaultDailyPrice: form.value.defaultDailyPrice || undefined,
        requiredLicenseClassId: form.value.requiredLicenseClassId,
        sortOrder: form.value.sortOrder || undefined,
      })
      toast.success('Kategori güncellendi')
    } else {
      await vehicleCategoriesApi.create({
        code: form.value.code.trim().toUpperCase(),
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        defaultDailyPrice: form.value.defaultDailyPrice || 0,
        requiredLicenseClassId: form.value.requiredLicenseClassId,
        sortOrder: form.value.sortOrder || 0,
      })
      toast.success('Kategori eklendi')
    }
    showModal.value = false
    await fetchCategories()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  } finally {
    saving.value = false
  }
}

function confirmDeactivate(category: VehicleCategory) {
  deactivateTarget.value = category
}

async function doDeactivate() {
  if (!deactivateTarget.value) return
  const { id, name } = deactivateTarget.value
  try {
    await vehicleCategoriesApi.deactivate(id)
    toast.success(`"${name}" pasif yapıldı`)
    await fetchCategories()
    deactivateTarget.value = null
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

onMounted(() => {
  fetchLicenseClasses()
  fetchCategories()
})
</script>

<template>
  <div class="rcs-manager">
    <div class="rcs-manager__head">
      <h3 class="rcs-manager__title">Araç kategorileri</h3>
      <div class="rcs-manager__actions">
        <button
          type="button"
          class="rcs-toggle"
          :aria-pressed="showInactive"
          @click="handleToggleShowInactive"
        >
          <span class="rcs-toggle__track" :class="{ 'rcs-toggle__track--on': showInactive }">
            <span class="rcs-toggle__thumb" />
          </span>
          Pasifleri göster
        </button>
        <RcButton variant="accent" size="sm" @click="openAdd">
          <RcIcon name="plus" :size="14" />
          Yeni kategori
        </RcButton>
      </div>
    </div>

    <RcTableSkeleton v-if="loading" :rows="5" :cols="3" />

    <RcEmpty
      v-else-if="!categories.length"
      title="Henüz kategori yok"
      description="Araç sınıflandırması için kategori ekleyin"
    >
      <template #action>
        <RcButton variant="accent" size="sm" @click="openAdd">İlk kategoriyi ekle</RcButton>
      </template>
    </RcEmpty>

    <div v-else class="rcs-list">
      <div
        v-for="category in categories"
        :key="category.id"
        class="rcs-list__row"
        :class="{ 'rcs-list__row--inactive': category.active === false }"
      >
        <span class="rcs-badge-code">{{ category.code }}</span>
        <div class="rcs-list__main">
          <span class="rcs-list__name">{{ category.name }}</span>
          <span v-if="category.description" class="rcs-list__meta">{{ category.description }}</span>
        </div>
        <span
          v-if="licenseClassCode(category.requiredLicenseClassId)"
          class="rcs-badge-code"
          :title="`Gerekli ehliyet sınıfı: ${licenseClassCode(category.requiredLicenseClassId)}`"
        >
          Ehliyet: {{ licenseClassCode(category.requiredLicenseClassId) }}
        </span>
        <span v-if="category.defaultDailyPrice" class="rcs-price">
          {{ category.defaultDailyPrice.toLocaleString('tr-TR') }} ₺/gün
        </span>
        <span v-if="category.active === false" class="rcs-badge-inactive">Pasif</span>
        <div class="rcs-list__actions">
          <template v-if="category.active !== false">
            <RcButton variant="ghost" size="sm" @click="openEdit(category)">Düzenle</RcButton>
            <RcButton variant="ghost" size="sm" @click="confirmDeactivate(category)">Pasif yap</RcButton>
          </template>
          <RcButton v-else variant="ghost" size="sm" @click="doActivate(category)">Aktif et</RcButton>
        </div>
      </div>
    </div>

    <RcModal
      :open="showModal"
      :title="editingCategory ? 'Kategori düzenle' : 'Yeni kategori'"
      @close="showModal = false"
    >
      <form id="category-form" @submit.prevent="save">
        <RcField v-if="!editingCategory" label="Kod" hint="En fazla 10 karakter, benzersiz olmalı">
          <input
            v-model="form.code"
            type="text"
            class="rc-input"
            required
            placeholder="Örn: ECONOMY"
            maxlength="10"
            style="text-transform: uppercase"
          />
        </RcField>
        <RcField label="Kategori adı">
          <input v-model="form.name" type="text" class="rc-input" required placeholder="Örn: Ekonomi" maxlength="100" />
        </RcField>
        <RcField label="Açıklama">
          <input v-model="form.description" type="text" class="rc-input" placeholder="Kısa açıklama" maxlength="500" />
        </RcField>
        <RcField
          label="Gerekli ehliyet sınıfı"
          hint="Boş bırakılırsa bu kategorideki araçlar için ehliyet sınıfı şartı aranmaz"
        >
          <SearchableSelect
            :model-value="form.requiredLicenseClassId ?? null"
            :options="licenseClassOptions"
            placeholder="Sınıf seçin (opsiyonel)"
            search-placeholder="Ara..."
            clearable
            @update:model-value="form.requiredLicenseClassId = ($event as number | undefined) ?? undefined"
          />
        </RcField>
        <div class="rcs-modal-grid">
          <RcField label="Varsayılan günlük fiyat (₺)">
            <input v-model.number="form.defaultDailyPrice" type="number" class="rc-input" min="0" step="50" />
          </RcField>
          <RcField label="Sıra">
            <input v-model.number="form.sortOrder" type="number" class="rc-input" min="0" />
          </RcField>
        </div>
      </form>
      <template #footer>
        <RcButton variant="secondary" @click="showModal = false">İptal</RcButton>
        <RcButton variant="primary" type="submit" form="category-form" :disabled="saving">
          {{ saving ? 'Kaydediliyor…' : (editingCategory ? 'Güncelle' : 'Ekle') }}
        </RcButton>
      </template>
    </RcModal>

    <AccountingConfirmModal
      :open="!!deactivateTarget"
      title="Pasif yap"
      :message="deactivateTarget ? `${deactivateTarget.name} kategorisi pasif yapılsın mı? Pasif kategoriler araç formunda görünmez.` : ''"
      confirm-label="Pasif yap"
      @close="deactivateTarget = null"
      @confirm="doDeactivate"
    />
  </div>
</template>
