import { ref, readonly } from 'vue'
import { navSummaryApi, type NavSummary } from '@/api/search.api'

const counts = ref<NavSummary | null>(null)
const loading = ref(false)

export function useShellNavCounts() {
  async function fetchNavCounts(): Promise<void> {
    if (loading.value) return
    loading.value = true
    try {
      counts.value = await navSummaryApi.getNavSummary()
    } catch {
      counts.value = null
    } finally {
      loading.value = false
    }
  }

  function countForNavItem(name: string): number | undefined {
    const c = counts.value
    if (!c) return undefined
    switch (name) {
      case 'rentals':
        return c.activeRentals > 0 ? c.activeRentals : undefined
      case 'vehicles':
        return c.totalVehicles > 0 ? c.totalVehicles : undefined
      case 'customers':
        return c.totalCustomers > 0 ? c.totalCustomers : undefined
      case 'finance':
        return c.pendingInstallmentPayments > 0 ? c.pendingInstallmentPayments : undefined
      default:
        return undefined
    }
  }

  return {
    counts: readonly(counts),
    loading: readonly(loading),
    fetchNavCounts,
    countForNavItem,
  }
}
