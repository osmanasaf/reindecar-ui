<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { userInvitationsApi } from '@/api'
import { useToast } from '@/composables'
import type { UserInvitationResponse, UserInvitationRole } from '@/api'

const toast = useToast()

const invitations = ref<UserInvitationResponse[]>([])
const loading = ref(true)
const creating = ref(false)
const cancellingId = ref<number | null>(null)
const createError = ref<string | null>(null)
const lastInviteLink = ref('')

const form = ref({
  email: '',
  role: 'OPERATOR' as UserInvitationRole
})

const roleLabels: Record<UserInvitationRole, string> = {
  ADMIN: 'Tenant admin',
  OPERATOR: 'Operatör'
}

const statusLabels: Record<string, string> = {
  PENDING: 'Beklemede',
  USED: 'Kullanıldı',
  CANCELLED: 'İptal edildi',
  EXPIRED: 'Süresi doldu'
}

onMounted(loadInvitations)

async function loadInvitations() {
  loading.value = true
  try {
    invitations.value = await userInvitationsApi.list()
  } catch (e) {
    toast.apiError(e, 'Davetler yüklenemedi')
  } finally {
    loading.value = false
  }
}

async function createInvitation() {
  if (!isValidEmail(form.value.email)) {
    createError.value = 'Geçerli bir e-posta adresi girin.'
    return
  }

  creating.value = true
  createError.value = null

  try {
    const created = await userInvitationsApi.create({
      email: form.value.email.trim(),
      role: form.value.role
    })
    invitations.value = [created, ...invitations.value]
    form.value.email = ''
    lastInviteLink.value = buildInvitationLink(created)
    await copyText(lastInviteLink.value)
    toast.success('Davet oluşturuldu')
  } catch (e) {
    createError.value = (e as Error).message || 'Davet oluşturulamadı'
  } finally {
    creating.value = false
  }
}

async function cancelInvitation(invitation: UserInvitationResponse) {
  if (!confirm(`${invitation.email} daveti iptal edilsin mi?`)) return

  cancellingId.value = invitation.id
  try {
    await userInvitationsApi.cancel(invitation.id)
    await loadInvitations()
    toast.success('Davet iptal edildi')
  } catch (e) {
    toast.apiError(e, 'Davet iptal edilemedi')
  } finally {
    cancellingId.value = null
  }
}

async function copyInvitationLink(invitation: UserInvitationResponse) {
  if (!invitation.token) {
    toast.error('Bu davetin token bilgisi yalnızca oluşturulduğu anda gösterilir.')
    return
  }
  const url = buildInvitationLink(invitation)
  await copyText(url)
  toast.success('Davet linki kopyalandı')
}

function buildInvitationLink(invitation: UserInvitationResponse) {
  return `${window.location.origin}/register-invited-user?token=${invitation.token}`
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}
</script>

<template>
  <div class="invitations-page">
    <header class="page-header responsive-page-header">
      <div class="header-left">
        <h1>Kullanıcı Davetleri</h1>
        <span class="count">{{ invitations.length }} davet</span>
      </div>
    </header>

    <section class="create-card">
      <h2>Yeni davet oluştur</h2>
      <form class="invite-form" @submit.prevent="createInvitation">
        <div class="form-group">
          <label for="invite-email">E-posta</label>
          <input id="invite-email" v-model="form.email" type="email" required placeholder="kullanici@firma.com" />
        </div>

        <div class="form-group">
          <label for="invite-role">Rol</label>
          <select id="invite-role" v-model="form.role">
            <option value="OPERATOR">Operatör</option>
            <option value="ADMIN">Tenant admin</option>
          </select>
        </div>

        <button class="btn btn-primary" type="submit" :disabled="creating || !form.email">
          {{ creating ? 'Oluşturuluyor...' : 'Davet oluştur' }}
        </button>
      </form>
      <p v-if="createError" class="error-text">{{ createError }}</p>
      <p class="hint">Davet linki oluşturulduğunda otomatik panoya kopyalanır. Token veritabanında düz metin saklanmaz.</p>

      <div v-if="lastInviteLink" class="created-link">
        <div>
          <strong>Son oluşturulan davet linki</strong>
          <span>Bu linki test kullanıcısına gönderebilir veya yeni sekmede açabilirsiniz.</span>
        </div>
        <input :value="lastInviteLink" readonly />
        <button class="btn btn-secondary" type="button" @click="copyText(lastInviteLink)">
          Kopyala
        </button>
      </div>
    </section>

    <div v-if="loading" class="loading">Yükleniyor...</div>

    <section v-else class="table-card responsive-table">
      <table>
        <thead>
          <tr>
            <th>E-posta</th>
            <th>Rol</th>
            <th>Durum</th>
            <th>Oluşturulma</th>
            <th>Son kullanma</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="invitation in invitations" :key="invitation.id">
            <td>{{ invitation.email }}</td>
            <td>{{ roleLabels[invitation.role] }}</td>
            <td>
              <span :class="['status-badge', invitation.status.toLowerCase()]">
                {{ statusLabels[invitation.status] }}
              </span>
            </td>
            <td>{{ formatDate(invitation.createdAt) }}</td>
            <td>{{ formatDate(invitation.expiresAt) }}</td>
            <td class="actions">
              <button
                v-if="invitation.status === 'PENDING' && invitation.token"
                class="btn-action"
                type="button"
                @click="copyInvitationLink(invitation)"
              >
                Linki kopyala
              </button>
              <button
                v-if="invitation.status === 'PENDING'"
                class="btn-action danger"
                type="button"
                :disabled="cancellingId === invitation.id"
                @click="cancelInvitation(invitation)"
              >
                İptal
              </button>
            </td>
          </tr>
          <tr v-if="invitations.length === 0">
            <td colspan="6" class="empty">Henüz davet oluşturulmadı.</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.invitations-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.create-card,
.table-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
}

.create-card h2 {
  margin: 0 0 16px;
  font-size: 18px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 10px 16px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 700;
  line-height: 1;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast), opacity var(--transition-fast);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text);
  border-color: var(--color-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
}

.invite-form {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 180px auto;
  gap: 14px;
  align-items: end;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.form-group input,
.form-group select {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
}

.hint {
  margin: 12px 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.created-link {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg);
}

.created-link > div {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.created-link span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.created-link input {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
}

.error-text {
  margin: 12px 0 0;
  color: var(--color-danger);
}

.status-badge {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  background: var(--color-bg);
}

.status-badge.pending {
  color: var(--color-warning);
}

.status-badge.used {
  color: var(--color-success);
}

.status-badge.cancelled,
.status-badge.expired {
  color: var(--color-text-secondary);
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 7px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: 700;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast), opacity var(--transition-fast);
}

.btn-action:hover:not(:disabled) {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}

.btn-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-action.danger {
  color: var(--color-danger);
}

.btn-action.danger:hover:not(:disabled) {
  background: var(--color-danger-light);
  border-color: var(--color-danger);
}

.empty {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 24px;
}

@media (max-width: 760px) {
  .invite-form {
    grid-template-columns: 1fr;
  }

  .created-link {
    grid-template-columns: 1fr;
  }
}
</style>
