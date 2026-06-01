<script setup lang="ts">
import type { Branch } from '@/types'
import { RcButton, RcBadge } from '@/components/rc'

interface BranchRow extends Branch {
  vehicleCount?: number
}

defineProps<{
  branches: readonly BranchRow[]
}>()

const emit = defineEmits<{
  edit: [branch: BranchRow]
  toggle: [branch: BranchRow]
}>()

function location(branch: BranchRow): string {
  const parts = [branch.address, branch.district, branch.city].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
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
      <tbody>
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
