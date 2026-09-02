import apiClient, { BaseApi } from './client'
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
    ContractTemplateDetail,
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

    /**
     * Sözleşme yoksa backend 404 (E001) döner ve çağıran bunu sessizce ele alır —
     * beklenen kontrol akışı olduğu için konsola hata olarak yazılmaz.
     */
    async getByRentalId(rentalId: number, documentType: ContractDocumentType): Promise<ContractDetail> {
        return this.get<ContractDetail>(`/rental/${rentalId}`, { documentType }, { suppressErrorLog: true })
    }

    /** Kiralamanin tum sozlesmeleri tek istekte; olmayan tip icin satir donmez, 404 uretilmez. */
    async getAllByRentalId(rentalId: number): Promise<ContractDetail[]> {
        return this.get<ContractDetail[]>(`/rental/${rentalId}/documents`)
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

    async newVersion(id: number): Promise<ContractDetail> {
        return this.post<ContractDetail>(`/${id}/new-version`)
    }

    async cancel(id: number): Promise<void> {
        await this.post(`/${id}/cancel`)
    }
}

export interface CreateContractTemplatePayload {
    code: string
    name: string
    rentalType: string
    documentType: ContractDocumentType
    content: string
}

class ContractTemplatesApiService extends BaseApi {
    protected readonly basePath = '/contract-templates'

    async findByDocumentType(documentType: ContractDocumentType): Promise<ContractTemplateSummary> {
        return this.get<ContractTemplateSummary>(`/by-document-type/${documentType}`)
    }

    async create(payload: CreateContractTemplatePayload): Promise<ContractTemplateDetail> {
        return this.post<ContractTemplateDetail>('', payload)
    }

    async findAll(): Promise<ContractTemplateDetail[]> {
        return this.get<ContractTemplateDetail[]>('')
    }

    async findById(id: number): Promise<ContractTemplateDetail> {
        return this.get<ContractTemplateDetail>(`/${id}`)
    }

    async updateContent(id: number, content: string): Promise<ContractTemplateDetail> {
        return this.put<ContractTemplateDetail>(`/${id}/content`, { content })
    }

    async rename(id: number, name: string): Promise<ContractTemplateDetail> {
        return this.put<ContractTemplateDetail>(`/${id}/name`, { name })
    }

    async activate(id: number): Promise<void> {
        await this.post(`/${id}/activate`)
    }

    async deactivate(id: number): Promise<void> {
        await this.post(`/${id}/deactivate`)
    }

    async previewPdf(id: number, rentalId: number): Promise<Blob> {
        const { data } = await apiClient.get(`${this.basePath}/${id}/preview/pdf`, {
            params: { rentalId },
            responseType: 'blob',
        })
        return data
    }

    async previewSamplePdf(id: number): Promise<Blob> {
        return this.getBlob(`/${id}/preview/sample/pdf`)
    }

    async bootstrapDefaults(): Promise<void> {
        await this.post('/bootstrap-defaults')
    }
}

export interface ContractClause {
    id: number
    text: string
    sortOrder: number
}

class ContractClausesApiService extends BaseApi {
    protected readonly basePath = '/contract-clauses'

    async list(): Promise<ContractClause[]> {
        return this.get<ContractClause[]>('')
    }

    async create(text: string): Promise<ContractClause> {
        return this.post<ContractClause>('', { text })
    }

    async remove(id: number): Promise<void> {
        await this.deleteByPath(`/${id}`)
    }
}

export const contractsApi = new ContractsApiService()
export const contractTemplatesApi = new ContractTemplatesApiService()
export const contractClausesApi = new ContractClausesApiService()
