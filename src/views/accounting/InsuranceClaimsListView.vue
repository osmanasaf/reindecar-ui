<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountingStore } from '@/stores'
import { useToast, useAccountingStats, useEnumTranslations } from '@/composables'
import { SearchableSelect } from '@/components/common'
import InsuranceClaimsTable from '@/components/accounting/insurance-claims/InsuranceClaimsTable.vue'
import { RcPageHeader, RcButton, RcEmpty } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { fmtTRY } from '@/utils/format'
import { ClaimStatus, ClaimType } from '@/types'

const router = useRouter()
const accountingStore = useAccountingStore()
const toast = useToast()
const stats = useAccountingStats()
const { claimStatuses, claimTypes } = useEnumTranslations()

const claims = computed(() => accountingStore.insuranceClaims)
const loading = computed(() => accountingStore.claimsLoading)

const searchQuery = ref('')
const selectedType = ref<ClaimType | null>(null)
const statusChip = ref<'all' | ClaimStatus>('all')

const typeOptions = computed(() =>
  Object.values(ClaimType).map(t => ({ value: t, label: claimTypes[t] ?? t }))
)

const statusChips = computed(() => [
  { id: 'all' as const, label: 'Hepsi', count: claims.value.length },
  ...Object.values(ClaimStatus).map(s => ({
    id: s,
    label: claimStatuses[s] ?? s,
    count: claims.value.filter(c => c.status === s).length,
  })),
])

const filteredClaims = computed(() => {
  let result = [...claims.value]
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    result = result.filter(c =>
      c.claimNumber?.toLowerCase().includes(q)
      || c.vehiclePlate?.toLowerCase().includes(q)
    )
  }
  if (statusChip.value !== 'all') {
    result = result.filter(c => c.status === statusChip.value)
  }
  if (selectedType.value) {
    result = result.filter(c => c.claimType === selectedType.value)
  }
  return result
})

const hasFilters = computed(() =>
  !!searchQuery.value || !!selectedType.value || statusChip.value !== 'all'
)

onMounted(() => {
  void loadClaims()
})

async function loadClaims() {
  try {
    await accountingStore.fetchClaims()
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Sigorta başvuruları yüklenemedi')
  }
}

function handleClaimClick(id: number) {
  router.push({ name: 'claim-detail', params: { id } })
}

function clearFilters() {
  searchQuery.value = ''
  selectedType.value = null
  statusChip.value = 'all'
}
</script>

<template>
  <div class="rc-page rca-claims">
    <RcPageHeader
      title="Sigorta Başvuruları"
      subtitle="Sigorta şirketlerinden talep edilen tazminatlar"
    >
      <template #actions>
        <span class="rc-badge">Hasar raporlarından oluşturulur</span>
      </template>
    </RcPageHeader>

    <div class="rca-stats rca-stats--claims">
      <div class="rca-stat">
        <div class="rca-stat__label">Toplam başvuru</div>
        <div class="rca-stat__value rc-num">{{ stats.totalClaims.value }}</div>
      </div>
      <div class="rca-stat">
        <div class="rca-stat__label">Bekleyen</div>
        <div class="rca-stat__value rca-stat__value--warning rc-num">{{ stats.pendingClaimsCount.value }}</div>
      </div>
      <div class="rca-stat">
        <div class="rca-stat__label">Onaylanan</div>
        <div class="rca-stat__value rca-stat__value--success rc-num">{{ stats.approvedClaimsCount.value }}</div>
      </div>
      <div class="rca-stat">
        <div class="rca-stat__label">Toplam tazminat</div>
        <div class="rca-stat__value rc-num">{{ fmtTRY(stats.totalApprovedAmount.value) }}</div>
      </div>
    </div>

    <div class="rc-filterbar rcv-filterbar--slim">
      <div class="rc-input-group" style="width: 240px">
        <RcIcon name="search" class="rc-icon" :size="16" />
        <input v-model="searchQuery" type="search" placeholder="Başvuru no veya plaka…" />
      </div>
      <span class="rc-filterbar__sep" />
      <button
        v-for="chip in statusChips"
        :key="chip.id"
        type="button"
        class="rc-chip"
        :class="{ 'rc-chip--on': statusChip === chip.id }"
        @click="statusChip = chip.id"
      >
        {{ chip.label }}
        <span v-if="chip.count > 0" class="rc-chip__count">{{ chip.count }}</span>
      </button>
      <SearchableSelect
        :model-value="selectedType"
        :options="typeOptions"
        placeholder="Tüm tipler"
        search-placeholder="Tip ara..."
        clearable
        style="min-width: 160px"
        @update:model-value="(v) => selectedType = v as ClaimType | null"
      />
      <RcButton v-if="hasFilters" variant="ghost" size="sm" @click="clearFilters">Temizle</RcButton>
    </div>

    <div v-if="loading" class="rc-skeleton rc-card-skeleton" style="height: 280px" />

    <RcEmpty
      v-else-if="filteredClaims.length === 0"
      :title="hasFilters ? 'Sonuç bulunamadı' : 'Başvuru yok'"
      :description="hasFilters ? 'Filtreleri değiştirmeyi deneyin' : 'Henüz sigorta başvurusu bulunmuyor'"
    >
      <template #icon><RcIcon name="shield" :size="32" /></template>
    </RcEmpty>

    <InsuranceClaimsTable
      v-else
      :claims="filteredClaims"
      @row-click="handleClaimClick"
    />
  </div>
</template>

<style scoped>
.rca-stats--claims {
  grid-template-columns: repeat(4, 1fr);
}

@media (max-width: 900px) {
  .rca-stats--claims {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
