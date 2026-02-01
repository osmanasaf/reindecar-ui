<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { branchesApi, vehiclesApi } from '@/api'
import { useToast } from '@/composables'
import type { Branch } from '@/types'

interface BranchWithCount extends Branch {
  vehicleCount?: number
}

const branches = ref<BranchWithCount[]>([])
const loading = ref(true)
const showForm = ref(false)
const editingBranch = ref<Branch | null>(null)

const toast = useToast()

const formData = ref({
  name: '',
  address: '',
  city: '',
  phone: '',
  active: true
})

const activeBranches = computed(() => branches.value.filter(b => b.active))
const inactiveBranches = computed(() => branches.value.filter(b => !b.active))

async function fetchBranches() {
  loading.value = true
  try {
    const response = await branchesApi.getAll()
    branches.value = response.content
    
    // Her şube için araç sayısını çek
    await fetchVehicleCounts()
  } catch {
    toast.error('Şubeler yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

async function fetchVehicleCounts() {
  const promises = branches.value.map(async (branch) => {
    try {
      const response = await vehiclesApi.getByBranch(branch.id)
      branch.vehicleCount = response.totalElements
    } catch {
      branch.vehicleCount = 0
    }
  })
  
  await Promise.all(promises)
}

function openCreateForm() {
  editingBranch.value = null
  formData.value = { name: '', address: '', city: '', phone: '', active: true }
  showForm.value = true
}

function openEditForm(branch: Branch) {
  editingBranch.value = branch
  formData.value = {
    name: branch.name,
    address: branch.address,
    city: branch.city,
    phone: branch.phone,
    active: branch.active
  }
  showForm.value = true
}

async function handleSubmit() {
  try {
    if (editingBranch.value) {
      await branchesApi.update(editingBranch.value.id, formData.value)
      toast.success('Şube güncellendi')
    } else {
      await branchesApi.create(formData.value)
      toast.success('Şube oluşturuldu')
    }
    showForm.value = false
    fetchBranches()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

async function toggleStatus(branch: Branch) {
  try {
    await branchesApi.updateStatus(branch.id, !branch.active)
    toast.success(branch.active ? 'Şube pasifleştirildi' : 'Şube aktifleştirildi')
    fetchBranches()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

onMounted(fetchBranches)
</script>

<template>
  <div class="branches-page">
    <header class="page-header">
      <div class="header-left">
        <h1>Şubeler</h1>
        <span class="count">{{ branches.length }} şube</span>
      </div>
      <button class="btn btn-primary" @click="openCreateForm">
        ➕ Yeni Şube
      </button>
    </header>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <template v-else>
      <div class="branches-grid">
        <div 
          v-for="branch in branches" 
          :key="branch.id"
          :class="['branch-card', { inactive: !branch.active }]"
        >
          <div class="card-header">
            <h3>{{ branch.name }}</h3>
            <span :class="['status-badge', branch.active ? 'active' : 'inactive']">
              {{ branch.active ? 'Aktif' : 'Pasif' }}
            </span>
          </div>
          
          <div class="card-body">
            <div class="info-row">
              <span class="icon">📍</span>
              <span>{{ branch.address }}, {{ branch.city }}</span>
            </div>
            <div class="info-row">
              <span class="icon">📞</span>
              <span>{{ branch.phone }}</span>
            </div>
            <div class="info-row">
              <span class="icon">🚗</span>
              <span>{{ branch.vehicleCount || 0 }} araç</span>
            </div>
          </div>

          <div class="card-footer">
            <button class="btn-action" @click="openEditForm(branch)">
              ✏️ Düzenle
            </button>
            <button 
              :class="['btn-action', branch.active ? 'danger' : 'success']"
              @click="toggleStatus(branch)"
            >
              {{ branch.active ? '⏸️ Pasifleştir' : '▶️ Aktifleştir' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="branches.length === 0" class="empty-state">
        <p>Henüz şube eklenmemiş</p>
      </div>
    </template>

    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal">
        <h2>{{ editingBranch ? 'Şube Düzenle' : 'Yeni Şube' }}</h2>
        
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label>Şube Adı</label>
            <input v-model="formData.name" type="text" required />
          </div>
          
          <div class="form-group">
            <label>Adres</label>
            <input v-model="formData.address" type="text" required />
          </div>
          
          <div class="form-group">
            <label>Şehir</label>
            <input v-model="formData.city" type="text" required />
          </div>
          
          <div class="form-group">
            <label>Telefon</label>
            <input v-model="formData.phone" type="tel" required />
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-outline" @click="showForm = false">
              İptal
            </button>
            <button type="submit" class="btn btn-primary">
              {{ editingBranch ? 'Güncelle' : 'Oluştur' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.branches-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 0;
}

.count {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary { background: var(--color-primary); color: white; }
.btn-outline { background: transparent; border: 1px solid var(--color-border); color: var(--color-text); }

.loading,
.empty-state {
  text-align: center;
  padding: 60px;
  color: var(--color-text-secondary);
}

.branches-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.branch-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
}

.branch-card.inactive {
  opacity: 0.7;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
}

.card-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background: var(--color-success-light);
  color: var(--color-success);
}

.status-badge.inactive {
  background: var(--color-bg-secondary);
  color: var(--color-text-muted);
}

.card-body {
  padding: 20px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.info-row:last-child {
  margin-bottom: 0;
}

.icon {
  font-size: 16px;
}

.card-footer {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  background: var(--color-bg-secondary);
}

.btn-action {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  background: var(--color-surface);
  color: var(--color-text);
  transition: all 0.2s;
}

.btn-action:hover {
  background: var(--color-primary-light);
}

.btn-action.danger:hover {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.btn-action.success:hover {
  background: var(--color-success-light);
  color: var(--color-success);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 32px;
  width: 100%;
  max-width: 480px;
}

.modal h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 24px 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--color-text-secondary);
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 32px;
}

.form-actions .btn {
  flex: 1;
}
</style>
