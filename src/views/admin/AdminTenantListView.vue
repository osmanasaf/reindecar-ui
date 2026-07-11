<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { adminTenantsApi } from '@/api'
import { useToast } from '@/composables'
import { RcPageHeader, RcButton, RcEmpty, RcBadge, RcModal, RcField, RcInput, RcTableSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { Tenant, TenantStatus } from '@/types/tenant'

const router = useRouter()
const toast = useToast()

const tenants = ref<Tenant[]>([])
const loading = ref(true)
const searchQuery = ref('')

const showCreateModal = ref(false)
const newTenantName = ref('')
const creating = ref(false)

const statusMeta: Record<TenantStatus, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  ACTIVE: { label: 'Aktif', variant: 'success' },
  SUSPENDED: { label: 'Askıda', variant: 'warning' },
  DELETED: { label: 'Silindi', variant: 'danger' },
}

const filteredTenants = computed(() => {
  if (!searchQuery.value.trim()) return tenants.value
  const q = searchQuery.value.toLowerCase()
  return tenants.value.filter(
    (t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q),
  )
})

async function loadTenants() {
  loading.value = true
  try {
    tenants.value = await adminTenantsApi.list()
  } catch (err) {
    toast.apiError(err, 'Firmalar yüklenemedi')
  } finally {
    loading.value = false
  }
}

function openDetail(tenant: Tenant) {
  router.push({ name: 'admin-tenant-detail', params: { id: tenant.id } })
}

async function handleCreate() {
  if (!newTenantName.value.trim()) {
    toast.error('Firma adı zorunludur')
    return
  }
  creating.value = true
  try {
    await adminTenantsApi.create({ name: newTenantName.value.trim() })
    toast.success('Firma oluşturuldu')
    showCreateModal.value = false
    newTenantName.value = ''
    await loadTenants()
  } catch (err) {
    toast.apiError(err, 'Firma oluşturulamadı')
  } finally {
    creating.value = false
  }
}

onMounted(loadTenants)
</script>

<template>
  <div class="rc-page">
    <RcPageHeader title="Firmalar" subtitle="Tüm kiracı (tenant) firmaların yönetimi">
      <template #actions>
        <RcButton variant="accent" @click="showCreateModal = true">
          <RcIcon name="plus" :size="14" />
          Yeni firma
        </RcButton>
      </template>
    </RcPageHeader>

    <RcTableSkeleton v-if="loading" :rows="8" :cols="4" />

    <template v-else>
      <div class="rc-filterbar rcv-filterbar--slim">
        <div class="rc-input-group" style="flex: 1; min-width: 240px">
          <RcIcon name="search" class="rc-icon" :size="16" />
          <input v-model="searchQuery" type="search" placeholder="Firma adı veya kodu…" />
        </div>
      </div>

      <RcEmpty
        v-if="filteredTenants.length === 0"
        title="Firma yok"
        description="Henüz kayıtlı firma bulunmuyor"
      >
        <template #icon><RcIcon name="building" :size="32" /></template>
      </RcEmpty>

      <div v-else class="rc-card" style="overflow: hidden">
        <table class="rc-table rcv-table--slim">
          <thead>
            <tr>
              <th>Firma</th>
              <th>Kod</th>
              <th>Durum</th>
              <th>Plan</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="tenant in filteredTenants"
              :key="tenant.id"
              style="cursor: pointer"
              @click="openDetail(tenant)"
            >
              <td>
                <div class="rcr-row__primary">{{ tenant.name }}</div>
                <div class="rcr-row__secondary">{{ tenant.contactEmail || '—' }}</div>
              </td>
              <td class="rc-mono">{{ tenant.code }}</td>
              <td><RcBadge :variant="statusMeta[tenant.status].variant">{{ statusMeta[tenant.status].label }}</RcBadge></td>
              <td>{{ tenant.subscriptionPlan || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <RcModal :open="showCreateModal" title="Yeni firma" @close="showCreateModal = false">
      <RcField label="Firma adı *">
        <RcInput v-model="newTenantName" placeholder="Örn: Altek Filo A.Ş." />
      </RcField>
      <template #footer>
        <RcButton variant="secondary" @click="showCreateModal = false">İptal</RcButton>
        <RcButton variant="accent" :loading="creating" @click="handleCreate">Oluştur</RcButton>
      </template>
    </RcModal>
  </div>
</template>
