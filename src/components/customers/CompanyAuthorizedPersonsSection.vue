<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { customersApi } from '@/api'
import { useToast } from '@/composables'
import { isErrorResponse } from '@/utils/error'
import { formatPhoneInput } from '@/utils/phone'
import type {
  CompanyAuthorizedPerson,
  CreateAuthorizedPersonRequest,
  UpdateAuthorizedPersonRequest
} from '@/types'

interface Props {
  customerId: number
}

const props = defineProps<Props>()
const toast = useToast()

const loading = ref(false)
const saving = ref(false)
const actionPersonId = ref<number | null>(null)
const authorizedPersons = ref<CompanyAuthorizedPerson[]>([])

const showForm = ref(false)
const editPersonId = ref<number | null>(null)
const form = ref<CreateAuthorizedPersonRequest>({
  firstName: '',
  lastName: '',
  nationalId: '',
  phone: '',
  email: '',
  title: ''
})

const isEditMode = computed(() => editPersonId.value !== null)

function isPrimaryPerson(person: CompanyAuthorizedPerson): boolean {
  return Boolean(person.primary ?? person.isPrimary)
}

function sortPersons(list: CompanyAuthorizedPerson[]): CompanyAuthorizedPerson[] {
  return [...list].sort((a, b) => {
    if (isPrimaryPerson(a) !== isPrimaryPerson(b)) return Number(isPrimaryPerson(b)) - Number(isPrimaryPerson(a))
    if (a.active !== b.active) return Number(b.active) - Number(a.active)
    return a.firstName.localeCompare(b.firstName, 'tr')
  })
}

function resetForm(): void {
  form.value = {
    firstName: '',
    lastName: '',
    nationalId: '',
    phone: '',
    email: '',
    title: ''
  }
  editPersonId.value = null
}

function openCreateForm(): void {
  resetForm()
  showForm.value = true
}

function openEditForm(person: CompanyAuthorizedPerson): void {
  editPersonId.value = person.id
  form.value = {
    firstName: person.firstName,
    lastName: person.lastName,
    nationalId: person.nationalId,
    phone: formatPhoneInput(person.phone),
    email: person.email ?? '',
    title: person.title ?? ''
  }
  showForm.value = true
}

function closeForm(): void {
  showForm.value = false
  resetForm()
}

function getFullName(person: CompanyAuthorizedPerson): string {
  return `${person.firstName} ${person.lastName}`.trim()
}

function formatPhone(phone: string): string {
  const formatted = formatPhoneInput(phone)
  return formatted || phone
}

function handlePhoneInput(event: Event): void {
  const target = event.target as HTMLInputElement
  form.value.phone = formatPhoneInput(target.value)
}

function isValidForm(): boolean {
  if (!form.value.firstName.trim()) return false
  if (!form.value.lastName.trim()) return false
  if (!/^\d{11}$/.test(form.value.nationalId)) return false
  const phoneDigits = form.value.phone.replace(/\D/g, '')
  if (phoneDigits.length < 10) return false
  return true
}

function getApiErrorInfo(err: unknown): { code?: string; message?: string } | null {
  if (isErrorResponse(err)) {
    return { code: err.code, message: err.message }
  }

  if (typeof err === 'object' && err !== null && 'response' in err) {
    const responseData = (err as { response?: { data?: unknown } }).response?.data
    if (isErrorResponse(responseData)) {
      return { code: responseData.code, message: responseData.message }
    }
  }

  if (err instanceof Error) {
    return { message: err.message }
  }

  return null
}

function getAuthorizedPersonErrorMessage(err: unknown, fallback: string): string {
  const info = getApiErrorInfo(err)
  if (!info?.message) return fallback

  const normalized = info.message.toLowerCase()
  if (info.code === 'E003' && normalized.includes('last active authorized person')) {
    return 'Son aktif yetkili kişi silinemez veya pasif yapılamaz.'
  }

  return info.message
}

