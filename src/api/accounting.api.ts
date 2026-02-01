import { BaseApi } from './client'
import type { 
  PaginatedResponse, 
  PaginationParams,
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
  ClaimFilters
} from '@/types'

// ==================== Receivables API ====================

class ReceivablesApiService extends BaseApi {
  protected readonly basePath = '/receivables'

  async getById(id: number): Promise<ReceivableResponse> {
    return this.get(`/${id}`)
  }

  async getByCustomer(customerId: number): Promise<ReceivableResponse[]> {
    return this.get(`/customer/${customerId}`)
  }

  async getOverdue(): Promise<ReceivableResponse[]> {
    return this.get('/overdue')
  }

  async getOutstanding(params?: PaginationParams): Promise<PaginatedResponse<ReceivableResponse>> {
    return this.getList('/outstanding', params)
  }

  async getAll(filters?: ReceivableFilters, params?: PaginationParams): Promise<PaginatedResponse<ReceivableResponse>> {
    const queryParams = { ...params, ...filters }
    return this.getList('', queryParams)
  }

  async recordPayment(id: number, request: RecordPaymentRequest): Promise<ReceivableResponse> {
    return this.post(`/${id}/payment`, request)
  }

  async writeOff(id: number): Promise<ReceivableResponse> {
    return this.put(`/${id}/write-off`)
  }

  async cancel(id: number): Promise<ReceivableResponse> {
    return this.put(`/${id}/cancel`)
  }
}

// ==================== Payables API ====================

class PayablesApiService extends BaseApi {
  protected readonly basePath = '/payables'

  async create(request: CreatePayableRequest): Promise<PayableResponse> {
    return this.post('', request)
  }

  async getById(id: number): Promise<PayableResponse> {
    return this.get(`/${id}`)
  }

  async getByProvider(providerId: number): Promise<PayableResponse[]> {
    return this.get(`/provider/${providerId}`)
  }

  async getOverdue(): Promise<PayableResponse[]> {
    return this.get('/overdue')
  }

  async getOutstanding(params?: PaginationParams): Promise<PaginatedResponse<PayableResponse>> {
    return this.getList('/outstanding', params)
  }

  async getAll(filters?: PayableFilters, params?: PaginationParams): Promise<PaginatedResponse<PayableResponse>> {
    const queryParams = { ...params, ...filters }
    return this.getList('', queryParams)
  }

  async update(id: number, request: UpdatePayableRequest): Promise<PayableResponse> {
    return this.put(`/${id}`, request)
  }

  async recordPayment(id: number, request: RecordPaymentRequest): Promise<PayableResponse> {
    return this.post(`/${id}/payment`, request)
  }

  async cancel(id: number): Promise<PayableResponse> {
    return this.put(`/${id}/cancel`)
  }
}

// ==================== Insurance Claims API ====================

class InsuranceClaimsApiService extends BaseApi {
  protected readonly basePath = '/insurance-claims'

  async create(request: CreateClaimRequest): Promise<InsuranceClaimResponse> {
    return this.post('', request)
  }

  async getById(id: number): Promise<InsuranceClaimResponse> {
    return this.get(`/${id}`)
  }

  async getByVehicle(vehicleId: number): Promise<InsuranceClaimResponse[]> {
    return this.get(`/vehicle/${vehicleId}`)
  }

  async getPending(params?: PaginationParams): Promise<PaginatedResponse<InsuranceClaimResponse>> {
    return this.getList('/pending', params)
  }

  async getAll(filters?: ClaimFilters, params?: PaginationParams): Promise<PaginatedResponse<InsuranceClaimResponse>> {
    const queryParams = { ...params, ...filters }
    return this.getList('', queryParams)
  }

  async submit(id: number): Promise<InsuranceClaimResponse> {
    return this.put(`/${id}/submit`)
  }

  async moveToReview(id: number): Promise<InsuranceClaimResponse> {
    return this.put(`/${id}/review`)
  }

  async approve(id: number, request: ApproveClaimRequest): Promise<InsuranceClaimResponse> {
    return this.put(`/${id}/approve`, request)
  }

  async reject(id: number, request: RejectClaimRequest): Promise<InsuranceClaimResponse> {
    return this.put(`/${id}/reject`, request)
  }

  async recordPayment(id: number, amount: number): Promise<InsuranceClaimResponse> {
    return this.post(`/${id}/payment`, { amount })
  }
}

// ==================== Service Providers API ====================

class ServiceProvidersApiService extends BaseApi {
  protected readonly basePath = '/service-providers'

  async create(request: CreateServiceProviderRequest): Promise<ServiceProviderResponse> {
    return this.post('', request)
  }

  async getById(id: number): Promise<ServiceProviderResponse> {
    return this.get(`/${id}`)
  }

  async getAll(activeOnly = true): Promise<ServiceProviderResponse[]> {
    return this.get('', { active: activeOnly })
  }

  async getByType(serviceType: string): Promise<ServiceProviderResponse[]> {
    return this.get(`/by-type/${serviceType}`)
  }

  async update(id: number, request: UpdateServiceProviderRequest): Promise<ServiceProviderResponse> {
    return this.put(`/${id}`, request)
  }

  async deactivate(id: number): Promise<void> {
    return this.remove(`/${id}`)
  }

  async activate(id: number): Promise<ServiceProviderResponse> {
    return this.put(`/${id}/activate`)
  }
}

// ==================== Exports ====================

export const receivablesApi = new ReceivablesApiService()
export const payablesApi = new PayablesApiService()
export const insuranceClaimsApi = new InsuranceClaimsApiService()
export const serviceProvidersApi = new ServiceProvidersApiService()
