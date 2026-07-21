import { ref } from 'vue'
import { toApiDateTime, toInputDateTime } from '@/utils/datetime'
import type {
    CreateUetdsManifestRequest,
    ParsedUetdsManifestData,
    UetdsManifest,
    UpdateUetdsManifestRequest,
} from '@/types/manifest'

export interface ManifestFormState {
    uetdsTripNumber: string
    vehiclePlate: string
    tripStartAt: string
    tripEndAt: string
    documentNumber: string
    driverName: string
    driverSrc: string
    carrierCompanyName: string
    groupName: string
    groupRoute: string
    groupDescription: string
    groupFeeAmount: string | number
    passengerCount: string | number
}

function emptyState(): ManifestFormState {
    return {
        uetdsTripNumber: '',
        vehiclePlate: '',
        tripStartAt: '',
        tripEndAt: '',
        documentNumber: '',
        driverName: '',
        driverSrc: '',
        carrierCompanyName: '',
        groupName: '',
        groupRoute: '',
        groupDescription: '',
        groupFeeAmount: '',
        passengerCount: '',
    }
}

function toOptionalNumber(value: string | number): number | undefined {
    return value !== '' ? Number(value) : undefined
}

function toOptionalText(value: string): string | undefined {
    return value || undefined
}

export function useManifestForm() {
    const form = ref<ManifestFormState>(emptyState())

    function reset(): void {
        form.value = emptyState()
    }

    function syncFromManifest(data: UetdsManifest): void {
        form.value = {
            uetdsTripNumber: data.uetdsTripNumber,
            vehiclePlate: data.vehiclePlate,
            tripStartAt: toInputDateTime(data.tripStartAt),
            tripEndAt: toInputDateTime(data.tripEndAt),
            documentNumber: data.documentNumber || '',
            driverName: data.driverName || '',
            driverSrc: data.driverSrc || '',
            carrierCompanyName: data.carrierCompanyName || '',
            groupName: data.groupName || '',
            groupRoute: data.groupRoute || '',
            groupDescription: data.groupDescription || '',
            groupFeeAmount: data.groupFeeAmount ?? '',
            passengerCount: data.passengerCount ?? '',
        }
    }

    function applyParsed(parsed: ParsedUetdsManifestData, fallbackPlate = ''): void {
        form.value = {
            uetdsTripNumber: parsed.uetdsTripNumber || '',
            vehiclePlate: parsed.vehiclePlate || fallbackPlate,
            tripStartAt: parsed.tripStartAt ? parsed.tripStartAt.replace(' ', 'T').slice(0, 16) : '',
            tripEndAt: parsed.tripEndAt ? parsed.tripEndAt.replace(' ', 'T').slice(0, 16) : '',
            documentNumber: parsed.documentNumber || '',
            driverName: parsed.driverName || '',
            driverSrc: parsed.driverSrc || '',
            carrierCompanyName: parsed.carrierCompanyName || '',
            groupName: parsed.groupName || '',
            groupRoute: parsed.groupRoute || '',
            groupDescription: parsed.groupDescription || '',
            groupFeeAmount: parsed.groupFeeAmount ?? '',
            passengerCount: parsed.passengerCount ?? '',
        }
    }

    function buildCommonFields() {
        return {
            documentNumber: toOptionalText(form.value.documentNumber),
            driverName: toOptionalText(form.value.driverName),
            driverSrc: toOptionalText(form.value.driverSrc),
            carrierCompanyName: toOptionalText(form.value.carrierCompanyName),
            groupName: toOptionalText(form.value.groupName),
            groupRoute: toOptionalText(form.value.groupRoute),
            groupDescription: toOptionalText(form.value.groupDescription),
            groupFeeAmount: toOptionalNumber(form.value.groupFeeAmount),
            passengerCount: toOptionalNumber(form.value.passengerCount),
        }
    }

    function buildCreatePayload(rentalId: number): CreateUetdsManifestRequest {
        return {
            rentalId,
            uetdsTripNumber: form.value.uetdsTripNumber.trim(),
            vehiclePlate: form.value.vehiclePlate.trim(),
            tripStartAt: toApiDateTime(form.value.tripStartAt),
            tripEndAt: form.value.tripEndAt ? toApiDateTime(form.value.tripEndAt) : undefined,
            ...buildCommonFields(),
        }
    }

    function buildUpdatePayload(): UpdateUetdsManifestRequest {
        return {
            uetdsTripNumber: form.value.uetdsTripNumber.trim(),
            tripStartAt: toApiDateTime(form.value.tripStartAt),
            tripEndAt: form.value.tripEndAt ? toApiDateTime(form.value.tripEndAt) : undefined,
            ...buildCommonFields(),
        }
    }

    return {
        form,
        reset,
        syncFromManifest,
        applyParsed,
        buildCreatePayload,
        buildUpdatePayload,
    }
}
