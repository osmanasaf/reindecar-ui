export { default as apiClient, tokenStorage } from './client'

export { authApi } from './auth.api'
export { vehiclesApi, vehicleCategoriesApi } from './vehicles.api'
export { customersApi } from './customers.api'
export { driversApi } from './drivers.api'
export { damagesApi } from './damages.api'
export { maintenancesApi } from './maintenances.api'
export { rentalsApi, kmPackagesApi, leasingKmApi } from './rentals.api'
export { branchesApi } from './branches.api'
export { 
    pricingApi, 
    categoryPricingApi,
    vehiclePricingApi,
    termDiscountApi,
    extraItemTypeApi,
    rentalExtraItemApi,
    leasingApi 
} from './pricing.api'
export type { 
    PriceCalculationRequest,
    CategoryPricingRequest,
    VehiclePricingRequest,
    TermDiscountRequest,
    ExtraItemTypeRequest,
    RentalExtraItemRequest,
    PriceCalculationResponse, 
    LeasingPlan,
    PriceBreakdownItem,
    KmPackageInfo
} from './pricing.api'
export { dashboardApi } from './dashboard.api'
export type { DashboardStats, RevenueData, VehicleStatusData, UpcomingReturn, DashboardResponse } from './dashboard.api'
export { usersApi } from './users.api'
export type { UpdateProfileRequest, ChangePasswordRequest, UserSettings, UserResponse } from './users.api'
export { 
    receivablesApi,
    payablesApi,
    insuranceClaimsApi,
    serviceProvidersApi
} from './accounting.api'