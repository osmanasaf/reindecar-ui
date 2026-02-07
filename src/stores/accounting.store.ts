import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type {
  ReceivableResponse,
  PayableResponse,
  InsuranceClaimResponse,
  ServiceProviderResponse,
  RecordPaymentRequest,
  CreatePayableRequest,
  UpdatePayableRequest,
  CreateClaimRequest,
  ApproveClaimRequest,
  RejectClaimRequest,
  CreateServiceProviderRequest,
  UpdateServiceProviderRequest,
  ReceivableFilters,
  PayableFilters,
  ClaimFilters,
  PaginationParams
} from '@/types'
import {
  receivablesApi,
  payablesApi,
  insuranceClaimsApi,
  serviceProvidersApi
} from '@/api'

export const useAccountingStore = defineStore('accounting', () => {



  const receivables = ref<ReceivableResponse[]>([])
  const selectedReceivable = ref<ReceivableResponse | null>(null)
  const receivablesLoading = ref(false)
  const receivablesError = ref<string | null>(null)


  const payables = ref<PayableResponse[]>([])
  const selectedPayable = ref<PayableResponse | null>(null)
  const payablesLoading = ref(false)
  const payablesError = ref<string | null>(null)


  const insuranceClaims = ref<InsuranceClaimResponse[]>([])
  const selectedClaim = ref<InsuranceClaimResponse | null>(null)
  const claimsLoading = ref(false)
  const claimsError = ref<string | null>(null)


  const serviceProviders = ref<ServiceProviderResponse[]>([])
  const selectedProvider = ref<ServiceProviderResponse | null>(null)
  const providersLoading = ref(false)
  const providersError = ref<string | null>(null)




  const overdueReceivables = computed(() =>
    receivables.value.filter(r => r.status === 'OVERDUE')
  )

  const totalReceivablesAmount = computed(() =>
    receivables.value.reduce((sum, r) => sum + r.amount, 0)
  )

  const outstandingReceivablesAmount = computed(() =>
    receivables.value.reduce((sum, r) => sum + r.remainingAmount, 0)
  )


  const overduePayables = computed(() =>
    payables.value.filter(p => p.status === 'OVERDUE')
  )

  const totalPayablesAmount = computed(() =>
    payables.value.reduce((sum, p) => sum + p.amount, 0)
  )

  const outstandingPayablesAmount = computed(() =>
    payables.value.reduce((sum, p) => sum + p.remainingAmount, 0)
  )


  const pendingClaims = computed(() =>
    insuranceClaims.value.filter(c =>
      c.status === 'DRAFT' || c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW'
    )
  )

  const totalClaimedAmount = computed(() =>
    insuranceClaims.value.reduce((sum, c) => sum + c.claimedAmount, 0)
  )

  const totalApprovedAmount = computed(() =>
    insuranceClaims.value.reduce((sum, c) => sum + c.approvedAmount, 0)
  )


  const activeProviders = computed(() =>
    serviceProviders.value.filter(p => p.active)
  )



  async function fetchReceivables(filters?: ReceivableFilters, params?: PaginationParams) {
    receivablesLoading.value = true
    receivablesError.value = null
    try {
      const response = await receivablesApi.getAll(filters, params)
      receivables.value = response.content
      return response
    } catch (error: any) {
      receivablesError.value = error.message || 'Alacaklar yüklenirken hata oluştu'
      throw error
    } finally {
      receivablesLoading.value = false
    }
  }

  async function fetchReceivableById(id: number) {
    receivablesLoading.value = true
    receivablesError.value = null
    try {
      const receivable = await receivablesApi.getById(id)
      selectedReceivable.value = receivable
      return receivable
    } catch (error: any) {
      receivablesError.value = error.message || 'Alacak yüklenirken hata oluştu'
      throw error
    } finally {
      receivablesLoading.value = false
    }
  }

  async function fetchCustomerReceivables(customerId: number) {
    receivablesLoading.value = true
    receivablesError.value = null
    try {
      const data = await receivablesApi.getByCustomer(customerId)
      return data
    } catch (error: any) {
      receivablesError.value = error.message || 'Müşteri alacakları yüklenirken hata oluştu'
      throw error
    } finally {
      receivablesLoading.value = false
    }
  }

  async function fetchOverdueReceivables() {
    receivablesLoading.value = true
    receivablesError.value = null
    try {
      const data = await receivablesApi.getOverdue()
      return data
    } catch (error: any) {
      receivablesError.value = error.message || 'Vadesi geçmiş alacaklar yüklenirken hata oluştu'
      throw error
    } finally {
      receivablesLoading.value = false
    }
  }

  async function recordReceivablePayment(id: number, request: RecordPaymentRequest) {
    receivablesLoading.value = true
    receivablesError.value = null
    try {
      const updated = await receivablesApi.recordPayment(id, request)


      const index = receivables.value.findIndex(r => r.id === id)
      if (index !== -1) {
        receivables.value[index] = updated
      }


      if (selectedReceivable.value?.id === id) {
        selectedReceivable.value = updated
      }

      return updated
    } catch (error: any) {
      receivablesError.value = error.message || 'Ödeme kaydedilirken hata oluştu'
      throw error
    } finally {
      receivablesLoading.value = false
    }
  }

  async function markAsWrittenOff(id: number) {
    receivablesLoading.value = true
    receivablesError.value = null
    try {
      const updated = await receivablesApi.writeOff(id)

      const index = receivables.value.findIndex(r => r.id === id)
      if (index !== -1) {
        receivables.value[index] = updated
      }

      if (selectedReceivable.value?.id === id) {
        selectedReceivable.value = updated
      }

      return updated
    } catch (error: any) {
      receivablesError.value = error.message || 'Şüpheli alacak işaretlenirken hata oluştu'
      throw error
    } finally {
      receivablesLoading.value = false
    }
  }

  async function cancelReceivable(id: number) {
    receivablesLoading.value = true
    receivablesError.value = null
    try {
      const updated = await receivablesApi.cancel(id)

      const index = receivables.value.findIndex(r => r.id === id)
      if (index !== -1) {
        receivables.value[index] = updated
      }

      if (selectedReceivable.value?.id === id) {
        selectedReceivable.value = updated
      }

      return updated
    } catch (error: any) {
      receivablesError.value = error.message || 'Alacak iptal edilirken hata oluştu'
      throw error
    } finally {
      receivablesLoading.value = false
    }
  }



  async function fetchPayables(filters?: PayableFilters, params?: PaginationParams) {
    payablesLoading.value = true
    payablesError.value = null
    try {
      const response = await payablesApi.getAll(filters, params)
      payables.value = response.content
      return response
    } catch (error: any) {
      payablesError.value = error.message || 'Verecekler yüklenirken hata oluştu'
      throw error
    } finally {
      payablesLoading.value = false
    }
  }

  async function fetchPayableById(id: number) {
    payablesLoading.value = true
    payablesError.value = null
    try {
      const payable = await payablesApi.getById(id)
      selectedPayable.value = payable
      return payable
    } catch (error: any) {
      payablesError.value = error.message || 'Verecek yüklenirken hata oluştu'
      throw error
    } finally {
      payablesLoading.value = false
    }
  }

  async function createPayable(request: CreatePayableRequest) {
    payablesLoading.value = true
    payablesError.value = null
    try {
      const created = await payablesApi.create(request)
      payables.value.unshift(created)
      return created
    } catch (error: any) {
      payablesError.value = error.message || 'Verecek oluşturulurken hata oluştu'
      throw error
    } finally {
      payablesLoading.value = false
    }
  }

  async function updatePayable(id: number, request: UpdatePayableRequest) {
    payablesLoading.value = true
    payablesError.value = null
    try {
      const updated = await payablesApi.update(id, request)

      const index = payables.value.findIndex(p => p.id === id)
      if (index !== -1) {
        payables.value[index] = updated
      }

      if (selectedPayable.value?.id === id) {
        selectedPayable.value = updated
      }

      return updated
    } catch (error: any) {
      payablesError.value = error.message || 'Verecek güncellenirken hata oluştu'
      throw error
    } finally {
      payablesLoading.value = false
    }
  }

  async function recordPayablePayment(id: number, request: RecordPaymentRequest) {
    payablesLoading.value = true
    payablesError.value = null
    try {
      const updated = await payablesApi.recordPayment(id, request)

      const index = payables.value.findIndex(p => p.id === id)
      if (index !== -1) {
        payables.value[index] = updated
      }

      if (selectedPayable.value?.id === id) {
        selectedPayable.value = updated
      }

      return updated
    } catch (error: any) {
      payablesError.value = error.message || 'Ödeme kaydedilirken hata oluştu'
      throw error
    } finally {
      payablesLoading.value = false
    }
  }

  async function cancelPayable(id: number) {
    payablesLoading.value = true
    payablesError.value = null
    try {
      const updated = await payablesApi.cancel(id)

      const index = payables.value.findIndex(p => p.id === id)
      if (index !== -1) {
        payables.value[index] = updated
      }

      if (selectedPayable.value?.id === id) {
        selectedPayable.value = updated
      }

      return updated
    } catch (error: any) {
      payablesError.value = error.message || 'Verecek iptal edilirken hata oluştu'
      throw error
    } finally {
      payablesLoading.value = false
    }
  }



  async function fetchClaims(filters?: ClaimFilters, params?: PaginationParams) {
    claimsLoading.value = true
    claimsError.value = null
    try {
      const response = await insuranceClaimsApi.getAll(filters, params)
      insuranceClaims.value = response.content
      return response
    } catch (error: any) {
      claimsError.value = error.message || 'Sigorta başvuruları yüklenirken hata oluştu'
      throw error
    } finally {
      claimsLoading.value = false
    }
  }

  async function fetchClaimById(id: number) {
    claimsLoading.value = true
    claimsError.value = null
    try {
      const claim = await insuranceClaimsApi.getById(id)
      selectedClaim.value = claim
      return claim
    } catch (error: any) {
      claimsError.value = error.message || 'Sigorta başvurusu yüklenirken hata oluştu'
      throw error
    } finally {
      claimsLoading.value = false
    }
  }

  async function createClaim(request: CreateClaimRequest) {
    claimsLoading.value = true
    claimsError.value = null
    try {
      const created = await insuranceClaimsApi.create(request)
      insuranceClaims.value.unshift(created)
      return created
    } catch (error: any) {
      claimsError.value = error.message || 'Sigorta başvurusu oluşturulurken hata oluştu'
      throw error
    } finally {
      claimsLoading.value = false
    }
  }

  async function submitClaim(id: number) {
    claimsLoading.value = true
    claimsError.value = null
    try {
      const updated = await insuranceClaimsApi.submit(id)

      const index = insuranceClaims.value.findIndex(c => c.id === id)
      if (index !== -1) {
        insuranceClaims.value[index] = updated
      }

      if (selectedClaim.value?.id === id) {
        selectedClaim.value = updated
      }

      return updated
    } catch (error: any) {
      claimsError.value = error.message || 'Başvuru gönderilirken hata oluştu'
      throw error
    } finally {
      claimsLoading.value = false
    }
  }

  async function moveClaimToReview(id: number) {
    claimsLoading.value = true
    claimsError.value = null
    try {
      const updated = await insuranceClaimsApi.moveToReview(id)

      const index = insuranceClaims.value.findIndex(c => c.id === id)
      if (index !== -1) {
        insuranceClaims.value[index] = updated
      }

      if (selectedClaim.value?.id === id) {
        selectedClaim.value = updated
      }

      return updated
    } catch (error: any) {
      claimsError.value = error.message || 'Başvuru incelemeye alınırken hata oluştu'
      throw error
    } finally {
      claimsLoading.value = false
    }
  }

  async function approveClaim(id: number, request: ApproveClaimRequest) {
    claimsLoading.value = true
    claimsError.value = null
    try {
      const updated = await insuranceClaimsApi.approve(id, request)

      const index = insuranceClaims.value.findIndex(c => c.id === id)
      if (index !== -1) {
        insuranceClaims.value[index] = updated
      }

      if (selectedClaim.value?.id === id) {
        selectedClaim.value = updated
      }

      return updated
    } catch (error: any) {
      claimsError.value = error.message || 'Başvuru onaylanırken hata oluştu'
      throw error
    } finally {
      claimsLoading.value = false
    }
  }

  async function rejectClaim(id: number, request: RejectClaimRequest) {
    claimsLoading.value = true
    claimsError.value = null
    try {
      const updated = await insuranceClaimsApi.reject(id, request)

      const index = insuranceClaims.value.findIndex(c => c.id === id)
      if (index !== -1) {
        insuranceClaims.value[index] = updated
      }

      if (selectedClaim.value?.id === id) {
        selectedClaim.value = updated
      }

      return updated
    } catch (error: any) {
      claimsError.value = error.message || 'Başvuru reddedilirken hata oluştu'
      throw error
    } finally {
      claimsLoading.value = false
    }
  }

  async function recordClaimPayment(id: number, amount: number) {
    claimsLoading.value = true
    claimsError.value = null
    try {
      const updated = await insuranceClaimsApi.recordPayment(id, amount)

      const index = insuranceClaims.value.findIndex(c => c.id === id)
      if (index !== -1) {
        insuranceClaims.value[index] = updated
      }

      if (selectedClaim.value?.id === id) {
        selectedClaim.value = updated
      }

      return updated
    } catch (error: any) {
      claimsError.value = error.message || 'Tazminat ödemesi kaydedilirken hata oluştu'
      throw error
    } finally {
      claimsLoading.value = false
    }
  }



  async function fetchServiceProviders(activeOnly = true) {
    providersLoading.value = true
    providersError.value = null
    try {
      const data = await serviceProvidersApi.getAll(activeOnly)
      serviceProviders.value = data
      return data
    } catch (error: any) {
      providersError.value = error.message || 'Servis sağlayıcılar yüklenirken hata oluştu'
      throw error
    } finally {
      providersLoading.value = false
    }
  }

  async function fetchProviderById(id: number) {
    providersLoading.value = true
    providersError.value = null
    try {
      const provider = await serviceProvidersApi.getById(id)
      selectedProvider.value = provider
      return provider
    } catch (error: any) {
      providersError.value = error.message || 'Servis sağlayıcı yüklenirken hata oluştu'
      throw error
    } finally {
      providersLoading.value = false
    }
  }

  async function fetchProvidersByType(providerType: string) {
    providersLoading.value = true
    providersError.value = null
    try {
      const data = await serviceProvidersApi.getByType(providerType)
      serviceProviders.value = data
      return data
    } catch (error: any) {
      providersError.value = error.message || 'Servis sağlayıcılar yüklenirken hata oluştu'
      throw error
    } finally {
      providersLoading.value = false
    }
  }

  async function searchProviders(query: string) {
    providersLoading.value = true
    providersError.value = null
    try {
      const data = await serviceProvidersApi.search(query)
      serviceProviders.value = data
      return data
    } catch (error: any) {
      providersError.value = error.message || 'Servis sağlayıcılar aranırken hata oluştu'
      throw error
    } finally {
      providersLoading.value = false
    }
  }

  async function createServiceProvider(request: CreateServiceProviderRequest) {
    providersLoading.value = true
    providersError.value = null
    try {
      const created = await serviceProvidersApi.create(request)
      serviceProviders.value.unshift(created)
      return created
    } catch (error: any) {
      providersError.value = error.message || 'Servis sağlayıcı oluşturulurken hata oluştu'
      throw error
    } finally {
      providersLoading.value = false
    }
  }

  async function updateServiceProvider(id: number, request: UpdateServiceProviderRequest) {
    providersLoading.value = true
    providersError.value = null
    try {
      const updated = await serviceProvidersApi.update(id, request)

      const index = serviceProviders.value.findIndex(p => p.id === id)
      if (index !== -1) {
        serviceProviders.value[index] = updated
      }

      if (selectedProvider.value?.id === id) {
        selectedProvider.value = updated
      }

      return updated
    } catch (error: any) {
      providersError.value = error.message || 'Servis sağlayıcı güncellenirken hata oluştu'
      throw error
    } finally {
      providersLoading.value = false
    }
  }

  async function deactivateServiceProvider(id: number) {
    providersLoading.value = true
    providersError.value = null
    try {
      await serviceProvidersApi.deactivate(id)

      const index = serviceProviders.value.findIndex(p => p.id === id)
      if (index !== -1) {
        serviceProviders.value[index].active = false
      }

      if (selectedProvider.value?.id === id) {
        selectedProvider.value.active = false
      }
    } catch (error: any) {
      providersError.value = error.message || 'Servis sağlayıcı pasifleştirilirken hata oluştu'
      throw error
    } finally {
      providersLoading.value = false
    }
  }

  async function activateServiceProvider(id: number) {
    providersLoading.value = true
    providersError.value = null
    try {
      const updated = await serviceProvidersApi.activate(id)

      const index = serviceProviders.value.findIndex(p => p.id === id)
      if (index !== -1) {
        serviceProviders.value[index] = updated
      }

      if (selectedProvider.value?.id === id) {
        selectedProvider.value = updated
      }

      return updated
    } catch (error: any) {
      providersError.value = error.message || 'Servis sağlayıcı aktifleştirilirken hata oluştu'
      throw error
    } finally {
      providersLoading.value = false
    }
  }

  function clearSelectedProvider() {
    selectedProvider.value = null
  }



  return {

    receivables: readonly(receivables),
    selectedReceivable: readonly(selectedReceivable),
    receivablesLoading: readonly(receivablesLoading),
    receivablesError: readonly(receivablesError),

    payables: readonly(payables),
    selectedPayable: readonly(selectedPayable),
    payablesLoading: readonly(payablesLoading),
    payablesError: readonly(payablesError),

    insuranceClaims: readonly(insuranceClaims),
    selectedClaim: readonly(selectedClaim),
    claimsLoading: readonly(claimsLoading),
    claimsError: readonly(claimsError),

    serviceProviders: readonly(serviceProviders),
    selectedProvider: readonly(selectedProvider),
    providersLoading: readonly(providersLoading),
    providersError: readonly(providersError),


    overdueReceivables,
    totalReceivablesAmount,
    outstandingReceivablesAmount,
    overduePayables,
    totalPayablesAmount,
    outstandingPayablesAmount,
    pendingClaims,
    totalClaimedAmount,
    totalApprovedAmount,
    activeProviders,


    fetchReceivables,
    fetchReceivableById,
    fetchCustomerReceivables,
    fetchOverdueReceivables,
    recordReceivablePayment,
    markAsWrittenOff,
    writeOffReceivable: markAsWrittenOff,
    cancelReceivable,

    fetchPayables,
    fetchPayableById,
    createPayable,
    updatePayable,
    recordPayablePayment,
    cancelPayable,

    fetchClaims,
    fetchClaimById,
    createClaim,
    submitClaim,
    moveClaimToReview,
    approveClaim,
    rejectClaim,
    recordClaimPayment,

    fetchServiceProviders,
    fetchProviderById,
    fetchProvidersByType,
    searchProviders,
    createServiceProvider,
    updateServiceProvider,
    deactivateServiceProvider,
    activateServiceProvider,
    clearSelectedProvider
  }
})
