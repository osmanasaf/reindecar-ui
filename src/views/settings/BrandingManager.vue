<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { tenantSettingsApi } from '@/api'
import { useToast } from '@/composables'
import { RcButton, RcField } from '@/components/rc'
import { RcIcon } from '@/components/icons'

const toast = useToast()
const loading = ref(true)
const uploading = ref(false)
const deleting = ref(false)
const logoUrl = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const companyForm = ref({
  name: '',
  contactEmail: '',
  contactPhone: '',
  taxNumber: '',
})
const savingCompany = ref(false)

async function fetchSettings() {
  loading.value = true
  try {
    const settings = await tenantSettingsApi.getSettings()
    logoUrl.value = settings.logoUrl
    companyForm.value = {
      name: settings.name || '',
      contactEmail: settings.contactEmail || '',
      contactPhone: settings.contactPhone || '',
      taxNumber: settings.taxNumber || '',
    }
  } catch (err) {
    toast.apiError(err, 'Firma ayarları yüklenemedi')
  } finally {
    loading.value = false
  }
}

function pickLogo() {
  fileInput.value?.click()
}

async function handleLogoChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  uploading.value = true
  try {
    logoUrl.value = await tenantSettingsApi.uploadLogo(file)
    toast.success('Logo yüklendi')
  } catch (err) {
    toast.apiError(err, 'Logo yüklenemedi')
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function removeLogo() {
  deleting.value = true
  try {
    await tenantSettingsApi.deleteLogo()
    logoUrl.value = null
    toast.success('Logo kaldırıldı')
  } catch (err) {
    toast.apiError(err, 'Logo kaldırılamadı')
  } finally {
    deleting.value = false
  }
}

async function saveCompanyInfo() {
  savingCompany.value = true
  try {
    await tenantSettingsApi.updateSettings(companyForm.value)
    toast.success('Firma bilgileri kaydedildi')
  } catch (err) {
    toast.apiError(err, 'Kaydedilemedi')
  } finally {
    savingCompany.value = false
  }
}

onMounted(fetchSettings)
</script>

<template>
  <div class="rcs-manager">
    <div class="rcs-branding__logo-section">
      <h3 class="rcs-manager__title">Firma logosu</h3>
      <p class="rcs-branding__hint">
        Sözleşme, teklif ve teslim tutanağı PDF'lerinin başında görünür. JPEG, PNG veya WebP — en fazla 5 MB.
      </p>

      <div class="rcs-branding__logo-preview">
        <img v-if="logoUrl" :src="logoUrl" alt="Firma logosu" class="rcs-branding__logo-img" />
        <div v-else class="rcs-branding__logo-empty">
          <RcIcon name="camera" :size="28" />
        </div>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        class="rcs-branding__file-input"
        @change="handleLogoChange"
      />

      <div class="rcs-branding__logo-actions">
        <RcButton variant="secondary" size="sm" :loading="uploading" @click="pickLogo">
          <RcIcon name="upload" :size="14" />
          {{ logoUrl ? 'Logoyu değiştir' : 'Logo yükle' }}
        </RcButton>
        <RcButton v-if="logoUrl" variant="ghost" size="sm" :loading="deleting" @click="removeLogo">
          <RcIcon name="trash" :size="14" />
          Kaldır
        </RcButton>
      </div>
    </div>

    <div class="rcs-branding__divider" />

    <form @submit.prevent="saveCompanyInfo">
      <h3 class="rcs-manager__title">Firma bilgileri</h3>
      <div class="rcs-form-grid">
        <RcField label="Firma adı" style="grid-column: 1 / -1">
          <input v-model="companyForm.name" type="text" class="rc-input" />
        </RcField>
        <RcField label="İletişim e-postası">
          <input v-model="companyForm.contactEmail" type="email" class="rc-input" />
        </RcField>
        <RcField label="İletişim telefonu">
          <input v-model="companyForm.contactPhone" type="text" class="rc-input" />
        </RcField>
        <RcField label="Vergi numarası">
          <input v-model="companyForm.taxNumber" type="text" class="rc-input" />
        </RcField>
      </div>
      <div class="rcs-card__foot" style="margin: 20px -20px -20px; padding-right: 20px">
        <RcButton type="submit" variant="primary" :loading="savingCompany">
          Kaydet
        </RcButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.rcs-branding__hint {
  color: var(--rc-text-muted);
  font-size: 13px;
  margin: 4px 0 16px;
}

.rcs-branding__logo-preview {
  width: 200px;
  height: 90px;
  border: 1px dashed var(--rc-border);
  border-radius: var(--rc-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--rc-surface-muted);
  margin-bottom: 12px;
}

.rcs-branding__logo-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.rcs-branding__logo-empty {
  color: var(--rc-text-muted);
}

.rcs-branding__file-input {
  display: none;
}

.rcs-branding__logo-actions {
  display: flex;
  gap: 8px;
}

.rcs-branding__divider {
  height: 1px;
  background: var(--rc-border);
  margin: 24px 0;
}
</style>
