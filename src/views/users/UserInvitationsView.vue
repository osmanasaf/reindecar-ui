<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { branchesApi, userInvitationsApi } from '@/api'
import { useToast } from '@/composables'
import { AccountingConfirmModal } from '@/components/accounting'
import { SearchableSelect } from '@/components/common'
import { RcPageHeader, RcButton, RcEmpty, RcStatusPill, RcTableSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { UserInvitationResponse, UserInvitationRole } from '@/api'
import type { Branch } from '@/types'

const toast = useToast()

const invitations = ref<UserInvitationResponse[]>([])
const branches = ref<Branch[]>([])
const loading = ref(true)
const creating = ref(false)
const cancellingId = ref<number | null>(null)
const createError = ref<string | null>(null)
const lastInviteLink = ref('')
const cancelTarget = ref<UserInvitationResponse | null>(null)

const form = ref({
  email: '',
  role: 'OPERATOR' as UserInvitationRole,
  branchId: null as number | null,
})

const roleLabels: Record<UserInvitationRole, string> = {
  ADMIN: 'Tenant admin',
  OPERATOR: 'Operatör',
}

const CLIPBOARD_FAILED_MESSAGE = 'Link panoya kopyalanamadı, aşağıdaki alandan manuel kopyalayabilirsiniz.'

const branchOptions = computed(() =>
  branches.value.map(branch => ({ value: branch.id, label: branch.name })),
)

const requiresBranch = computed(() => form.value.role === 'OPERATOR')

onMounted(() => {
  loadInvitations()
  loadBranches()
})

async function loadBranches() {
  try {
    branches.value = await branchesApi.getActive()
  } catch (e) {
    toast.apiError(e, 'Şubeler yüklenemedi')
    branches.value = []
  }
}

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
  if (requiresBranch.value && form.value.branchId == null) {
    createError.value = 'Operatör kullanıcılar için şube seçimi zorunludur.'
    return
  }

  creating.value = true
  createError.value = null

  try {
    const created = await userInvitationsApi.create({
      email: form.value.email.trim(),
      role: form.value.role,
      branchId: requiresBranch.value ? form.value.branchId : null,
    })
    invitations.value = [created, ...invitations.value]
    form.value.email = ''
    form.value.branchId = null
    lastInviteLink.value = buildInvitationLink(created)
    toast.success('Davet oluşturuldu')
  } catch (e) {
    createError.value = (e as Error).message || 'Davet oluşturulamadı'
    return
  } finally {
    creating.value = false
  }

  if (!(await tryCopyText(lastInviteLink.value))) {
    toast.info(CLIPBOARD_FAILED_MESSAGE)
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
  await copyLink(buildInvitationLink(invitation))
}

async function copyLink(value: string) {
  if (await tryCopyText(value)) {
    toast.success('Davet linki kopyalandı')
    return
  }
  toast.error(CLIPBOARD_FAILED_MESSAGE)
}

function buildInvitationLink(invitation: UserInvitationResponse) {
  return `${window.location.origin}/register-invited-user?token=${invitation.token}`
}

async function tryCopyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
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

      <form
        class="rca-invite-form"
        :class="{ 'rca-invite-form--with-branch': requiresBranch }"
        @submit.prevent="createInvitation"
      >
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
        <label v-if="requiresBranch" class="rc-field">
          <span class="rc-field__label">Şube</span>
          <SearchableSelect
            v-model="form.branchId"
            :options="branchOptions"
            placeholder="Şube seçin"
            search-placeholder="Şube ara…"
          />
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
          <RcButton variant="secondary" size="sm" type="button" @click="copyLink(lastInviteLink)">
            Kopyala
          </RcButton>
        </div>
      </div>
    </div>

    <RcTableSkeleton v-if="loading" :rows="6" :cols="4" />

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

.rca-invite-form--with-branch {
  grid-template-columns: minmax(220px, 1fr) 180px minmax(180px, 220px) auto;
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
  .rca-invite-form,
  .rca-invite-form--with-branch {
    grid-template-columns: 1fr;
  }

  .rca-invite-link__row {
    flex-direction: column;
  }
}
</style>
