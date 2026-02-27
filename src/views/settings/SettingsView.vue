<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores'
import { useToast } from '@/composables'
import { usersApi } from '@/api'
import BrandsManager from './BrandsManager.vue'
import CitiesManager from './CitiesManager.vue'
import ColorsManager from './ColorsManager.vue'

const authStore = useAuthStore()
const toast = useToast()

const activeTab = ref('profile')
const refDataSubTab = ref<'brands' | 'cities' | 'colors'>('brands')
const loading = ref(false)
const settingsLoading = ref(false)


const profileForm = ref({
  firstName: '',
  lastName: '',
  email: authStore.user?.email || ''
})


const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})


const notificationSettings = ref({
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: false
})


onMounted(async () => {

  const fullName = authStore.user?.fullName || ''
  const nameParts = fullName.split(' ')
  profileForm.value.firstName = nameParts[0] || ''
  profileForm.value.lastName = nameParts.slice(1).join(' ') || ''
  

  await fetchSettings()
})

async function fetchSettings() {
  settingsLoading.value = true
  try {
    const settings = await usersApi.getSettings()
    notificationSettings.value = {
      emailNotifications: settings.emailNotifications,
      smsNotifications: settings.smsNotifications,
      pushNotifications: settings.pushNotifications
    }
  } catch {

  } finally {
    settingsLoading.value = false
  }
}

