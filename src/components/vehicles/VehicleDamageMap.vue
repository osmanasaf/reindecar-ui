<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { damagesApi, serviceProvidersApi } from '@/api'
import { useToast } from '@/composables'
import type { VehicleDamageMap, DamageReport, MarkDamageRepairedForm } from '@/types'
import { DamageSeverity } from '@/types'
import { SEVERITY_COLORS, ZONE_NAMES } from '@/utils/vehicleZones'
import { RcButton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import CarDiagramSVG from './CarDiagramSVG.vue'
import CompletionModal from '@/components/CompletionModal.vue'
import DamageDetailModal from './DamageDetailModal.vue'

const props = defineProps<{
  vehicleId: number
}>()

const emit = defineEmits<{
  counts: [payload: { open: number; total: number }]
  'add-damage': [zoneId?: number]
  'edit-damage': [damageId: number]
}>()

type DamageFilter = 'all' | 'open' | 'repaired'

const toast = useToast()
const damageMap = ref<VehicleDamageMap | null>(null)
const loading = ref(false)
const damageFilter = ref<DamageFilter>('all')
const selectedDamageId = ref<number | null>(null)
const showRepairModal = ref(false)
const selectedDamage = ref<DamageReport | null>(null)
const damageForDetailModal = ref<DamageReport | null>(null)
const serviceProviders = ref<Array<{ id: number; name: string }>>([])

const allDamages = computed(() => damageMap.value?.damages ?? [])

const filteredDamages = computed(() => {
  if (damageFilter.value === 'open') return allDamages.value.filter(d => !d.repaired)
  if (damageFilter.value === 'repaired') return allDamages.value.filter(d => d.repaired)
  return allDamages.value
})

const openCount = computed(() => allDamages.value.filter(d => !d.repaired).length)
const fixedCount = computed(() => allDamages.value.filter(d => d.repaired).length)

const totalCost = computed(() =>
  allDamages.value.reduce((sum, d) => sum + (d.repairCostAmount || d.estimatedCostAmount || 0), 0)
)

const selectedDamageDetail = computed(() =>
  allDamages.value.find(d => d.id === selectedDamageId.value) ?? null
)

const damagePins = computed(() =>
  filteredDamages.value.map((d, i) => ({
    id: d.id,
    zoneId: d.zoneId,
    severity: d.severity,
    repaired: d.repaired,
    index: i + 1
  }))
)

const zoneConfigs = computed(() => {
  if (!damageMap.value) return {}

  const configs: Record<number, { color: string; onClick: () => void; opacity?: number }> = {}
  const allZones = [1, 2, 3, 4, 6, 7, 8, 9, 10, 12, 13]

  allZones.forEach(zoneId => {
    const activeDamagesInZone = damageMap.value!.damages.filter(d => d.zoneId === zoneId && !d.repaired)

    let color = '#4CAF50'
    if (activeDamagesInZone.length > 0) {
      const severityOrder = ['#B71C1C', '#D32F2F', '#F57C00', '#FBC02D']
      activeDamagesInZone.sort((a, b) => {
        const idxA = severityOrder.indexOf(a.severityColorCode)
        const idxB = severityOrder.indexOf(b.severityColorCode)
        return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99)
      })
      color = activeDamagesInZone[0]?.severityColorCode || '#F57C00'
    }

    configs[zoneId] = {
      color,
      onClick: () => handleZoneClick(zoneId),
      opacity: 1
    }
  })

  return configs
})

function pickDefaultSelection() {
  const list = filteredDamages.value
  if (selectedDamageId.value && list.some(d => d.id === selectedDamageId.value)) return
  const firstOpen = allDamages.value.find(d => !d.repaired)
  selectedDamageId.value = firstOpen?.id ?? list[0]?.id ?? null
}

async function fetchDamageMap() {
  loading.value = true
  try {
    damageMap.value = await damagesApi.getVehicleDamageMap(props.vehicleId, true)
    pickDefaultSelection()
  } catch {
    toast.error('Hasar haritası yüklenemedi')
  } finally {
    loading.value = false
  }
}

watch(damageFilter, pickDefaultSelection)

