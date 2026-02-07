import { BaseApi } from './client'
import type { 
  PaginatedResponse, 
  PaginationParams,
  ReceivableResponse,
  PayableResponse,
  InsuranceClaimResponse,
  VehicleInsuranceResponse,
  ClaimDocumentResponse,
  ServiceProviderResponse,
  RecordPaymentRequest,
  CreatePayableRequest,
  UpdatePayableRequest,
  CreateClaimRequest,
  CreateVehicleInsuranceRequest,
  ApproveClaimRequest,
  RejectClaimRequest,
  CreateServiceProviderRequest,
  UpdateServiceProviderRequest,
  ReceivableFilters,
  PayableFilters,
  ClaimFilters,
  ClaimDocumentType
} from '@/types'

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

  async uploadDocument(claimId: number, file: File, documentType: ClaimDocumentType): Promise<ClaimDocumentResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('documentType', documentType)
    return this.postFormData(formData, `/${claimId}/documents`)
  }

  async getDocuments(claimId: number): Promise<ClaimDocumentResponse[]> {
    return this.get(`/${claimId}/documents`)
  }

  async deleteDocument(claimId: number, documentId: number): Promise<void> {
    return this.remove(`/${claimId}/documents/${documentId}`)
  }

  async downloadDocument(claimId: number, documentId: number): Promise<Blob> {
    const response = await fetch(
      `/api/v1/insurance-claims/${claimId}/documents/${documentId}/download`,
      { headers: { 'Authorization': `Bearer ${localStorage.getItem('reindecar_access_token')}` } }
    )
    return response.blob()
  }
}

class ServiceProvidersApiService extends BaseApi {
  protected readonly basePath = '/service-providers'

  async create(request: CreateServiceProviderRequest): Promise<ServiceProviderResponse> {
    return this.post('', request)
  }

  async getById(id: number): Promise<ServiceProviderResponse> {
    return this.get(`/${id}`)
  }

  async getAll(activeOnly = true): Promise<ServiceProviderResponse[]> {
    return this.get(activeOnly ? '/active' : '')
  }

  async getByType(providerType: string): Promise<ServiceProviderResponse[]> {
    return this.get(`/type/${providerType}`)
  }

  async search(query: string): Promise<ServiceProviderResponse[]> {
    return this.get('/search', { q: query })
  }

  async update(id: number, request: UpdateServiceProviderRequest): Promise<ServiceProviderResponse> {
    return this.put(`/${id}`, request)
  }

  async deactivate(id: number): Promise<void> {
    return this.put(`/${id}/deactivate`)
  }

  async activate(id: number): Promise<ServiceProviderResponse> {
    return this.put(`/${id}/activate`)
  }
}

class VehicleInsurancesApiService extends BaseApi {
  protected readonly basePath = '/vehicle-insurances'

  async getByVehicle(vehicleId: number): Promise<VehicleInsuranceResponse[]> {
    return this.get(`/vehicle/${vehicleId}`)
  }

  async getAllByVehicle(vehicleId: number): Promise<VehicleInsuranceResponse[]> {
    return this.get(`/vehicle/${vehicleId}/all`)
  }

  async create(request: CreateVehicleInsuranceRequest): Promise<VehicleInsuranceResponse> {
    return this.post('', request)
  }

  async deactivate(id: number): Promise<void> {
    return this.remove(`/${id}`)
  }
}

export const receivablesApi = new ReceivablesApiService()
export const payablesApi = new PayablesApiService()
export const insuranceClaimsApi = new InsuranceClaimsApiService()
export const serviceProvidersApi = new ServiceProvidersApiService()
export const vehicleInsurancesApi = new VehicleInsurancesApiService()
