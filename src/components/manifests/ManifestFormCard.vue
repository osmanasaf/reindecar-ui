<script setup lang="ts">
import { ref, watch } from 'vue'
import { serviceManifestsApi } from '@/api'
import { useToast, useManifestForm } from '@/composables'
import { RcButton, RcField } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { UetdsManifest } from '@/types/manifest'

const props = defineProps<{
  manifest: UetdsManifest
}>()

const emit = defineEmits<{
  updated: [manifest: UetdsManifest]
}>()

const toast = useToast()
const saving = ref(false)
const { form, syncFromManifest, buildUpdatePayload } = useManifestForm()

watch(() => props.manifest, syncFromManifest, { immediate: true })

async function handleSave() {
  saving.value = true
  try {
    const updated = await serviceManifestsApi.update(props.manifest.id, buildUpdatePayload())
    emit('updated', updated)
    toast.success('Manifesto güncellendi')
  } catch (err) {
    toast.apiError(err, 'Kayıt başarısız')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="rc-card rc-animate-in">
    <div class="rc-card__head">
      <div class="rc-card__head-lead">
        <span class="rc-card__icon"><RcIcon name="globe" :size="16" /></span>
        <div>
          <h2 class="rc-card__title">Sefer bilgileri</h2>
          <div class="rc-card__desc">UETDS sefer numarası, tarih ve taşıyıcı detayları</div>
        </div>
      </div>
    </div>
    <div class="rc-card__body">
      <form class="rcs-form-grid" @submit.prevent="handleSave">
        <RcField label="UETDS sefer no">
          <input v-model="form.uetdsTripNumber" class="rc-input" required />
        </RcField>
        <RcField label="Belge no">
          <input v-model="form.documentNumber" class="rc-input" />
        </RcField>
        <RcField label="Başlangıç">
          <input v-model="form.tripStartAt" type="datetime-local" class="rc-input" />
        </RcField>
        <RcField label="Bitiş">
          <input v-model="form.tripEndAt" type="datetime-local" class="rc-input" />
        </RcField>
        <RcField label="Şoför">
          <input v-model="form.driverName" class="rc-input" />
        </RcField>
        <RcField label="SRC">
          <input v-model="form.driverSrc" class="rc-input" />
        </RcField>
        <RcField label="Taşıyıcı" style="grid-column: 1 / -1">
          <input v-model="form.carrierCompanyName" class="rc-input" />
        </RcField>
        <RcField label="Grup">
          <input v-model="form.groupName" class="rc-input" />
        </RcField>
        <RcField label="Ücret">
          <input v-model.number="form.groupFeeAmount" type="number" min="0" step="0.01" class="rc-input rc-num" />
        </RcField>
        <RcField label="Güzergah" style="grid-column: 1 / -1">
          <input v-model="form.groupRoute" class="rc-input" />
        </RcField>
        <RcField label="Açıklama" style="grid-column: 1 / -1">
          <textarea v-model="form.groupDescription" class="rc-input" rows="3" />
        </RcField>
        <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end">
          <RcButton type="submit" variant="primary" :loading="saving">Kaydet</RcButton>
        </div>
      </form>
    </div>
  </div>
</template>
