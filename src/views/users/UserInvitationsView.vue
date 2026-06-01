<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { userInvitationsApi } from '@/api'
import { useToast } from '@/composables'
import { AccountingConfirmModal } from '@/components/accounting'
import { RcPageHeader, RcButton, RcEmpty, RcStatusPill } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { UserInvitationResponse, UserInvitationRole } from '@/api'

const toast = useToast()

const invitations = ref<UserInvitationResponse[]>([])
const loading = ref(true)
const creating = ref(false)
const cancellingId = ref<number | null>(null)
const createError = ref<string | null>(null)
const lastInviteLink = ref('')
const cancelTarget = ref<UserInvitationResponse | null>(null)

const form = ref({
  email: '',
  role: 'OPERATOR' as UserInvitationRole,
})

const roleLabels: Record<UserInvitationRole, string> = {
  ADMIN: 'Tenant admin',
  OPERATOR: 'Operatör',
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
      role: form.value.role,
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

function requestCancel(invitation: UserInvitationResponse) {
  cancelTarget.value = invitation
}

async function confirmCancel() {
  const invitation = cancelTarget.value
  if (!invitation) return

  cancellingId.value = invitation.id
  try {
    await userInvitationsApi.cancel(invitation.id)
    cancelTarget.value = null
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
  await copyText(buildInvitationLink(invitation))
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
  if (!value) return '—'
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
</script>

<template>
  <div class="rc-page rca-invitations">
    <RcPageHeader
      title="Kullanıcı Davetleri"
      subtitle="Yeni kullanıcıları e-posta daveti ile sisteme ekleyin"
    />

    <div class="rca-stats rca-stats--payables">
      <div class="rca-stat">
        <div class="rca-stat__label">Toplam davet</div>
        <div class="rca-stat__value rc-num">{{ invitations.length }}</div>
      </div>
      <div class="rca-stat">
        <div class="rca-stat__label">Bekleyen</div>
        <div class="rca-stat__value rca-stat__value--warning rc-num">
          {{ invitations.filter(i => i.status === 'PENDING').length }}
        </div>
      </div>
    </div>

    <div class="rc-card rca-invite-panel">
      <div class="rc-card__head">
        <div>
          <div class="rc-card__title">Yeni davet oluştur</div>
          <div style="font-size: 12px; color: var(--rc-text-muted); margin-top: 2px">
            Link oluşturulunca otomatik panoya kopyalanır
          </div>
        </div>
      </div>

      <form class="rca-invite-form" @submit.prevent="createInvitation">
        <label class="rc-field">
          <span class="rc-field__label">E-posta</span>
          <input
            id="invite-email"
            v-model="form.email"
            type="email"
            class="rc-input"
            required
            placeholder="kullanici@firma.com"
          />
        </label>
        <label class="rc-field">
          <span class="rc-field__label">Rol</span>
          <select id="invite-role" v-model="form.role" class="rc-select">
            <option value="OPERATOR">Operatör</option>
            <option value="ADMIN">Tenant admin</option>
          </select>
        </label>
        <RcButton variant="accent" type="submit" :disabled="creating || !form.email">
          {{ creating ? 'Oluşturuluyor…' : 'Davet oluştur' }}
        </RcButton>
      </form>

      <p v-if="createError" class="rc-alert rc-alert--danger" style="margin-top: 12px">{{ createError }}</p>

      <div v-if="lastInviteLink" class="rca-invite-link">
        <div class="rc-field__label">Son oluşturulan link</div>
        <div class="rca-invite-link__row">
          <input :value="lastInviteLink" readonly class="rc-input" />
          <RcButton variant="secondary" size="sm" type="button" @click="copyText(lastInviteLink)">
            Kopyala
          </RcButton>
        </div>
      </div>
    </div>

    <div v-if="loading" class="rc-skeleton rc-card-skeleton" style="height: 240px" />

    <RcEmpty
      v-else-if="invitations.length === 0"
      title="Davet yok"
      description="Henüz kullanıcı daveti oluşturulmadı"
    >
      <template #icon><RcIcon name="mail" :size="32" /></template>
    </RcEmpty>

    <div v-else class="rc-card" style="overflow: hidden">
      <table class="rc-table rcv-table--slim">
        <thead>
          <tr>
            <th>E-posta</th>
            <th>Rol</th>
            <th>Durum</th>
            <th>Oluşturulma</th>
            <th>Son kullanma</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="invitation in invitations" :key="invitation.id">
            <td>{{ invitation.email }}</td>
            <td>{{ roleLabels[invitation.role] }}</td>
            <td>
              <RcStatusPill :status="invitation.status" />
            </td>
            <td class="rc-mono" style="font-size: 12.5px">{{ formatDate(invitation.createdAt) }}</td>
            <td class="rc-mono" style="font-size: 12.5px">{{ formatDate(invitation.expiresAt) }}</td>
            <td class="rc-right">
              <div style="display: flex; gap: 6px; justify-content: flex-end">
                <RcButton
                  v-if="invitation.status === 'PENDING' && invitation.token"
                  variant="ghost"
                  size="sm"
                  @click="copyInvitationLink(invitation)"
                >
                  Link
                </RcButton>
                <RcButton
                  v-if="invitation.status === 'PENDING'"
                  variant="danger"
                  size="sm"
                  :disabled="cancellingId === invitation.id"
                  @click="requestCancel(invitation)"
                >
                  İptal
                </RcButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AccountingConfirmModal
      :open="!!cancelTarget"
      title="Daveti iptal et"
      :message="cancelTarget ? `${cancelTarget.email} daveti iptal edilsin mi?` : ''"
      confirm-label="İptal et"
      variant="danger"
      @close="cancelTarget = null"
      @confirm="confirmCancel"
    />
  </div>
</template>

<style scoped>
.rca-invite-panel {
  padding: 16px 20px;
  margin-bottom: 16px;
}

.rca-invite-form {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 180px auto;
  gap: 12px;
  align-items: end;
}

.rca-invite-link {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--rc-border);
}

.rca-invite-link__row {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.rca-invite-link__row .rc-input {
  flex: 1;
  min-width: 0;
}

@media (max-width: 760px) {
  .rca-invite-form {
    grid-template-columns: 1fr;
  }

  .rca-invite-link__row {
    flex-direction: column;
  }
}
</style>
