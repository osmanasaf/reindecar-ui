<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores'
import { useAppSettingsStore } from '@/stores/appSettings.store'
import { useFeaturesStore } from '@/stores/features.store'
import { useToast } from '@/composables'
import { usersApi } from '@/api'
import { RcPageHeader, RcButton, RcField, RcTabs, RcSkeletonText } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { IconName } from '@/components/icons/iconPaths'
import BrandsManager from './BrandsManager.vue'
import CitiesManager from './CitiesManager.vue'
import ColorsManager from './ColorsManager.vue'
import CategoriesManager from './CategoriesManager.vue'
import FeaturesManager from './FeaturesManager.vue'
import BrandingManager from './BrandingManager.vue'
import DocumentTemplatesManager from './DocumentTemplatesManager.vue'

type SettingsTab = 'profile' | 'password' | 'notifications' | 'general' | 'features' | 'branding' | 'document-templates' | 'reference-data'
type RefDataTab = 'brands' | 'cities' | 'colors' | 'categories'

interface NavItemMeta {
  id: SettingsTab
  label: string
  desc: string
  icon: IconName
  keywords: string
}

const SKELETON_MS = 850
const COUNTER_MS = 750

const authStore = useAuthStore()
const route = useRoute()
const appSettingsStore = useAppSettingsStore()
const featuresStore = useFeaturesStore()
const toast = useToast()

const activeTab = ref<SettingsTab>('profile')
const refDataSubTab = ref<RefDataTab>('brands')
const loading = ref(false)
const settingsLoading = ref(false)
const loaded = ref(false)
const query = ref('')

const profileForm = ref({
  firstName: '',
  lastName: '',
  email: authStore.user?.email || '',
})
const profileSnapshot = ref({ firstName: '', lastName: '', email: '' })

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

const notificationItems: { key: keyof typeof notificationSettings.value; title: string; desc: string; icon: IconName }[] = [
  { key: 'emailNotifications', title: 'E-posta bildirimleri', desc: 'Kiralamalar, ödemeler ve hatırlatmalar için e-posta al', icon: 'mail' },
  { key: 'smsNotifications', title: 'SMS bildirimleri', desc: 'Önemli güncellemeler için SMS al', icon: 'phone' },
  { key: 'pushNotifications', title: 'Push bildirimleri', desc: 'Tarayıcı bildirimleri al', icon: 'bell' },
]

const currencyOptions = [
  { value: 'TRY', label: 'TRY — Türk Lirası' },
  { value: 'USD', label: 'USD — Amerikan Doları' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — İngiliz Sterlini' },
]
const selectedCurrency = ref('TRY')
const savingCurrency = ref(false)

const currencyPreviewRows = computed(() => {
  const fmt = (value: number) => {
    try {
      return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: selectedCurrency.value,
        maximumFractionDigits: 2,
      }).format(value)
    } catch {
      return String(value)
    }
  }
  return [
    { label: 'Günlük araç fiyatı', value: fmt(1450) },
    { label: 'Aylık ciro', value: fmt(1284500) },
    { label: 'Depozito tutarı', value: fmt(7500) },
  ]
})

const DEFAULT_META: NavItemMeta = { id: 'profile', label: 'Profil', desc: 'Ad, soyad ve iletişim bilgileri', icon: 'user', keywords: 'profil ad soyad e-posta email isim hesap' }

const accountItems: NavItemMeta[] = [
  DEFAULT_META,
  { id: 'password', label: 'Şifre & Güvenlik', desc: 'Hesap parolanı güncelle', icon: 'key', keywords: 'şifre parola güvenlik password değiştir' },
  { id: 'notifications', label: 'Bildirimler', desc: 'E-posta, SMS ve push tercihleri', icon: 'bell', keywords: 'bildirim e-posta sms push uyarı hatırlatma' },
]

