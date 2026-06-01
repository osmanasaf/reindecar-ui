<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { customersApi, rentalsApi, receivablesApi } from '@/api'
import { RcModal, RcButton, RcBadge, RcAvatar, RcStatusPill } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { fmtTRY, formatPhone, formatDate } from '@/utils/format'
import type { Customer, CustomerStats, CustomerType, Rental } from '@/types'

const props = defineProps<{
  open: boolean
  customer: Customer | null
}>()

const emit = defineEmits<{
  close: []
  edit: [customerId: number]
}>()

const router = useRouter()
const loading = ref(false)
const stats = ref<CustomerStats | null>(null)
const recentRentals = ref<Rental[]>([])
const outstandingBalance = ref(0)

const typeLabels: Record<CustomerType, string> = {
  PERSONAL: 'Bireysel',
  COMPANY: 'Kurumsal',
}

const factCards = computed(() => {
  if (!stats.value) return []
  const owed = outstandingBalance.value
  return [
    {
      label: 'Toplam harcama',
      value: fmtTRY(stats.value.totalSpending),
      sub: `${stats.value.totalCompletedRentals} kiralama`,
    },
    {
      label: 'Tamamlanan',
      value: String(stats.value.totalCompletedRentals),
      sub: props.customer?.totalRentals ? `${props.customer.totalRentals} toplam kayıt` : 'kiralama',
    },
    {
      label: 'Aktif kiralama',
      value: stats.value.hasActiveRental ? 'Var' : 'Yok',
      sub: stats.value.hasActiveRental ? 'devam ediyor' : 'açık yok',
      tone: stats.value.hasActiveRental ? 'success' : undefined,
    },
    {
      label: 'Açık bakiye',
      value: fmtTRY(owed),
      sub: owed > 0 ? 'tahsil edilecek' : 'borç yok',
      tone: owed > 0 ? 'warn' as const : 'success' as const,
    },
  ]
})

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function identityLabel(customer: Customer): string {
  if (customer.customerType === 'COMPANY') {
    const tax = customer.companyInfo?.taxNumber || customer.taxNumber
    return tax ? `VKN · ${tax.slice(0, 3)}***` : 'Kurumsal müşteri'
  }
  const id = customer.personalInfo?.nationalId || customer.nationalId
  return id ? `TCKN · ${id.slice(0, 3)}***` : 'Bireysel müşteri'
}

async function loadPreviewData(id: number) {
  loading.value = true
  stats.value = null
  recentRentals.value = []
  outstandingBalance.value = props.customer?.outstandingBalance ?? 0

  try {
    const [statsData, rentalPage, receivableRows] = await Promise.all([
      customersApi.getStats(id),
      rentalsApi.getByCustomer(id, { page: 0, size: 4, sort: 'startDate', direction: 'desc' }),
      receivablesApi.getByCustomer(id),
    ])
    stats.value = statsData
    recentRentals.value = rentalPage.content
    outstandingBalance.value = receivableRows
      .filter((r) => r.remainingAmount > 0)
      .reduce((sum, r) => sum + r.remainingAmount, 0)
  } catch {
    stats.value = null
  } finally {
    loading.value = false
  }
}

function openFullDetail() {
  if (!props.customer) return
  emit('close')
  router.push(`/customers/${props.customer.id}`)
}

function openEdit() {
  if (!props.customer) return
  emit('edit', props.customer.id)
}

function startRental() {
  if (!props.customer) return
  emit('close')
  router.push({ name: 'rental-create', query: { customerId: String(props.customer.id) } })
}

function openRental(rentalId: number) {
  emit('close')
  router.push(`/rentals/${rentalId}`)
}

watch(
  () => [props.open, props.customer?.id] as const,
  ([isOpen, id]) => {
    if (isOpen && id) loadPreviewData(id)
  },
)
</script>

