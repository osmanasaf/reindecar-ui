import { createRouter, createWebHistory } from 'vue-router'
import { authGuard } from './guards'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: () => import('@/views/auth/LoginView.vue'),
            meta: { requiresAuth: false }
        },
        {
            path: '/',
            name: 'dashboard',
            component: () => import('@/views/dashboard/DashboardView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/vehicles',
            name: 'vehicles',
            component: () => import('@/views/vehicles/VehicleListView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/vehicles/new',
            name: 'vehicle-create',
            component: () => import('@/views/vehicles/VehicleFormView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/vehicles/:id/edit',
            name: 'vehicle-edit',
            component: () => import('@/views/vehicles/VehicleFormView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/vehicles/:id',
            name: 'vehicle-detail',
            component: () => import('@/views/vehicles/VehicleDetailView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/customers',
            name: 'customers',
            component: () => import('@/views/customers/CustomerListView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/customers/new/:type?',
            name: 'customer-create',
            component: () => import('@/views/customers/CustomerFormView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/customers/:id/edit',
            name: 'customer-edit',
            component: () => import('@/views/customers/CustomerFormView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/customers/:id',
            name: 'customer-detail',
            component: () => import('@/views/customers/CustomerDetailView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/rentals',
            name: 'rentals',
            component: () => import('@/views/rentals/RentalListView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/rentals/create',
            name: 'rental-create',
            component: () => import('@/views/rentals/RentalCreateView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/rentals/:id',
            name: 'rental-detail',
            component: () => import('@/views/rentals/RentalDetailView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/branches',
            name: 'branches',
            component: () => import('@/views/branches/BranchListView.vue'),
            meta: { requiresAuth: true, roles: ['ADMIN'] }
        },
        {
            path: '/users',
            name: 'users',
            component: () => import('@/views/users/UserListView.vue'),
            meta: { requiresAuth: true, roles: ['ADMIN'] }
        },
        {
            path: '/settings',
            name: 'settings',
            component: () => import('@/views/settings/SettingsView.vue'),
            meta: { requiresAuth: true }
        },
        // Accounting routes
        {
            path: '/accounting/receivables',
            name: 'receivables',
            component: () => import('@/views/accounting/ReceivablesListView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/accounting/receivables/:id',
            name: 'receivable-detail',
            component: () => import('@/views/accounting/ReceivableDetailView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/accounting/payables',
            name: 'payables',
            component: () => import('@/views/accounting/PayablesListView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/accounting/payables/:id',
            name: 'payable-detail',
            component: () => import('@/views/accounting/PayableDetailView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/accounting/insurance-claims',
            name: 'insurance-claims',
            component: () => import('@/views/accounting/InsuranceClaimsListView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/accounting/insurance-claims/:id',
            name: 'claim-detail',
            component: () => import('@/views/accounting/InsuranceClaimDetailView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/accounting/service-providers',
            name: 'service-providers',
            component: () => import('@/views/accounting/ServiceProvidersListView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/accounting/service-providers/:id',
            name: 'provider-detail',
            component: () => import('@/views/accounting/ServiceProviderDetailView.vue'),
            meta: { requiresAuth: true }
        },
        // Fallback
        {
            path: '/:pathMatch(.*)*',
            redirect: '/'
        }
    ]
})

router.beforeEach(authGuard)

export default router
