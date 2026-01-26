# Module 3: Authentication

## Status: 🟢 Completed

## Rules Compliance
- ✅ `vue-3.md`: Composition API, <script setup>
- ✅ `typescript.md`: Typed props/emits, no any
- ✅ `pinia.md`: Setup store, readonly state
- ✅ `security.md`: Secure token storage
- ✅ `code-style.md`: No comments

---

## Completed Tasks

- [x] Auth store (setup syntax, readonly state)
- [x] LoginForm component
- [x] LoginView page
- [x] Auth guard
- [x] Router integration
- [x] Login redirect handling

---

## Files Created

### Store
- `src/stores/auth.store.ts`
- `src/stores/index.ts`

### Components
- `src/components/auth/LoginForm.vue`

### Views
- `src/views/auth/LoginView.vue`

### Router
- `src/router/guards.ts`
- `src/router/index.ts` (updated)

---

## Auth Store API

```typescript
const authStore = useAuthStore()

// State (readonly)
authStore.user
authStore.loading
authStore.error

// Computed
authStore.isAuthenticated
authStore.isAdmin
authStore.userFullName

// Actions
await authStore.login(credentials)
await authStore.logout()
await authStore.checkAuth()
authStore.clearError()
```

---

## User Flow

1. User navigates to protected route
2. authGuard calls checkAuth()
3. If not authenticated → redirect to /login
4. User submits LoginForm
5. authStore.login() called
6. On success → tokens stored, user fetched
7. Redirect to original URL or dashboard