const systemItems: NavItemMeta[] = [
  { id: 'general', label: 'Genel', desc: 'Para birimi ve bölgesel ayarlar', icon: 'sliders', keywords: 'genel para birimi currency bölge dil try usd euro' },
  { id: 'branding', label: 'Firma / Marka', desc: 'Logo, renk ve firma bilgileri', icon: 'building', keywords: 'firma marka logo renk kurumsal branding' },
  { id: 'document-templates', label: 'Belge Şablonları', desc: 'Sözleşme ve fatura şablonları', icon: 'edit', keywords: 'belge şablon sözleşme fatura döküman template' },
  { id: 'features', label: 'Modüller', desc: 'Aktif modülleri yönet', icon: 'sparkle', keywords: 'modül özellik feature aktif' },
  { id: 'reference-data', label: 'Referans Veriler', desc: 'Marka, il, renk ve kategori tanımları', icon: 'folder', keywords: 'referans veri marka model il ilçe renk kategori' },
]

const moduleCountDisplay = ref(0)
const moduleTotal = computed(() => featuresStore.features.length)
const moduleActive = computed(() => featuresStore.enabledKeys.size)

function badgeFor(id: SettingsTab): string | null {
  if (id === 'features' && moduleTotal.value > 0) {
    return `${moduleCountDisplay.value}/${moduleTotal.value}`
  }
  return null
}

const navGroups = computed(() => {
  const q = query.value.trim().toLowerCase()
  const matches = (item: NavItemMeta) =>
    !q || item.label.toLowerCase().includes(q) || item.keywords.toLowerCase().includes(q)

  const groups: { section: string; items: NavItemMeta[] }[] = [
    { section: 'Hesap', items: accountItems.filter(matches) },
  ]
  if (authStore.isAdmin) {
    groups.push({ section: 'Sistem', items: systemItems.filter(matches) })
  }
  return groups.filter((group) => group.items.length > 0)
})

const hasMatches = computed(() => navGroups.value.length > 0)

const allItems = computed(() =>
  authStore.isAdmin ? [...accountItems, ...systemItems] : accountItems,
)

const activeMeta = computed(
  () => allItems.value.find((item) => item.id === activeTab.value) ?? DEFAULT_META,
)

const refDataTabs = [
  { id: 'brands' as const, label: 'Markalar / Modeller' },
  { id: 'cities' as const, label: 'İller / İlçeler' },
  { id: 'colors' as const, label: 'Renkler' },
  { id: 'categories' as const, label: 'Kategoriler' },
]

let counterRaf = 0
let loadTimer: ReturnType<typeof setTimeout> | undefined

function animateModuleCount() {
  const target = moduleActive.value
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced || target === 0) {
    moduleCountDisplay.value = target
    return
  }
  const start = performance.now()
  const step = (now: number) => {
    const progress = Math.min(1, (now - start) / COUNTER_MS)
    const eased = 1 - Math.pow(1 - progress, 3)
    moduleCountDisplay.value = Math.round(target * eased)
    if (progress < 1) counterRaf = requestAnimationFrame(step)
  }
  counterRaf = requestAnimationFrame(step)
}

watch(moduleActive, (value) => {
  moduleCountDisplay.value = value
})

function selectTab(id: SettingsTab) {
  activeTab.value = id
}

function clearQuery() {
  query.value = ''
}

function resetProfile() {
  profileForm.value = { ...profileSnapshot.value }
}

onMounted(async () => {
  const tab = route.query.tab
  if (tab === 'features' && authStore.isAdmin) {
    activeTab.value = 'features'
  }

  const fullName = authStore.user?.fullName || ''
  const nameParts = fullName.split(' ')
  profileForm.value.firstName = nameParts[0] || ''
  profileForm.value.lastName = nameParts.slice(1).join(' ') || ''
  profileSnapshot.value = { ...profileForm.value }

  loadTimer = setTimeout(() => {
    loaded.value = true
  }, SKELETON_MS)

  await fetchSettings()
  if (authStore.isAdmin) {
    await appSettingsStore.loadSettings()
    selectedCurrency.value = appSettingsStore.defaultCurrency
    await featuresStore.loadFeatures()
    animateModuleCount()
  }
})

