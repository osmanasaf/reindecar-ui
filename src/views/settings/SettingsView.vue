<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores'
import { useToast } from '@/composables'
import { usersApi } from '@/api'
import { RcPageHeader, RcButton, RcField, RcTabs } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import BrandsManager from './BrandsManager.vue'
import CitiesManager from './CitiesManager.vue'
import ColorsManager from './ColorsManager.vue'
import CategoriesManager from './CategoriesManager.vue'

type SettingsTab = 'profile' | 'password' | 'notifications' | 'reference-data'
type RefDataTab = 'brands' | 'cities' | 'colors' | 'categories'

const authStore = useAuthStore()
const toast = useToast()

const activeTab = ref<SettingsTab>('profile')
const refDataSubTab = ref<RefDataTab>('brands')
const loading = ref(false)
const settingsLoading = ref(false)

const profileForm = ref({
  firstName: '',
  lastName: '',
  email: authStore.user?.email || '',
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const notificationSettings = ref({
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: false,
})

const navItems = computed(() => {
  const items: { id: SettingsTab; label: string; icon: 'user' | 'key' | 'bell' | 'folder' }[] = [
    { id: 'profile', label: 'Profil', icon: 'user' },
    { id: 'password', label: 'Şifre', icon: 'key' },
    { id: 'notifications', label: 'Bildirimler', icon: 'bell' },
  ]
  if (authStore.isAdmin) {
    items.push({ id: 'reference-data', label: 'Referans Veriler', icon: 'folder' })
  }
  return items
})

const refDataTabs = [
  { id: 'brands' as const, label: 'Markalar / Modeller' },
  { id: 'cities' as const, label: 'İller / İlçeler' },
  { id: 'colors' as const, label: 'Renkler' },
  { id: 'categories' as const, label: 'Kategoriler' },
]

const sectionTitles: Record<SettingsTab, string> = {
  profile: 'Profil Bilgileri',
  password: 'Şifre Değiştir',
  notifications: 'Bildirim Ayarları',
  'reference-data': 'Referans Veriler',
}

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
      pushNotifications: settings.pushNotifications,
    }
  } catch {
    /* ayarlar yoksa varsayılanlar kalır */
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
      lastName: profileForm.value.lastName,
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
      newPassword: passwordForm.value.newPassword,
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
      pushNotifications: notificationSettings.value.pushNotifications,
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
  <div class="rc-page">
    <RcPageHeader
      title="Ayarlar"
      subtitle="Hesap, bildirim ve referans veri yapılandırması"
    />

    <div class="rcs-layout">
      <nav class="rcs-nav" aria-label="Ayarlar menüsü">
        <button
          v-for="item in navItems"
          :key="item.id"
          type="button"
          class="rcs-nav__item"
          :class="{ 'rcs-nav__item--active': activeTab === item.id }"
          @click="activeTab = item.id"
        >
          <RcIcon :name="item.icon" class="rc-icon" />
          {{ item.label }}
        </button>
      </nav>

      <div class="rcs-card">
        <div class="rcs-card__head">
          <h2 class="rcs-card__title">{{ sectionTitles[activeTab] }}</h2>
        </div>

        <div class="rcs-card__body">
          <form v-if="activeTab === 'profile'" @submit.prevent="handleProfileSave">
            <div class="rcs-form-grid">
              <RcField label="Ad">
                <input v-model="profileForm.firstName" type="text" class="rc-input" required />
              </RcField>
              <RcField label="Soyad">
                <input v-model="profileForm.lastName" type="text" class="rc-input" required />
              </RcField>
              <RcField label="E-posta" style="grid-column: 1 / -1">
                <input v-model="profileForm.email" type="email" class="rc-input" required />
              </RcField>
            </div>
            <div class="rcs-card__foot" style="margin: 20px -20px -20px; padding-right: 20px">
              <RcButton type="submit" variant="primary" :disabled="loading">
                {{ loading ? 'Kaydediliyor…' : 'Kaydet' }}
              </RcButton>
            </div>
          </form>

          <form v-else-if="activeTab === 'password'" @submit.prevent="handlePasswordChange">
            <div class="rcs-form-grid rcs-form-grid--single">
              <RcField label="Mevcut şifre">
                <input v-model="passwordForm.currentPassword" type="password" class="rc-input" required />
              </RcField>
              <RcField label="Yeni şifre" hint="En az 8 karakter">
                <input
                  v-model="passwordForm.newPassword"
                  type="password"
                  class="rc-input"
                  minlength="8"
                  required
                />
              </RcField>
              <RcField label="Yeni şifre (tekrar)">
                <input v-model="passwordForm.confirmPassword" type="password" class="rc-input" required />
              </RcField>
            </div>
            <div class="rcs-card__foot" style="margin: 20px -20px -20px; padding-right: 20px">
              <RcButton type="submit" variant="primary" :disabled="loading">
                {{ loading ? 'Değiştiriliyor…' : 'Şifreyi değiştir' }}
              </RcButton>
            </div>
          </form>

          <template v-else-if="activeTab === 'notifications'">
            <div v-if="settingsLoading" class="rc-empty-state" style="padding: 24px 0">
              <span class="rc-spin" aria-hidden="true" />
              Yükleniyor…
            </div>
            <form v-else @submit.prevent="handleNotificationSave">
              <div class="rcs-notif-list">
                <label class="rcs-notif-item">
                  <input v-model="notificationSettings.emailNotifications" type="checkbox" />
                  <span class="rcs-notif-item__text">
                    <span class="rcs-notif-item__title">E-posta bildirimleri</span>
                    <span class="rcs-notif-item__desc">Kiralamalar, ödemeler ve hatırlatmalar için e-posta al</span>
                  </span>
                </label>
                <label class="rcs-notif-item">
                  <input v-model="notificationSettings.smsNotifications" type="checkbox" />
                  <span class="rcs-notif-item__text">
                    <span class="rcs-notif-item__title">SMS bildirimleri</span>
                    <span class="rcs-notif-item__desc">Önemli güncellemeler için SMS al</span>
                  </span>
                </label>
                <label class="rcs-notif-item">
                  <input v-model="notificationSettings.pushNotifications" type="checkbox" />
                  <span class="rcs-notif-item__text">
                    <span class="rcs-notif-item__title">Push bildirimleri</span>
                    <span class="rcs-notif-item__desc">Tarayıcı bildirimleri al</span>
                  </span>
                </label>
              </div>
              <div class="rcs-card__foot" style="margin: 20px -20px -20px; padding-right: 20px">
                <RcButton type="submit" variant="primary" :disabled="loading">
                  {{ loading ? 'Kaydediliyor…' : 'Kaydet' }}
                </RcButton>
              </div>
            </form>
          </template>

          <section v-else-if="activeTab === 'reference-data'">
            <RcTabs
              v-model="refDataSubTab"
              :tabs="refDataTabs"
              style="margin-bottom: 16px"
            />
            <BrandsManager v-if="refDataSubTab === 'brands'" />
            <CitiesManager v-else-if="refDataSubTab === 'cities'" />
            <ColorsManager v-else-if="refDataSubTab === 'colors'" />
            <CategoriesManager v-else-if="refDataSubTab === 'categories'" />
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
