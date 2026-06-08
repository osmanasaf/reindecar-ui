<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { referenceDataApi } from '@/api'
import { useToast } from '@/composables'
import { AccountingConfirmModal } from '@/components/accounting'
import { RcButton, RcField, RcModal, RcEmpty, RcTableSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
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
        sortOrder: form.value.sortOrder || undefined,
      })
      toast.success('Renk güncellendi')
    } else {
      await referenceDataApi.createColor({
        name: form.value.name.trim(),
        hexCode: form.value.hexCode.trim() || undefined,
        sortOrder: form.value.sortOrder || 0,
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
  if (!hexCode?.trim()) {
    return { background: 'var(--rc-bg-subtle)', border: '1px solid var(--rc-border-subtle)' }
  }
  return { background: hexCode.trim() }
}

onMounted(fetchColors)
</script>

<template>
  <div class="rcs-manager">
    <div class="rcs-manager__head">
      <h3 class="rcs-manager__title">Araç renkleri</h3>
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
          Yeni renk
        </RcButton>
      </div>
    </div>

    <RcTableSkeleton v-if="loading" :rows="5" :cols="3" />

    <RcEmpty
      v-else-if="!colors.length"
      title="Henüz renk yok"
      description="Araç formlarında kullanılacak renkleri buradan ekleyin"
    >
      <template #action>
        <RcButton variant="accent" size="sm" @click="openAdd">İlk rengi ekle</RcButton>
      </template>
    </RcEmpty>

    <div v-else class="rcs-list">
      <div
        v-for="color in colors"
        :key="color.id"
        class="rcs-list__row"
        :class="{ 'rcs-list__row--inactive': color.active === false }"
      >
        <div class="rcs-swatch" :style="swatchStyle(color.hexCode)" :title="color.hexCode || 'Renk kodu yok'" />
        <div class="rcs-list__main">
          <span class="rcs-list__name">{{ color.name }}</span>
          <span v-if="color.hexCode" class="rcs-list__meta">{{ color.hexCode }}</span>
        </div>
        <span v-if="color.active === false" class="rcs-badge-inactive">Pasif</span>
        <div class="rcs-list__actions">
          <template v-if="color.active !== false">
            <RcButton variant="ghost" size="sm" @click="openEdit(color)">Düzenle</RcButton>
            <RcButton variant="ghost" size="sm" @click="confirmDeactivate(color)">Pasif yap</RcButton>
          </template>
          <RcButton v-else variant="ghost" size="sm" @click="doActivate(color)">Aktif et</RcButton>
        </div>
      </div>
    </div>

    <RcModal
      :open="showModal"
      :title="editingColor ? 'Renk düzenle' : 'Yeni renk'"
      @close="showModal = false"
    >
      <form id="color-form" @submit.prevent="save">
        <RcField label="Renk adı">
          <input v-model="form.name" type="text" class="rc-input" required placeholder="Örn: Beyaz" />
        </RcField>
        <RcField label="Hex kodu">
          <div class="rcs-hex-row">
            <div class="rcs-swatch" :style="form.hexCode ? { background: form.hexCode } : {}" />
            <input v-model="form.hexCode" type="text" class="rc-input" placeholder="#FFFFFF" maxlength="20" />
          </div>
        </RcField>
        <RcField label="Sıra">
          <input v-model.number="form.sortOrder" type="number" class="rc-input" min="0" />
        </RcField>
      </form>
      <template #footer>
        <RcButton variant="secondary" @click="showModal = false">İptal</RcButton>
        <RcButton variant="primary" type="submit" form="color-form" :disabled="saving">
          {{ saving ? 'Kaydediliyor…' : (editingColor ? 'Güncelle' : 'Ekle') }}
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
