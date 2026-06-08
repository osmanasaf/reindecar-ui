<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { customersApi } from '@/api'
import { usePagination, useToast } from '@/composables'
import CustomerQuickPreviewModal from '@/components/customers/CustomerQuickPreviewModal.vue'
import CustomerEditModal from '@/components/customers/CustomerEditModal.vue'
import { RcIcon } from '@/components/icons'
import {
  RcPageHeader,
  RcButton,
  RcBadge,
  RcAvatar,
  RcEmpty,
  RcKbd,
  RcListSkeleton,
  RcError,
} from '@/components/rc'
import { formatPhone, fmtTRY, formatDate } from '@/utils/format'
import { CustomerType } from '@/types'
import type { Customer, CustomerOverview } from '@/types'

type FilterKey = 'all' | 'personal' | 'company' | 'blacklisted' | 'owed'

const route = useRoute()
const router = useRouter()

const customers = ref<Customer[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')
const typeFilter = ref<FilterKey>('all')
const previewCustomer = ref<Customer | null>(null)
const showPreview = ref(false)
const showEditModal = ref(false)
const showCreateModal = ref(false)
const editCustomerId = ref<number | null>(null)
const createCustomerType = ref<CustomerType>(CustomerType.PERSONAL)

const overview = ref<CustomerOverview>({
  total: 0,
  personal: 0,
  company: 0,
  blacklisted: 0,
  newThisMonth: 0,
  withOutstandingBalance: 0,
  totalOutstandingAmount: 0,
})

const { page, totalElements, totalPages, setPage, setTotal, getParams } = usePagination()
const toast = useToast()

const typeLabels: Record<CustomerType, string> = {
  [CustomerType.PERSONAL]: 'Bireysel',
  [CustomerType.COMPANY]: 'Kurumsal',
}

const filterChips: { id: FilterKey; label: string }[] = [
  { id: 'all', label: 'Hepsi' },
  { id: 'personal', label: 'Bireysel' },
  { id: 'company', label: 'Kurumsal' },
  { id: 'blacklisted', label: 'Kara liste' },
  { id: 'owed', label: 'Borçlu' },
]

const corporatePct = computed(() => {
  if (!overview.value.total) return 0
  return Math.round((overview.value.company / overview.value.total) * 100)
})

function chipCount(id: FilterKey): number {
  if (id === 'all') return overview.value.total
  if (id === 'personal') return overview.value.personal
  if (id === 'company') return overview.value.company
  if (id === 'blacklisted') return overview.value.blacklisted
  return overview.value.withOutstandingBalance
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function applyClientFilters(rows: Customer[]): Customer[] {
  let result = rows
  if (typeFilter.value === 'personal') {
    result = result.filter((c) => c.customerType === 'PERSONAL')
  } else if (typeFilter.value === 'company') {
    result = result.filter((c) => c.customerType === 'COMPANY')
  } else if (typeFilter.value === 'blacklisted') {
    result = result.filter((c) => c.blacklisted)
  } else if (typeFilter.value === 'owed') {
    result = result.filter((c) => (c.outstandingBalance ?? 0) > 0)
  }
  return result
}

async function fetchOverview() {
  try {
    overview.value = await customersApi.getOverview()
  } catch {
    try {
      const [all, personal, company, blacklisted] = await Promise.all([
        customersApi.getAll({ page: 0, size: 1 }),
        customersApi.getByType(CustomerType.PERSONAL, { page: 0, size: 1 }),
        customersApi.getByType(CustomerType.COMPANY, { page: 0, size: 1 }),
        customersApi.getBlacklisted({ page: 0, size: 1 }),
      ])
      overview.value = {
        ...overview.value,
        total: all.totalElements,
        personal: personal.totalElements,
        company: company.totalElements,
        blacklisted: blacklisted.totalElements,
      }
    } catch {
      toast.error('Müşteri özeti yüklenemedi')
    }
  }
}

async function fetchCustomers() {
  loading.value = true
  error.value = null
  try {
    const q = searchQuery.value.trim()

    if (typeFilter.value === 'blacklisted' && !q) {
      const response = await customersApi.getBlacklisted(getParams())
      customers.value = response.content
      setTotal(response.totalElements, response.totalPages)
      return
    }

    if (typeFilter.value === 'owed' && !q) {
      const response = await customersApi.getAll(getParams())
      customers.value = applyClientFilters(response.content)
      setTotal(response.totalElements, response.totalPages)
      return
    }

    if (q.length >= 2) {
      const response = await customersApi.search(q, getParams())
      customers.value = applyClientFilters(response.content)
      setTotal(response.totalElements, response.totalPages)
      return
    }

    if (typeFilter.value === 'personal') {
      const response = await customersApi.getByType(CustomerType.PERSONAL, getParams())
      customers.value = response.content
      setTotal(response.totalElements, response.totalPages)
      return
    }

    if (typeFilter.value === 'company') {
      const response = await customersApi.getByType(CustomerType.COMPANY, getParams())
      customers.value = response.content
      setTotal(response.totalElements, response.totalPages)
      return
    }

    const response = await customersApi.getAll(getParams())
    customers.value = response.content
    setTotal(response.totalElements, response.totalPages)
  } catch {
    error.value = 'Müşteriler yüklenirken hata oluştu'
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

function setFilter(next: FilterKey) {
  if (typeFilter.value === next) return
  typeFilter.value = next
  setPage(0)
  fetchCustomers()
}

function handlePageChange(newPage: number) {
  setPage(newPage)
  fetchCustomers()
}

function openPreview(customer: Customer) {
  previewCustomer.value = customer
  showPreview.value = true
}

function closePreview() {
  showPreview.value = false
  previewCustomer.value = null
}

function openCreateModal(type: CustomerType = CustomerType.PERSONAL) {
  createCustomerType.value = type
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
  if (route.query.create) {
    router.replace({ name: 'customers', query: {} })
  }
}

function openEditFromPreview(customerId: number) {
  editCustomerId.value = customerId
  showEditModal.value = true
}

async function onCustomerEdited() {
  await fetchOverview()
  await fetchCustomers()
}

async function onCustomerCreated(customerId: number) {
  await fetchOverview()
  await fetchCustomers()
  closeCreateModal()
  try {
    const customer = await customersApi.getById(customerId)
    openPreview(customer)
  } catch {
    // liste güncellendi; önizleme opsiyonel
  }
}

function syncCreateFromQuery() {
  if (route.query.create !== '1') return
  const qType = String(route.query.type ?? '').toUpperCase()
  openCreateModal(qType === 'COMPANY' ? CustomerType.COMPANY : CustomerType.PERSONAL)
}

watch(() => route.query.create, syncCreateFromQuery)

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    setPage(0)
    fetchCustomers()
  }, 300)
})

