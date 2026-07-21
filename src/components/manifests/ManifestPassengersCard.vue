<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { serviceManifestsApi } from '@/api'
import { useToast, useFeatures } from '@/composables'
import FeatureGate from '@/components/common/FeatureGate.vue'
import PassengerImportModal from './PassengerImportModal.vue'
import { RcButton, RcEmpty } from '@/components/rc'
import { RcIcon, type IconName } from '@/components/icons'
import type { UetdsPassenger, CreateUetdsPassengerRequest } from '@/types/manifest'

const props = defineProps<{
  manifestId: number
}>()

const toast = useToast()
const { isEnabled } = useFeatures()

const passengers = ref<UetdsPassenger[]>([])
const showImportModal = ref(false)
const savingEdit = ref(false)
const bulkDeleting = ref(false)
const editingId = ref<number | null>(null)
const search = ref('')
const selected = ref<Set<number>>(new Set())

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

type IdState = 'valid' | 'invalid' | 'foreign'

function isForeign(nationality?: string | null): boolean {
  const n = (nationality ?? '').trim().toUpperCase()
  return n !== '' && n !== 'T.C.' && n !== 'TC' && n !== 'TÜRKİYE' && n !== 'TURKIYE'
}

function idState(p: UetdsPassenger): IdState {
  if (isForeign(p.nationality)) return 'foreign'
  const id = (p.idNumber ?? '').trim()
  return /^\d{11}$/.test(id) ? 'valid' : 'invalid'
}

const ID_META: Record<IdState, { icon: IconName; cls: string }> = {
  valid: { icon: 'checkCircle', cls: 'mp-id--valid' },
  invalid: { icon: 'xCircle', cls: 'mp-id--invalid' },
  foreign: { icon: 'passport', cls: 'mp-id--foreign' },
}

const seatCounts = computed(() => {
  const counts: Record<number, number> = {}
  for (const p of passengers.value) {
    if (p.seatNumber != null) counts[p.seatNumber] = (counts[p.seatNumber] ?? 0) + 1
  }
  return counts
})

const validCount = computed(() => passengers.value.filter((p) => idState(p) !== 'invalid').length)
const errorCount = computed(() => passengers.value.filter((p) => idState(p) === 'invalid').length)
const conflictCount = computed(
  () => Object.values(seatCounts.value).filter((c) => c > 1).length,
)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return passengers.value
  return passengers.value.filter((p) =>
    `${p.fullName} ${p.idNumber ?? ''} ${p.seatNumber ?? ''}`.toLowerCase().includes(q),
  )
})

const allSelected = computed(
  () => filtered.value.length > 0 && filtered.value.every((p) => selected.value.has(p.id)),
)
const selectedCount = computed(() => selected.value.size)

function seatConflict(p: UetdsPassenger): boolean {
  return p.seatNumber != null && (seatCounts.value[p.seatNumber] ?? 0) > 1
}

async function loadPassengers() {
  if (!isEnabled('UETDS_PASSENGERS')) return
  try {
    passengers.value = await serviceManifestsApi.listPassengers(props.manifestId)
    pruneSelection()
  } catch (err) {
    toast.apiError(err, 'Yolcular yüklenemedi')
  }
}