async function fetchAuthorizedPersons(): Promise<void> {
  if (!props.customerId) return
  loading.value = true
  try {
    const list = await customersApi.getAuthorizedPersons(props.customerId)
    authorizedPersons.value = sortPersons(list)
  } catch (err) {
    toast.error(getAuthorizedPersonErrorMessage(err, 'Yetkili kişiler yüklenemedi'))
    authorizedPersons.value = []
  } finally {
    loading.value = false
  }
}

async function submitForm(): Promise<void> {
  if (!isValidForm()) {
    toast.error('Lütfen yetkili kişi formunu eksiksiz doldurun')
    return
  }

  if (!props.customerId) return

  saving.value = true
  try {
    if (isEditMode.value && editPersonId.value !== null) {
      const payload: UpdateAuthorizedPersonRequest = {
        firstName: form.value.firstName.trim(),
        lastName: form.value.lastName.trim(),
        nationalId: form.value.nationalId.trim(),
        phone: form.value.phone,
        email: form.value.email?.trim() || null,
        title: form.value.title?.trim() || null
      }
      await customersApi.updateAuthorizedPerson(props.customerId, editPersonId.value, payload)
      toast.success('Yetkili kişi güncellendi')
    } else {
      await customersApi.createAuthorizedPerson(props.customerId, {
        firstName: form.value.firstName.trim(),
        lastName: form.value.lastName.trim(),
        nationalId: form.value.nationalId.trim(),
        phone: form.value.phone,
        email: form.value.email?.trim() || null,
        title: form.value.title?.trim() || null
      })
      toast.success('Yetkili kişi eklendi')
    }
    closeForm()
    await fetchAuthorizedPersons()
  } catch (err) {
    toast.error(
      getAuthorizedPersonErrorMessage(
        err,
        isEditMode.value ? 'Yetkili kişi güncellenemedi' : 'Yetkili kişi eklenemedi'
      )
    )
  } finally {
    saving.value = false
  }
}

async function handleDelete(person: CompanyAuthorizedPerson): Promise<void> {
  if (!props.customerId) return
  const confirmed = confirm(`${getFullName(person)} kaydını silmek istiyor musunuz?`)
  if (!confirmed) return

  actionPersonId.value = person.id
  try {
    await customersApi.deleteAuthorizedPerson(props.customerId, person.id)
    toast.success('Yetkili kişi silindi')
    await fetchAuthorizedPersons()
  } catch (err) {
    toast.error(getAuthorizedPersonErrorMessage(err, 'Yetkili kişi silinemedi'))
  } finally {
    actionPersonId.value = null
  }
}

async function handleSetPrimary(person: CompanyAuthorizedPerson): Promise<void> {
  if (!props.customerId || isPrimaryPerson(person)) return

  actionPersonId.value = person.id
  try {
    await customersApi.setPrimaryAuthorizedPerson(props.customerId, person.id)
    toast.success('Ana yetkili güncellendi')
    await fetchAuthorizedPersons()
  } catch (err) {
    toast.error(getAuthorizedPersonErrorMessage(err, 'Ana yetkili güncellenemedi'))
  } finally {
    actionPersonId.value = null
  }
}

async function handleToggleActive(person: CompanyAuthorizedPerson): Promise<void> {
  if (!props.customerId) return

  actionPersonId.value = person.id
  try {
    if (person.active) {
      await customersApi.deactivateAuthorizedPerson(props.customerId, person.id)
      toast.success('Yetkili kişi pasif yapıldı')
    } else {
      await customersApi.activateAuthorizedPerson(props.customerId, person.id)
      toast.success('Yetkili kişi aktif yapıldı')
    }
    await fetchAuthorizedPersons()
  } catch (err) {
    toast.error(getAuthorizedPersonErrorMessage(err, 'Durum güncellenemedi'))
  } finally {
    actionPersonId.value = null
  }
}

watch(
  () => props.customerId,
  async (newId) => {
    if (!newId) return
    closeForm()
    await fetchAuthorizedPersons()
  },
  { immediate: true }
)
</script>

