import apiClient, { BaseApi } from './client'
import type { ApiResponse } from '@/types'
import type {
    ContractDetail,
    ContractContent,
    ContractPreview,
    CreateContractPayload,
    ContractPreviewPayload,
    UpdateContractContentPayload,
    SignContractPayload,
    ContractDocumentType,
    ContractTemplateSummary,
} from '@/types/contract'

class ContractsApiService extends BaseApi {
    protected readonly basePath = '/contracts'

    async listPlaceholders(): Promise<string[]> {
        return this.get<string[]>('/placeholders')
    }

    async preview(payload: ContractPreviewPayload): Promise<ContractPreview> {
        return this.post('/preview', payload)
    }

    async previewPdf(payload: ContractPreviewPayload): Promise<Blob> {
        const { data } = await apiClient.post(`${this.basePath}/preview/pdf`, payload, {
            responseType: 'blob',
        })
        return data
    }

    async getById(id: number): Promise<ContractDetail> {
        return this.get<ContractDetail>(`/${id}`)
    }

    async getByRentalId(rentalId: number): Promise<ContractDetail> {
        return this.get<ContractDetail>(`/rental/${rentalId}`)
    }

    async create(payload: CreateContractPayload): Promise<ContractDetail> {
        return this.post('', payload)
    }

    async getContent(id: number): Promise<ContractContent> {
        return this.get<ContractContent>(`/${id}/content`)
    }

    async updateContent(id: number, payload: UpdateContractContentPayload): Promise<ContractContent> {
        return this.put<ContractContent>(`/${id}/content`, payload)
    }

    async regenerate(id: number): Promise<ContractContent> {
        return this.post<ContractContent>(`/${id}/regenerate`)
    }

    async downloadPdf(id: number): Promise<Blob> {
        return this.getBlob(`/${id}/pdf`)
    }

    async sign(id: number, payload: SignContractPayload): Promise<ContractDetail> {
        return this.post<ContractDetail>(`/${id}/sign`, payload)
    }

    async cancel(id: number): Promise<void> {
        await this.post(`/${id}/cancel`)
    }
}

class ContractTemplatesApiService extends BaseApi {
    protected readonly basePath = '/contract-templates'

    async findByDocumentType(documentType: ContractDocumentType): Promise<ContractTemplateSummary> {
        const { data } = await apiClient.get<ApiResponse<ContractTemplateSummary> | ContractTemplateSummary>(
            `${this.basePath}/by-document-type/${documentType}`,
        )
        if (data && typeof data === 'object' && 'data' in data) {
            return (data as ApiResponse<ContractTemplateSummary>).data
        }
        return data as ContractTemplateSummary
    }
}

export const contractsApi = new ContractsApiService()
export const contractTemplatesApi = new ContractTemplatesApiService()
