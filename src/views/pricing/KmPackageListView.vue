<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { kmPackagesApi } from '@/api/km-packages.api'
import { useToast } from '@/composables'
import { RentalType } from '@/types'
import type { KmPackage, CreateKmPackageForm, UpdateKmPackageForm } from '@/types'

const toast = useToast()

const packages = ref<KmPackage[]>([])
const loading = ref(true)
const activeTab = ref<RentalType | 'ALL'>('ALL')
const showModal = ref(false)
const editingPackage = ref<KmPackage | null>(null)
const saving = ref(false)

const form = ref<CreateKmPackageForm>({
    name: '',
    includedKm: 0,
    extraKmPrice: 0,
    applicableTypes: [],
    unlimited: false,
    categoryId: undefined
})

const rentalTypes: { value: RentalType; label: string }[] = [
    { value: RentalType.DAILY, label: 'Günlük' },
    { value: RentalType.WEEKLY, label: 'Haftalık' },
    { value: RentalType.MONTHLY, label: 'Aylık' },
    { value: RentalType.LEASING, label: 'Leasing' }
]

const tabs = [
    { value: 'ALL', label: 'Tümü' },
    ...rentalTypes
]

const filteredPackages = computed(() => {
    if (activeTab.value === 'ALL') return packages.value
    return packages.value.filter(p => p.applicableTypes.includes(activeTab.value as RentalType))
})

async function fetchPackages() {
    loading.value = true
    try {
        packages.value = await kmPackagesApi.getAll()
    } catch (err) {
        toast.apiError(err, 'KM paketleri yüklenemedi')
    } finally {
        loading.value = false
    }
}

function openCreateModal() {
    editingPackage.value = null
    form.value = {
        name: '',
        includedKm: 0,
        extraKmPrice: 0,
        applicableTypes: [],
        unlimited: false,
        categoryId: undefined
    }
    showModal.value = true
}

function openEditModal(pkg: KmPackage) {
    editingPackage.value = pkg
    form.value = {
        name: pkg.name,
        includedKm: pkg.includedKm,
        extraKmPrice: pkg.extraKmPrice,
        applicableTypes: [...pkg.applicableTypes],
        unlimited: pkg.unlimited,
        categoryId: pkg.categoryId ?? undefined
    }
    showModal.value = true
}

function closeModal() {
    showModal.value = false
    editingPackage.value = null
}

function toggleType(type: RentalType) {
    const idx = form.value.applicableTypes.indexOf(type)
    if (idx >= 0) {
        form.value.applicableTypes.splice(idx, 1)
    } else {
        form.value.applicableTypes.push(type)
    }
}

async function savePackage() {
    if (!form.value.name || form.value.applicableTypes.length === 0) {
        toast.error('Paket adı ve uygulanacak kiralama tipleri zorunludur')
        return
    }

    saving.value = true
    try {
        if (editingPackage.value) {
            const updateForm: UpdateKmPackageForm = {
                name: form.value.name,
                includedKm: form.value.includedKm,
                extraKmPrice: form.value.extraKmPrice,
                applicableTypes: form.value.applicableTypes,
                unlimited: form.value.unlimited,
                categoryId: form.value.categoryId
            }
            await kmPackagesApi.update(editingPackage.value.id, updateForm)
            toast.success('KM paketi güncellendi')
        } else {
            await kmPackagesApi.create(form.value)
            toast.success('KM paketi oluşturuldu')
        }
        closeModal()
        await fetchPackages()
    } catch (err) {
        toast.apiError(err, 'İşlem başarısız')
    } finally {
        saving.value = false
    }
}

async function toggleActive(pkg: KmPackage) {
    try {
        if (pkg.active) {
            await kmPackagesApi.deactivate(pkg.id)
            toast.success('Paket pasife alındı')
        } else {
            await kmPackagesApi.activate(pkg.id)
            toast.success('Paket aktifleştirildi')
        }
        await fetchPackages()
    } catch (err) {
        toast.apiError(err, 'İşlem başarısız')
    }
}

