import { computed } from 'vue'
import { useFeatures } from './useFeatures'

export interface Terminology {
    customer: string
    customerPlural: string
    customerNew: string
    rental: string
    rentalPlural: string
    rentalNew: string
    rentalNumber: string
    driver: string
    driverPlural: string
    branch: string
    branchPlural: string
    handover: string
    completion: string
}

const COMMERCIAL: Terminology = {
    customer: 'Müşteri',
    customerPlural: 'Müşteriler',
    customerNew: 'Yeni Müşteri',
    rental: 'Kiralama',
    rentalPlural: 'Kiralamalar',
    rentalNew: 'Yeni Kiralama',
    rentalNumber: 'Kiralama No',
    driver: 'Sürücü',
    driverPlural: 'Sürücüler',
    branch: 'Şube',
    branchPlural: 'Şubeler',
    handover: 'Teslim',
    completion: 'İade',
}

const INTERNAL_FLEET: Terminology = {
    customer: 'Çalışan',
    customerPlural: 'Çalışanlar',
    customerNew: 'Yeni Çalışan',
    rental: 'Zimmet',
    rentalPlural: 'Zimmetler',
    rentalNew: 'Yeni Zimmet',
    rentalNumber: 'Zimmet No',
    driver: 'Kullanan',
    driverPlural: 'Kullananlar',
    branch: 'Lokasyon',
    branchPlural: 'Lokasyonlar',
    handover: 'Zimmet Teslimi',
    completion: 'Zimmet İadesi',
}

export function useTerminology() {
    const { isEnabled } = useFeatures()

    const terms = computed<Terminology>(() =>
        isEnabled('INTERNAL_FLEET_MODE') ? INTERNAL_FLEET : COMMERCIAL,
    )

    const isInternalFleet = computed(() => isEnabled('INTERNAL_FLEET_MODE'))

    function term(key: keyof Terminology): string {
        return terms.value[key]
    }

    return { terms, term, isInternalFleet }
}