function pruneSelection() {
  const ids = new Set(passengers.value.map((p) => p.id))
  const next = new Set<number>()
  selected.value.forEach((id) => ids.has(id) && next.add(id))
  selected.value = next
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

function toggleRow(id: number) {
  const next = new Set(selected.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selected.value = next
}

function toggleAll() {
  selected.value = allSelected.value ? new Set() : new Set(filtered.value.map((p) => p.id))
}

function clearSelection() {
  selected.value = new Set()
}

async function bulkDelete() {
  if (selected.value.size === 0) return
  const ids = Array.from(selected.value)
  bulkDeleting.value = true
  try {
    await serviceManifestsApi.bulkDeletePassengers(props.manifestId, ids)
    selected.value = new Set()
    await loadPassengers()
    toast.success(`${ids.length} yolcu silindi`)
  } catch (err) {
    toast.apiError(err, 'Yolcular silinemedi')
  } finally {
    bulkDeleting.value = false
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
            <div class="rc-card__desc">Sefer yolcu listesi · tekil ekle veya CSV/Excel toplu yükle</div>
          </div>
        </div>
        <RcButton variant="secondary" size="sm" @click="showImportModal = true">
          <RcIcon name="upload" :size="14" />
          Toplu yükle
        </RcButton>
      </div>

      <div class="rc-card__body">
        <!-- Doğrulama özeti -->
        <div v-if="passengers.length > 0" class="mp-summary">
          <span class="mp-chip mp-chip--ok">
            <RcIcon name="checkCircle" :size="13" :stroke-width="2" />
            {{ validCount }} geçerli
          </span>
          <span v-if="errorCount > 0" class="mp-chip mp-chip--err">
            <RcIcon name="xCircle" :size="13" :stroke-width="2" />
            {{ errorCount }} kimlik hatası
          </span>
          <span v-if="conflictCount > 0" class="mp-chip mp-chip--warn">
            <RcIcon name="warning" :size="13" :stroke-width="2" />
            {{ conflictCount }} koltuk çakışması
          </span>
        </div>

        <!-- Arama + toplu sil -->
        <div class="mp-tools">
          <div class="mp-search">
            <RcIcon name="search" :size="14" class="mp-search__icon" />
            <input v-model="search" class="mp-search__input" placeholder="Yolcu adı, kimlik veya koltuk…" />
          </div>
          <div v-if="selectedCount > 0" class="mp-bulk">
            <span class="mp-bulk__count">{{ selectedCount }} seçili</span>
            <button type="button" class="mp-bulk__del" :disabled="bulkDeleting" @click="bulkDelete">
              <RcIcon name="trash" :size="13" :stroke-width="1.8" />
              Sil
            </button>
            <button type="button" class="mp-bulk__clear" @click="clearSelection">Temizle</button>
          </div>
        </div>

        <!-- Hızlı ekleme satırı -->
        <form class="mp-add" @submit.prevent="handleAdd">
          <label class="mp-add__field">
            <span class="mp-add__label">Koltuk</span>
            <input v-model.number="addForm.seatNumber" type="number" min="1" class="rc-input rc-num" />
          </label>
          <label class="mp-add__field mp-add__field--grow">
            <span class="mp-add__label">Ad soyad *</span>
            <input v-model="addForm.fullName" class="rc-input" placeholder="Yolcu adı" required />
          </label>
          <label class="mp-add__field">
            <span class="mp-add__label">Uyruk</span>
            <input v-model="addForm.nationality" class="rc-input" />
          </label>
          <label class="mp-add__field">
            <span class="mp-add__label">Kimlik / pasaport</span>
            <input v-model="addForm.idNumber" class="rc-input" />
          </label>
          <RcButton type="submit" variant="primary" size="sm">Ekle</RcButton>
        </form>

        <RcEmpty
          v-if="passengers.length === 0"
          title="Yolcu yok"
          description="Bu sefere yolcu ekleyebilir veya toplu liste yükleyebilirsiniz"
        />

        <div v-else class="mp-table">
          <div class="mp-row mp-row--head">
            <button type="button" class="mp-check" :class="{ 'mp-check--on': allSelected }" @click="toggleAll">
              <RcIcon v-if="allSelected" name="check" :size="11" :stroke-width="3" />
            </button>
            <span>Koltuk</span>
            <span>Ad soyad</span>
            <span>Uyruk</span>
            <span>Kimlik</span>
            <span />
          </div>

          <template v-for="passenger in filtered" :key="passenger.id">
            <!-- Düzenleme -->
            <div v-if="editingId === passenger.id" class="mp-row mp-row--edit">
              <span />
              <input v-model.number="editForm.seatNumber" type="number" min="1" class="rc-input rc-input--xs rc-num" />
              <input v-model="editForm.fullName" class="rc-input rc-input--xs" required />
              <input v-model="editForm.nationality" class="rc-input rc-input--xs" />
              <input v-model="editForm.idNumber" class="rc-input rc-input--xs" />
              <div class="mp-actions">
                <button type="button" class="mp-icon-btn mp-icon-btn--ok" title="Kaydet" :disabled="savingEdit" @click="handleUpdate">
                  <RcIcon name="check" :size="14" :stroke-width="2" />
                </button>
                <button type="button" class="mp-icon-btn" title="Vazgeç" :disabled="savingEdit" @click="cancelEdit">
                  <RcIcon name="close" :size="13" :stroke-width="2" />
                </button>
              </div>
            </div>

            <!-- Görüntüleme -->
            <div v-else class="mp-row mp-row--body" :class="{ 'mp-row--selected': selected.has(passenger.id) }">
              <button
                type="button"
                class="mp-check"
                :class="{ 'mp-check--on': selected.has(passenger.id) }"
                @click="toggleRow(passenger.id)"
              >
                <RcIcon v-if="selected.has(passenger.id)" name="check" :size="11" :stroke-width="3" />
              </button>
              <span class="mp-seat rc-mono" :class="{ 'mp-seat--conflict': seatConflict(passenger) }">
                {{ passenger.seatNumber ?? '—' }}
              </span>
              <span class="mp-name">{{ passenger.fullName }}</span>
              <span class="mp-nat">{{ passenger.nationality || '—' }}</span>
              <span class="mp-id" :class="ID_META[idState(passenger)].cls">
                <RcIcon :name="ID_META[idState(passenger)].icon" :size="14" :stroke-width="1.8" />
                <span class="rc-mono">{{ passenger.idNumber || 'eksik' }}</span>
              </span>
              <div class="mp-actions">
                <button type="button" class="mp-icon-btn" title="Düzenle" @click="startEdit(passenger)">
                  <RcIcon name="edit" :size="14" :stroke-width="1.7" />
                </button>
                <button type="button" class="mp-icon-btn mp-icon-btn--danger" title="Sil" @click="handleDelete(passenger.id)">
                  <RcIcon name="trash" :size="14" :stroke-width="1.7" />
                </button>
              </div>
            </div>
          </template>

          <div v-if="filtered.length === 0" class="mp-empty-inline">
            "{{ search }}" ile eşleşen yolcu yok
          </div>
        </div>
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

<style scoped>
.mp-summary { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.mp-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--rc-r-full);
}
.mp-chip--ok { background: var(--rc-success-50); color: var(--rc-success-700); }
.mp-chip--err { background: var(--rc-danger-50); color: var(--rc-danger-700); }
.mp-chip--warn { background: var(--rc-warning-50); color: var(--rc-warning-700); }

.mp-tools { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.mp-search { position: relative; flex: 1; max-width: 280px; }
.mp-search__icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--rc-text-faint); }
.mp-search__input {
  width: 100%;
  height: 34px;
  padding: 0 12px 0 30px;
  background: var(--rc-surface);
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-r-8);
  font-size: 12.5px;
  outline: none;
  transition: border-color var(--rc-dur-base), box-shadow var(--rc-dur-base);
}
.mp-search__input:focus { border-color: var(--rc-accent); box-shadow: var(--rc-focus-ring); }

.mp-bulk {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 6px 5px 14px;
  border-radius: var(--rc-r-8);
  background: var(--rc-danger-50);
}
.mp-bulk__count { font-size: 12.5px; font-weight: 600; color: var(--rc-danger-700); }
.mp-bulk__del {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 11px;
  border-radius: var(--rc-r-6);
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: var(--rc-danger-500);
}
.mp-bulk__del:disabled { opacity: 0.6; cursor: not-allowed; }
.mp-bulk__clear { font-size: 12px; font-weight: 500; color: var(--rc-danger-700); padding: 0 4px; }

/* Hızlı ekle */
.mp-add {
  display: grid;
  grid-template-columns: 76px 1fr 120px 150px auto;
  gap: 10px;
  align-items: end;
  padding: 12px;
  border: 1px dashed var(--rc-border-strong);
  border-radius: var(--rc-r-10);
  background: var(--rc-surface-2);
  margin-bottom: 12px;
}
.mp-add__field { display: flex; flex-direction: column; gap: 5px; }
.mp-add__label { font-size: 11px; font-weight: 500; color: var(--rc-text-muted); }

/* Tablo */
.mp-table { border: 1px solid var(--rc-border-subtle); border-radius: var(--rc-r-10); overflow: hidden; }
.mp-row {
  display: grid;
  grid-template-columns: 40px 66px 1fr 120px 170px 76px;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--rc-border-subtle);
}
.mp-row--head {
  padding: 9px 12px;
  background: var(--rc-surface-2);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: var(--rc-tracking-wide);
  text-transform: uppercase;
  color: var(--rc-text-faint);
}
.mp-row--body { transition: background var(--rc-dur-fast); }
.mp-row--body:hover { background: var(--rc-surface-hover); }
.mp-row:last-child { border-bottom: none; }
.mp-row--selected { background: var(--rc-accent-subtle); }
.mp-row--edit { background: var(--rc-surface-2); }

