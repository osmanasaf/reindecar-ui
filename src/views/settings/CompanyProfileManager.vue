<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { tenantSettingsApi } from '@/api'
import { useToast } from '@/composables'
import { RcButton, RcField } from '@/components/rc'
import { RcIcon } from '@/components/icons'

const toast = useToast()
const loading = ref(true)
const saving = ref(false)
const uploadingLogo = ref(false)
const logoUrl = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const currentCurrency = ref('TRY')

const form = ref({
  name: '',
  contactEmail: '',
  contactPhone: '',
  taxNumber: '',
})

async function loadSettings() {
  loading.value = true
  try {
    const settings = await tenantSettingsApi.getSettings()
    form.value = {
      name: settings.name ?? '',
      contactEmail: settings.contactEmail ?? '',
      contactPhone: settings.contactPhone ?? '',
      taxNumber: settings.taxNumber ?? '',
    }
    logoUrl.value = settings.logoUrl
    currentCurrency.value = settings.defaultCurrency
  } catch (err) {
    toast.apiError(err, 'Firma bilgileri yüklenemedi')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.value.name.trim()) {
    toast.error('Firma adı zorunludur')
    return
  }
  saving.value = true
  try {
    const updated = await tenantSettingsApi.updateSettings({
      name: form.value.name.trim(),
      contactEmail: form.value.contactEmail.trim() || undefined,
      contactPhone: form.value.contactPhone.trim() || undefined,
      taxNumber: form.value.taxNumber.trim() || undefined,
      defaultCurrency: currentCurrency.value,
    })
    logoUrl.value = updated.logoUrl
    toast.success('Firma bilgileri kaydedildi')
  } catch (err) {
    toast.apiError(err, 'Firma bilgileri kaydedilemedi')
  } finally {
    saving.value = false
  }
}

function triggerFileSelect() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return

  if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
    toast.error('Yalnızca JPEG, PNG veya WebP dosyaları desteklenir')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error('Logo dosyası 5 MB sınırını aşıyor')
    return
  }

  uploadingLogo.value = true
  try {
    logoUrl.value = await tenantSettingsApi.uploadLogo(file)
    toast.success('Logo yüklendi')
  } catch (err) {
    toast.apiError(err, 'Logo yüklenemedi')
  } finally {
    uploadingLogo.value = false
  }
}

async function removeLogo() {
  if (!confirm('Logoyu kaldırmak istediğinize emin misiniz?')) return
  uploadingLogo.value = true
  try {
    await tenantSettingsApi.deleteLogo()
    logoUrl.value = null
    toast.success('Logo kaldırıldı')
  } catch (err) {
    toast.apiError(err, 'Logo kaldırılamadı')
  } finally {
    uploadingLogo.value = false
  }
}

onMounted(() => {
  void loadSettings()
})
</script>

<template>
  <div class="rc-settings-section">
    <div v-if="loading" class="rc-skeleton" style="height: 240px" />

    <template v-else>
      <div class="rccp-logo-section">
        <div class="rccp-logo-preview">
          <img v-if="logoUrl" :src="logoUrl" alt="Firma logosu" />
          <RcIcon v-else name="building" :size="28" />
        </div>
        <div>
          <div class="rc-card__title" style="margin-bottom: 4px">Firma Logosu</div>
          <div class="rcv-veh-damage-map__sub" style="margin-bottom: 10px">
            Sözleşme ve fiyat teklifi PDF'lerinin üst kısmında görünür. PNG, JPEG veya WebP · max 5 MB
          </div>
          <div style="display: flex; gap: 8px">
            <RcButton variant="secondary" size="sm" :disabled="uploadingLogo" @click="triggerFileSelect">
              <RcIcon name="upload" :size="14" />
              {{ logoUrl ? 'Logoyu değiştir' : 'Logo yükle' }}
            </RcButton>
            <RcButton v-if="logoUrl" variant="ghost" size="sm" :disabled="uploadingLogo" @click="removeLogo">
              <RcIcon name="trash" :size="14" />
              Kaldır
            </RcButton>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style="display: none"
            @change="handleFileChange"
          />
        </div>
      </div>

      <form @submit.prevent="save" style="margin-top: 24px">
        <div class="rcs-form-grid">
          <RcField label="Firma adı *">
            <input v-model="form.name" type="text" class="rc-input" required />
          </RcField>
          <RcField label="Vergi numarası">
            <input v-model="form.taxNumber" type="text" class="rc-input" />
          </RcField>
          <RcField label="İletişim e-postası">
            <input v-model="form.contactEmail" type="email" class="rc-input" />
          </RcField>
          <RcField label="İletişim telefonu">
            <input v-model="form.contactPhone" type="text" class="rc-input" />
          </RcField>
        </div>
        <div class="rcs-card__foot" style="margin: 20px -20px -20px; padding-right: 20px">
          <RcButton type="submit" variant="primary" :loading="saving">
            Kaydet
          </RcButton>
        </div>
      </form>
    </template>
  </div>
</template>

<style scoped>
.rccp-logo-section {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}
.rccp-logo-preview {
  width: 140px;
  height: 70px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--rc-border);
  border-radius: var(--rc-radius-md);
  background: var(--rc-surface-muted);
  color: var(--rc-text-faint);
  overflow: hidden;
}
.rccp-logo-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
