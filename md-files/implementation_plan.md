# Reindecar Frontend - Implementation Plan

## Overview

Vue 3 + TypeScript ile Reindecar Leasing Panel frontend uygulaması.

---

## Rules Compliance

> ⚠️ **IMPORTANT**: All development MUST follow the rules in `agents/rules/frontend/`:

| Rule File | Key Points |
|-----------|------------|
| `vue-3.md` | Composition API, `<script setup>`, max 300 lines/component |
| `typescript.md` | Strict mode, no `any`, typed props/emits |
| `pinia.md` | Setup stores, readonly state, action mutations |
| `composables.md` | `use` prefix, readonly refs, named exports |
| `api-integration.md` | Centralized client, interceptors, typed responses |
| `vue-router.md` | Lazy loading, named routes, guards with meta |
| `security.md` | No v-html, secure tokens, input validation |
| `code-style.md` | **No comments**, self-documenting code |

---

## Tech Stack

- **Framework**: Vue 3 (Composition API)
- **Language**: TypeScript (strict mode)
- **State**: Pinia (setup stores)
- **Router**: Vue Router 4
- **HTTP**: Axios (with BaseApi pattern)
- **Build**: Vite + Rolldown
- **Styling**: CSS Variables

---

## Project Structure

```
src/
├── api/           # BaseApi + domain services
├── components/    # base, layout, shared, feature
├── composables/   # use* functions
├── router/        # routes + guards
├── stores/        # Pinia stores
├── types/         # TypeScript definitions
├── utils/         # Utility functions
└── views/         # Page components
```

---

## Modules

| Phase | Module | Timeframe |
|-------|--------|-----------|
| 1 | Foundation | ✅ Done |
| 2 | Infrastructure | ✅ Done |
| 3 | Authentication | Week 1 |
| 4 | Layout | Week 1 |
| 5 | Dashboard | Week 2 |
| 6 | Vehicles | Week 2-3 |
| 7 | Customers | Week 3 |
| 8 | Rentals (Core) | Week 3-4 |
| 9 | Branches | Week 4 |
| 10 | Payments | Week 4-5 |
| 11 | Campaigns | Week 5 |
| 12 | Users | Week 5 |
| 13 | Settings | Week 6 |

---

## API Pattern

```typescript
abstract class BaseApi {
  protected async get<T>(url: string, params?): Promise<T>
  protected async post<T>(url: string, body?): Promise<T>
  protected async put<T>(url: string, body?): Promise<T>
  protected async patch<T>(url: string, body?): Promise<T>
  protected async delete(url: string): Promise<void>
  protected async getPaginated<T>(url: string, params?): Promise<PaginatedResponse<T>>
}

class CustomersApiService extends BaseApi {
  async getAll(params?): Promise<PaginatedResponse<Customer>> {
    return this.getPaginated<Customer>('/customers', params)
  }
}

export const customersApi = new CustomersApiService()
```

---

## Composables Pattern

```typescript
export function useFetch<T>(fetcher: () => Promise<T>) {
  const data = shallowRef<T | null>(null)
  const error = shallowRef<ApiError | null>(null)
  const loading = ref(false)

  async function execute() { /* ... */ }

  return {
    data: readonly(data) as Ref<T | null>,
    error: readonly(error) as Ref<ApiError | null>,
    loading: readonly(loading),
    execute,
    refresh: execute
  }
}
```

---

## Store Pattern

```typescript
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)

  const isAuthenticated = computed(() => !!accessToken.value)
  const isAdmin = computed(() => user.value?.role === Role.ADMIN)

  async function login(credentials: LoginForm) { }
  function logout() { }

  return {
    user: readonly(user),
    isAuthenticated,
    isAdmin,
    login,
    logout
  }
})
```

---

## Module Plans Location

All detailed module plans: `md-files/modules/`
