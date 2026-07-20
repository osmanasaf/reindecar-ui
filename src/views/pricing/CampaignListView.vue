<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { campaignsApi, vehicleCategoriesApi } from '@/api'
import { useToast } from '@/composables'
import { RentalType } from '@/types'
import type { VehicleCategory } from '@/types'
import type { CampaignResponse, CreateCampaignRequest } from '@/types/campaign'
import { RcPageHeader, RcButton, RcEmpty, RcSegTab, RcModal, RcBadge, RcTableSkeleton, RcField } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import { formatDate } from '@/utils/format'

const toast = useToast()

const campaigns = ref<CampaignResponse[]>([])
const categories = ref<VehicleCategory[]>([])
const loading = ref(true)
const activeTab = ref<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
const showModal = ref(false)
const saving = ref(false)
const workingId = ref<number | null>(null)

const rentalTypes: { value: RentalType; label: string }[] = [
  { value: RentalType.DAILY, label: 'Günlük' },
  { value: RentalType.WEEKLY, label: 'Haftalık' },
  { value: RentalType.MONTHLY, label: 'Aylık' },
  { value: RentalType.LEASING, label: 'Leasing' },
  { value: RentalType.SERVICE, label: 'Servis' },
]

const form = ref<Partial<CreateCampaignRequest>>({})

const tabs = computed(() => [
  { id: 'ALL' as const, label: 'Tümü', count: campaigns.value.length },
  { id: 'ACTIVE' as const, label: 'Aktif', count: campaigns.value.filter((c) => c.active).length },
  { id: 'INACTIVE' as const, label: 'Pasif', count: campaigns.value.filter((c) => !c.active).length },
])

const filteredCampaigns = computed(() => {
  if (activeTab.value === 'ACTIVE') return campaigns.value.filter((c) => c.active)
  if (activeTab.value === 'INACTIVE') return campaigns.value.filter((c) => !c.active)
  return campaigns.value
})

function rentalTypeLabel(type: RentalType): string {
  return rentalTypes.find((t) => t.value === type)?.label ?? type
}

function categoryName(categoryId: number | null): string {
  if (categoryId == null) return 'Tüm kategoriler'
  return categories.value.find((c) => c.id === categoryId)?.name ?? `#${categoryId}`
}

async function fetchCampaigns() {
  loading.value = true
  try {
    campaigns.value = await campaignsApi.findAll()
  } catch (err) {
    toast.apiError(err, 'Kampanyalar yüklenemedi')
  } finally {
    loading.value = false
  }
}

async function fetchCategories() {
  try {
    categories.value = await vehicleCategoriesApi.getAll()
  } catch (err) {
    toast.apiError(err, 'Kategoriler yüklenemedi')
  }
}

