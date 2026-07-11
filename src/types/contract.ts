export type ContractDocumentType = 'PRICE_OFFER' | 'RENTAL_CONTRACT'

export type ContractStatus =
    | 'DRAFT'
    | 'PENDING_SIGNATURE'
    | 'SIGNED'
    | 'EXPIRED'
    | 'RENEWED'
    | 'CANCELLED'

export interface ContractTemplateSummary {
    id: number
    code: string
    name: string
    documentType: ContractDocumentType
}

export interface ContractDetail {
    id: number
    contractNumber: string
    rentalId: number
    templateId: number
    contractVersion: number
    status: ContractStatus
    validFrom: string
    validTo: string | null
    signedAt: string | null
    signedBy: string | null
    signatureMethod: string | null
    expired: boolean
    signed: boolean
    createdAt: string
}

export interface ContractContent {
    id: number
    rentalId: number
    templateId: number
    documentType: ContractDocumentType
    content: string
    version: number
}

export interface ContractPreview {
    documentType: ContractDocumentType
    renderedContent: string
    placeholders: Record<string, string>
}

export interface CreateContractPayload {
    rentalId: number
    templateId?: number
    documentType?: ContractDocumentType
}

export interface ContractPreviewPayload {
    rentalId: number
    templateId?: number
    contentOverride?: string
}

export interface UpdateContractContentPayload {
    content: string
}

export interface SignContractPayload {
    signedBy: string
    signatureMethod: string
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
    DRAFT: 'Taslak',
    PENDING_SIGNATURE: 'İmza bekliyor',
    SIGNED: 'İmzalandı',
    EXPIRED: 'Süresi doldu',
    RENEWED: 'Yenilendi',
    CANCELLED: 'İptal',
}

export const CONTRACT_DOCUMENT_TYPE_LABELS: Record<ContractDocumentType, string> = {
    PRICE_OFFER: 'Fiyat teklifi',
    RENTAL_CONTRACT: 'Kiralama sözleşmesi',
}
