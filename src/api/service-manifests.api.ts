import apiClient, { BaseApi } from './client'
import type { ApiResponse, PaginatedResponse, PaginationParams } from '@/types'
import type { FileRecord, FileUploadType } from './files.api'
import type {
    CreateUetdsManifestRequest,
    CreateUetdsPassengerRequest,
    UetdsManifest,
    UetdsManifestPreviewResponse,
    UetdsPassenger,
    UpdateUetdsManifestRequest,
} from '@/types/manifest'

class ServiceManifestsApiService extends BaseApi {
    protected readonly basePath = '/service-manifests'

    async list(params?: PaginationParams & { rentalId?: number }): Promise<PaginatedResponse<UetdsManifest>> {
        return this.getList('', params)
    }

    async getById(id: number): Promise<UetdsManifest> {
        return this.get(`/${id}`)
    }

    async listByRental(rentalId: number): Promise<UetdsManifest[]> {
        return this.get(`/rental/${rentalId}`)
    }

    async create(request: CreateUetdsManifestRequest): Promise<UetdsManifest> {
        return this.post('', request)
    }

    async update(id: number, request: UpdateUetdsManifestRequest): Promise<UetdsManifest> {
        return this.put(`/${id}`, request)
    }

    async remove(id: number): Promise<void> {
        return this.deleteByPath(`/${id}`)
    }

    async previewFromPdf(rentalId: number, file: File): Promise<UetdsManifestPreviewResponse> {
        const formData = new FormData()
        formData.append('rentalId', String(rentalId))
        formData.append('file', file)
        const { data } = await apiClient.post<ApiResponse<UetdsManifestPreviewResponse>>(
            `${this.basePath}/preview`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        )
        return data.data
    }

    async createFromPdf(rentalId: number, file: File): Promise<UetdsManifest> {
        const formData = new FormData()
        formData.append('rentalId', String(rentalId))
        formData.append('file', file)
        const { data } = await apiClient.post<ApiResponse<UetdsManifest>>(
            `${this.basePath}/upload`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        )
        return data.data
    }

    async attachPdf(id: number, file: File): Promise<UetdsManifest> {
        const formData = new FormData()
        formData.append('file', file)
        const { data } = await apiClient.post<ApiResponse<UetdsManifest>>(
            `${this.basePath}/${id}/pdf`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        )
        return data.data
    }

    async uploadDocument(id: number, file: File, uploadType: FileUploadType): Promise<FileRecord> {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('uploadType', uploadType)
        const { data } = await apiClient.post<ApiResponse<FileRecord>>(
            `${this.basePath}/${id}/documents`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        )
        return data.data
    }

    async listDocuments(id: number, uploadType?: FileUploadType): Promise<FileRecord[]> {
        return this.get(`/${id}/documents`, uploadType ? { uploadType } : undefined)
    }

    async listPassengers(id: number): Promise<UetdsPassenger[]> {
        return this.get(`/${id}/passengers`)
    }

    async addPassenger(id: number, request: CreateUetdsPassengerRequest): Promise<UetdsPassenger> {
        return this.post(`/${id}/passengers`, request)
    }

    async replacePassengers(id: number, requests: CreateUetdsPassengerRequest[]): Promise<UetdsPassenger[]> {
        return this.put(`/${id}/passengers`, requests)
    }

    async deletePassenger(id: number, passengerId: number): Promise<void> {
        return this.deleteByPath(`/${id}/passengers/${passengerId}`)
    }
}

export const serviceManifestsApi = new ServiceManifestsApiService()