onMounted(async () => {
  await fetchOverview()
  await fetchCustomers()
  syncCreateFromQuery()
})
</script>

<template>
  <div class="rc-page">
    <RcPageHeader
      title="Müşteriler"
      subtitle="Müşteri tabanı, segment dağılımı ve durum özeti"
    >
      <template #actions>
        <button type="button" class="rc-btn rc-btn--accent" @click="openCreateModal(CustomerType.PERSONAL)">
          <RcIcon name="plus" :size="14" />
          Müşteri ekle
        </button>
      </template>
    </RcPageHeader>

    <div class="rcv-hero-strip">
      <div class="rcv-hs__zone">
        <div class="rcv-hs__eyebrow">
          <RcIcon name="users" :size="14" />
          Müşteri tabanı
        </div>
        <div class="rcv-hs__stat-value rc-num">{{ overview.total }}</div>
        <div v-if="overview.newThisMonth > 0" style="font-size: 12.5px; color: var(--rc-success-700); font-weight: 500">
          +{{ overview.newThisMonth }} bu ay
        </div>
        <div class="rcv-hs__legend">
          <div class="rcv-hs__legend-row">
            <span class="rc-dot rc-dot--accent" />
            <span>Bireysel</span>
            <span class="rc-num">{{ overview.personal }}</span>
          </div>
          <div class="rcv-hs__legend-row">
            <span class="rc-dot" style="background: var(--rc-purple-500)" />
            <span>Kurumsal</span>
            <span class="rc-num">{{ overview.company }}</span>
          </div>
        </div>
      </div>

      <div class="rcv-hs__zone">
        <div class="rcv-hs__eyebrow">
          <RcIcon name="warning" :size="14" />
          Dikkat gerektiren
        </div>
        <div class="rcv-hs__lead">
          <em>{{ overview.blacklisted }} müşteri</em> kara listede,<br />
          <b>{{ fmtTRY(overview.totalOutstandingAmount) }}</b> açık alacak var.
        </div>
        <div class="rcv-hs__quick">
          <button
            type="button"
            class="rcv-hs__chip rcv-hs__chip--danger"
            @click="setFilter('blacklisted')"
          >
            <RcIcon name="warning" :size="14" />
            Kara liste
            <span class="rcv-hs__chip-count">{{ overview.blacklisted }}</span>
          </button>
          <button
            type="button"
            class="rcv-hs__chip rcv-hs__chip--warn"
            @click="setFilter('owed')"
          >
            <RcIcon name="cash" :size="14" />
            Borçlu
            <span class="rcv-hs__chip-count">{{ overview.withOutstandingBalance }}</span>
          </button>
        </div>
      </div>

      <div class="rcv-hs__zone">
        <div class="rcv-hs__eyebrow">
          <RcIcon name="trend" :size="14" />
          Segment dağılımı
        </div>
        <div class="rcv-hs__lead">
          Müşterilerin <b>%{{ corporatePct }}</b>'i kurumsal segmentte.
        </div>
        <div style="font-size: 12px; color: var(--rc-text-muted); margin-top: auto">
          {{ overview.company }} kurumsal · {{ overview.personal }} bireysel
        </div>
      </div>
    </div>

    <div class="rc-filterbar rcv-filterbar--slim">
      <div class="rc-input-group" style="width: 280px">
        <RcIcon name="search" :size="16" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Ad, telefon, e-posta ara…"
          autocomplete="off"
        />
        <RcKbd>/</RcKbd>
      </div>
      <span class="rc-filterbar__sep" />
      <button
        v-for="chip in filterChips"
        :key="chip.id"
        type="button"
        class="rc-chip"
        :class="{ 'rc-chip--on': typeFilter === chip.id }"
        @click="setFilter(chip.id)"
      >
        {{ chip.label }}
        <span class="rc-chip__count">{{ chipCount(chip.id) }}</span>
      </button>
    </div>

    <RcListSkeleton v-if="loading" :rows="8" />

    <RcError
      v-else-if="error"
      :message="error"
      @retry="fetchCustomers"
    />

    <RcEmpty
      v-else-if="customers.length === 0"
      title="Eşleşen müşteri yok"
      description="Filtreyi veya aramayı değiştirin"
    >
      <template #icon>
        <RcIcon name="search" :size="32" />
      </template>
    </RcEmpty>

    <div v-else class="rc-card" style="overflow: hidden">
      <table class="rc-table rcv-table--slim">
        <thead>
          <tr>
            <th>Müşteri</th>
            <th>Tip</th>
            <th>İletişim</th>
            <th>Şehir</th>
            <th class="rc-right">Kiralama</th>
            <th class="rc-right">Bakiye</th>
            <th>Son aktivite</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="customer in customers"
            :key="customer.id"
            style="cursor: pointer"
            @click="openPreview(customer)"
          >
            <td>
              <div style="display: flex; align-items: center; gap: 12px">
                <RcAvatar size="sm">{{ initials(customer.displayName) }}</RcAvatar>
                <div style="min-width: 0">
                  <div class="rcv-row__primary">{{ customer.displayName }}</div>
                  <div class="rcv-row__plate">{{ customer.publicId }}</div>
                </div>
              </div>
            </td>
            <td>
              <RcBadge :variant="customer.customerType === 'COMPANY' ? 'purple' : 'accent'">
                {{ typeLabels[customer.customerType] }}
              </RcBadge>
            </td>
            <td>
              <div class="rcv-row__primary">{{ formatPhone(customer.phone) }}</div>
              <div v-if="customer.email" class="rcv-row__secondary">{{ customer.email }}</div>
            </td>
            <td>{{ customer.city || '—' }}</td>
            <td class="rc-right rc-num">{{ customer.totalRentals ?? 0 }}</td>
            <td class="rc-right rc-num">
              <span
                v-if="(customer.outstandingBalance ?? 0) > 0"
                style="color: var(--rc-warning-700); font-weight: 500"
              >
                {{ fmtTRY(customer.outstandingBalance!) }}
              </span>
              <span v-else style="color: var(--rc-text-faint)">—</span>
            </td>
            <td>
              <span v-if="customer.lastActivityAt" style="font-size: 12.5px; color: var(--rc-text-soft)">
                {{ formatDate(customer.lastActivityAt) }}
              </span>
              <span v-else style="color: var(--rc-text-faint)">—</span>
            </td>
            <td>
              <RcBadge v-if="customer.blacklisted" variant="danger" dot>Kara liste</RcBadge>
              <RcBadge v-else variant="success" dot>Aktif</RcBadge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="!loading && customers.length > 0 && typeFilter !== 'owed' && totalPages > 1"
      class="rc-filterbar"
      style="justify-content: center; margin-top: 20px"
    >
      <RcButton variant="secondary" :disabled="page === 0" @click="handlePageChange(page - 1)">
        Önceki
      </RcButton>
      <span style="font-size: 13px; color: var(--rc-text-muted)">
        Sayfa {{ page + 1 }} / {{ totalPages }} · {{ totalElements }} kayıt
      </span>
      <RcButton
        variant="secondary"
        :disabled="page + 1 >= totalPages"
        @click="handlePageChange(page + 1)"
      >
        Sonraki
      </RcButton>
    </div>

    <CustomerQuickPreviewModal
      :open="showPreview"
      :customer="previewCustomer"
      @close="closePreview"
      @edit="openEditFromPreview"
    />

    <CustomerEditModal
      :open="showEditModal"
      :customer-id="editCustomerId"
      @close="showEditModal = false"
      @saved="onCustomerEdited"
    />

    <CustomerEditModal
      :open="showCreateModal"
      :customer-id="null"
      :initial-type="createCustomerType"
      @close="closeCreateModal"
      @saved="onCustomerCreated"
    />
  </div>
</template>
