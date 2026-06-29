<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { RcIcon, RcAntlerMark } from '@/components/icons'
import { RcAvatar, RcKbd } from '@/components/rc'
import { useAuthStore, useFeaturesStore } from '@/stores'
import { useShellNavCounts } from '@/composables/useShellNavCounts'
import { useShellSearch } from '@/composables/useShellSearch'
import {
  navSections,
  isNavItemActive,
  userInitials,
  roleLabel,
  type NavItem,
} from './navConfig'

const props = defineProps<{
  collapsed: boolean
  mobileOpen: boolean
  isMobile: boolean
}>()

const emit = defineEmits<{
  'toggle-collapse': []
}>()

const route = useRoute()
const authStore = useAuthStore()
const featuresStore = useFeaturesStore()
const { countForNavItem } = useShellNavCounts()
const { openSearch } = useShellSearch()

function isNavItemVisible(item: NavItem): boolean {
  if (item.adminOnly && !authStore.isAdmin) {
    return false
  }
  if (item.featureKey && !authStore.isSuperAdmin && !featuresStore.isEnabled(item.featureKey)) {
    return false
  }
  return true
}

const visibleSections = computed(() =>
  navSections
    .map((section) => ({
      ...section,
      section:
        section.section === 'Sistem' && section.items.filter(isNavItemVisible).length <= 1
          ? undefined
          : section.section,
      items: section.items.filter(isNavItemVisible),
    }))
    .filter((section) => section.items.length > 0),
)

const searchKbdLabel = computed(() =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform)
    ? '⌘K'
    : 'Ctrl+K',
)

const userMeta = computed(() => {
  const user = authStore.user
  return {
    initials: userInitials(authStore.userFullName || 'U'),
    name: authStore.userFullName || 'Kullanıcı',
    branch: user?.branchName ?? '—',
    role: roleLabel(user?.role),
  }
})

const collapseLabel = computed(() =>
  props.collapsed && !props.mobileOpen ? 'Menüyü genişlet' : 'Menüyü daralt',
)

function itemActive(item: NavItem) {
  return isNavItemActive(route.name as string | undefined, route.path, item.name)
}

function formatCount(n: number | undefined): string | undefined {
  if (n == null || n <= 0) return undefined
  return n > 999 ? '999+' : String(n)
}
</script>

<template>
  <aside
    class="rc-side"
    :class="{
      'rc-side--collapsed': collapsed && !mobileOpen,
      'rc-side--mobile-open': mobileOpen,
    }"
  >
    <div class="rc-side__brand">
      <RouterLink to="/" class="rc-side__brand-link">
        <RcAntlerMark />
        <span class="rc-mark__wordmark">Reindecar</span>
      </RouterLink>
      <button
        v-if="!isMobile"
        type="button"
        class="rc-side__collapse-btn"
        :title="collapseLabel"
        :aria-label="collapseLabel"
        @click="emit('toggle-collapse')"
      >
        <RcIcon :name="collapsed && !mobileOpen ? 'panelRight' : 'panelLeft'" :size="16" />
      </button>
    </div>

    <button
      type="button"
      class="rc-side__search"
      :title="`Ara (${searchKbdLabel})`"
      @click="openSearch"
    >
      <RcIcon name="search" :size="14" />
      <span v-if="!collapsed || mobileOpen" class="rc-side__search-placeholder">
        Plaka, müşteri, kiralama…
      </span>
      <RcKbd v-if="!collapsed || mobileOpen">{{ searchKbdLabel }}</RcKbd>
    </button>

    <nav class="rc-side__nav" aria-label="Ana menü">
      <template v-for="(section, si) in visibleSections" :key="si">
        <div v-if="section.section && (!collapsed || mobileOpen)" class="rc-side__nav-section">
          {{ section.section }}
        </div>
        <RouterLink
          v-for="item in section.items"
          :key="item.name"
          :to="{ name: item.name }"
          class="rc-side__item"
          :class="{ 'rc-side__item--active': itemActive(item) }"
          :title="collapsed && !mobileOpen ? item.label : undefined"
        >
          <RcIcon :name="item.icon" />
          <span v-if="!collapsed || mobileOpen" class="rc-side__item-label">{{ item.label }}</span>
          <span
            v-if="(!collapsed || mobileOpen) && formatCount(countForNavItem(item.name))"
            class="rc-side__item-count"
          >
            {{ formatCount(countForNavItem(item.name)) }}
          </span>
        </RouterLink>
      </template>
    </nav>

    <RouterLink to="/settings" class="rc-side__user">
      <RcAvatar>{{ userMeta.initials }}</RcAvatar>
      <div v-if="!collapsed || mobileOpen" class="rc-side__user-info">
        <b>{{ userMeta.name }}</b>
        <small>{{ userMeta.branch }} · {{ userMeta.role }}</small>
      </div>
      <RcIcon v-if="!collapsed || mobileOpen" name="chevronRight" :size="14" />
    </RouterLink>
  </aside>
</template>

<style scoped>
.rc-side__search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: calc(100% - 16px);
  margin: 0 8px 8px;
  padding: 0 10px;
  height: 32px;
  border-radius: var(--rc-r-6);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--rc-ink-400);
  cursor: pointer;
  text-align: left;
  font: inherit;
}
.rc-side__search:hover {
  background: rgba(255, 255, 255, 0.07);
  color: var(--rc-ink-200);
}
.rc-side__search-placeholder {
  flex: 1;
  font-size: 12.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
