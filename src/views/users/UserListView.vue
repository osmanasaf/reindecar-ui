<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { usersApi, branchesApi } from '@/api'
import type { UserResponse, UserRole, CreateUserRequest, UpdateUserRequest } from '@/api'
import type { Branch } from '@/types'
import { useToast } from '@/composables'
import { SearchableSelect } from '@/components/common'
import { RcPageHeader, RcButton, RcEmpty, RcModal, RcAvatar, RcBadge, RcStatusPill, RcTableSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDate } from '@/utils/format'

const users = ref<UserResponse[]>([])
const loading = ref(true)
const saving = ref(false)
const showForm = ref(false)
const editingUser = ref<UserResponse | null>(null)

const toast = useToast()

const branches = ref<Branch[]>([])

const activeCount = computed(() => users.value.filter(u => u.active).length)

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'OPERATOR', label: 'Operatör' },
  { value: 'ADMIN', label: 'Yönetici' },
]

const branchOptions = computed(() =>
  branches.value.map(branch => ({ value: branch.id, label: branch.name })),
)

const requiresBranch = computed(() => formData.value.role === 'OPERATOR')

const formData = ref({
  username: '',
  email: '',
  firstName: '',
  lastName: '',
  role: 'OPERATOR' as UserRole,
  branchId: null as number | null,
  password: '',
})

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || parts[0] || '',
  }
}

async function fetchUsers() {
  loading.value = true
  try {
    const response = await usersApi.getAll({ page: 0, size: 100 })
    users.value = response.content
  } catch (err) {
    toast.apiError(err, 'Kullanıcılar yüklenemedi')
    users.value = []
  } finally {
    loading.value = false
  }
}

async function fetchBranches() {
  try {
    branches.value = await branchesApi.getActive()
  } catch (err) {
    toast.apiError(err, 'Şubeler yüklenemedi')
    branches.value = []
  }
}

function openCreateForm() {
  editingUser.value = null
  formData.value = {
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'OPERATOR',
    branchId: null,
    password: '',
  }
  showForm.value = true
}

function openEditForm(user: UserResponse) {
  editingUser.value = user
  formData.value = {
    username: user.username,
    email: user.email,
    firstName: user.firstName || splitName(user.fullName).firstName,
    lastName: user.lastName || splitName(user.fullName).lastName,
    role: (user.role as UserRole) || 'OPERATOR',
    branchId: user.branchId ?? null,
    password: '',
  }
  showForm.value = true
}

async function handleSubmit() {
  if (requiresBranch.value && formData.value.branchId == null) {
    toast.error('Operatör kullanıcılar için şube seçimi zorunludur')
    return
  }
  saving.value = true
  try {
    if (editingUser.value) {
      const payload: UpdateUserRequest = {
        email: formData.value.email.trim(),
        firstName: formData.value.firstName.trim(),
        lastName: formData.value.lastName.trim(),
        branchId: formData.value.branchId,
      }
      await usersApi.update(editingUser.value.id, payload)
      toast.success('Kullanıcı güncellendi')
    } else {
      const payload: CreateUserRequest = {
        username: formData.value.username.trim(),
        email: formData.value.email.trim(),
        password: formData.value.password,
        firstName: formData.value.firstName.trim(),
        lastName: formData.value.lastName.trim(),
        role: formData.value.role,
        branchId: formData.value.branchId,
      }
      await usersApi.create(payload)
      toast.success('Kullanıcı oluşturuldu')
    }
    showForm.value = false
    await fetchUsers()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  } finally {
    saving.value = false
  }
}

