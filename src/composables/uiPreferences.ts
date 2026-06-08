export const UI_STORAGE_KEYS = {
  sidebarCollapsed: 'reindecar_ui.sidebar_collapsed',
  pageSize: 'reindecar_ui.page_size',
  vehicleListView: 'reindecar_ui.vehicles.view_mode',
} as const

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

export type VehicleListViewMode = 'table' | 'grid' | 'gantt'

const VEHICLE_VIEW_MODES: VehicleListViewMode[] = ['table', 'grid', 'gantt']

export function normalizePageSize(value: unknown, fallback = 20): PageSizeOption {
  const n = typeof value === 'number' ? value : Number(value)
  if (PAGE_SIZE_OPTIONS.includes(n as PageSizeOption)) return n as PageSizeOption
  return fallback as PageSizeOption
}

export function normalizeVehicleViewMode(value: unknown, fallback: VehicleListViewMode = 'table'): VehicleListViewMode {
  if (typeof value === 'string' && VEHICLE_VIEW_MODES.includes(value as VehicleListViewMode)) {
    return value as VehicleListViewMode
  }
  return fallback
}
