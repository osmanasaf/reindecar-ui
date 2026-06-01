<script setup lang="ts">
import { ref, onMounted, provide } from 'vue'
import { accountingApi } from '@/api/accounting.api'
import { installmentsApi } from '@/api'
import { RcPageHeader } from '@/components/rc'
import FinanceNetBanner from './FinanceNetBanner.vue'
import FinanceSubNav from './FinanceSubNav.vue'
import { FINANCE_PAGE_KEY } from '@/composables/useFinancePageContext'
import type { AccountingSummaryResponse } from '@/types'

const summary = ref<AccountingSummaryResponse | null>(null)
const installmentCount = ref(0)
const loading = ref(false)

async function refresh(): Promise<void> {
  loading.value = true
  try {
    const [sum, dash] = await Promise.all([
      accountingApi.getSummary(),
      installmentsApi.getDashboard().catch(() => null),
    ])
    summary.value = sum
    installmentCount.value = dash?.vehiclesWithInstallments ?? 0
  } catch {
    summary.value = null
    installmentCount.value = 0
  } finally {
    loading.value = false
  }
}

provide(FINANCE_PAGE_KEY, { summary, installmentCount, loading, refresh })

onMounted(() => {
  void refresh()
})

defineExpose({ refresh })
</script>

<template>
  <div class="rc-page rca-finance">
    <RcPageHeader
      title="Alacak / Verecek"
      subtitle="Kiralama tahsilatları, tedarikçi ödemeleri ve araç taksitleri"
    >
      <template #actions>
        <slot name="actions" />
      </template>
    </RcPageHeader>

    <FinanceNetBanner :summary="summary" :loading="loading" />

    <FinanceSubNav
      :receivables-count="summary?.receivables.totalCount"
      :payables-count="summary?.payables.totalCount"
      :installments-count="installmentCount"
    />

    <slot />
  </div>
</template>