watch([openCount, allDamages], () => {
  emit('counts', { open: openCount.value, total: allDamages.value.length })
}, { immediate: true })

function handleZoneClick(zoneId: number) {
  const inFilter = filteredDamages.value.find(d => d.zoneId === zoneId)
  if (inFilter) {
    selectedDamageId.value = inFilter.id
    return
  }

  const inZone = allDamages.value.filter(d => d.zoneId === zoneId)
  if (inZone.length === 0) {
    emit('add-damage', zoneId)
    return
  }

  selectedDamageId.value = inZone[0]!.id
}

function handlePinClick(id: number) {
  selectedDamageId.value = id
}

function severityChipStyle(damage: DamageReport) {
  if (damage.repaired) {
    return { background: 'var(--rc-success-500)', color: 'white' }
  }
  const darkText = damage.severity === DamageSeverity.MINOR
  const bg =
    damage.severity === DamageSeverity.MAJOR || damage.severity === DamageSeverity.CRITICAL
      ? '#E5342E'
      : damage.severity === DamageSeverity.MODERATE
        ? '#FF9800'
        : '#FFC107'
  return { background: bg, color: darkText ? '#6B4A00' : 'white' }
}

function pinIndexFor(damage: DamageReport): number {
  const idx = filteredDamages.value.findIndex(d => d.id === damage.id)
  return idx >= 0 ? idx + 1 : 1
}

async function openRepairModal(damage: DamageReport) {
  selectedDamage.value = damage
  showRepairModal.value = true
  await fetchServiceProviders()
}

async function fetchServiceProviders() {
  try {
    const providers = await serviceProvidersApi.getAll(true)
    serviceProviders.value = providers.map(provider => ({
      id: provider.id,
      name: provider.name
    }))
  } catch (err) {
    toast.apiError(err, 'Servis sağlayıcı listesi yüklenemedi')
  }
}

function closeRepairModal() {
  showRepairModal.value = false
  selectedDamage.value = null
}

async function handleRepairSubmit(form: MarkDamageRepairedForm) {
  if (!selectedDamage.value) return
  try {
    await damagesApi.markAsRepaired(selectedDamage.value.id, form)
    toast.success('Hasar onarıldı olarak işaretlendi')
    closeRepairModal()
    await fetchDamageMap()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

function handleDamageDetailEdit(damageId: number) {
  damageForDetailModal.value = null
  emit('edit-damage', damageId)
}

defineExpose({ refresh: fetchDamageMap })

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR')
}

function formatCurrency(amount: number | null, currency: string | null): string {
  if (!amount) return '-'
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency || 'TRY'
  }).format(amount)
}

onMounted(() => {
  fetchDamageMap()
})
</script>

