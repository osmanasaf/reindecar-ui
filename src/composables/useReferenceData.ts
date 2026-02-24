import { ref, readonly } from 'vue'
import { referenceDataApi } from '@/api'
import type { CarBrand, CarModel, City, District, VehicleColor } from '@/types/reference'

const brandsCache = ref<CarBrand[]>([])
const citiesCache = ref<City[]>([])
const colorsCache = ref<VehicleColor[]>([])
const modelsCache = ref<Map<number, CarModel[]>>(new Map())
const districtsCache = ref<Map<number, District[]>>(new Map())

let brandsLoaded = false
let citiesLoaded = false
let colorsLoaded = false

export function useReferenceData() {
    const loadingBrands = ref(false)
    const loadingCities = ref(false)
    const loadingColors = ref(false)
    const loadingModels = ref(false)
    const loadingDistricts = ref(false)

    async function loadBrands() {
        if (brandsLoaded) return
        loadingBrands.value = true
        try {
            brandsCache.value = await referenceDataApi.getBrands()
            brandsLoaded = true
        } finally {
            loadingBrands.value = false
        }
    }

    async function loadModelsByBrand(brandId: number): Promise<CarModel[]> {
        if (modelsCache.value.has(brandId)) return modelsCache.value.get(brandId)!
        loadingModels.value = true
        try {
            const list = await referenceDataApi.getModelsByBrand(brandId)
            modelsCache.value.set(brandId, list)
            return list
        } finally {
            loadingModels.value = false
        }
    }

    async function loadCities() {
        if (citiesLoaded) return
        loadingCities.value = true
        try {
            citiesCache.value = await referenceDataApi.getCities()
            citiesLoaded = true
        } finally {
            loadingCities.value = false
        }
    }

    async function loadDistrictsByCity(cityId: number): Promise<District[]> {
        if (districtsCache.value.has(cityId)) return districtsCache.value.get(cityId)!
        loadingDistricts.value = true
        try {
            const list = await referenceDataApi.getDistrictsByCity(cityId)
            districtsCache.value.set(cityId, list)
            return list
        } finally {
            loadingDistricts.value = false
        }
    }

    async function loadColors() {
        if (colorsLoaded) return
        loadingColors.value = true
        try {
            colorsCache.value = await referenceDataApi.getColors()
            colorsLoaded = true
        } finally {
            loadingColors.value = false
        }
    }

    function getModelsForBrand(brandId: number): CarModel[] {
        return modelsCache.value.get(brandId) ?? []
    }

    function getDistrictsForCity(cityId: number): District[] {
        return districtsCache.value.get(cityId) ?? []
    }

    return {
        brands: readonly(brandsCache),
        cities: readonly(citiesCache),
        colors: readonly(colorsCache),
        loadingBrands,
        loadingCities,
        loadingColors,
        loadingModels,
        loadingDistricts,
        loadBrands,
        loadModelsByBrand,
        loadCities,
        loadDistrictsByCity,
        loadColors,
        getModelsForBrand,
        getDistrictsForCity
    }
}
