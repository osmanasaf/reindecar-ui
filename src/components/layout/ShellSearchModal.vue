<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { RcIcon } from '@/components/icons'
import { RcModal } from '@/components/rc'
import { globalSearchApi, type GlobalSearchResult } from '@/api/search.api'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const query = ref('')
const loading = ref(false)
const results = ref<GlobalSearchResult | null>(null)
let debounceTimer: ReturnType<typeof setTimeout> | undefined

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    query.value = ''
    results.value = null
    setTimeout(() => document.getElementById('shell-search-input')?.focus(), 50)
  }
})

watch(query, (q) => {
  clearTimeout(debounceTimer)
  if (!props.open) return
  const trimmed = q.trim()
  if (trimmed.length < 2) {
    results.value = null
    loading.value = false
    return
  }
  loading.value = true
  debounceTimer = setTimeout(async () => {
    try {
      results.value = await globalSearchApi.search(trimmed, 5)
    } catch {
      results.value = { vehicles: [], customers: [], rentals: [] }
    } finally {
      loading.value = false
    }
  }, 280)
})

function navigate(path: string) {
  emit('close')
  router.push(path)
}

function goVehicle(id: number) {
  navigate(`/vehicles/${id}`)
}

function goCustomer(id: number) {
  navigate(`/customers/${id}`)
}

function goRental(id: number) {
  navigate(`/rentals/${id}`)
}
</script>

<template>
  <RcModal
    :open="open"
    title="Ara"
    subtitle="Plaka, müşteri adı veya kiralama numarası (en az 2 karakter)"
    wide
    @close="emit('close')"
  >
    <div class="shell-search">
      <div class="rc-input-group shell-search__input">
        <RcIcon name="search" />
        <input
          id="shell-search-input"
          v-model="query"
          type="search"
          placeholder="Plaka, müşteri, kiralama no…"
          autocomplete="off"
          @keydown.esc="emit('close')"
        />
      </div>

      <p v-if="loading" class="shell-search__hint">Aranıyor…</p>
      <p v-else-if="query.trim().length < 2" class="shell-search__hint">
        Aramaya başlamak için en az 2 karakter yazın.
      </p>
      <p v-else-if="results && !results.vehicles.length && !results.customers.length && !results.rentals.length" class="shell-search__hint">
        Sonuç bulunamadı.
      </p>

      <template v-if="results">
        <section v-if="results.vehicles.length" class="shell-search__group">
          <h3>Araçlar</h3>
          <button
            v-for="v in results.vehicles"
            :key="'v-' + v.id"
            type="button"
            class="shell-search__hit"
            @click="goVehicle(v.id)"
          >
            <RcIcon name="car" />
            <span>
              <b>{{ v.label }}</b>
              <small v-if="v.subtitle">{{ v.subtitle }}</small>
            </span>
          </button>
        </section>

        <section v-if="results.customers.length" class="shell-search__group">
          <h3>Müşteriler</h3>
          <button
            v-for="c in results.customers"
            :key="'c-' + c.id"
            type="button"
            class="shell-search__hit"
            @click="goCustomer(c.id)"
          >
            <RcIcon name="users" />
            <span>
              <b>{{ c.label }}</b>
              <small v-if="c.subtitle">{{ c.subtitle }}</small>
            </span>
          </button>
        </section>

        <section v-if="results.rentals.length" class="shell-search__group">
          <h3>Kiralamalar</h3>
          <button
            v-for="r in results.rentals"
            :key="'r-' + r.id"
            type="button"
            class="shell-search__hit"
            @click="goRental(r.id)"
          >
            <RcIcon name="key" />
            <span>
              <b>{{ r.label }}</b>
              <small v-if="r.subtitle">{{ r.subtitle }}</small>
            </span>
          </button>
        </section>
      </template>
    </div>
  </RcModal>
</template>

<style scoped>
.shell-search__input {
  margin-bottom: 16px;
}
.shell-search__hint {
  font-size: 13px;
  color: var(--rc-text-muted);
  margin: 0;
}
.shell-search__group {
  margin-top: 16px;
}
.shell-search__group h3 {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--rc-text-muted);
  margin: 0 0 8px;
}
.shell-search__hit {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-r-8);
  background: var(--rc-surface);
  text-align: left;
  margin-bottom: 6px;
  cursor: pointer;
}
.shell-search__hit:hover {
  background: var(--rc-surface-hover);
  border-color: var(--rc-border-strong, var(--rc-border));
}
.shell-search__hit span {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.shell-search__hit b {
  font-size: 13px;
  font-weight: 500;
  color: var(--rc-text);
}
.shell-search__hit small {
  font-size: 12px;
  color: var(--rc-text-muted);
}
</style>
