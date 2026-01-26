<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '@/composables'

interface User {
  id: number
  username: string
  email: string
  fullName: string
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR'
  branchName: string
  active: boolean
  createdAt: string
}

const users = ref<User[]>([])
const loading = ref(true)
const showForm = ref(false)
const editingUser = ref<User | null>(null)

const toast = useToast()

const roleLabels: Record<string, string> = {
  ADMIN: 'Yönetici',
  MANAGER: 'Şube Müdürü',
  OPERATOR: 'Operatör'
}

const formData = ref({
  username: '',
  email: '',
  fullName: '',
  role: 'OPERATOR' as 'ADMIN' | 'MANAGER' | 'OPERATOR',
  branchId: null as number | null,
  password: ''
})

async function fetchUsers() {
  loading.value = true
  try {
    users.value = [
      { id: 1, username: 'admin', email: 'admin@reindecar.com', fullName: 'Sistem Admin', role: 'ADMIN', branchName: 'Merkez', active: true, createdAt: '2026-01-01' },
      { id: 2, username: 'manager1', email: 'manager@reindecar.com', fullName: 'Ahmet Yönetici', role: 'MANAGER', branchName: 'İstanbul', active: true, createdAt: '2026-01-05' },
      { id: 3, username: 'operator1', email: 'operator@reindecar.com', fullName: 'Mehmet Operatör', role: 'OPERATOR', branchName: 'İstanbul', active: true, createdAt: '2026-01-10' }
    ]
  } catch {
    toast.error('Kullanıcılar yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

function openCreateForm() {
  editingUser.value = null
  formData.value = { username: '', email: '', fullName: '', role: 'OPERATOR', branchId: null, password: '' }
  showForm.value = true
}

function openEditForm(user: User) {
  editingUser.value = user
  formData.value = {
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    branchId: null,
    password: ''
  }
  showForm.value = true
}

async function handleSubmit() {
  toast.success(editingUser.value ? 'Kullanıcı güncellendi' : 'Kullanıcı oluşturuldu')
  showForm.value = false
  fetchUsers()
}

async function toggleStatus(user: User) {
  toast.success(user.active ? 'Kullanıcı devre dışı bırakıldı' : 'Kullanıcı aktifleştirildi')
  user.active = !user.active
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR')
}

onMounted(fetchUsers)
</script>

<template>
  <div class="users-page">
    <header class="page-header">
      <div class="header-left">
        <h1>Kullanıcılar</h1>
        <span class="count">{{ users.length }} kullanıcı</span>
      </div>
      <button class="btn btn-primary" @click="openCreateForm">
        ➕ Yeni Kullanıcı
      </button>
    </header>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <div v-else class="users-table">
      <table>
        <thead>
          <tr>
            <th>Kullanıcı</th>
            <th>E-posta</th>
            <th>Rol</th>
            <th>Şube</th>
            <th>Kayıt Tarihi</th>
            <th>Durum</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td class="user-cell">
              <span class="avatar">{{ user.fullName.charAt(0) }}</span>
              <div>
                <strong>{{ user.fullName }}</strong>
                <span class="username">@{{ user.username }}</span>
              </div>
            </td>
            <td>{{ user.email }}</td>
            <td>
              <span :class="['role-badge', user.role.toLowerCase()]">
                {{ roleLabels[user.role] }}
              </span>
            </td>
            <td>{{ user.branchName }}</td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td>
              <span :class="['status-badge', user.active ? 'active' : 'inactive']">
                {{ user.active ? 'Aktif' : 'Pasif' }}
              </span>
            </td>
            <td class="actions">
              <button class="btn-action" @click="openEditForm(user)">✏️</button>
              <button class="btn-action" @click="toggleStatus(user)">
                {{ user.active ? '⏸️' : '▶️' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal">
        <h2>{{ editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı' }}</h2>
        
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label>Ad Soyad</label>
            <input v-model="formData.fullName" type="text" required />
          </div>
          
          <div class="form-group">
            <label>Kullanıcı Adı</label>
            <input v-model="formData.username" type="text" required :disabled="!!editingUser" />
          </div>
          
          <div class="form-group">
            <label>E-posta</label>
            <input v-model="formData.email" type="email" required />
          </div>
          
          <div class="form-group">
            <label>Rol</label>
            <select v-model="formData.role" required>
              <option value="OPERATOR">Operatör</option>
              <option value="MANAGER">Şube Müdürü</option>
              <option value="ADMIN">Yönetici</option>
            </select>
          </div>
          
          <div v-if="!editingUser" class="form-group">
            <label>Şifre</label>
            <input v-model="formData.password" type="password" required />
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-outline" @click="showForm = false">İptal</button>
            <button type="submit" class="btn btn-primary">{{ editingUser ? 'Güncelle' : 'Oluştur' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.users-page {
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

.loading {
  text-align: center;
  padding: 60px;
  color: var(--color-text-secondary);
}

.users-table {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  padding: 14px 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

td {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  font-size: 14px;
}

tbody tr:last-child td {
  border-bottom: none;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.user-cell strong {
  display: block;
}

.username {
  font-size: 12px;
  color: var(--color-text-muted);
}

.role-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.role-badge.admin { background: #fef3c7; color: #d97706; }
.role-badge.manager { background: #dbeafe; color: #1d4ed8; }
.role-badge.operator { background: var(--color-bg-secondary); color: var(--color-text-secondary); }

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active { background: var(--color-success-light); color: var(--color-success); }
.status-badge.inactive { background: var(--color-bg-secondary); color: var(--color-text-muted); }

.actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: var(--color-bg-secondary);
  font-size: 14px;
}

.btn-action:hover {
  background: var(--color-primary-light);
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

.form-group input,
.form-group select {
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
