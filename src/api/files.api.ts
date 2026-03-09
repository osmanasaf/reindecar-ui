import apiClient, { BaseApi } from './client'

export type FileReferenceType = 'CUSTOMER' | 'VEHICLE' | 'RENTAL' | 'LEASING' | 'DAMAGE' | 'MAINTENANCE' | 'INSURANCE' | 'INSTALLMENT' | 'USER'

export type FileUploadType =
    | 'DRIVER_LICENSE_FRONT'
    | 'DRIVER_LICENSE_BACK'
    | 'PASSPORT'
    | 'IDENTITY_CARD'
    | 'VEHICLE_PHOTO'
    | 'VEHICLE_REGISTRATION'
    | 'VEHICLE_INSPECTION'
    | 'INSURANCE_POLICY'
    | 'LICENSE_DOCUMENT'
    | 'HANDOVER_PHOTO'
    | 'HANDOVER_VIDEO'
    | 'RETURN_PHOTO'
    | 'RETURN_VIDEO'
    | 'SIGNED_CONTRACT'
    | 'LEASE_CONTRACT'
    | 'DAMAGE_PHOTO'
    | 'REPAIR_INVOICE'
    | 'REPAIR_ESTIMATE'
    | 'ACCIDENT_REPORT'
    | 'POLICE_REPORT'
    | 'MAINTENANCE_INVOICE'
    | 'PROFILE_PHOTO'
    | 'OTHER'

export const FILE_UPLOAD_TYPE_LABELS: Record<FileUploadType, string> = {
    DRIVER_LICENSE_FRONT: 'Ehliyet (Ön)',
    DRIVER_LICENSE_BACK: 'Ehliyet (Arka)',
    PASSPORT: 'Pasaport',
    IDENTITY_CARD: 'Kimlik Kartı',
    VEHICLE_PHOTO: 'Araç Fotoğrafı',
    VEHICLE_REGISTRATION: 'Araç Ruhsatı',
    VEHICLE_INSPECTION: 'Muayene Belgesi',
    INSURANCE_POLICY: 'Sigorta Poliçesi',
    LICENSE_DOCUMENT: 'Lisans Belgesi',
    HANDOVER_PHOTO: 'Teslim Fotoğrafı',
    HANDOVER_VIDEO: 'Teslim Videosu',
    RETURN_PHOTO: 'İade Fotoğrafı',
    RETURN_VIDEO: 'İade Videosu',
    SIGNED_CONTRACT: 'İmzalı Sözleşme',
    LEASE_CONTRACT: 'Leasing Sözleşmesi',
    DAMAGE_PHOTO: 'Hasar Fotoğrafı',
    REPAIR_INVOICE: 'Tamir Faturası',
    REPAIR_ESTIMATE: 'Tamir Keşif',
    ACCIDENT_REPORT: 'Kaza Tutanağı',
    POLICE_REPORT: 'Trafik Kazası Tespit Tutanağı',
    MAINTENANCE_INVOICE: 'Bakım Faturası',
    PROFILE_PHOTO: 'Profil Fotoğrafı',
    OTHER: 'Diğer',
}

export const ALLOWED_TYPES_BY_REFERENCE: Record<FileReferenceType, FileUploadType[]> = {
    CUSTOMER: ['IDENTITY_CARD', 'PASSPORT', 'DRIVER_LICENSE_FRONT', 'DRIVER_LICENSE_BACK', 'SIGNED_CONTRACT', 'OTHER'],
    VEHICLE: ['VEHICLE_PHOTO', 'VEHICLE_REGISTRATION', 'VEHICLE_INSPECTION', 'INSURANCE_POLICY', 'LICENSE_DOCUMENT', 'OTHER'],
    RENTAL: ['SIGNED_CONTRACT', 'HANDOVER_PHOTO', 'HANDOVER_VIDEO', 'RETURN_PHOTO', 'RETURN_VIDEO', 'OTHER'],
    LEASING: ['LEASE_CONTRACT', 'SIGNED_CONTRACT', 'HANDOVER_PHOTO', 'RETURN_PHOTO', 'OTHER'],
    DAMAGE: ['DAMAGE_PHOTO', 'ACCIDENT_REPORT', 'REPAIR_INVOICE', 'OTHER'],
    MAINTENANCE: ['MAINTENANCE_INVOICE', 'OTHER'],
    INSURANCE: ['INSURANCE_POLICY', 'ACCIDENT_REPORT', 'DAMAGE_PHOTO', 'POLICE_REPORT', 'REPAIR_ESTIMATE', 'OTHER'],
    INSTALLMENT: ['LEASE_CONTRACT', 'SIGNED_CONTRACT', 'OTHER'],
    USER: ['PROFILE_PHOTO', 'OTHER'],
}

export interface FileRecord {
    id: number
    fileName: string
    storedName: string
    contentType: string
    size: number
    extension: string
    referenceType: FileReferenceType
    referenceId: number
    uploadType: FileUploadType
    downloadUrl: string
    viewUrl: string
    uploadedAt: string
}

class FilesApiService extends BaseApi {
    protected readonly basePath = '/files'

    async getByReference(referenceType: FileReferenceType, referenceId: number): Promise<FileRecord[]> {
        return this.get(`/references/${referenceType}/${referenceId}`)
    }

    async getById(id: number): Promise<FileRecord> {
        return this.get(`/${id}`)
    }

    async upload(
        file: File,
        referenceType: FileReferenceType,
        referenceId: number,
        uploadType: FileUploadType,
        isPublic = false
    ): Promise<FileRecord> {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('referenceType', referenceType)
        formData.append('referenceId', String(referenceId))
        formData.append('uploadType', uploadType)
        formData.append('isPublic', String(isPublic))
        return this.postFormData<FileRecord>(formData)
    }

    async getPresignedUrl(id: number): Promise<string> {
        const result = await this.get<string>(`/${id}/presigned-url`)
        // Backend returns URL in data; handle both direct string and wrapped shape
        if (typeof result === 'string') return result
        const obj = result as { data?: string; message?: string } | null
        return obj?.data ?? obj?.message ?? ''
    }

    async delete(id: number): Promise<void> {
        return this.remove(`/${id}`)
    }

    /**
     * Opens file in a new tab. Uses a temporary link so only one tab opens
     * with the content directly (no blank page, no double tab).
     */
    async openFile(id: number): Promise<void> {
        const url = await this.getPresignedUrl(id)
        const urlStr = typeof url === 'string' ? url : ''
        if (!urlStr.trim()) return
        const link = document.createElement('a')
        link.href = urlStr
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        link.click()
    }

    async downloadFile(id: number, fileName: string): Promise<void> {
        const response = await apiClient.get(`/files/${id}/download`, { responseType: 'blob' })
        const blob = new Blob([response.data])
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = fileName
        link.click()
        URL.revokeObjectURL(link.href)
    }

    formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }
}

export const filesApi = new FilesApiService()
