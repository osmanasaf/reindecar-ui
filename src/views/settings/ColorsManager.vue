<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { referenceDataApi } from '@/api'
import { useToast } from '@/composables'
import type { VehicleColor } from '@/types/reference'

const toast = useToast()
const colors = ref<VehicleColor[]>([])
const loading = ref(true)
const showInactive = ref(false)

const showModal = ref(false)
const editingColor = ref<VehicleColor | null>(null)
const form = ref({ name: '', hexCode: '', sortOrder: 0 })
const saving = ref(false)

const deactivateTarget = ref<VehicleColor | null>(null)

async function fetchColors() {
    loading.value = true
    try {
        colors.value = showInactive.value
            ? await referenceDataApi.getColorsAll()
            : await referenceDataApi.getColors()
    } catch {
        toast.error('Renkler yüklenemedi')
    } finally {
        loading.value = false
    }
}

async function handleToggleShowInactive() {
    showInactive.value = !showInactive.value
    await fetchColors()
}

async function doActivate(color: VehicleColor) {
    try {
        await referenceDataApi.activateColor(color.id)
        toast.success(`"${color.name}" tekrar aktif edildi`)
        await fetchColors()
    } catch (err) {
        toast.apiError(err, 'Aktif edilemedi')
    }
}

function openAdd() {
    editingColor.value = null
    form.value = { name: '', hexCode: '', sortOrder: colors.value.length + 1 }
    showModal.value = true
}

function openEdit(color: VehicleColor) {
    editingColor.value = color
    form.value = { name: color.name, hexCode: color.hexCode ?? '', sortOrder: 0 }
    showModal.value = true
}

async function save() {
    if (!form.value.name.trim()) {
        toast.error('Renk adı zorunludur')
        return
    }
    saving.value = true
    try {
        if (editingColor.value) {
            await referenceDataApi.updateColor(editingColor.value.id, {
                name: form.value.name.trim(),
                hexCode: form.value.hexCode.trim() || undefined,
                sortOrder: form.value.sortOrder || undefined
            })
            toast.success('Renk güncellendi')
        } else {
            await referenceDataApi.createColor({
                name: form.value.name.trim(),
                hexCode: form.value.hexCode.trim() || undefined,
                sortOrder: form.value.sortOrder || 0
            })
            toast.success('Renk eklendi')
        }
        showModal.value = false
        await fetchColors()
    } catch (err) {
        toast.apiError(err, 'İşlem başarısız')
    } finally {
        saving.value = false
    }
}

function confirmDeactivate(color: VehicleColor) {
    deactivateTarget.value = color
}

async function doDeactivate() {
    if (!deactivateTarget.value) return
    const { id, name } = deactivateTarget.value
    try {
        await referenceDataApi.deactivateColor(id)
        toast.success(`"${name}" pasif yapıldı`)
        await fetchColors()
        deactivateTarget.value = null
    } catch (err) {
        toast.apiError(err, 'İşlem başarısız')
    }
}

function swatchStyle(hexCode: string | null) {
    if (!hexCode || !hexCode.trim()) return { background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }
    return { background: hexCode.trim() }
}

onMounted(fetchColors)
</script>

<template>
  <div class="colors-manager">
    <div class="section-header">
      <h2>Araç Renkleri</h2>
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
        <button class="btn btn-primary" @click="openAdd">Yeni Renk</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>
    <template v-else>
      <div class="colors-list">
        <div
          v-for="color in colors"
          :key="color.id"
          class="color-row"
          :class="{ 'color-row--inactive': color.active === false }"
        >
          <div
            class="swatch"
            :style="swatchStyle(color.hexCode)"
            :title="color.hexCode || 'Renk kodu yok'"
          />
          <div class="color-info">
            <span class="color-name">{{ color.name }}</span>
            <span v-if="color.hexCode" class="color-hex">{{ color.hexCode }}</span>
          </div>
          <span v-if="color.active === false" class="inactive-badge">Pasif</span>
          <div class="row-actions">
            <template v-if="color.active !== false">
              <button class="btn-sm btn-outline" @click="openEdit(color)">Düzenle</button>
              <button class="btn-sm btn-danger" @click="confirmDeactivate(color)">Pasif yap</button>
            </template>
            <button v-else class="btn-sm btn-success" @click="doActivate(color)">Aktif et</button>
          </div>
        </div>
      </div>
      <p v-if="!colors.length" class="empty-state">Henüz renk eklenmemiş.</p>
    </template>

    <!-- Add/Edit modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <h3>{{ editingColor ? 'Renk Düzenle' : 'Yeni Renk' }}</h3>
        <form @submit.prevent="save">
          <div class="form-group">
            <label>Renk adı <span class="required">*</span></label>
            <input v-model="form.name" type="text" required placeholder="Örn: Beyaz" />
          </div>
          <div class="form-group">
            <label>Hex kodu</label>
            <div class="hex-input-wrap">
              <div
                class="swatch-preview"
                :style="form.hexCode ? { background: form.hexCode } : {}"
              />
              <input
                v-model="form.hexCode"
                type="text"
                placeholder="#FFFFFF"
                maxlength="20"
              />
            </div>
          </div>
          <div class="form-group">
            <label>Sıra</label>
            <input v-model.number="form.sortOrder" type="number" min="0" />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-outline" @click="showModal = false">İptal</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Kaydediliyor...' : (editingColor ? 'Güncelle' : 'Ekle') }}
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
.colors-manager {
  max-width: 600px;
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

.color-row--inactive { opacity: 0.75; background: var(--color-bg-secondary) !important; }

.btn-success { background: var(--color-success, #059669); color: white; border: none; }
.btn-success:hover { opacity: 0.9; }

.btn { padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; border: none; }
.btn-primary { background: var(--color-primary); color: white; }
.btn-outline { background: transparent; border: 1px solid var(--color-border); color: var(--color-text); }
.btn-danger { background: var(--color-danger, #dc3545); color: white; }
.btn-sm { padding: 6px 12px; font-size: 13px; }

.loading, .empty-state { text-align: center; padding: 24px; color: var(--color-text-secondary); }

.colors-list {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}
.color-row:last-child { border-bottom: none; }

.swatch {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
}

.color-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.color-name { font-weight: 500; }
.color-hex { font-size: 12px; color: var(--color-text-muted); }

.row-actions { display: flex; gap: 8px; }

.hex-input-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}
.swatch-preview {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}
.hex-input-wrap input { flex: 1; }

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
