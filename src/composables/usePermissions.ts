import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores'

/**
 * Centralised role-based permission flags.
 *
 * Rol modeli:
 * - SUPER_ADMIN / ADMIN: her şeyi görür (ciro, kazanç, alacak/verecek).
 * - OPERATOR (araç dealer'ı): operasyonel verileri ve alacak/verecek bilgisini
 *   görür, ancak toplam ciro/kazanç gibi finansal özetleri GÖREMEZ.
 */
export function usePermissions() {
  const authStore = useAuthStore()
  const { isAdmin, isSuperAdmin, isOperator, role } = storeToRefs(authStore)

  // Toplam ciro / kazanç / kâr görüntüleme (yalnızca admin).
  const canViewRevenue = computed(() => isAdmin.value)
  const canViewProfit = computed(() => isAdmin.value)

  // Alacak / verecek görüntüleme (tüm personel, dealer dahil).
  const canViewFinance = computed(() => true)

  // Alacak / verecek oluşturma / düzenleme (yalnızca admin).
  const canManageFinance = computed(() => isAdmin.value)

  return {
    role,
    isAdmin,
    isSuperAdmin,
    isOperator,
    canViewRevenue,
    canViewProfit,
    canViewFinance,
    canManageFinance,
  }
}

export default usePermissions
