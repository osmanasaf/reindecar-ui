<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { vehicleCategoriesApi } from '@/api'
import { useToast } from '@/composables'
import type { VehicleCategory } from '@/types'

const toast = useToast()
const categories = ref<VehicleCategory[]>([])
const loading = ref(true)
const showInactive = ref(false)

const showModal = ref(false)
const editingCategory = ref<VehicleCategory | null>(null)
const form = ref({ code: '', name: '', description: '', defaultDailyPrice: 0, sortOrder: 0 })
const saving = ref(false)

const deactivateTarget = ref<VehicleCategory | null>(null)

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
        sortOrder: categories.value.length + 1
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
        sortOrder: category.sortOrder
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
                sortOrder: form.value.sortOrder || undefined
            })
            toast.success('Kategori güncellendi')
        } else {
            await vehicleCategoriesApi.create({
                code: form.value.code.trim().toUpperCase(),
                name: form.value.name.trim(),
                description: form.value.description.trim() || undefined,
                defaultDailyPrice: form.value.defaultDailyPrice || 0,
                sortOrder: form.value.sortOrder || 0
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

onMounted(fetchCategories)
</script>

<template>
  <div class="categories-manager">
    <div class="section-header">
      <h2>Araç Kategorileri</h2>
      <div class="header-actions">
        <button
          type="button"
          class="toggle-label"
          :aria-pressed="showInactive"
          @click="handleToggleShowInactive"
        >
          <span class="toggle-track" :class="{ active: showInactive }">
            <span class="toggle-thumb"></span>
          </span>
          <span class="toggle-text">Pasifleri göster</span>
        </button>
        <button class="btn btn-primary" @click="openAdd">Yeni Kategori</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>
    <template v-else>
      <div class="categories-list">
        <div
          v-for="category in categories"
          :key="category.id"
          class="category-row"
          :class="{ 'category-row--inactive': category.active === false }"
        >
          <div class="category-badge">{{ category.code }}</div>
          <div class="category-info">
            <span class="category-name">{{ category.name }}</span>
            <span v-if="category.description" class="category-desc">{{ category.description }}</span>
          </div>
          <div class="category-price" v-if="category.defaultDailyPrice">
            {{ category.defaultDailyPrice.toLocaleString('tr-TR') }} ₺/gün
          </div>
          <span v-if="category.active === false" class="inactive-badge">Pasif</span>
          <div class="row-actions">
            <template v-if="category.active !== false">
              <button class="btn-sm btn-outline" @click="openEdit(category)">Düzenle</button>
              <button class="btn-sm btn-danger" @click="confirmDeactivate(category)">Pasif yap</button>
            </template>
            <button v-else class="btn-sm btn-success" @click="doActivate(category)">Aktif et</button>
          </div>
        </div>
      </div>
      <p v-if="!categories.length" class="empty-state">Henüz kategori eklenmemiş.</p>
    </template>

    <!-- Add/Edit modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori' }}</h3>
        <form @submit.prevent="save">
          <div v-if="!editingCategory" class="form-group">
            <label>Kod <span class="required">*</span></label>
            <input
              v-model="form.code"
              type="text"
              required
              placeholder="Örn: ECONOMY"
              maxlength="10"
              style="text-transform: uppercase"
            />
            <span class="hint">En fazla 10 karakter, benzersiz olmalı</span>
          </div>
          <div class="form-group">
            <label>Kategori adı <span class="required">*</span></label>
            <input v-model="form.name" type="text" required placeholder="Örn: Ekonomi" maxlength="100" />
          </div>
          <div class="form-group">
            <label>Açıklama</label>
            <input v-model="form.description" type="text" placeholder="Kısa açıklama" maxlength="500" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Varsayılan günlük fiyat (₺)</label>
              <input v-model.number="form.defaultDailyPrice" type="number" min="0" step="50" />
            </div>
            <div class="form-group">
              <label>Sıra</label>
              <input v-model.number="form.sortOrder" type="number" min="0" />
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-outline" @click="showModal = false">İptal</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Kaydediliyor...' : (editingCategory ? 'Güncelle' : 'Ekle') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Deactivate confirm -->
    <div v-if="deactivateTarget" class="modal-overlay" @click.self="deactivateTarget = null">
      <div class="modal modal-sm">
        <h3>Pasif yap</h3>
        <p>
          <strong>{{ deactivateTarget.name }}</strong> kategorisi pasif yapılsın mı?
          Pasif kategoriler araç formunda görünmez, silinmez.
        </p>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" @click="deactivateTarget = null">Vazgeç</button>
          <button type="button" class="btn btn-danger" @click="doDeactivate">Pasif yap</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.categories-manager {
  max-width: 700px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.header-actions { display: flex; align-items: center; gap: 12px; }

.toggle-label {
  display: flex; align-items: center; gap: 0.5rem;
  cursor: pointer; user-select: none;
  background: none; border: none; padding: 0; font: inherit;
}
.toggle-track {
  position: relative; display: inline-block;
  width: 2.25rem; height: 1.25rem;
  background: var(--color-border, #d1d5db); border-radius: 9999px; transition: background 0.2s;
}
.toggle-track.active { background: var(--color-primary, #2563eb); }
.toggle-thumb {
  position: absolute; top: 0.125rem; left: 0.125rem;
  width: 1rem; height: 1rem; background: white; border-radius: 50%;
  transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.toggle-track.active .toggle-thumb { transform: translateX(1rem); }
.toggle-text { font-size: 0.875rem; color: var(--color-text-secondary, #6b7280); }

.inactive-badge {
  font-size: 0.7rem; padding: 0.15rem 0.5rem;
  border-radius: 9999px; background: #e5e7eb; color: #6b7280; font-weight: 500;
}

.category-row--inactive { opacity: 0.75; background: var(--color-bg-secondary) !important; }

.btn-success { background: var(--color-success, #059669); color: white; border: none; }
.btn-success:hover { opacity: 0.9; }

.btn { padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; border: none; }
.btn-primary { background: var(--color-primary); color: white; }
.btn-outline { background: transparent; border: 1px solid var(--color-border); color: var(--color-text); }
.btn-danger { background: var(--color-danger, #dc3545); color: white; }
.btn-sm { padding: 6px 12px; font-size: 13px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; font-weight: 500; }
.btn-sm.btn-outline { border-color: var(--color-border); background: transparent; color: var(--color-text); }
.btn-sm.btn-danger { background: var(--color-danger, #dc3545); color: white; }

.loading, .empty-state { text-align: center; padding: 24px; color: var(--color-text-secondary); }

.categories-list {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.category-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}
.category-row:last-child { border-bottom: none; }

.category-badge {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  min-width: 64px;
  text-align: center;
}

.category-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.category-name { font-weight: 500; font-size: 14px; }
.category-desc { font-size: 12px; color: var(--color-text-muted); }

.category-price {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  white-space: nowrap;
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
  max-width: 460px;
}
.modal h3 { font-size: 18px; margin: 0 0 20px 0; }
.modal p { margin: 0 0 20px 0; color: var(--color-text-secondary); }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; color: var(--color-text-secondary); }
.form-group input { width: 100%; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.hint { display: block; font-size: 12px; color: var(--color-text-muted); margin-top: 4px; }
.required { color: var(--color-danger, #dc3545); }
.form-actions { display: flex; gap: 12px; margin-top: 20px; }
.form-actions .btn { flex: 1; }
.modal-sm { max-width: 380px; }

@media (max-width: 768px) {
  .header-actions,
  .category-row,
  .row-actions,
  .form-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .category-info {
    width: 100%;
  }

  .category-price,
  .inactive-badge {
    align-self: flex-start;
  }

  .btn,
  .btn-sm {
    width: 100%;
    justify-content: center;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .modal-overlay {
    padding: 16px;
  }

  .modal,
  .modal-sm {
    max-width: 100%;
  }
}
</style>
