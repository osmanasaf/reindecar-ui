<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { serviceManifestsApi } from '@/api'
import { useToast, useFeatures } from '@/composables'
import FeatureGate from '@/components/common/FeatureGate.vue'
import PassengerImportModal from './PassengerImportModal.vue'
import { RcButton, RcEmpty, RcField, RcBadge } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { UetdsPassenger, CreateUetdsPassengerRequest } from '@/types/manifest'

const props = defineProps<{
  manifestId: number
}>()

const toast = useToast()
const { isEnabled } = useFeatures()

const passengers = ref<UetdsPassenger[]>([])
const showImportModal = ref(false)
const savingEdit = ref(false)
const editingId = ref<number | null>(null)

const addForm = ref<CreateUetdsPassengerRequest>({
  seatNumber: undefined,
  fullName: '',
  nationality: 'T.C.',
  idNumber: '',
})

const editForm = ref<CreateUetdsPassengerRequest>({
  seatNumber: undefined,
  fullName: '',
  nationality: '',
  idNumber: '',
})

async function loadPassengers() {
  if (!isEnabled('UETDS_PASSENGERS')) return
  try {
    passengers.value = await serviceManifestsApi.listPassengers(props.manifestId)
  } catch (err) {
    toast.apiError(err, 'Yolcular yüklenemedi')
  }
}

async function handleAdd() {
  if (!addForm.value.fullName.trim()) {
    toast.error('Yolcu adı zorunludur')
    return
  }
  try {
    await serviceManifestsApi.addPassenger(props.manifestId, {
      seatNumber: addForm.value.seatNumber,
      fullName: addForm.value.fullName.trim(),
      nationality: addForm.value.nationality || undefined,
      idNumber: addForm.value.idNumber || undefined,
    })
    addForm.value = { seatNumber: undefined, fullName: '', nationality: 'T.C.', idNumber: '' }
    await loadPassengers()
    toast.success('Yolcu eklendi')
  } catch (err) {
    toast.apiError(err, 'Yolcu eklenemedi')
  }
}

function startEdit(passenger: UetdsPassenger) {
  editingId.value = passenger.id
  editForm.value = {
    seatNumber: passenger.seatNumber ?? undefined,
    fullName: passenger.fullName,
    nationality: passenger.nationality ?? '',
    idNumber: passenger.idNumber ?? '',
  }
}

function cancelEdit() {
  editingId.value = null
}

async function handleUpdate() {
  if (!editingId.value) return
  if (!editForm.value.fullName.trim()) {
    toast.error('Yolcu adı zorunludur')
    return
  }
  savingEdit.value = true
  try {
    await serviceManifestsApi.updatePassenger(props.manifestId, editingId.value, {
      seatNumber: editForm.value.seatNumber,
      fullName: editForm.value.fullName.trim(),
      nationality: editForm.value.nationality || undefined,
      idNumber: editForm.value.idNumber || undefined,
    })
    editingId.value = null
    await loadPassengers()
    toast.success('Yolcu güncellendi')
  } catch (err) {
    toast.apiError(err, 'Yolcu güncellenemedi')
  } finally {
    savingEdit.value = false
  }
}

async function handleDelete(passengerId: number) {
  try {
    await serviceManifestsApi.deletePassenger(props.manifestId, passengerId)
    await loadPassengers()
    toast.success('Yolcu silindi')
  } catch (err) {
    toast.apiError(err, 'Yolcu silinemedi')
  }
}

onMounted(loadPassengers)
watch(() => props.manifestId, loadPassengers)
</script>

<template>
  <FeatureGate feature="UETDS_PASSENGERS">
    <div id="yolcular" class="rc-card rc-animate-in">
      <div class="rc-card__head">
        <div class="rc-card__head-lead">
          <span class="rc-card__icon"><RcIcon name="users" :size="16" /></span>
          <div>
            <h2 class="rc-card__title">Yolcular</h2>
            <div class="rc-card__desc">Sefer yolcu listesi — tekil ekleme veya CSV/Excel toplu yükleme</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px">
          <RcBadge v-if="passengers.length > 0">{{ passengers.length }} yolcu</RcBadge>
          <RcButton variant="secondary" size="sm" @click="showImportModal = true">
            <RcIcon name="upload" :size="14" />
            Toplu yükle
          </RcButton>
        </div>
      </div>
      <div class="rc-card__body">
        <form class="rcs-form-grid" style="margin-bottom: 16px" @submit.prevent="handleAdd">
          <RcField label="Koltuk">
            <input v-model.number="addForm.seatNumber" type="number" min="1" class="rc-input rc-num" />
          </RcField>
          <RcField label="Ad soyad *">
            <input v-model="addForm.fullName" class="rc-input" required />
          </RcField>
          <RcField label="Uyruk">
            <input v-model="addForm.nationality" class="rc-input" />
          </RcField>
          <RcField label="Kimlik / pasaport">
            <input v-model="addForm.idNumber" class="rc-input" />
          </RcField>
          <div style="grid-column: 1 / -1">
            <RcButton type="submit" variant="secondary">Yolcu ekle</RcButton>
          </div>
        </form>

        <RcEmpty v-if="passengers.length === 0" title="Yolcu yok" description="Bu sefere yolcu ekleyebilirsiniz" />
        <table v-else class="rc-table rcv-table--slim">
          <thead>
            <tr>
              <th>Koltuk</th>
              <th>Ad soyad</th>
              <th>Uyruk</th>
              <th>Kimlik</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="passenger in passengers" :key="passenger.id">
              <template v-if="editingId === passenger.id">
                <td><input v-model.number="editForm.seatNumber" type="number" min="1" class="rc-input rc-num" /></td>
                <td><input v-model="editForm.fullName" class="rc-input" required /></td>
                <td><input v-model="editForm.nationality" class="rc-input" /></td>
                <td><input v-model="editForm.idNumber" class="rc-input" /></td>
                <td class="rc-right">
                  <RcButton variant="accent" size="sm" :disabled="savingEdit" @click="handleUpdate">Kaydet</RcButton>
                  <RcButton variant="ghost" size="sm" :disabled="savingEdit" @click="cancelEdit">Vazgeç</RcButton>
                </td>
              </template>
              <template v-else>
                <td>{{ passenger.seatNumber ?? '—' }}</td>
                <td>{{ passenger.fullName }}</td>
                <td>{{ passenger.nationality || '—' }}</td>
                <td>{{ passenger.idNumber || '—' }}</td>
                <td class="rc-right">
                  <RcButton variant="ghost" size="sm" @click="startEdit(passenger)">Düzenle</RcButton>
                  <RcButton variant="ghost" size="sm" @click="handleDelete(passenger.id)">Sil</RcButton>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>

      <PassengerImportModal
        :open="showImportModal"
        :manifest-id="manifestId"
        @close="showImportModal = false"
        @imported="loadPassengers"
      />
    </div>
  </FeatureGate>
</template>