async function handleProfileSave() {
  loading.value = true
  try {
    await usersApi.updateProfile({
      email: profileForm.value.email,
      firstName: profileForm.value.firstName,
      lastName: profileForm.value.lastName
    })
    

    await authStore.fetchUser()
    
    toast.success('Profil başarıyla güncellendi')
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(err.message || 'Profil güncellenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

async function handlePasswordChange() {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    toast.error('Şifreler eşleşmiyor')
    return
  }
  
  if (passwordForm.value.newPassword.length < 8) {
    toast.error('Yeni şifre en az 8 karakter olmalıdır')
    return
  }

  loading.value = true
  try {
    await usersApi.changePassword({
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword
    })
    
    toast.success('Şifre başarıyla değiştirildi')
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(err.message || 'Şifre değiştirilirken hata oluştu')
  } finally {
    loading.value = false
  }
}

async function handleNotificationSave() {
  loading.value = true
  try {
    await usersApi.updateSettings({
      emailNotifications: notificationSettings.value.emailNotifications,
      smsNotifications: notificationSettings.value.smsNotifications,
      pushNotifications: notificationSettings.value.pushNotifications
    })
    
    toast.success('Bildirim ayarları kaydedildi')
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(err.message || 'Ayarlar kaydedilirken hata oluştu')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="settings-page">
    <header class="page-header">
      <h1>Ayarlar</h1>
    </header>

    <div class="settings-layout">
      <nav class="settings-nav">
        <button 
          :class="['nav-item', { active: activeTab === 'profile' }]"
          @click="activeTab = 'profile'"
        >
          👤 Profil
        </button>
        <button 
          :class="['nav-item', { active: activeTab === 'password' }]"
          @click="activeTab = 'password'"
        >
          🔒 Şifre
        </button>
        <button 
          :class="['nav-item', { active: activeTab === 'notifications' }]"
          @click="activeTab = 'notifications'"
        >
          🔔 Bildirimler
        </button>
        <button 
          v-if="authStore.isAdmin"
          :class="['nav-item', { active: activeTab === 'reference-data' }]"
          @click="activeTab = 'reference-data'"
        >
          🗂️ Referans Veriler
        </button>
      </nav>

      <div class="settings-content">
        <section v-if="activeTab === 'profile'" class="card">
          <h2>Profil Bilgileri</h2>
          <form @submit.prevent="handleProfileSave">
            <div class="form-row">
              <div class="form-group">
                <label>Ad</label>
                <input v-model="profileForm.firstName" type="text" required />
              </div>
              <div class="form-group">
                <label>Soyad</label>
                <input v-model="profileForm.lastName" type="text" required />
              </div>
            </div>
            <div class="form-group">
              <label>E-posta</label>
              <input v-model="profileForm.email" type="email" required />
            </div>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              {{ loading ? 'Kaydediliyor...' : 'Kaydet' }}
            </button>
          </form>
        </section>

        <section v-if="activeTab === 'password'" class="card">
          <h2>Şifre Değiştir</h2>
          <form @submit.prevent="handlePasswordChange">
            <div class="form-group">
              <label>Mevcut Şifre</label>
              <input v-model="passwordForm.currentPassword" type="password" required />
            </div>
            <div class="form-group">
              <label>Yeni Şifre</label>
              <input v-model="passwordForm.newPassword" type="password" minlength="8" required />
              <span class="hint">En az 8 karakter</span>
            </div>
            <div class="form-group">
              <label>Yeni Şifre (Tekrar)</label>
              <input v-model="passwordForm.confirmPassword" type="password" required />
            </div>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              {{ loading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir' }}
            </button>
          </form>
        </section>

        <section v-if="activeTab === 'notifications'" class="card">
          <h2>Bildirim Ayarları</h2>
          <div v-if="settingsLoading" class="loading-text">Yükleniyor...</div>
          <form v-else @submit.prevent="handleNotificationSave">
            <div class="toggle-group">
              <label class="toggle-label">
                <input type="checkbox" v-model="notificationSettings.emailNotifications" />
                <span class="toggle-text">
                  <strong>E-posta Bildirimleri</strong>
                  <span>Kiralamalar, ödemeler ve hatırlatmalar için e-posta al</span>
                </span>
              </label>
            </div>
            <div class="toggle-group">
              <label class="toggle-label">
                <input type="checkbox" v-model="notificationSettings.smsNotifications" />
                <span class="toggle-text">
                  <strong>SMS Bildirimleri</strong>
                  <span>Önemli güncellemeler için SMS al</span>
                </span>
              </label>
            </div>
            <div class="toggle-group">
              <label class="toggle-label">
                <input type="checkbox" v-model="notificationSettings.pushNotifications" />
                <span class="toggle-text">
                  <strong>Push Bildirimleri</strong>
                  <span>Tarayıcı bildirimleri al</span>
                </span>
              </label>
            </div>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              {{ loading ? 'Kaydediliyor...' : 'Kaydet' }}
            </button>
          </form>
        </section>

        <section v-if="activeTab === 'reference-data'" class="card reference-data-section">
          <div class="ref-data-subnav">
            <button
              :class="['sub-nav-item', { active: refDataSubTab === 'brands' }]"
              @click="refDataSubTab = 'brands'"
            >
              Markalar / Modeller
            </button>
            <button
              :class="['sub-nav-item', { active: refDataSubTab === 'cities' }]"
              @click="refDataSubTab = 'cities'"
            >
              İller / İlçeler
            </button>
            <button
              :class="['sub-nav-item', { active: refDataSubTab === 'colors' }]"
              @click="refDataSubTab = 'colors'"
            >
              Renkler
            </button>
          </div>
          <BrandsManager v-if="refDataSubTab === 'brands'" />
          <CitiesManager v-if="refDataSubTab === 'cities'" />
          <ColorsManager v-if="refDataSubTab === 'colors'" />
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 0;
}

.settings-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 32px;
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.nav-item:hover {
  background: var(--color-bg-secondary);
}

.nav-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 32px;
}

.card h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 24px 0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.hint {
  display: block;
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.loading-text {
  text-align: center;
  padding: 20px;
  color: var(--color-text-secondary);
}

.toggle-group {
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.toggle-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}

.toggle-label input {
  margin-top: 4px;
  width: 18px;
  height: 18px;
}

.toggle-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-text strong {
  font-size: 14px;
}

.toggle-text span:last-child {
  font-size: 13px;
  color: var(--color-text-muted);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  margin-top: 8px;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.reference-data-section {
  padding: 24px;
}

.ref-data-subnav {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.sub-nav-item {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.sub-nav-item:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.sub-nav-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

@media (max-width: 768px) {
  .settings-layout {
    grid-template-columns: 1fr;
  }
  
  .settings-nav {
    flex-direction: row;
    overflow-x: auto;
  }
}
</style>