<template>
  <RcModal
    :open="open && !!customer"
    wide
    class="rc-cust-quick-modal"
    @close="emit('close')"
  >
    <div v-if="customer" class="rc-cust-quick">
      <!-- Header -->
      <div class="rc-cust-quick__head">
        <RcAvatar size="lg" class="rc-cust-quick__avatar">{{ initials(customer.displayName) }}</RcAvatar>
        <div class="rc-cust-quick__identity">
          <div class="rc-cust-quick__badges">
            <span class="rcv-hero__plate">{{ customer.publicId }}</span>
            <RcBadge :variant="customer.customerType === 'COMPANY' ? 'purple' : 'accent'">
              {{ typeLabels[customer.customerType] }}
            </RcBadge>
            <RcBadge v-if="customer.blacklisted" variant="danger" dot>Kara liste</RcBadge>
            <RcBadge v-else variant="success" dot>Aktif</RcBadge>
          </div>
          <h2 class="rc-cust-quick__title">{{ customer.displayName }}</h2>
          <p class="rc-cust-quick__sub">
            <span v-if="customer.city">{{ customer.city }}</span>
            <span v-if="customer.createdAt"> · {{ formatDate(customer.createdAt) }}'den beri müşteri</span>
          </p>
        </div>
        <button type="button" class="rc-modal__close" aria-label="Kapat" @click="emit('close')">
          <RcIcon name="close" />
        </button>
      </div>

      <!-- Alert -->
      <div
        v-if="customer.blacklisted && customer.blacklistReason"
        class="rc-alert rc-alert--warning rc-cust-quick__alert"
      >
        <RcIcon name="warning" :size="16" />
        <span>{{ customer.blacklistReason }}</span>
      </div>

      <!-- Facts -->
      <div v-if="loading" class="rc-skeleton rc-cust-quick__facts-skeleton" />
      <div v-else-if="factCards.length" class="rc-cust-quick__facts">
        <div v-for="(fact, i) in factCards" :key="i" class="rc-cust-quick__fact">
          <div class="rc-cust-quick__fact-label">{{ fact.label }}</div>
          <div
            class="rc-cust-quick__fact-value rc-num"
            :class="{
              'rc-cust-quick__fact-value--success': fact.tone === 'success',
              'rc-cust-quick__fact-value--warn': fact.tone === 'warn',
            }"
          >
            {{ fact.value }}
          </div>
          <div class="rc-cust-quick__fact-sub">{{ fact.sub }}</div>
        </div>
      </div>

      <!-- Contact + recent rentals -->
      <div class="rc-cust-quick__cols">
        <div class="rc-cust-quick__col">
          <div class="rc-cust-quick__section-title">İletişim</div>
          <div class="rc-meta-row">
            <span class="rc-meta-row__label">Telefon</span>
            <a v-if="customer.phone" :href="`tel:${customer.phone}`" class="rc-meta-row__value rc-mono">
              {{ formatPhone(customer.phone) }}
            </a>
            <span v-else class="rc-meta-row__value">—</span>
          </div>
          <div class="rc-meta-row">
            <span class="rc-meta-row__label">E-posta</span>
            <a v-if="customer.email" :href="`mailto:${customer.email}`" class="rc-meta-row__value">
              {{ customer.email }}
            </a>
            <span v-else class="rc-meta-row__value">—</span>
          </div>
          <div class="rc-meta-row rc-meta-row--last">
            <span class="rc-meta-row__label">{{ customer.customerType === 'COMPANY' ? 'Vergi no' : 'Kimlik' }}</span>
            <span class="rc-meta-row__value rc-mono">{{ identityLabel(customer) }}</span>
          </div>
        </div>

        <div class="rc-cust-quick__col">
          <div class="rc-cust-quick__section-title">Son kiralamalar</div>
          <div v-if="loading" class="rc-skeleton" style="height: 80px" />
          <div v-else-if="recentRentals.length === 0" class="rc-cust-quick__empty">
            Henüz kiralama kaydı yok
          </div>
          <div v-else class="rc-cust-quick__rentals">
            <button
              v-for="rental in recentRentals"
              :key="rental.id"
              type="button"
              class="rc-cust-quick__rental-row"
              @click="openRental(rental.id)"
            >
              <span class="rc-mono rc-cust-quick__rental-no">{{ rental.rentalNumber }}</span>
              <span class="rc-cust-quick__rental-vehicle">{{ rental.vehiclePlate || rental.vehicleName || '—' }}</span>
              <RcStatusPill :status="rental.status" />
              <span class="rc-num rc-cust-quick__rental-price">{{ fmtTRY(rental.grandTotal) }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="rc-cust-quick__actions">
        <a v-if="customer.phone" :href="`tel:${customer.phone}`" class="rc-btn rc-btn--ghost rc-btn--sm">
          <RcIcon name="phone" :size="14" />
          Ara
        </a>
        <a v-if="customer.email" :href="`mailto:${customer.email}`" class="rc-btn rc-btn--ghost rc-btn--sm">
          <RcIcon name="mail" :size="14" />
          E-posta
        </a>
        <button
          type="button"
          class="rc-btn rc-btn--ghost rc-btn--sm rc-cust-quick__action-accent"
          :disabled="customer.blacklisted"
          @click="startRental"
        >
          <RcIcon name="plus" :size="14" />
          Yeni kiralama
        </button>
      </div>

      <!-- Footer -->
      <div class="rc-cust-quick__foot">
        <RcButton variant="ghost" @click="emit('close')">Kapat</RcButton>
        <span class="rc-spacer" />
        <RcButton variant="secondary" @click="openEdit">
          <RcIcon name="edit" :size="14" />
          Düzenle
        </RcButton>
        <RcButton variant="accent" @click="openFullDetail">
          Tam profile git
          <RcIcon name="arrowRight" :size="14" />
        </RcButton>
      </div>
    </div>
  </RcModal>
</template>

<style scoped>
:deep(.rc-modal__body) {
  padding: 0;
}

.rc-spacer {
  flex: 1;
}

a.rc-meta-row__value {
  color: var(--rc-blue-500);
  text-decoration: none;
}

a.rc-meta-row__value:hover {
  text-decoration: underline;
}
</style>