function formatMoney(amount: number, currency: string = 'TRY'): string {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency
    }).format(amount)
}

onMounted(fetchPackages)
</script>

<template>
    <div class="km-packages-view">
        <header class="page-header">
            <div class="header-content">
                <h1>KM Paketleri</h1>
                <p class="subtitle">Kiralama türlerine göre KM paketlerini yönetin</p>
            </div>
            <button class="btn btn-primary" @click="openCreateModal">
                + Yeni Paket
            </button>
        </header>

        <div class="tabs">
            <button 
                v-for="tab in tabs" 
                :key="tab.value"
                :class="['tab', { active: activeTab === tab.value }]"
                @click="activeTab = tab.value as RentalType | 'ALL'"
            >
                {{ tab.label }}
            </button>
        </div>

        <div v-if="loading" class="loading">Yükleniyor...</div>
        
        <div v-else-if="filteredPackages.length === 0" class="empty-state">
            <p>Henüz KM paketi bulunmuyor</p>
            <button class="btn btn-primary" @click="openCreateModal">İlk Paketi Oluştur</button>
        </div>

        <div v-else class="packages-grid">
            <div 
                v-for="pkg in filteredPackages" 
                :key="pkg.id" 
                :class="['package-card', { inactive: !pkg.active }]"
            >
                <div class="package-header">
                    <h3>{{ pkg.name }}</h3>
                    <span :class="['status-badge', pkg.active ? 'active' : 'inactive']">
                        {{ pkg.active ? 'Aktif' : 'Pasif' }}
                    </span>
                </div>
                
                <div class="package-details">
                    <div class="detail-row">
                        <span class="label">Dahil KM:</span>
                        <span class="value">{{ pkg.unlimited ? 'Sınırsız' : pkg.includedKm.toLocaleString('tr-TR') + ' km' }}</span>
                    </div>
                    <div v-if="!pkg.unlimited" class="detail-row">
                        <span class="label">Aşım Ücreti:</span>
                        <span class="value">{{ formatMoney(pkg.extraKmPrice, pkg.currency) }}/km</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Geçerli:</span>
                        <span class="value types">
                            <span v-for="type in pkg.applicableTypes" :key="type" class="type-badge">
                                {{ rentalTypes.find(t => t.value === type)?.label }}
                            </span>
                        </span>
                    </div>
                    <div v-if="pkg.categoryName" class="detail-row">
                        <span class="label">Kategori:</span>
                        <span class="value">{{ pkg.categoryName }}</span>
                    </div>
                    <div v-if="pkg.global" class="detail-row">
                        <span class="value global-badge">🌐 Tüm Kategoriler</span>
                    </div>
                </div>

                <div class="package-actions">
                    <button class="btn btn-sm btn-outline" @click="openEditModal(pkg)">
                        Düzenle
                    </button>
                    <button 
                        :class="['btn', 'btn-sm', pkg.active ? 'btn-warning' : 'btn-success']" 
                        @click="toggleActive(pkg)"
                    >
                        {{ pkg.active ? 'Pasif Yap' : 'Aktif Yap' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal -->
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
            <div class="modal">
                <div class="modal-header">
                    <h3>{{ editingPackage ? 'KM Paketi Düzenle' : 'Yeni KM Paketi' }}</h3>
                    <button class="close-btn" @click="closeModal">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="form-group">
                        <label>Paket Adı *</label>
                        <input v-model="form.name" type="text" placeholder="Örn: Standart 1000 KM" />
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Dahil KM</label>
                            <input 
                                v-model.number="form.includedKm" 
                                type="number" 
                                min="0"
                                :disabled="form.unlimited"
                            />
                        </div>
                        <div class="form-group">
                            <label>Aşım Ücreti (KM başına)</label>
                            <input 
                                v-model.number="form.extraKmPrice" 
                                type="number" 
                                step="0.01"
                                min="0"
                                :disabled="form.unlimited"
                            />
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="checkbox-label">
                            <input v-model="form.unlimited" type="checkbox" />
                            <span>Sınırsız KM</span>
                        </label>
                    </div>

                    <div class="form-group">
                        <label>Uygulanacak Kiralama Tipleri *</label>
                        <div class="type-selector">
                            <button 
                                v-for="type in rentalTypes" 
                                :key="type.value"
                                :class="['type-btn', { selected: form.applicableTypes.includes(type.value) }]"
                                @click="toggleType(type.value)"
                            >
                                {{ type.label }}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-outline" @click="closeModal">İptal</button>
                    <button class="btn btn-primary" :disabled="saving" @click="savePackage">
                        {{ saving ? 'Kaydediliyor...' : (editingPackage ? 'Güncelle' : 'Oluştur') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.km-packages-view {
    padding: 24px;
    max-width: 1400px;
    margin: 0 auto;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.header-content h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
}

.subtitle {
    margin: 4px 0 0;
    color: var(--color-text-secondary);
}

.tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 12px;
}

.tab {
    padding: 8px 16px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 14px;
    color: var(--color-text-secondary);
    border-radius: 6px;
    transition: all 0.2s;
}

.tab:hover {
    background: var(--color-bg-secondary);
}

.tab.active {
    background: var(--color-primary);
    color: white;
}

.loading, .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--color-text-secondary);
}

.packages-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
}