<template>
  <section class="authorized-persons">
    <div class="section-header">
      <h2>Yetkili Kişiler</h2>
      <button
        type="button"
        class="btn btn-primary btn-sm"
        :disabled="saving"
        @click="showForm ? closeForm() : openCreateForm()"
      >
        {{ showForm ? 'İptal' : '+ Yetkili Ekle' }}
      </button>
    </div>

    <form v-if="showForm" class="person-form" @submit.prevent="submitForm">
      <div class="form-grid">
        <div class="form-group">
          <label>Ad *</label>
          <input v-model="form.firstName" type="text" maxlength="100" />
        </div>
        <div class="form-group">
          <label>Soyad *</label>
          <input v-model="form.lastName" type="text" maxlength="100" />
        </div>
        <div class="form-group">
          <label>TC Kimlik No *</label>
          <input v-model="form.nationalId" type="text" maxlength="11" inputmode="numeric" />
        </div>
        <div class="form-group">
          <label>Telefon *</label>
          <input
            v-model="form.phone"
            type="tel"
            maxlength="13"
            inputmode="numeric"
            placeholder="555 111 11 11"
            @input="handlePhoneInput"
          />
        </div>
        <div class="form-group">
          <label>E-posta</label>
          <input v-model="form.email" type="email" maxlength="255" />
        </div>
        <div class="form-group">
          <label>Ünvan</label>
          <input v-model="form.title" type="text" maxlength="100" />
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline btn-sm" :disabled="saving" @click="closeForm">
          Vazgeç
        </button>
        <button type="submit" class="btn btn-primary btn-sm" :disabled="saving">
          {{ saving ? 'Kaydediliyor...' : (isEditMode ? 'Güncelle' : 'Kaydet') }}
        </button>
      </div>
    </form>

    <div v-if="loading" class="state-text">Yükleniyor...</div>
    <div v-else-if="authorizedPersons.length === 0" class="state-text">Yetkili kişi bulunamadı</div>

    <div v-else class="person-list">
      <article v-for="person in authorizedPersons" :key="person.id" class="person-card">
        <div class="person-info">
          <div class="person-header-row">
            <strong>{{ getFullName(person) }}</strong>
            <span v-if="isPrimaryPerson(person)" class="badge badge-primary">Ana Yetkili</span>
            <span v-if="!person.active" class="badge badge-muted">Pasif</span>
          </div>
          <div class="person-meta">
            <span>{{ person.title || '-' }}</span>
            <span>{{ formatPhone(person.phone) }}</span>
            <span>{{ person.email || '-' }}</span>
          </div>
        </div>

        <div class="person-actions">
          <button
            type="button"
            class="btn btn-outline btn-xs"
            :disabled="actionPersonId === person.id || saving || isPrimaryPerson(person)"
            @click="handleSetPrimary(person)"
          >
            Ana Yetkili Yap
          </button>
          <button
            type="button"
            class="btn btn-outline btn-xs"
            :disabled="actionPersonId === person.id || saving"
            @click="handleToggleActive(person)"
          >
            {{ person.active ? 'Pasif Yap' : 'Aktif Yap' }}
          </button>
          <button
            type="button"
            class="btn btn-outline btn-xs"
            :disabled="actionPersonId === person.id || saving"
            @click="openEditForm(person)"
          >
            Düzenle
          </button>
          <button
            type="button"
            class="btn btn-danger btn-xs"
            :disabled="actionPersonId === person.id || saving"
            @click="handleDelete(person)"
          >
            Sil
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.authorized-persons {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.person-form {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background: var(--color-bg-secondary);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.form-group input {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--color-surface);
  font-size: 14px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.state-text {
  text-align: center;
  padding: 16px;
  color: var(--color-text-secondary);
}

.person-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.person-card {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-secondary);
}

.person-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.person-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.person-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.person-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.btn {
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  border: none;
}

.btn-sm {
  padding: 8px 12px;
  font-size: 13px;
}

.btn-xs {
  padding: 6px 10px;
  font-size: 12px;
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-danger {
  background: var(--color-danger);
  color: #fff;
}

.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
}

.badge-primary {
  background: var(--color-success-light);
  color: var(--color-success);
}

.badge-muted {
  background: var(--color-bg);
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .person-card {
    flex-direction: column;
  }

  .person-actions {
    justify-content: flex-start;
  }
}
</style>
