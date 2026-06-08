<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { referenceDataApi } from '@/api'
import { useToast } from '@/composables'
import { AccountingConfirmModal } from '@/components/accounting'
import { RcButton, RcField, RcModal, RcEmpty, RcTableSkeleton } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { City, District } from '@/types/reference'

const toast = useToast()
const cities = ref<City[]>([])
const loading = ref(true)
const showInactive = ref(false)
const expandedCityId = ref<number | null>(null)
const districtsByCity = ref<Map<number, District[]>>(new Map())
const loadingDistricts = ref<Set<number>>(new Set())

const showCityModal = ref(false)
const editingCity = ref<City | null>(null)
const cityForm = ref({ name: '', plateCode: '', sortOrder: 0 })
const citySaving = ref(false)

const showDistrictModal = ref(false)
const editingDistrict = ref<District | null>(null)
const districtForm = ref({ cityId: 0, name: '', sortOrder: 0 })
const districtSaving = ref(false)

const deactivateTarget = ref<{ type: 'city' | 'district'; id: number; name: string; cityId?: number } | null>(null)

async function fetchCities() {
  loading.value = true
  try {
    cities.value = showInactive.value
      ? await referenceDataApi.getCitiesAll()
      : await referenceDataApi.getCities()
  } catch {
    toast.error('İller yüklenemedi')
  } finally {
    loading.value = false
  }
}

async function handleToggleShowInactive() {
  showInactive.value = !showInactive.value
  await fetchCities()
}

async function doActivateCity(city: City) {
  try {
    await referenceDataApi.activateCity(city.id)
    toast.success(`"${city.name}" tekrar aktif edildi`)
    await fetchCities()
    if (expandedCityId.value === city.id) {
      expandedCityId.value = null
      districtsByCity.value.delete(city.id)
    }
  } catch (err) {
    toast.apiError(err, 'Aktif edilemedi')
  }
}

async function loadDistricts(cityId: number) {
  if (districtsByCity.value.has(cityId)) return
  loadingDistricts.value.add(cityId)
  try {
    const list = showInactive.value
      ? await referenceDataApi.getDistrictsByCityAll(cityId)
      : await referenceDataApi.getDistrictsByCity(cityId)
    districtsByCity.value.set(cityId, [...list])
  } catch {
    toast.error('İlçeler yüklenemedi')
  } finally {
    loadingDistricts.value.delete(cityId)
  }
}

function toggleCity(cityId: number) {
  if (expandedCityId.value === cityId) {
    expandedCityId.value = null
    return
  }
  expandedCityId.value = cityId
  loadDistricts(cityId)
}

function openAddCity() {
  editingCity.value = null
  cityForm.value = { name: '', plateCode: '', sortOrder: cities.value.length + 1 }
  showCityModal.value = true
}

function openEditCity(city: City) {
  editingCity.value = city
  cityForm.value = { name: city.name, plateCode: city.plateCode ?? '', sortOrder: 0 }
  showCityModal.value = true
}

async function saveCity() {
  if (!cityForm.value.name.trim()) {
    toast.error('İl adı zorunludur')
    return
  }
  citySaving.value = true
  try {
    if (editingCity.value) {
      await referenceDataApi.updateCity(editingCity.value.id, {
        name: cityForm.value.name.trim(),
        plateCode: cityForm.value.plateCode.trim() || undefined,
        sortOrder: cityForm.value.sortOrder || undefined,
      })
      toast.success('İl güncellendi')
    } else {
      await referenceDataApi.createCity({
        name: cityForm.value.name.trim(),
        plateCode: cityForm.value.plateCode.trim() || undefined,
        sortOrder: cityForm.value.sortOrder || 0,
      })
      toast.success('İl eklendi')
    }
    showCityModal.value = false
    await fetchCities()
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  } finally {
    citySaving.value = false
  }
}

function openAddDistrict(city: City) {
  editingDistrict.value = null
  districtForm.value = { cityId: city.id, name: '', sortOrder: 0 }
  showDistrictModal.value = true
}

function openEditDistrict(district: District) {
  editingDistrict.value = district
  districtForm.value = { cityId: district.cityId, name: district.name, sortOrder: 0 }
  showDistrictModal.value = true
}