.mp-check {
  width: 18px;
  height: 18px;
  border-radius: var(--rc-r-4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  border: 1.5px solid var(--rc-border-strong);
  background: transparent;
  transition: background var(--rc-dur-fast), border-color var(--rc-dur-fast);
}
.mp-check--on { border-color: var(--rc-accent); background: var(--rc-accent); }

.mp-seat {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 24px;
  border-radius: var(--rc-r-6);
  font-size: 12px;
  font-weight: 600;
  background: var(--rc-surface-2);
  color: var(--rc-text-soft);
}
.mp-seat--conflict { background: var(--rc-warning-50); color: var(--rc-warning-700); }
.mp-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--rc-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mp-nat { font-size: 12.5px; color: var(--rc-text-soft); }
.mp-id {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 12px;
}
.mp-id .rc-mono { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mp-id--valid { color: var(--rc-text-soft); }
.mp-id--valid > :first-child { color: var(--rc-success-500); }
.mp-id--invalid { color: var(--rc-danger-700); }
.mp-id--invalid > :first-child { color: var(--rc-danger-500); }
.mp-id--foreign { color: var(--rc-text-soft); }
.mp-id--foreign > :first-child { color: var(--rc-blue-500); }

.mp-actions { display: flex; gap: 4px; justify-content: flex-end; }
.mp-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--rc-r-6);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--rc-text-muted);
  transition: background var(--rc-dur-fast), color var(--rc-dur-fast);
}
.mp-icon-btn:hover { background: var(--rc-surface-hover); color: var(--rc-text); }
.mp-icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.mp-icon-btn--ok { color: var(--rc-success-700); background: var(--rc-success-50); }
.mp-icon-btn--danger:hover { background: var(--rc-danger-50); color: var(--rc-danger-700); }

.mp-empty-inline { padding: 28px; text-align: center; color: var(--rc-text-muted); font-size: 13px; }

:deep(.rc-input--xs) { height: 30px; padding: 0 8px; font-size: 12px; }

@media (max-width: 720px) {
  .mp-add { grid-template-columns: 1fr 1fr; }
  .mp-row { grid-template-columns: 34px 50px 1fr 64px; }
  .mp-row > :nth-child(5) { display: none; }
}
</style>