.package-card {
    background: white;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 20px;
    transition: all 0.2s;
}

.package-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.package-card.inactive {
    opacity: 0.6;
    background: var(--color-bg-secondary);
}

.package-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.package-header h3 {
    margin: 0;
    font-size: 18px;
}

.status-badge {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
}

.status-badge.active {
    background: #dcfce7;
    color: #166534;
}

.status-badge.inactive {
    background: #f3f4f6;
    color: #6b7280;
}

.package-details {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
}

.detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
}

.detail-row .label {
    color: var(--color-text-secondary);
}

.detail-row .value {
    font-weight: 500;
}

.detail-row .types {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.type-badge {
    padding: 2px 8px;
    background: var(--color-primary-light);
    color: var(--color-primary);
    border-radius: 4px;
    font-size: 12px;
}

.global-badge {
    color: var(--color-primary);
    font-size: 13px;
}

.package-actions {
    display: flex;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid var(--color-border);
}

.btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
}

.btn-sm {
    padding: 6px 12px;
    font-size: 13px;
}

.btn-primary {
    background: var(--color-primary);
    color: white;
}

.btn-primary:hover {
    background: var(--color-primary-dark);
}

.btn-outline {
    background: white;
    border: 1px solid var(--color-border);
    color: var(--color-text);
}

.btn-outline:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
}

.btn-warning {
    background: #fef3c7;
    color: #92400e;
}

.btn-success {
    background: #dcfce7;
    color: #166534;
}

/* Modal */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
}

.modal {
    background: white;
    border-radius: 12px;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
    margin: 0;
    font-size: 18px;
}

.close-btn {
    background: none;
    border: none;
    font-size: 28px;
    cursor: pointer;
    color: var(--color-text-secondary);
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-body {
    padding: 24px;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid var(--color-border);
}

.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 500;
}

.form-group input[type="text"],
.form-group input[type="number"] {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    font-size: 14px;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

.checkbox-label input {
    width: auto;
}

.type-selector {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.type-btn {
    padding: 8px 16px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: white;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
}

.type-btn:hover {
    border-color: var(--color-primary);
}

.type-btn.selected {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
}

@media (max-width: 768px) {
    .page-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
    }

    .packages-grid {
        grid-template-columns: 1fr;
    }

    .form-row {
        grid-template-columns: 1fr;
    }
}
</style>