function openCreateModal() {
  form.value = {
    discountType: 'PERCENTAGE',
    applicableRentalTypes: [],
    validFrom: new Date().toISOString().slice(0, 10),
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

function toggleType(type: RentalType) {
  const types = form.value.applicableRentalTypes ?? []
  const idx = types.indexOf(type)
  if (idx >= 0) {
    types.splice(idx, 1)
  } else {
    types.push(type)
  }
  form.value.applicableRentalTypes = [...types]
}

async function saveCampaign() {
  if (!form.value.name || !form.value.discountType || !form.value.discountValue ||
      !form.value.validFrom || !form.value.validTo || !form.value.applicableRentalTypes?.length) {
    toast.error('Ad, indirim türü, değeri, tarih aralığı ve en az bir kiralama tipi zorunludur')
    return
  }
  if (form.value.validTo < form.value.validFrom) {
    toast.error('Bitiş tarihi başlangıçtan önce olamaz')
    return
  }

  saving.value = true
  try {
    await campaignsApi.create(form.value as CreateCampaignRequest)
    toast.success('Kampanya oluşturuldu')
    closeModal()
    await fetchCampaigns()
  } catch (err) {
    toast.apiError(err, 'Kampanya oluşturulamadı')
  } finally {
    saving.value = false
  }
}

async function toggleActive(campaign: CampaignResponse) {
  workingId.value = campaign.id
  try {
    if (campaign.active) {
      await campaignsApi.deactivate(campaign.id)
      toast.success('Kampanya pasife alındı')
    } else {
      await campaignsApi.activate(campaign.id)
      toast.success('Kampanya aktifleştirildi')
    }
    await fetchCampaigns()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  } finally {
    workingId.value = null
  }
}

function discountLabel(campaign: CampaignResponse): string {
  return campaign.discountType === 'PERCENTAGE'
    ? `%${campaign.discountValue}`
    : new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(campaign.discountValue)
}

onMounted(() => {
  void fetchCampaigns()
  void fetchCategories()
})
</script>

<template>
  <div class="rc-page rca-cc">
    <RcPageHeader
      title="Kampanyalar"
      subtitle="İndirim kampanyaları (şu an yalnızca leasing fiyat hesaplamasında uygulanıyor)"
    >
      <template #actions>
        <RcButton variant="accent" @click="openCreateModal">
          <RcIcon name="plus" :size="14" />
          Yeni kampanya
        </RcButton>
      </template>
    </RcPageHeader>

    <div class="rc-segtabs" style="margin-bottom: 14px">
      <RcSegTab
        v-for="tab in tabs"
        :key="tab.id"
        :id="tab.id"
        :active="activeTab"
        :count="tab.count"
        @select="(id) => activeTab = id as 'ALL' | 'ACTIVE' | 'INACTIVE'"
      >
        {{ tab.label }}
      </RcSegTab>
    </div>

    <RcTableSkeleton v-if="loading" :rows="6" :cols="4" />

    <RcEmpty
      v-else-if="filteredCampaigns.length === 0"
      title="Kampanya yok"
      description="Bu filtre için kampanya bulunmuyor"
    >
      <template #icon><RcIcon name="bolt" :size="32" /></template>
      <template #action>
        <RcButton variant="accent" @click="openCreateModal">İlk kampanyayı oluştur</RcButton>
      </template>
    </RcEmpty>

    <div v-else class="rca-cc-grid">
      <article v-for="campaign in filteredCampaigns" :key="campaign.id" class="rca-cc-card">
        <div class="rca-cc-card__head">
          <div>
            <h3 class="rca-cc-card__title">{{ campaign.name }}</h3>
            <p class="rca-cc-card__sub">{{ discountLabel(campaign) }} indirim</p>
          </div>
          <RcBadge :variant="campaign.active ? 'success' : 'default'">
            {{ campaign.active ? 'Aktif' : 'Pasif' }}
          </RcBadge>
        </div>

        <div class="rca-meta-row">
          <span class="rca-meta-row__label">Geçerlilik</span>
          <span class="rca-meta-row__value">{{ formatDate(campaign.validFrom) }} – {{ formatDate(campaign.validTo) }}</span>
        </div>
        <div class="rca-meta-row">
          <span class="rca-meta-row__label">Uygulanan tipler</span>
          <span class="rca-meta-row__value">
            <span v-for="type in campaign.applicableRentalTypes" :key="type" class="rc-chip" style="margin-left: 4px">
              {{ rentalTypeLabel(type) }}
            </span>
          </span>
        </div>
        <div class="rca-meta-row">
          <span class="rca-meta-row__label">Kategori</span>
          <span class="rca-meta-row__value">{{ categoryName(campaign.categoryId) }}</span>
        </div>
        <div v-if="campaign.minTermMonths" class="rca-meta-row">
          <span class="rca-meta-row__label">Min. vade</span>
          <span class="rca-meta-row__value">{{ campaign.minTermMonths }} ay</span>
        </div>
        <div v-if="campaign.description" class="rca-meta-row">
          <span class="rca-meta-row__label">Açıklama</span>
          <span class="rca-meta-row__value">{{ campaign.description }}</span>
        </div>

        <div class="rca-cc-card__actions">
          <RcButton
            :variant="campaign.active ? 'ghost' : 'accent'"
            size="sm"
            :disabled="workingId === campaign.id"
            @click="toggleActive(campaign)"
          >
            {{ campaign.active ? 'Pasif yap' : 'Aktif yap' }}
          </RcButton>
        </div>
      </article>
    </div>

    <RcModal :open="showModal" title="Yeni kampanya" @close="closeModal">
      <div class="rc-form">
        <RcField label="Kampanya adı *">
          <input v-model="form.name" type="text" class="rc-input" placeholder="Örn: Yaz İndirimi" />
        </RcField>

        <div class="rc-form__row">
          <RcField label="İndirim türü *">
            <select v-model="form.discountType" class="rc-select">
              <option value="PERCENTAGE">Yüzde (%)</option>
              <option value="FIXED_AMOUNT">Sabit tutar</option>
            </select>
          </RcField>
          <RcField :label="form.discountType === 'FIXED_AMOUNT' ? 'İndirim tutarı *' : 'İndirim yüzdesi *'">
            <input v-model.number="form.discountValue" type="number" min="0.01" step="0.01" class="rc-input" />
          </RcField>
        </div>

        <div class="rc-form__row">
          <RcField label="Başlangıç tarihi *">
            <input v-model="form.validFrom" type="date" class="rc-input" />
          </RcField>
          <RcField label="Bitiş tarihi *">
            <input v-model="form.validTo" type="date" class="rc-input" />
          </RcField>
        </div>

        <div class="rc-field">
          <span class="rc-field__label">Uygulanacak kiralama tipleri *</span>
          <div class="rc-filterbar" style="padding: 0; border: none; margin: 0">
            <button
              v-for="type in rentalTypes"
              :key="type.value"
              type="button"
              class="rc-chip"
              :class="{ 'rc-chip--on': form.applicableRentalTypes?.includes(type.value) }"
              @click="toggleType(type.value)"
            >
              {{ type.label }}
            </button>
          </div>
        </div>

        <div class="rc-form__row">
          <RcField label="Kategori (opsiyonel — boşsa tüm kategoriler)">
            <select v-model.number="form.categoryId" class="rc-select">
              <option :value="undefined">Tüm kategoriler</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </RcField>
          <RcField label="Min. vade (ay, opsiyonel)">
            <input v-model.number="form.minTermMonths" type="number" min="1" class="rc-input" />
          </RcField>
        </div>

        <RcField label="Açıklama (opsiyonel)">
          <textarea v-model="form.description" class="rc-input" rows="2" maxlength="500" />
        </RcField>
      </div>

      <template #footer>
        <RcButton variant="secondary" @click="closeModal">İptal</RcButton>
        <RcButton variant="accent" :disabled="saving" @click="saveCampaign">
          {{ saving ? 'Kaydediliyor…' : 'Oluştur' }}
        </RcButton>
      </template>
    </RcModal>
  </div>
</template>

<style scoped>
.rc-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rc-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 640px) {
  .rc-form__row {
    grid-template-columns: 1fr;
  }
}

.rca-cc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.rca-cc-card {
  padding: 16px;
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-radius-lg);
  background: var(--rc-surface);
}

.rca-cc-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.rca-cc-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.rca-cc-card__sub {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--rc-text-muted);
}

.rca-cc-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
</style>