async function saveDistrict() {
  if (!districtForm.value.name.trim()) {
    toast.error('İlçe adı zorunludur')
    return
  }
  districtSaving.value = true
  try {
    if (editingDistrict.value) {
      await referenceDataApi.updateDistrict(editingDistrict.value.id, {
        name: districtForm.value.name.trim(),
        sortOrder: districtForm.value.sortOrder || undefined,
      })
      toast.success('İlçe güncellendi')
    } else {
      await referenceDataApi.createDistrict({
        cityId: districtForm.value.cityId,
        name: districtForm.value.name.trim(),
        sortOrder: districtForm.value.sortOrder || 0,
      })
      toast.success('İlçe eklendi')
    }
    showDistrictModal.value = false
    districtsByCity.value.delete(districtForm.value.cityId)
    if (expandedCityId.value === districtForm.value.cityId) {
      await loadDistricts(districtForm.value.cityId)
    }
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  } finally {
    districtSaving.value = false
  }
}

function confirmDeactivate(type: 'city' | 'district', id: number, name: string, cityId?: number) {
  deactivateTarget.value = { type, id, name, cityId }
}

async function doDeactivate() {
  if (!deactivateTarget.value) return
  const { type, id, name, cityId } = deactivateTarget.value
  try {
    if (type === 'city') {
      await referenceDataApi.deactivateCity(id)
      toast.success(`"${name}" pasif yapıldı`)
      await fetchCities()
      if (expandedCityId.value === id) expandedCityId.value = null
      districtsByCity.value.delete(id)
    } else {
      await referenceDataApi.deactivateDistrict(id)
      toast.success(`"${name}" pasif yapıldı`)
      if (cityId) {
        districtsByCity.value.delete(cityId)
        if (expandedCityId.value === cityId) await loadDistricts(cityId)
      }
    }
    deactivateTarget.value = null
  } catch (err) {
    toast.apiError(err, 'İşlem başarısız')
  }
}

async function doActivateDistrict(district: District, cityId: number) {
  try {
    await referenceDataApi.activateDistrict(district.id)
    toast.success(`"${district.name}" tekrar aktif edildi`)
    districtsByCity.value.delete(cityId)
    if (expandedCityId.value === cityId) await loadDistricts(cityId)
  } catch (err) {
    toast.apiError(err, 'Aktif edilemedi')
  }
}

onMounted(fetchCities)
</script>

