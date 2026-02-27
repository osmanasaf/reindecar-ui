<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { referenceDataApi } from '@/api'
import { useToast } from '@/composables'
import type { CarBrand, CarModel } from '@/types/reference'

const toast = useToast()
const brands = ref<CarBrand[]>([])
const loading = ref(true)
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
        brands.value = await referenceDataApi.getBrands()
    } catch {
        toast.error('Markalar yüklenemedi')
    } finally {
        loading.value = false
    }
}

async function loadModels(brandId: number) {
    if (modelsByBrand.value.has(brandId)) return
    loadingModels.value.add(brandId)
    try {
        const list = await referenceDataApi.getModelsByBrand(brandId)
        modelsByBrand.value.set(brandId, [...list])
    } catch {
        toast.error('Modeller yüklenemedi')
    } finally {
        loadingModels.value.delete(brandId)
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
                sortOrder: brandForm.value.sortOrder || undefined
            })
            toast.success('Marka güncellendi')
        } else {
            await referenceDataApi.createBrand({
                name: brandForm.value.name.trim(),
                logoUrl: brandForm.value.logoUrl.trim() || undefined,
                sortOrder: brandForm.value.sortOrder || 0
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
                sortOrder: modelForm.value.sortOrder || undefined
            })
            toast.success('Model güncellendi')
        } else {
            await referenceDataApi.createModel({
                brandId: modelForm.value.brandId,
                name: modelForm.value.name.trim(),
                sortOrder: modelForm.value.sortOrder || 0
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
  <div class="brands-manager">
    <div class="section-header">
      <h2>Markalar ve Modeller</h2>
      <button class="btn btn-primary" @click="openAddBrand">Yeni Marka</button>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>
    <template v-else>
      <div class="accordion-list">
        <div
          v-for="brand in brands"
          :key="brand.id"
          class="accordion-item"
        >
          <div
            class="accordion-header"
            @click="toggleBrand(brand.id)"
          >
            <span class="accordion-arrow">{{ expandedBrandId === brand.id ? '▼' : '▶' }}</span>
            <span class="brand-name">{{ brand.name }}</span>
            <div class="header-actions" @click.stop>
              <button class="btn-sm btn-outline" @click="openEditBrand(brand)">Düzenle</button>
              <button class="btn-sm btn-danger" @click="confirmDeactivate('brand', brand.id, brand.name)">
                Pasif yap
              </button>
            </div>
          </div>
          <div v-if="expandedBrandId === brand.id" class="accordion-body">
            <div v-if="loadingModels.has(brand.id)" class="loading-inline">Modeller yükleniyor...</div>
            <template v-else>
              <div class="models-toolbar">
                <span class="models-count">{{ (modelsByBrand.get(brand.id) || []).length }} model</span>
                <button class="btn-sm btn-primary" @click="openAddModel(brand)">Yeni Model</button>
              </div>
              <ul class="models-list">
                <li
                  v-for="model in (modelsByBrand.get(brand.id) || [])"
                  :key="model.id"
                  class="model-row"
                >
                  <span>{{ model.name }}</span>
                  <div class="row-actions">
                    <button class="btn-sm btn-outline" @click="openEditModel(model)">Düzenle</button>
                    <button
                      class="btn-sm btn-danger"
                      @click="confirmDeactivate('model', model.id, model.name, brand.id)"
                    >
                      Pasif yap
                    </button>
                  </div>
                </li>
              </ul>
              <p v-if="!(modelsByBrand.get(brand.id) || []).length" class="empty-inline">Bu markaya ait model yok.</p>
            </template>
          </div>
        </div>
      </div>
      <p v-if="!brands.length" class="empty-state">Henüz marka eklenmemiş.</p>
    </template>

    <!-- Brand modal -->
    <div v-if="showBrandModal" class="modal-overlay" @click.self="showBrandModal = false">
      <div class="modal">
        <h3>{{ editingBrand ? 'Marka Düzenle' : 'Yeni Marka' }}</h3>
        <form @submit.prevent="saveBrand">
          <div class="form-group">
            <label>Marka adı <span class="required">*</span></label>
            <input v-model="brandForm.name" type="text" required placeholder="Örn: Toyota" />
          </div>
          <div class="form-group">
            <label>Logo URL</label>
            <input v-model="brandForm.logoUrl" type="url" placeholder="https://..." />
          </div>
          <div class="form-group">
            <label>Sıra</label>
            <input v-model.number="brandForm.sortOrder" type="number" min="0" />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-outline" @click="showBrandModal = false">İptal</button>
            <button type="submit" class="btn btn-primary" :disabled="brandSaving">
              {{ brandSaving ? 'Kaydediliyor...' : (editingBrand ? 'Güncelle' : 'Ekle') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Model modal -->
    <div v-if="showModelModal" class="modal-overlay" @click.self="showModelModal = false">
      <div class="modal">
        <h3>{{ editingModel ? 'Model Düzenle' : 'Yeni Model' }}</h3>
        <form @submit.prevent="saveModel">
          <div class="form-group">
            <label>Model adı <span class="required">*</span></label>
            <input v-model="modelForm.name" type="text" required placeholder="Örn: Corolla" />
          </div>
          <div class="form-group">
            <label>Sıra</label>
            <input v-model.number="modelForm.sortOrder" type="number" min="0" />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-outline" @click="showModelModal = false">İptal</button>
            <button type="submit" class="btn btn-primary" :disabled="modelSaving">
              {{ modelSaving ? 'Kaydediliyor...' : (editingModel ? 'Güncelle' : 'Ekle') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Deactivate confirm -->
    <div v-if="deactivateTarget" class="modal-overlay" @click.self="deactivateTarget = null">
      <div class="modal modal-sm">
        <h3>Pasif yap</h3>
        <p><strong>{{ deactivateTarget.name }}</strong> pasif yapılsın mı? (Listede görünmez, silinmez.)</p>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" @click="deactivateTarget = null">Vazgeç</button>
          <button type="button" class="btn btn-danger" @click="doDeactivate">Pasif yap</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.brands-manager {
  max-width: 800px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.btn { padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; border: none; }
.btn-primary { background: var(--color-primary); color: white; }
.btn-outline { background: transparent; border: 1px solid var(--color-border); color: var(--color-text); }
.btn-danger { background: var(--color-danger, #dc3545); color: white; }
.btn-sm { padding: 6px 12px; font-size: 13px; }

.loading, .empty-state { text-align: center; padding: 24px; color: var(--color-text-secondary); }
.loading-inline, .empty-inline { padding: 12px; color: var(--color-text-muted); font-size: 14px; }

.accordion-list { border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; }
.accordion-item { border-bottom: 1px solid var(--color-border); }
.accordion-item:last-child { border-bottom: none; }

.accordion-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  background: var(--color-surface);
  transition: background 0.2s;
}
.accordion-header:hover { background: var(--color-bg-secondary); }

.accordion-arrow { font-size: 12px; color: var(--color-text-muted); width: 20px; }
.brand-name { flex: 1; font-weight: 500; }
.header-actions { display: flex; gap: 8px; }

.accordion-body { padding: 12px 16px 16px 48px; background: var(--color-bg-secondary); }

.models-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.models-count { font-size: 13px; color: var(--color-text-muted); }

.models-list { list-style: none; margin: 0; padding: 0; }
.model-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 4px;
  background: var(--color-surface);
}
.row-actions { display: flex; gap: 8px; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 420px;
}
.modal h3 { font-size: 18px; margin: 0 0 20px 0; }
.modal p { margin: 0 0 20px 0; color: var(--color-text-secondary); }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; color: var(--color-text-secondary); }
.form-group input { width: 100%; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: 8px; font-size: 14px; }
.required { color: var(--color-danger); }
.form-actions { display: flex; gap: 12px; margin-top: 20px; }
.form-actions .btn { flex: 1; }
.modal-sm { max-width: 360px; }
</style>
