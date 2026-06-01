import { BaseApi } from './client'

export interface NavSummary {
  activeRentals: number
  totalVehicles: number
  totalCustomers: number
  pendingInstallmentPayments: number
}

export interface GlobalSearchResult {
  vehicles: Array<{ id: number; plateNumber: string; label: string; subtitle: string | null }>
  customers: Array<{ id: number; label: string; subtitle: string | null }>
  rentals: Array<{ id: number; rentalNumber: string; label: string; subtitle: string | null }>
}

class SearchApiService extends BaseApi {
  protected readonly basePath = '/reports'

  async getNavSummary(): Promise<NavSummary> {
    return this.get<NavSummary>('/nav-summary')
  }
}

class GlobalSearchApiService extends BaseApi {
  protected readonly basePath = '/search'

  async search(q: string, limit = 5): Promise<GlobalSearchResult> {
    return this.get<GlobalSearchResult>('', { q, limit })
  }
}

export const navSummaryApi = new SearchApiService()
export const globalSearchApi = new GlobalSearchApiService()
