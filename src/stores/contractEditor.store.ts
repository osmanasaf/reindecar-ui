import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { contractsApi, contractTemplatesApi } from '@/api'
import type { ContractDetail, ContractDocumentType, ContractTemplateDetail } from '@/types/contract'
import {
    parseBlocks,
    serializeBlocks,
    type DocBlock,
    type ChipMode,
} from '@/utils/contractBlocks'
import { SAMPLE_PLACEHOLDERS } from '@/utils/contractSampleData'

export type EditorMode = 'document' | 'template'

const AUTOSAVE_DELAY_MS = 1200

let templatesBootstrapped = false

/** Varsayılan şablonların var olduğundan emin olur (idempotent; yetki yoksa sessiz geçer). */
async function ensureTemplatesBootstrapped(): Promise<void> {
    if (templatesBootstrapped) return
    try {
        await contractTemplatesApi.bootstrapDefaults()
        templatesBootstrapped = true
    } catch {
        // ADMIN olmayan kullanıcıda 403 dönebilir; şablonlar zaten mevcutsa sorun değil.
    }
}

/**
 * Blok tabanlı belge/şablon editörünün durumu.
 *
 * Faz B: akıllı alanlar hem şablonda hem belgede {{token}} olarak saklanır.
 * Belge PDF'i üretilirken backend güncel kiralama değerlerini çözer; imza
 * anında içerik dondurulur. Eski (değerleri çözülmüş) belgeler token
 * içermediği için çipsiz düz metin olarak açılır — geriye dönük uyumlu.
 */