onBeforeUnmount(() => {
  if (loadTimer) clearTimeout(loadTimer)
  if (counterRaf) cancelAnimationFrame(counterRaf)
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
    profileSnapshot.value = { ...profileForm.value }
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

async function handleCurrencySave() {
  savingCurrency.value = true
  try {
    await appSettingsStore.updateDefaultCurrency(selectedCurrency.value)
    toast.success('Para birimi ayarı kaydedildi')
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(err.message || 'Para birimi kaydedilemedi')
  } finally {
    savingCurrency.value = false
  }
}
</script>

<template>
  <div class="rc-page">
    <RcPageHeader
      title="Ayarlar"
      subtitle="Hesap, bildirim ve sistem yapılandırmasını tek yerden yönet"
    />

    <!-- Skeleton -->
    <div v-if="!loaded" class="rcs-layout rcs-fade">
      <div class="rcs-skel-nav">
        <span class="rcs-skel rcs-skel--search" />
        <span v-for="n in 6" :key="n" class="rcs-skel rcs-skel--item" />
      </div>
      <div class="rcs-skel rcs-skel--panel" />
    </div>

    <!-- Two-pane master · detail -->
    <div v-else class="rcs-layout rcs-fade">
      <nav class="rcs-nav" aria-label="Ayarlar menüsü">
        <div class="rcs-search">
          <RcIcon name="search" :size="15" class="rcs-search__icon" />
          <input
            v-model="query"
            type="text"
            class="rcs-search__input"
            placeholder="Ayarlarda ara…"
            aria-label="Ayarlarda ara"
          />
          <button
            v-if="query"
            type="button"
            class="rcs-search__clear"
            aria-label="Aramayı temizle"
            @click="clearQuery"
          >
            <RcIcon name="close" :size="14" />
          </button>
        </div>

        <template v-for="group in navGroups" :key="group.section">
          <div class="rcs-nav__group-title">{{ group.section }}</div>
          <button
            v-for="item in group.items"
            :key="item.id"
            type="button"
            class="rcs-nav__item"
            :class="{ 'rcs-nav__item--active': activeTab === item.id }"
            @click="selectTab(item.id)"
          >
            <RcIcon :name="item.icon" :size="16" class="rcs-nav__icon" />
            <span class="rcs-nav__label">{{ item.label }}</span>
            <span v-if="badgeFor(item.id)" class="rcs-nav__badge">{{ badgeFor(item.id) }}</span>
          </button>
        </template>

        <div v-if="!hasMatches" class="rcs-nav__empty">
          "{{ query }}" için eşleşme yok
        </div>
      </nav>

      <div class="rcs-panel">
        <div class="rcs-panel__head">
          <span class="rcs-panel__icon">
            <RcIcon :name="activeMeta.icon" :size="18" />
          </span>
          <div class="rcs-panel__heading">
            <h2 class="rcs-panel__title">{{ activeMeta.label }}</h2>
            <div class="rcs-panel__desc">{{ activeMeta.desc }}</div>
          </div>
        </div>

        <div :key="activeTab" class="rcs-panel__body rcs-section">
          <!-- Profil -->
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
            <div class="rcs-foot">
              <RcButton type="button" variant="ghost" @click="resetProfile">Vazgeç</RcButton>
              <RcButton type="submit" variant="primary" :loading="loading">Kaydet</RcButton>
            </div>
          </form>

          <!-- Şifre & Güvenlik -->
          <form v-else-if="activeTab === 'password'" @submit.prevent="handlePasswordChange">
            <div class="rcs-form-grid rcs-form-grid--single rcs-form-grid--narrow">
              <RcField label="Mevcut şifre">
                <input v-model="passwordForm.currentPassword" type="password" class="rc-input" placeholder="••••••••" required />
              </RcField>
              <RcField label="Yeni şifre" hint="En az 8 karakter">
                <input
                  v-model="passwordForm.newPassword"
                  type="password"
                  class="rc-input"
                  placeholder="En az 8 karakter"
                  minlength="8"
                  required
                />
              </RcField>
              <RcField label="Yeni şifre (tekrar)">
                <input v-model="passwordForm.confirmPassword" type="password" class="rc-input" placeholder="••••••••" required />
              </RcField>
              <div class="rcs-info">
                <RcIcon name="info" :size="16" class="rcs-info__icon" />
                <span>Güçlü bir şifre en az 8 karakter içermeli; bir büyük harf, bir rakam ve bir sembol önerilir.</span>
              </div>
            </div>
            <div class="rcs-foot">
              <RcButton type="submit" variant="primary" :loading="loading">Şifreyi değiştir</RcButton>
            </div>
          </form>

          <!-- Bildirimler -->
          <template v-else-if="activeTab === 'notifications'">
            <div v-if="settingsLoading" style="padding: 8px 0">
              <RcSkeletonText :lines="4" />
            </div>
            <form v-else @submit.prevent="handleNotificationSave">
              <div class="rcs-toggle-list">
                <button
                  v-for="item in notificationItems"
                  :key="item.key"
                  type="button"
                  class="rcs-toggle-row"
                  :aria-pressed="notificationSettings[item.key]"
                  @click="notificationSettings[item.key] = !notificationSettings[item.key]"
                >
                  <span class="rcs-toggle-row__icon">
                    <RcIcon :name="item.icon" :size="16" />
                  </span>
                  <span class="rcs-toggle-row__text">
                    <span class="rcs-toggle-row__title">{{ item.title }}</span>
                    <span class="rcs-toggle-row__desc">{{ item.desc }}</span>
                  </span>
                  <span
                    class="rcs-toggle__track"
                    :class="{ 'rcs-toggle__track--on': notificationSettings[item.key] }"
                  >
                    <span class="rcs-toggle__thumb" />
                  </span>
                </button>
              </div>
              <div class="rcs-foot">
                <RcButton type="submit" variant="primary" :loading="loading">Kaydet</RcButton>
              </div>
            </form>
          </template>

          <!-- Genel — canlı önizleme -->
          <template v-else-if="activeTab === 'general'">
            <form @submit.prevent="handleCurrencySave">
              <div class="rcs-form-grid">
                <RcField label="Varsayılan para birimi" hint="Tüm fiyat ve tutar gösterimlerinde kullanılır">
                  <select v-model="selectedCurrency" class="rc-input">
                    <option v-for="opt in currencyOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </RcField>
              </div>

              <div class="rcs-preview">
                <div class="rcs-preview__head">
                  <RcIcon name="eye" :size="14" class="rcs-preview__icon" />
                  <span>Canlı önizleme</span>
                </div>
                <div class="rcs-preview__body">
                  <div v-for="row in currencyPreviewRows" :key="row.label" class="rcs-preview__row">
                    <span class="rcs-preview__label">{{ row.label }}</span>
                    <span class="rcs-preview__value rc-mono">{{ row.value }}</span>
                  </div>
                </div>
              </div>

              <div class="rcs-foot">
                <RcButton type="submit" variant="primary" :loading="savingCurrency">Kaydet</RcButton>
              </div>
            </form>
          </template>

          <BrandingManager v-else-if="activeTab === 'branding'" />

          <DocumentTemplatesManager v-else-if="activeTab === 'document-templates'" />

          <FeaturesManager v-else-if="activeTab === 'features'" />

          <section v-else-if="activeTab === 'reference-data'">
            <RcTabs
              v-model="refDataSubTab"
              :tabs="refDataTabs"
              style="margin-bottom: 16px"
            />
            <div :key="refDataSubTab" class="rcs-section">
              <BrandsManager v-if="refDataSubTab === 'brands'" />
              <CitiesManager v-else-if="refDataSubTab === 'cities'" />
              <ColorsManager v-else-if="refDataSubTab === 'colors'" />
              <CategoriesManager v-else-if="refDataSubTab === 'categories'" />
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
