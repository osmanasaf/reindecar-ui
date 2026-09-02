<script setup lang="ts">
import type { Branch } from '@/types'
import { RcButton, RcBadge } from '@/components/rc'
import { toSearchQuery } from '@/utils/search'

interface BranchRow extends Branch {
  vehicleCount?: number
}

withDefaults(defineProps<{
  branches: readonly BranchRow[]
  /** İlk yüklemede satırlara kademeli giriş vermek için 'rc-stagger'. */
  rowsClass?: string
}>(), {
  rowsClass: '',
})

const emit = defineEmits<{
  edit: [branch: BranchRow]
  toggle: [branch: BranchRow]
}>()

/**
 * Adres serbest metin; kullanıcı doğal olarak ilçe ve ili de yazıyor. İlçe/il
 * yalnızca adreste zaten geçmiyorsa eklenir. Karşılaştırma diyakritik katlanarak
 * yapılır: referans verideki 'Cankaya' ile adresteki 'Çankaya' eşleşsin.
 */
function location(branch: BranchRow): string {
  const address = branch.address?.trim() ?? ''
  const addressSegments = new Set(
    address.split(',').map((segment) => toSearchQuery(segment)).filter(Boolean),
  )
  const parts = [address]
  for (const extra of [branch.district, branch.city]) {
    if (extra && !addressSegments.has(toSearchQuery(extra))) parts.push(extra)
  }
  const filled = parts.filter(Boolean)
  return filled.length ? filled.join(', ') : '—'
}
</script>

<template>
  <div class="rc-card" style="overflow: hidden">
    <table class="rc-table rcv-table--slim">
      <thead>
        <tr>
          <th>Şube</th>
          <th>Konum</th>
          <th>Telefon</th>
          <th class="rc-right">Araç</th>
          <th>Durum</th>
          <th />
        </tr>
      </thead>
      <tbody :class="rowsClass">
        <tr
          v-for="branch in branches"
          :key="branch.id"
          :class="{ 'rca-row--muted': !branch.active }"
        >
          <td>
            <div class="rcr-row__primary">{{ branch.name }}</div>
            <div class="rcr-row__secondary rcr-row__mono">{{ branch.branchCode || branch.code }}</div>
          </td>
          <td>
            <span class="rcr-row__secondary">{{ location(branch) }}</span>
          </td>
          <td>{{ branch.phone || '—' }}</td>
          <td class="rc-right rc-num">{{ branch.vehicleCount ?? 0 }}</td>
          <td>
            <RcBadge :variant="branch.active ? 'success' : 'default'">
              {{ branch.active ? 'Aktif' : 'Pasif' }}
            </RcBadge>
          </td>
          <td class="rc-right">
            <div style="display: flex; gap: 6px; justify-content: flex-end">
              <RcButton variant="ghost" size="sm" @click="emit('edit', branch)">Düzenle</RcButton>
              <RcButton
                :variant="branch.active ? 'ghost' : 'accent'"
                size="sm"
                @click="emit('toggle', branch)"
              >
                {{ branch.active ? 'Pasif' : 'Aktif' }}
              </RcButton>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