export const useContractEditorStore = defineStore('contractEditor', () => {
    const mode = ref<EditorMode>('document')
    const rentalId = ref<number | null>(null)
    const documentType = ref<ContractDocumentType>('RENTAL_CONTRACT')
    const contract = ref<ContractDetail | null>(null)
    const template = ref<ContractTemplateDetail | null>(null)

    const blocks = ref<DocBlock[]>([])
    const placeholders = ref<Record<string, string>>({})
    const documentName = ref('')

    const loading = ref(false)
    const dirty = ref(false)
    const saveState = ref<'idle' | 'saving' | 'saved'>('idle')
    const sampleNames = ref(false)

    let autosaveTimer: ReturnType<typeof setTimeout> | null = null

    const locked = computed(() => {
        if (mode.value === 'template') return false
        const c = contract.value
        return c != null && (c.isSigned || c.status === 'SIGNED' || c.status === 'CANCELLED')
    })

    const chipMode = computed<ChipMode>(() => 'token' as ChipMode)

    const hasTable = computed(() => blocks.value.some((b) => b.type === 'table'))
    const hasList = computed(() => blocks.value.some((b) => b.type === 'list'))
    const hasSignature = computed(() => blocks.value.some((b) => b.type === 'signature'))

    function resetState() {
        if (autosaveTimer) clearTimeout(autosaveTimer)
        autosaveTimer = null
        blocks.value = []
        placeholders.value = {}
        contract.value = null
        template.value = null
        documentName.value = ''
        dirty.value = false
        saveState.value = 'idle'
        sampleNames.value = false
    }

    /** Şablon şartlarını (termsBlock fallback'i) sessizce getirir. */
    async function fetchTermsFallback(templateId: number | null | undefined): Promise<string[] | undefined> {
        if (!templateId) return undefined
        try {
            const tpl = await contractTemplatesApi.findById(templateId)
            return tpl.terms.length > 0 ? tpl.terms.map((t) => t.content) : undefined
        } catch {
            return undefined
        }
    }

    /** Mevcut bir belgeyi düzenlemek için yükler. */
    async function loadDocument(targetRentalId: number, type: ContractDocumentType) {
        loading.value = true
        resetState()
        mode.value = 'document'
        rentalId.value = targetRentalId
        documentType.value = type
        try {
            const detail = await contractsApi.getByRentalId(targetRentalId, type)
            contract.value = detail
            const content = await contractsApi.getContent(detail.id)
            const preview = await contractsApi.preview({ rentalId: targetRentalId, templateId: content.templateId })
            placeholders.value = {
                ...(preview.placeholders ?? {}),
                contractNumber: detail.contractNumber,
                offerNumber: detail.contractNumber,
            }
            const termsFallback = content.content.includes('{{termsBlock}}')
                ? await fetchTermsFallback(content.templateId)
                : undefined
            blocks.value = parseBlocks(content.content, { chips: true, termsFallback })
            documentName.value = detail.contractNumber
        } finally {
            loading.value = false
        }
    }

    /** Şablondan yeni belge taslağı hazırlar (henüz kaydedilmez). */
    async function startFromTemplate(targetRentalId: number, type: ContractDocumentType) {
        loading.value = true
        resetState()
        mode.value = 'document'
        rentalId.value = targetRentalId
        documentType.value = type
        try {
            await ensureTemplatesBootstrapped()
            const summary = await contractTemplatesApi.findByDocumentType(type)
            const tpl = await contractTemplatesApi.findById(summary.id)
            const preview = await contractsApi.preview({ rentalId: targetRentalId, templateId: tpl.id })
            placeholders.value = preview.placeholders ?? {}
            const termsFallback = tpl.terms.length > 0 ? tpl.terms.map((t) => t.content) : undefined
            blocks.value = parseBlocks(tpl.content, { chips: true, termsFallback })
            documentName.value = ''
            dirty.value = true
        } finally {
            loading.value = false
        }
    }

    /** Boş belge taslağı başlatır. */
    async function startBlank(targetRentalId: number, type: ContractDocumentType) {
        loading.value = true
        resetState()
        mode.value = 'document'
        rentalId.value = targetRentalId
        documentType.value = type
        try {
            const preview = await contractsApi.preview({ rentalId: targetRentalId })
            placeholders.value = preview.placeholders ?? {}
        } catch {
            placeholders.value = {}
        } finally {
            blocks.value = []
            dirty.value = true
            loading.value = false
        }
    }

    /** Şablon düzenleme modu. */
    async function loadTemplate(templateId: number) {
        loading.value = true
        resetState()
        mode.value = 'template'
        rentalId.value = null
        try {
            const tpl = await contractTemplatesApi.findById(templateId)
            template.value = tpl
            documentType.value = tpl.documentType
            placeholders.value = { ...SAMPLE_PLACEHOLDERS }
            const termsFallback = tpl.terms.length > 0 ? tpl.terms.map((t) => t.content) : undefined
            blocks.value = parseBlocks(tpl.content, { chips: true, termsFallback })
            documentName.value = tpl.name
        } finally {
            loading.value = false
        }
    }

    function serializedContent(): string {
        return serializeBlocks(blocks.value, {
            chipMode: chipMode.value,
            placeholders: placeholders.value,
        })
    }

    function markDirty() {
        if (locked.value) return
        dirty.value = true
        if (mode.value === 'document') scheduleAutosave()
    }

    function scheduleAutosave() {
        if (autosaveTimer) clearTimeout(autosaveTimer)
        autosaveTimer = setTimeout(() => {
            void save({ auto: true })
        }, AUTOSAVE_DELAY_MS)
    }

    /**
     * Kaydeder. Belge modunda ilk kayıtta sözleşme oluşturulur ve otomatik
     * kayıt aktiftir; şablon modunda kayıt yalnızca "Kaydet ve yayınla" ile
     * tetiklenir (her kayıt şablon versiyonunu artırır).
     */
    async function save(opts?: { auto?: boolean }): Promise<boolean> {
        if (locked.value || loading.value) return false
        if (autosaveTimer) {
            clearTimeout(autosaveTimer)
            autosaveTimer = null
        }
        const content = serializedContent()
        if (!content.trim()) return false

        saveState.value = 'saving'
        try {
            if (mode.value === 'template') {
                if (!template.value) return false
                const trimmedName = documentName.value.trim()
                if (trimmedName && trimmedName !== template.value.name) {
                    template.value = await contractTemplatesApi.rename(template.value.id, trimmedName)
                }
                template.value = await contractTemplatesApi.updateContent(template.value.id, content)
                documentName.value = template.value.name
            } else {
                if (!rentalId.value) return false
                if (!contract.value) {
                    contract.value = await contractsApi.create({
                        rentalId: rentalId.value,
                        documentType: documentType.value,
                    })
                    documentName.value = contract.value.contractNumber
                    placeholders.value = {
                        ...placeholders.value,
                        contractNumber: contract.value.contractNumber,
                        offerNumber: contract.value.contractNumber,
                    }
                }
                const finalContent = content.replace(/PREVIEW-[A-Za-z0-9-]+/g, contract.value.contractNumber)
                await contractsApi.updateContent(contract.value.id, { content: finalContent })
                if (finalContent !== content) {
                    blocks.value = parseBlocks(finalContent)
                }
            }
            dirty.value = false
            saveState.value = 'saved'
            return true
        } catch (err) {
            saveState.value = 'idle'
            if (!opts?.auto) throw err
            return false
        }
    }

    async function regenerateFromTemplate(): Promise<void> {
        if (mode.value !== 'document' || !contract.value) return
        loading.value = true
        try {
            const content = await contractsApi.regenerate(contract.value.id)
            blocks.value = parseBlocks(content.content)
            dirty.value = false
            saveState.value = 'saved'
        } finally {
            loading.value = false
        }
    }

    async function downloadPdfBlob(): Promise<Blob> {
        if (mode.value === 'template') {
            if (!template.value) throw new Error('Şablon yüklü değil')
            if (dirty.value) await save()
            return contractTemplatesApi.previewSamplePdf(template.value.id)
        }
        if (!rentalId.value) throw new Error('Kiralama yok')
        return contractsApi.previewPdf({
            rentalId: rentalId.value,
            contentOverride: serializedContent(),
        })
    }

    function placeholderValue(key: string): string {
        return placeholders.value[key] ?? ''
    }

    return {
        mode,
        rentalId,
        documentType,
        contract,
        template,
        blocks,
        placeholders,
        documentName,
        loading,
        dirty,
        saveState,
        sampleNames,
        locked,
        chipMode,
        hasTable,
        hasList,
        hasSignature,
        resetState,
        loadDocument,
        startFromTemplate,
        startBlank,
        loadTemplate,
        serializedContent,
        markDirty,
        save,
        regenerateFromTemplate,
        downloadPdfBlob,
        placeholderValue,
    }
})
