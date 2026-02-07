import { BaseApi } from './client'
import type {
  PaginatedResponse,
  PaginationParams,
  PenaltyResponse,
  CreatePenaltyRequest,
  UpdatePenaltyRequest,
  PenaltySearchCriteria,
  ImportPenaltyRequest
} from '@/types'

class PenaltiesApiService extends BaseApi {
  protected readonly basePath = '/penalties'

  async create(request: CreatePenaltyRequest): Promise<PenaltyResponse> {
    return this.post('', request)
  }

  async getById(id: number): Promise<PenaltyResponse> {
    return this.get(`/${id}`)
  }

  async getByRental(rentalId: number): Promise<PenaltyResponse[]> {
    return this.get(`/rental/${rentalId}`)
  }

  async getByVehicle(vehicleId: number): Promise<PenaltyResponse[]> {
    return this.get(`/vehicle/${vehicleId}`)
  }

  async getByCustomer(customerId: number): Promise<PenaltyResponse[]> {
    return this.get(`/customer/${customerId}`)
  }

  async getPending(params?: PaginationParams): Promise<PaginatedResponse<PenaltyResponse>> {
    return this.getList('/pending', params)
  }

  async getOverdue(params?: PaginationParams): Promise<PaginatedResponse<PenaltyResponse>> {
    return this.getList('/overdue', params)
  }

  async getAll(params?: PaginationParams): Promise<PaginatedResponse<PenaltyResponse>> {
    return this.getList('', params)
  }

  async search(
    criteria: PenaltySearchCriteria,
    params?: PaginationParams
  ): Promise<PaginatedResponse<PenaltyResponse>> {
    const queryParams = { ...params, ...criteria }
    return this.getList('/search', queryParams)
  }

  async update(id: number, request: UpdatePenaltyRequest): Promise<PenaltyResponse> {
    return this.put(`/${id}`, request)
  }

  async notify(id: number): Promise<PenaltyResponse> {
    return this.put(`/${id}/notify`)
  }

  async dispute(id: number): Promise<PenaltyResponse> {
    return this.put(`/${id}/dispute`)
  }

  async markAsPaid(id: number, paidByCompany = false): Promise<PenaltyResponse> {
    return this.put(`/${id}/mark-paid`, { paidByCompany })
  }

  async cancel(id: number): Promise<PenaltyResponse> {
    return this.put(`/${id}/cancel`)
  }

  async remove(id: number): Promise<void> {
    return super.remove(`/${id}`)
  }

  async import(request: ImportPenaltyRequest): Promise<PenaltyResponse[]> {
    return this.post('/import', request)
  }
}

export const penaltiesApi = new PenaltiesApiService()
