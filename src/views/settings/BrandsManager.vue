<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { referenceDataApi } from '@/api'
import { useToast } from '@/composables'
import { AccountingConfirmModal } from '@/components/accounting'
import { RcButton, RcField, RcModal, RcEmpty, RcTableSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { CarBrand, CarModel } from '@/types/reference'

const toast = useToast()
const brands = ref<CarBrand[]>([])
const loading = ref(true)
const showInactive = ref(false)
const expandedBrandId = ref<number | null>(null)
const modelsByBrand = ref<Map<number, CarModel[]>>(new Map())
const loadingModels = ref<Set<number>>(new Set())

const showBrandModal = ref(false)
const editingBrand = ref<CarBrand | null>(null)
const brandForm = ref({ name: '', logoUrl: '', sortOrder: 0 })
const brandSaving = ref(false)

const showModelModal = ref(false)
const editingModel = ref<CarModel | null>(null)
const modelForm = ref({ brandId: 0, name: '', sortOrder: 0 })
const modelSaving = ref(false)

const deactivateTarget = ref<{ type: 'brand' | 'model'; id: number; name: string; brandId?: number } | null>(null)

async function fetchBrands() {
  loading.value = true
  try {
    brands.value = showInactive.value
      ? await referenceDataApi.getBrandsAll()
      : await referenceDataApi.getBrands()
  } catch {
    toast.error('Markalar yüklenemedi')
  } finally {
    loading.value = false
  }
}

async function handleToggleShowInactive() {
  showInactive.value = !showInactive.value
  await fetchBrands()
}

async function doActivateBrand(brand: CarBrand) {
  try {
    await referenceDataApi.activateBrand(brand.id)
    toast.success(`"${brand.name}" tekrar aktif edildi`)
    await fetchBrands()
    if (expandedBrandId.value === brand.id) {
      expandedBrandId.value = null
      modelsByBrand.value.delete(brand.id)
    }
  } catch (err) {
    toast.apiError(err, 'Aktif edilemedi')
  }
}

async function loadModels(brandId: number) {
  if (modelsByBrand.value.has(brandId)) return
  loadingModels.value.add(brandId)
  try {
    const list = showInactive.value
      ? await referenceDataApi.getModelsByBrandAll(brandId)
      : await referenceDataApi.getModelsByBrand(brandId)
    modelsByBrand.value.set(brandId, [...list])
  } catch {
    toast.error('Modeller yüklenemedi')
  } finally {
    loadingModels.value.delete(brandId)
  }
}

async function doActivateModel(model: CarModel) {
  try {
    await referenceDataApi.activateModel(model.id)
    toast.success(`"${model.name}" tekrar aktif edildi`)
    modelsByBrand.value.delete(model.brandId)
    await loadModels(model.brandId)
  } catch (err) {
    toast.apiError(err, 'Aktif edilemedi')
  }
}

function toggleBrand(brandId: number) {
  if (expandedBrandId.value === brandId) {
    expandedBrandId.value = null
    return
  }
  expandedBrandId.value = brandId
  loadModels(brandId)
}

function openAddBrand() {
  editingBrand.value = null
  brandForm.value = { name: '', logoUrl: '', sortOrder: brands.value.length + 1 }
  showBrandModal.value = true
}

function openEditBrand(brand: CarBrand) {
  editingBrand.value = brand
  brandForm.value = { name: brand.name, logoUrl: brand.logoUrl ?? '', sortOrder: 0 }
  showBrandModal.value = true
}

async function saveBrand() {
  if (!brandForm.value.name.trim()) {
    toast.error('Marka adı zorunludur')
    return
  }
  brandSaving.value = true
  try {
    if (editingBrand.value) {
      await referenceDataApi.updateBrand(editingBrand.value.id, {
        name: brandForm.value.name.trim(),
        logoUrl: brandForm.value.logoUrl.trim() || undefined,
        sortOrder: brandForm.value.sortOrder || undefined,
      })
      toast.success('Marka güncellendi')
    } else {
      await referenceDataApi.createBrand({
        name: brandForm.value.name.trim(),
        logoUrl: brandForm.value.logoUrl.trim() || undefined,
        sortOrder: brandForm.value.sortOrder || 0,
      })
      toast.success('Marka eklendi')
    }
    showBrandModal.value = false
    await fetchBrands()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  } finally {
    brandSaving.value = false
  }
}

function openAddModel(brand: CarBrand) {
  editingModel.value = null
  modelForm.value = { brandId: brand.id, name: '', sortOrder: 0 }
  showModelModal.value = true
}

function openEditModel(model: CarModel) {
  editingModel.value = model
  modelForm.value = { brandId: model.brandId, name: model.name, sortOrder: 0 }
  showModelModal.value = true
}

async function saveModel() {
  if (!modelForm.value.name.trim()) {
    toast.error('Model adı zorunludur')
    return
  }
  modelSaving.value = true
  try {
    if (editingModel.value) {
      await referenceDataApi.updateModel(editingModel.value.id, {
        name: modelForm.value.name.trim(),
        sortOrder: modelForm.value.sortOrder || undefined,
      })
      toast.success('Model güncellendi')
    } else {
      await referenceDataApi.createModel({
        brandId: modelForm.value.brandId,
        name: modelForm.value.name.trim(),
        sortOrder: modelForm.value.sortOrder || 0,
      })
      toast.success('Model eklendi')
    }
    showModelModal.value = false
    modelsByBrand.value.delete(modelForm.value.brandId)
    if (expandedBrandId.value === modelForm.value.brandId) {
      await loadModels(modelForm.value.brandId)
    }
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  } finally {
    modelSaving.value = false
  }
}

function confirmDeactivate(type: 'brand' | 'model', id: number, name: string, brandId?: number) {
  deactivateTarget.value = { type, id, name, brandId }
}

async function doDeactivate() {
  if (!deactivateTarget.value) return
  const { type, id, name, brandId } = deactivateTarget.value
  try {
    if (type === 'brand') {
      await referenceDataApi.deactivateBrand(id)
      toast.success(`"${name}" pasif yapıldı`)
      await fetchBrands()
      if (expandedBrandId.value === id) expandedBrandId.value = null
      modelsByBrand.value.delete(id)
    } else {
      await referenceDataApi.deactivateModel(id)
      toast.success(`"${name}" pasif yapıldı`)
      if (brandId) {
        modelsByBrand.value.delete(brandId)
        if (expandedBrandId.value === brandId) await loadModels(brandId)
      }
    }
    deactivateTarget.value = null
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

onMounted(fetchBrands)
</script>

<template>
  <div class="rcs-manager">
    <div class="rcs-manager__head">
      <h3 class="rcs-manager__title">Markalar ve modeller</h3>
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
        <RcButton variant="accent" size="sm" @click="openAddBrand">
          <RcIcon name="plus" :size="14" />
          Yeni marka
        </RcButton>
      </div>
    </div>

    <RcTableSkeleton v-if="loading" :rows="5" :cols="3" />

    <RcEmpty
      v-else-if="!brands.length"
      title="Henüz marka yok"
      description="Araç formlarında kullanılacak markaları buradan ekleyin"
    >
      <template #action>
        <RcButton variant="accent" size="sm" @click="openAddBrand">İlk markayı ekle</RcButton>
      </template>
    </RcEmpty>

    <div v-else class="rcs-accordion">
      <div
        v-for="brand in brands"
        :key="brand.id"
        class="rcs-accordion__item"
        :class="{ 'rcs-accordion__item--inactive': brand.active === false }"
      >
        <div class="rcs-accordion__header" @click="toggleBrand(brand.id)">
          <RcIcon
            name="chevronRight"
            :size="14"
            class="rcs-accordion__chevron"
            :class="{ 'rcs-accordion__chevron--open': expandedBrandId === brand.id }"
          />
          <span class="rcs-accordion__label">{{ brand.name }}</span>
          <span v-if="brand.active === false" class="rcs-badge-inactive">Pasif</span>
          <div class="rcs-accordion__row-actions" @click.stop>
            <template v-if="brand.active !== false">
              <RcButton variant="ghost" size="sm" @click="openEditBrand(brand)">Düzenle</RcButton>
              <RcButton variant="ghost" size="sm" @click="confirmDeactivate('brand', brand.id, brand.name)">
                Pasif yap
              </RcButton>
            </template>
            <RcButton v-else variant="ghost" size="sm" @click="doActivateBrand(brand)">Aktif et</RcButton>
          </div>
        </div>
        <div v-if="expandedBrandId === brand.id" class="rcs-accordion__body">
          <div v-if="loadingModels.has(brand.id)" class="rcs-list__meta">Modeller yükleniyor…</div>
          <template v-else>
            <div class="rcs-accordion__toolbar">
              <span class="rcs-accordion__count">{{ (modelsByBrand.get(brand.id) || []).length }} model</span>
              <RcButton variant="accent" size="sm" @click="openAddModel(brand)">Yeni model</RcButton>
            </div>
            <ul v-if="(modelsByBrand.get(brand.id) || []).length" class="rcs-accordion__list">
              <li
                v-for="model in (modelsByBrand.get(brand.id) || [])"
                :key="model.id"
                class="rcs-accordion__row"
                :class="{ 'rcs-accordion__row--inactive': model.active === false }"
              >
                <div class="rcs-accordion__row-info">
                  <span>{{ model.name }}</span>
                  <span v-if="model.active === false" class="rcs-badge-inactive">Pasif</span>
                </div>
                <div class="rcs-list__actions">
                  <template v-if="model.active !== false">
                    <RcButton variant="ghost" size="sm" @click="openEditModel(model)">Düzenle</RcButton>
                    <RcButton
                      variant="ghost"
                      size="sm"
                      @click="confirmDeactivate('model', model.id, model.name, brand.id)"
                    >
                      Pasif yap
                    </RcButton>
                  </template>
                  <RcButton v-else variant="ghost" size="sm" @click="doActivateModel(model)">Aktif et</RcButton>
                </div>
              </li>
            </ul>
            <p v-else class="rcs-list__meta">Bu markaya ait model yok.</p>
          </template>
        </div>
      </div>
    </div>

    <RcModal
      :open="showBrandModal"
      :title="editingBrand ? 'Marka düzenle' : 'Yeni marka'"
      @close="showBrandModal = false"
    >
      <form id="brand-form" @submit.prevent="saveBrand">
        <RcField label="Marka adı">
          <input v-model="brandForm.name" type="text" class="rc-input" required placeholder="Örn: Toyota" />
        </RcField>
        <RcField label="Logo URL">
          <input v-model="brandForm.logoUrl" type="url" class="rc-input" placeholder="https://…" />
        </RcField>
        <RcField label="Sıra">
          <input v-model.number="brandForm.sortOrder" type="number" class="rc-input" min="0" />
        </RcField>
      </form>
      <template #footer>
        <RcButton variant="secondary" @click="showBrandModal = false">İptal</RcButton>
        <RcButton variant="primary" type="submit" form="brand-form" :disabled="brandSaving">
          {{ brandSaving ? 'Kaydediliyor…' : (editingBrand ? 'Güncelle' : 'Ekle') }}
        </RcButton>
      </template>
    </RcModal>

    <RcModal
      :open="showModelModal"
      :title="editingModel ? 'Model düzenle' : 'Yeni model'"
      @close="showModelModal = false"
    >
      <form id="model-form" @submit.prevent="saveModel">
        <RcField label="Model adı">
          <input v-model="modelForm.name" type="text" class="rc-input" required placeholder="Örn: Corolla" />
        </RcField>
        <RcField label="Sıra">
          <input v-model.number="modelForm.sortOrder" type="number" class="rc-input" min="0" />
        </RcField>
      </form>
      <template #footer>
        <RcButton variant="secondary" @click="showModelModal = false">İptal</RcButton>
        <RcButton variant="primary" type="submit" form="model-form" :disabled="modelSaving">
          {{ modelSaving ? 'Kaydediliyor…' : (editingModel ? 'Güncelle' : 'Ekle') }}
        </RcButton>
      </template>
    </RcModal>

    <AccountingConfirmModal
      :open="!!deactivateTarget"
      title="Pasif yap"
      :message="deactivateTarget ? `${deactivateTarget.name} pasif yapılsın mı? Listede görünmez, silinmez.` : ''"
      confirm-label="Pasif yap"
      @close="deactivateTarget = null"
      @confirm="doDeactivate"
    />
  </div>
</template>