<template>
  <div class="rc-card rc-veh-damage-map">
    <div class="rc-card__head">
      <div>
        <div class="rc-card__title">Hasar haritası</div>
        <div v-if="damageMap && !loading" class="rc-veh-damage-map__sub">
          <template v-if="openCount === 0">
            Tüm hasarlar onarılmış. Son dönemde
            <b>{{ fixedCount }} onarım</b>
            · {{ formatCurrency(totalCost, 'TRY') }} toplam masraf.
          </template>
          <template v-else>
            <b class="rc-veh-damage-map__open">{{ openCount }} açık hasar</b>
            bekliyor · {{ fixedCount }} onarıldı · toplam {{ formatCurrency(totalCost, 'TRY') }}
          </template>
        </div>
      </div>
      <div class="rc-veh-damage-map__actions">
        <RcButton variant="ghost" size="sm" @click="toast.info('PDF raporu hazırlanıyor')">
          <RcIcon name="download" />
          Rapor
        </RcButton>
        <RcButton variant="accent" size="sm" @click="emit('add-damage')">
          <RcIcon name="plus" />
          Hasar ekle
        </RcButton>
      </div>
    </div>

    <div v-if="loading" class="rc-veh-damage-map__loading">
      <div class="rc-veh-damage-map__spinner" />
      <span>Hasar haritası yükleniyor...</span>
    </div>

    <template v-else-if="damageMap">
      <div class="rc-card__body rc-veh-damage-map__filters-wrap">
        <div class="rcv-dmg-filters">
          <button
            type="button"
            class="rc-chip"
            :class="{ 'rc-chip--on': damageFilter === 'all' }"
            @click="damageFilter = 'all'"
          >
            Tüm hasarlar
            <span class="rc-chip__count">{{ allDamages.length }}</span>
          </button>
          <button
            type="button"
            class="rc-chip"
            :class="{ 'rc-chip--on': damageFilter === 'open' }"
            @click="damageFilter = 'open'"
          >
            <span class="rc-dot rc-dot--warning" />
            Açık
            <span class="rc-chip__count">{{ openCount }}</span>
          </button>
          <button
            type="button"
            class="rc-chip"
            :class="{ 'rc-chip--on': damageFilter === 'repaired' }"
            @click="damageFilter = 'repaired'"
          >
            <span class="rc-dot rc-dot--success" />
            Onarıldı
            <span class="rc-chip__count">{{ fixedCount }}</span>
          </button>
        </div>
      </div>

      <div class="rc-card__body rc-veh-damage-map__body">
        <div class="rcv-dmg-layout">
          <div class="rcv-car3-wrap" data-rcv-car-wrap>
            <div class="rcv-car3-wrap__hint">Pin → seç · Boş bölge → yeni hasar</div>
            <div class="rcv-car3-wrap__viewchooser">
              <button type="button" class="on">Üstten</button>
              <button type="button" @click="toast.info('Yan görünüm yakında')">Yan</button>
            </div>
            <CarDiagramSVG
              :zones="zoneConfigs"
              :damage-pins="damagePins"
              :selected-damage-id="selectedDamageId"
              @pin-click="handlePinClick"
            />
          </div>

          <div class="rcv-dmg-detail">
            <template v-if="selectedDamageDetail">
              <div class="rcv-dmg-detail__head">
                <div
                  class="rcv-dmg-detail__sev-chip"
                  :style="severityChipStyle(selectedDamageDetail)"
                >
                  {{ pinIndexFor(selectedDamageDetail) }}
                </div>
                <div class="rcv-dmg-detail__title">
                  <b>{{ selectedDamageDetail.description || selectedDamageDetail.damageTypeDisplayName }}</b>
                  <small>
                    {{ selectedDamageDetail.damageTypeDisplayName }}
                    · {{ ZONE_NAMES[selectedDamageDetail.zoneId] }}
                  </small>
                </div>
              </div>

              <span
                v-if="selectedDamageDetail.repaired"
                class="rc-badge rc-badge--success rc-badge--dot rc-veh-damage-map__badge"
              >
                Onarıldı · {{ formatDate(selectedDamageDetail.repairedDate!) }}
              </span>
              <span
                v-else
                class="rc-badge rc-veh-damage-map__badge"
                :class="{
                  'rc-badge--danger':
                    selectedDamageDetail.severity === DamageSeverity.MAJOR ||
                    selectedDamageDetail.severity === DamageSeverity.CRITICAL,
                  'rc-badge--warning':
                    selectedDamageDetail.severity !== DamageSeverity.MAJOR &&
                    selectedDamageDetail.severity !== DamageSeverity.CRITICAL
                }"
              >
                {{ selectedDamageDetail.severityDisplayName }}
              </span>

              <div>
                <div class="rcv-dmg-detail__row">
                  <span>Bildirim tarihi</span>
                  <b class="rc-mono">{{ formatDate(selectedDamageDetail.reportDate) }}</b>
                </div>
                <div v-if="selectedDamageDetail.rentalId" class="rcv-dmg-detail__row">
                  <span>Kiralama</span>
                  <b class="rc-mono">#{{ selectedDamageDetail.rentalId }}</b>
                </div>
                <div class="rcv-dmg-detail__row">
                  <span>Lokasyon</span>
                  <b>{{ selectedDamageDetail.locationDisplayName }}</b>
                </div>
                <div v-if="selectedDamageDetail.estimatedCostAmount" class="rcv-dmg-detail__row">
                  <span>Tahmini bedel</span>
                  <b class="rc-num">
                    {{ formatCurrency(selectedDamageDetail.estimatedCostAmount, selectedDamageDetail.estimatedCostCurrency) }}
                  </b>
                </div>
                <div v-if="selectedDamageDetail.repairCostAmount" class="rcv-dmg-detail__row">
                  <span>Onarım bedeli</span>
                  <b class="rc-num rc-veh-damage-map__repair-cost">
                    {{ formatCurrency(selectedDamageDetail.repairCostAmount, selectedDamageDetail.repairCostCurrency) }}
                  </b>
                </div>
                <div v-if="selectedDamageDetail.reportedBy" class="rcv-dmg-detail__row">
                  <span>Rapor eden</span>
                  <b>{{ selectedDamageDetail.reportedBy }}</b>
                </div>
                <div v-if="selectedDamageDetail.customerName" class="rcv-dmg-detail__row">
                  <span>Müşteri</span>
                  <b>{{ selectedDamageDetail.customerName }}</b>
                </div>
                <div v-if="selectedDamageDetail.serviceProviderName" class="rcv-dmg-detail__row">
                  <span>Servis</span>
                  <b>{{ selectedDamageDetail.serviceProviderName }}</b>
                </div>
              </div>

              <div
                v-if="selectedDamageDetail.attachments?.length"
                class="rc-veh-damage-map__attachments"
              >
                <RcIcon name="folder" />
                {{ selectedDamageDetail.attachments.length }} dosya eki
              </div>

              <div class="rcv-dmg-detail__actions">
                <RcButton
                  v-if="!selectedDamageDetail.repaired"
                  variant="accent"
                  size="sm"
                  class="rcv-dmg-detail__action-btn"
                  @click="openRepairModal(selectedDamageDetail)"
                >
                  <RcIcon name="wrench" />
                  Onarıldı işaretle
                </RcButton>
                <RcButton
                  variant="secondary"
                  size="sm"
                  class="rcv-dmg-detail__action-btn"
                  @click="emit('edit-damage', selectedDamageDetail.id)"
                >
                  <RcIcon name="edit" />
                  Düzenle
                </RcButton>
                <RcButton
                  variant="secondary"
                  size="sm"
                  class="rcv-dmg-detail__action-btn"
                  @click="damageForDetailModal = selectedDamageDetail"
                >
                  <RcIcon name="receipt" />
                  Belgeler
                </RcButton>
              </div>
            </template>

            <div v-else class="rcv-dmg-detail__empty">
              <RcIcon name="info" class="rcv-dmg-detail__empty-icon" />
              <div>Detayı görmek için<br />haritadaki bir pini tıkla</div>
            </div>
          </div>
        </div>

        <div class="rc-damage-map__legend">
          <div class="rc-damage-map__leg-item">
            <span class="rc-damage-map__leg-chip" :style="{ background: SEVERITY_COLORS.MINOR }" />
            Küçük
          </div>
          <div class="rc-damage-map__leg-item">
            <span class="rc-damage-map__leg-chip" :style="{ background: SEVERITY_COLORS.MODERATE }" />
            Orta
          </div>
          <div class="rc-damage-map__leg-item">
            <span class="rc-damage-map__leg-chip" :style="{ background: SEVERITY_COLORS.MAJOR }" />
            Büyük
          </div>
          <div class="rc-damage-map__leg-item">
            <span class="rc-damage-map__leg-chip" :style="{ background: SEVERITY_COLORS.CRITICAL }" />
            Kritik
          </div>
          <div class="rc-damage-map__leg-item">
            <span class="rc-damage-map__leg-chip" style="background: var(--rc-success-500)" />
            Onarıldı
          </div>
        </div>
      </div>
    </template>

    <teleport to="body">
      <CompletionModal
        :show="showRepairModal"
        type="damage"
        title="Hasar Onarımını Tamamla"
        :estimated-cost="selectedDamage?.estimatedCostAmount ?? undefined"
        :has-rental="Boolean(selectedDamage?.rentalId)"
        :service-providers="serviceProviders"
        @close="closeRepairModal"
        @submit="(form) => handleRepairSubmit(form as MarkDamageRepairedForm)"
      />
    </teleport>

    <DamageDetailModal
      :damage="damageForDetailModal"
      :visible="damageForDetailModal !== null"
      @close="damageForDetailModal = null"
      @edit="handleDamageDetailEdit"
    />
  </div>
</template>