async function toggleStatus(user: UserResponse) {
  try {
    await usersApi.toggleStatus(user.id)
    toast.success(user.active ? 'Kullanıcı devre dışı bırakıldı' : 'Kullanıcı aktifleştirildi')
    await fetchUsers()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase()
}

onMounted(() => {
  fetchUsers()
  fetchBranches()
})
</script>

<template>
  <div class="rc-page rca-users">
    <RcPageHeader
      title="Kullanıcılar"
      subtitle="Sistem kullanıcıları ve rol yönetimi"
    >
      <template #actions>
        <RcButton variant="accent" @click="openCreateForm">
          <RcIcon name="plus" :size="14" />
          Yeni kullanıcı
        </RcButton>
      </template>
    </RcPageHeader>

    <div class="rca-stats rca-stats--payables">
      <div class="rca-stat">
        <div class="rca-stat__label">Toplam</div>
        <div class="rca-stat__value rc-num">{{ users.length }}</div>
      </div>
      <div class="rca-stat">
        <div class="rca-stat__label">Aktif</div>
        <div class="rca-stat__value rca-stat__value--success rc-num">{{ activeCount }}</div>
      </div>
    </div>

    <RcTableSkeleton v-if="loading" :rows="8" :cols="5" />

    <RcEmpty
      v-else-if="users.length === 0"
      title="Kullanıcı yok"
      description="Henüz kullanıcı kaydı bulunmuyor"
    >
      <template #icon><RcIcon name="user" :size="32" /></template>
      <template #action>
        <RcButton variant="accent" @click="openCreateForm">Kullanıcı ekle</RcButton>
      </template>
    </RcEmpty>

    <div v-else class="rc-card" style="overflow: hidden">
      <table class="rc-table rcv-table--slim">
        <thead>
          <tr>
            <th>Kullanıcı</th>
            <th>E-posta</th>
            <th>Rol</th>
            <th>Şube</th>
            <th>Kayıt</th>
            <th>Durum</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" :class="{ 'rca-row--muted': !user.active }">
            <td>
              <div style="display: flex; align-items: center; gap: 10px">
                <RcAvatar size="sm">{{ initials(user.fullName) }}</RcAvatar>
                <div>
                  <div class="rcr-row__primary">{{ user.fullName }}</div>
                  <div class="rcr-row__secondary">@{{ user.username }}</div>
                </div>
              </div>
            </td>
            <td>{{ user.email }}</td>
            <td>
              <RcStatusPill :status="user.role" />
            </td>
            <td>{{ user.branchName || '—' }}</td>
            <td class="rc-mono" style="font-size: 12.5px">
              {{ user.createdAt ? formatDate(user.createdAt) : '—' }}
            </td>
            <td>
              <RcBadge :variant="user.active ? 'success' : 'default'">
                {{ user.active ? 'Aktif' : 'Pasif' }}
              </RcBadge>
            </td>
            <td class="rc-right">
              <div style="display: flex; gap: 6px; justify-content: flex-end">
                <RcButton variant="ghost" size="sm" @click="openEditForm(user)">Düzenle</RcButton>
                <RcButton variant="ghost" size="sm" @click="toggleStatus(user)">
                  {{ user.active ? 'Pasif' : 'Aktif' }}
                </RcButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <RcModal
      :open="showForm"
      :title="editingUser ? 'Kullanıcı düzenle' : 'Yeni kullanıcı'"
      @close="showForm = false"
    >
      <form id="user-form" class="rca-user-form" @submit.prevent="handleSubmit">
        <label class="rc-field">
          <span class="rc-field__label">Ad</span>
          <input v-model="formData.firstName" type="text" class="rc-input" required />
        </label>
        <label class="rc-field">
          <span class="rc-field__label">Soyad</span>
          <input v-model="formData.lastName" type="text" class="rc-input" required />
        </label>
        <label class="rc-field">
          <span class="rc-field__label">Kullanıcı adı</span>
          <input v-model="formData.username" type="text" class="rc-input" required :disabled="!!editingUser" />
        </label>
        <label class="rc-field">
          <span class="rc-field__label">E-posta</span>
          <input v-model="formData.email" type="email" class="rc-input" required />
        </label>
        <label class="rc-field">
          <span class="rc-field__label">Rol</span>
          <SearchableSelect
            v-model="formData.role"
            :options="roleOptions"
            placeholder="Rol seçin"
            search-placeholder="Ara…"
            :disabled="!!editingUser"
          />
        </label>
        <label v-if="requiresBranch" class="rc-field">
          <span class="rc-field__label">Şube</span>
          <SearchableSelect
            v-model="formData.branchId"
            :options="branchOptions"
            placeholder="Şube seçin"
            search-placeholder="Şube ara…"
          />
        </label>
        <label v-if="!editingUser" class="rc-field">
          <span class="rc-field__label">Şifre</span>
          <input v-model="formData.password" type="password" class="rc-input" required minlength="8" />
        </label>
      </form>

      <template #footer>
        <RcButton variant="secondary" @click="showForm = false">İptal</RcButton>
        <RcButton variant="accent" type="submit" form="user-form" :disabled="saving">
          {{ saving ? 'Kaydediliyor…' : (editingUser ? 'Güncelle' : 'Oluştur') }}
        </RcButton>
      </template>
    </RcModal>
  </div>
</template>

<style scoped>
.rca-user-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