<template>
  <div class="rcs-manager">
    <div class="rcs-manager__head">
      <h3 class="rcs-manager__title">İller ve ilçeler</h3>
      <div class="rcs-manager__actions">
        <button
          type="button"
          class="rcs-toggle"
          :aria-pressed="showInactive"
          @click="handleToggleShowInactive"
        >
          <span class="rcs-toggle__track" :class="{ 'rcs-toggle__track--on': showInactive }">
            <span class="rcs-toggle__thumb" />
          </span>
          Pasifleri göster
        </button>
        <RcButton variant="accent" size="sm" @click="openAddCity">
          <RcIcon name="plus" :size="14" />
          Yeni il
        </RcButton>
      </div>
    </div>

    <RcTableSkeleton v-if="loading" :rows="5" :cols="3" />

    <RcEmpty
      v-else-if="!cities.length"
      title="Henüz il yok"
      description="Adres formlarında kullanılacak illeri buradan ekleyin"
    >
      <template #action>
        <RcButton variant="accent" size="sm" @click="openAddCity">İlk ili ekle</RcButton>
      </template>
    </RcEmpty>

    <div v-else class="rcs-accordion">
      <div
        v-for="city in cities"
        :key="city.id"
        class="rcs-accordion__item"
        :class="{ 'rcs-accordion__item--inactive': city.active === false }"
      >
        <div class="rcs-accordion__header" @click="toggleCity(city.id)">
          <RcIcon
            name="chevronRight"
            :size="14"
            class="rcs-accordion__chevron"
            :class="{ 'rcs-accordion__chevron--open': expandedCityId === city.id }"
          />
          <span class="rcs-plate">{{ city.plateCode || '—' }}</span>
          <span class="rcs-accordion__label">{{ city.name }}</span>
          <span v-if="city.active === false" class="rcs-badge-inactive">Pasif</span>
          <div class="rcs-accordion__row-actions" @click.stop>
            <template v-if="city.active !== false">
              <RcButton variant="ghost" size="sm" @click="openEditCity(city)">Düzenle</RcButton>
              <RcButton variant="ghost" size="sm" @click="confirmDeactivate('city', city.id, city.name)">
                Pasif yap
              </RcButton>
            </template>
            <RcButton v-else variant="ghost" size="sm" @click="doActivateCity(city)">Aktif et</RcButton>
          </div>
        </div>
        <div v-if="expandedCityId === city.id" class="rcs-accordion__body">
          <div v-if="loadingDistricts.has(city.id)" class="rcs-list__meta">İlçeler yükleniyor…</div>
          <template v-else>
            <div class="rcs-accordion__toolbar">
              <span class="rcs-accordion__count">{{ (districtsByCity.get(city.id) || []).length }} ilçe</span>
              <RcButton variant="accent" size="sm" @click="openAddDistrict(city)">Yeni ilçe</RcButton>
            </div>
            <ul v-if="(districtsByCity.get(city.id) || []).length" class="rcs-accordion__list">
              <li
                v-for="district in (districtsByCity.get(city.id) || [])"
                :key="district.id"
                class="rcs-accordion__row"
                :class="{ 'rcs-accordion__row--inactive': district.active === false }"
              >
                <div class="rcs-accordion__row-info">
                  <span>{{ district.name }}</span>
                  <span v-if="district.active === false" class="rcs-badge-inactive">Pasif</span>
                </div>
                <div class="rcs-list__actions">
                  <template v-if="district.active !== false">
                    <RcButton variant="ghost" size="sm" @click="openEditDistrict(district)">Düzenle</RcButton>
                    <RcButton
                      variant="ghost"
                      size="sm"
                      @click="confirmDeactivate('district', district.id, district.name, city.id)"
                    >
                      Pasif yap
                    </RcButton>
                  </template>
                  <RcButton v-else variant="ghost" size="sm" @click="doActivateDistrict(district, city.id)">
                    Aktif et
                  </RcButton>
                </div>
              </li>
            </ul>
            <p v-else class="rcs-list__meta">Bu ile ait ilçe yok.</p>
          </template>
        </div>
      </div>
    </div>

    <RcModal
      :open="showCityModal"
      :title="editingCity ? 'İl düzenle' : 'Yeni il'"
      @close="showCityModal = false"
    >
      <form id="city-form" @submit.prevent="saveCity">
        <RcField label="İl adı">
          <input v-model="cityForm.name" type="text" class="rc-input" required placeholder="Örn: İstanbul" />
        </RcField>
        <RcField label="Plaka kodu">
          <input v-model="cityForm.plateCode" type="text" class="rc-input" maxlength="10" placeholder="Örn: 34" />
        </RcField>
        <RcField label="Sıra">
          <input v-model.number="cityForm.sortOrder" type="number" class="rc-input" min="0" />
        </RcField>
      </form>
      <template #footer>
        <RcButton variant="secondary" @click="showCityModal = false">İptal</RcButton>
        <RcButton variant="primary" type="submit" form="city-form" :disabled="citySaving">
          {{ citySaving ? 'Kaydediliyor…' : (editingCity ? 'Güncelle' : 'Ekle') }}
        </RcButton>
      </template>
    </RcModal>

    <RcModal
      :open="showDistrictModal"
      :title="editingDistrict ? 'İlçe düzenle' : 'Yeni ilçe'"
      @close="showDistrictModal = false"
    >
      <form id="district-form" @submit.prevent="saveDistrict">
        <RcField label="İlçe adı">
          <input v-model="districtForm.name" type="text" class="rc-input" required placeholder="Örn: Kadıköy" />
        </RcField>
        <RcField label="Sıra">
          <input v-model.number="districtForm.sortOrder" type="number" class="rc-input" min="0" />
        </RcField>
      </form>
      <template #footer>
        <RcButton variant="secondary" @click="showDistrictModal = false">İptal</RcButton>
        <RcButton variant="primary" type="submit" form="district-form" :disabled="districtSaving">
          {{ districtSaving ? 'Kaydediliyor…' : (editingDistrict ? 'Güncelle' : 'Ekle') }}
        </RcButton>
      </template>
    </RcModal>

    <AccountingConfirmModal
      :open="!!deactivateTarget"
      title="Pasif yap"
      :message="deactivateTarget ? `${deactivateTarget.name} pasif yapılsın mı? Listede görünmez, silinmez.` : ''"
      confirm-label="Pasif yap"
      @close="deactivateTarget = null"
      @confirm="doDeactivate"
    />
  </div>
</template>
