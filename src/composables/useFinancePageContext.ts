import { inject, type Ref } from 'vue'
import type { AccountingSummaryResponse } from '@/types'

export const FINANCE_PAGE_KEY = Symbol('financePage')

export interface FinancePageContext {
  summary: Ref<AccountingSummaryResponse | null>
  installmentCount: Ref<number>
  loading: Ref<boolean>
  refresh: () => Promise<void>
}

export function useFinancePageContext(): FinancePageContext | undefined {
  return inject(FINANCE_PAGE_KEY)
}
