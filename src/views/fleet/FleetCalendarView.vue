<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { vehiclesApi, vehicleCategoriesApi, branchesApi } from '@/api'
import { useToast } from '@/composables'
import { RcPageHeader, RcButton, RcEmpty, RcTableSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import CalendarGrid from '@/components/fleet/CalendarGrid.vue'
import type { VehicleCategory, Branch } from '@/types'
import type { CalendarBlock, VehicleCalendarRow } from '@/types/calendar'

const router = useRouter()
const toast = useToast()

const loading = ref(true)
const rows = ref<VehicleCalendarRow[]>([])
const categories = ref<VehicleCategory[]>([])
const branches = ref<Branch[]>([])
const totalElements = ref(0)
const currentPage = ref(0)
const pageSize = ref(50)

function toIso(date: Date): string {
  return date.toISOString().split('T')[0] ?? ''
}

const today = new Date()
const rangeFrom = ref(toIso(today))
const rangeTo = ref(toIso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 27)))
const branchFilter = ref<number | null>(null)
const categoryFilter = ref<number | null>(null)
const searchQuery = ref('')
const hideDrafts = ref(false)

const totalPages = computed(() => Math.ceil(totalElements.value / pageSize.value) || 1)

const rangePresets = [
  { label: '2 Hafta', days: 13 },
  { label: '4 Hafta', days: 27 },
  { label: '2 Ay', days: 59 },
  { label: '3 Ay', days: 89 },
]

function applyPreset(days: number) {
  const start = new Date()
  rangeFrom.value = toIso(start)
  rangeTo.value = toIso(new Date(start.getFullYear(), start.getMonth(), start.getDate() + days))
  currentPage.value = 0
  void loadCalendar()
}

async function loadFilters() {
  try {
    const [categoryList, branchList] = await Promise.all([
      vehicleCategoriesApi.getAll(),
      branchesApi.getActive(),
    ])
    categories.value = categoryList
    branches.value = branchList
  } catch {
    // reference data is non-critical for the calendar itself
  }
}

async function loadCalendar() {
  if (!rangeFrom.value || !rangeTo.value) return
  if (rangeTo.value < rangeFrom.value) {
    toast.error('Bitiş tarihi başlangıçtan önce olamaz')
    return
  }
  loading.value = true
  try {
    const response = await vehiclesApi.getFleetCalendar({
      from: rangeFrom.value,
      to: rangeTo.value,
      branchId: branchFilter.value,
      categoryId: categoryFilter.value,
      search: searchQuery.value || undefined,
      page: currentPage.value,
      size: pageSize.value,
    })
    rows.value = response.content
    totalElements.value = response.totalElements
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Takvim yüklenemedi')
  } finally {
    loading.value = false
  }
}

function handleFilterChange() {
  currentPage.value = 0
  void loadCalendar()
}

function handlePageChange(page: number) {
  currentPage.value = page
  void loadCalendar()
}

function handleBlockClick(block: CalendarBlock) {
  if (block.blockType === 'RENTAL' && block.rentalId) {
    router.push({ name: 'rental-detail', params: { id: block.rentalId } })
  }
}

function handleEmptyRangeSelect(selection: { vehicleId: number; startDate: string; endDate: string }) {
  router.push({
    name: 'rental-create',
    query: {
      vehicleId: String(selection.vehicleId),
      startDate: selection.startDate,
      endDate: selection.endDate,
    },
  })
}

let searchDebounce: ReturnType<typeof setTimeout> | null = null
function handleSearchInput() {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    currentPage.value = 0
    void loadCalendar()
  }, 350)
}

onMounted(() => {
  void loadFilters()
  void loadCalendar()
})
</script>

<template>
  <div class="rc-page rcf-page">
    <RcPageHeader title="Filo Müsaitlik Takvimi" subtitle="Araç bazlı kiralama, rezervasyon ve servis dışı dönemler" />

    <div class="rc-filterbar">
      <div class="rcf-range-presets">
        <button
          v-for="preset in rangePresets"
          :key="preset.label"
          type="button"
          class="rc-chip"
          @click="applyPreset(preset.days)"
        >
          {{ preset.label }}
        </button>
      </div>

      <input v-model="rangeFrom" type="date" class="rc-input" style="width: auto" @change="handleFilterChange" />
      <span style="color: var(--rc-text-muted)">→</span>
      <input v-model="rangeTo" type="date" class="rc-input" style="width: auto" @change="handleFilterChange" />

      <select v-model="branchFilter" class="rc-input rcv-filter-select" @change="handleFilterChange">
        <option :value="null">Tüm şubeler</option>
        <option v-for="branch in branches" :key="branch.id" :value="branch.id">{{ branch.name }}</option>
      </select>

      <select v-model="categoryFilter" class="rc-input rcv-filter-select" @change="handleFilterChange">
        <option :value="null">Tüm kategoriler</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
      </select>

      <input
        v-model="searchQuery"
        type="text"
        class="rc-input"
        placeholder="Plaka ara..."
        style="width: 140px"
        @input="handleSearchInput"
      />

      <label class="rcf-toggle">
        <input v-model="hideDrafts" type="checkbox" />
        Taslakları gizle
      </label>
    </div>

    <RcTableSkeleton v-if="loading" :rows="8" :cols="1" />

    <RcEmpty
      v-else-if="rows.length === 0"
      title="Araç yok"
      description="Seçilen filtrelerle eşleşen araç bulunamadı"
    >
      <template #icon><RcIcon name="calendar" :size="32" /></template>
    </RcEmpty>

    <CalendarGrid
      v-else
      :rows="rows"
      :from="rangeFrom"
      :to="rangeTo"
      :hide-drafts="hideDrafts"
      @block-click="handleBlockClick"
      @empty-range-select="handleEmptyRangeSelect"
    />

    <div v-if="!loading && totalPages > 1" class="rca-pagination">
      <RcButton variant="secondary" :disabled="currentPage === 0" @click="handlePageChange(currentPage - 1)">
        Önceki
      </RcButton>
      <span style="font-size: 13px; color: var(--rc-text-muted)">Sayfa {{ currentPage + 1 }} / {{ totalPages }}</span>
      <RcButton variant="secondary" :disabled="currentPage >= totalPages - 1" @click="handlePageChange(currentPage + 1)">
        Sonraki
      </RcButton>
    </div>
  </div>
</template>

<style scoped>
.rcf-range-presets {
  display: flex;
  gap: 6px;
}
.rcf-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--rc-text-muted);
  cursor: pointer;
}
</style>
