<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { referenceDataApi } from '@/api'
import { useToast } from '@/composables'
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
                sortOrder: cityForm.value.sortOrder || undefined
            })
            toast.success('İl güncellendi')
        } else {
            await referenceDataApi.createCity({
                name: cityForm.value.name.trim(),
                plateCode: cityForm.value.plateCode.trim() || undefined,
                sortOrder: cityForm.value.sortOrder || 0
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
                sortOrder: districtForm.value.sortOrder || undefined
            })
            toast.success('İlçe güncellendi')
        } else {
            await referenceDataApi.createDistrict({
                cityId: districtForm.value.cityId,
                name: districtForm.value.name.trim(),
                sortOrder: districtForm.value.sortOrder || 0
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
  <div class="cities-manager">
    <div class="section-header">
      <h2>İller ve İlçeler</h2>
      <div class="header-actions">
        <button
          type="button"
          class="toggle-label"
          :aria-pressed="showInactive"
          @click="handleToggleShowInactive"
        >
          <span class="toggle-track" :class="{ active: showInactive }">
            <span class="toggle-thumb"></span>
          </span>
          <span class="toggle-text">Pasifleri göster</span>
        </button>
        <button class="btn btn-primary" @click="openAddCity">Yeni İl</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Yükleniyor...</div>
    <template v-else>
      <div class="accordion-list">
        <div
          v-for="city in cities"
          :key="city.id"
          class="accordion-item"
          :class="{ 'accordion-item--inactive': city.active === false }"
        >
          <div
            class="accordion-header"
            @click="toggleCity(city.id)"
          >
            <span class="accordion-arrow">{{ expandedCityId === city.id ? '▼' : '▶' }}</span>
            <span class="city-plate">{{ city.plateCode || '—' }}</span>
            <span class="city-name">{{ city.name }}</span>
            <span v-if="city.active === false" class="inactive-badge">Pasif</span>
            <div class="header-actions" @click.stop>
              <template v-if="city.active !== false">
                <button class="btn-sm btn-outline" @click="openEditCity(city)">Düzenle</button>
                <button class="btn-sm btn-danger" @click="confirmDeactivate('city', city.id, city.name)">
                  Pasif yap
                </button>
              </template>
              <button v-else class="btn-sm btn-success" @click="doActivateCity(city)">
                Aktif et
              </button>
            </div>
          </div>
          <div v-if="expandedCityId === city.id" class="accordion-body">
            <div v-if="loadingDistricts.has(city.id)" class="loading-inline">İlçeler yükleniyor...</div>
            <template v-else>
              <div class="districts-toolbar">
                <span class="districts-count">{{ (districtsByCity.get(city.id) || []).length }} ilçe</span>
                <button class="btn-sm btn-primary" @click="openAddDistrict(city)">Yeni İlçe</button>
              </div>
              <ul class="districts-list">
                <li
                  v-for="district in (districtsByCity.get(city.id) || [])"
                  :key="district.id"
                  class="district-row"
                  :class="{ 'row--inactive': district.active === false }"
                >
                  <span>{{ district.name }}</span>
                  <span v-if="district.active === false" class="inactive-badge">Pasif</span>
                  <div class="row-actions">
                    <template v-if="district.active !== false">
                      <button class="btn-sm btn-outline" @click="openEditDistrict(district)">Düzenle</button>
                      <button
                        class="btn-sm btn-danger"
                        @click="confirmDeactivate('district', district.id, district.name, city.id)"
                      >
                        Pasif yap
                      </button>
                    </template>
                    <button v-else class="btn-sm btn-success" @click="doActivateDistrict(district, city.id)">
                      Aktif et
                    </button>
                  </div>
                </li>
              </ul>
              <p v-if="!(districtsByCity.get(city.id) || []).length" class="empty-inline">Bu ile ait ilçe yok.</p>
            </template>
          </div>
        </div>
      </div>
      <p v-if="!cities.length" class="empty-state">Henüz il eklenmemiş.</p>
    </template>

    <!-- City modal -->
    <div v-if="showCityModal" class="modal-overlay" @click.self="showCityModal = false">
      <div class="modal">
        <h3>{{ editingCity ? 'İl Düzenle' : 'Yeni İl' }}</h3>
        <form @submit.prevent="saveCity">
          <div class="form-group">
            <label>İl adı <span class="required">*</span></label>
            <input v-model="cityForm.name" type="text" required placeholder="Örn: İstanbul" />
          </div>
          <div class="form-group">
            <label>Plaka kodu</label>
            <input v-model="cityForm.plateCode" type="text" maxlength="10" placeholder="Örn: 34" />
          </div>
          <div class="form-group">
            <label>Sıra</label>
            <input v-model.number="cityForm.sortOrder" type="number" min="0" />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-outline" @click="showCityModal = false">İptal</button>
            <button type="submit" class="btn btn-primary" :disabled="citySaving">
              {{ citySaving ? 'Kaydediliyor...' : (editingCity ? 'Güncelle' : 'Ekle') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- District modal -->
    <div v-if="showDistrictModal" class="modal-overlay" @click.self="showDistrictModal = false">
      <div class="modal">
        <h3>{{ editingDistrict ? 'İlçe Düzenle' : 'Yeni İlçe' }}</h3>
        <form @submit.prevent="saveDistrict">
          <div class="form-group">
            <label>İlçe adı <span class="required">*</span></label>
            <input v-model="districtForm.name" type="text" required placeholder="Örn: Kadıköy" />
          </div>
          <div class="form-group">
            <label>Sıra</label>
            <input v-model.number="districtForm.sortOrder" type="number" min="0" />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-outline" @click="showDistrictModal = false">İptal</button>
            <button type="submit" class="btn btn-primary" :disabled="districtSaving">
              {{ districtSaving ? 'Kaydediliyor...' : (editingDistrict ? 'Güncelle' : 'Ekle') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Deactivate confirm -->
    <div v-if="deactivateTarget" class="modal-overlay" @click.self="deactivateTarget = null">
      <div class="modal modal-sm">
        <h3>Pasif yap</h3>
        <p><strong>{{ deactivateTarget.name }}</strong> pasif yapılsın mı? (Listede görünmez, silinmez.)</p>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" @click="deactivateTarget = null">Vazgeç</button>
          <button type="button" class="btn btn-danger" @click="doDeactivate">Pasif yap</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cities-manager {
  max-width: 800px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
}

.toggle-track {
  position: relative;
  display: inline-block;
  width: 2.25rem;
  height: 1.25rem;
  background: var(--color-border, #d1d5db);
  border-radius: 9999px;
  transition: background 0.2s;
}

.toggle-track.active {
  background: var(--color-primary, #2563eb);
}

.toggle-thumb {
  position: absolute;
  top: 0.125rem;
  left: 0.125rem;
  width: 1rem;
  height: 1rem;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.toggle-track.active .toggle-thumb {
  transform: translateX(1rem);
}

.toggle-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
}

.accordion-item--inactive {
  opacity: 0.85;
}

.accordion-item--inactive .accordion-header {
  background: var(--color-bg-secondary, #f3f4f6);
}

.inactive-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  background: #e5e7eb;
  color: #6b7280;
  font-weight: 500;
}

.row--inactive {
  opacity: 0.75;
  background: var(--color-bg-secondary) !important;
}

.btn-success {
  background: var(--color-success, #059669);
  color: white;
  border: none;
}

.btn-success:hover {
  opacity: 0.9;
}

.btn { padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; border: none; }
.btn-primary { background: var(--color-primary); color: white; }
.btn-outline { background: transparent; border: 1px solid var(--color-border); color: var(--color-text); }
.btn-danger { background: var(--color-danger, #dc3545); color: white; }
.btn-sm { padding: 6px 12px; font-size: 13px; }

.loading, .empty-state { text-align: center; padding: 24px; color: var(--color-text-secondary); }
.loading-inline, .empty-inline { padding: 12px; color: var(--color-text-muted); font-size: 14px; }

.accordion-list { border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; }
.accordion-item { border-bottom: 1px solid var(--color-border); }
.accordion-item:last-child { border-bottom: none; }

.accordion-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  background: var(--color-surface);
  transition: background 0.2s;
}
.accordion-header:hover { background: var(--color-bg-secondary); }

.accordion-arrow { font-size: 12px; color: var(--color-text-muted); width: 20px; }
.city-plate { font-weight: 600; min-width: 28px; color: var(--color-text-muted); }
.city-name { flex: 1; font-weight: 500; }
.header-actions { display: flex; gap: 8px; }

.accordion-body { padding: 12px 16px 16px 48px; background: var(--color-bg-secondary); }

.districts-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.districts-count { font-size: 13px; color: var(--color-text-muted); }

.districts-list { list-style: none; margin: 0; padding: 0; }
.district-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 4px;
  background: var(--color-surface);
}
.row-actions { display: flex; gap: 8px; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 420px;
}
.modal h3 { font-size: 18px; margin: 0 0 20px 0; }
.modal p { margin: 0 0 20px 0; color: var(--color-text-secondary); }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; color: var(--color-text-secondary); }
.form-group input { width: 100%; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: 8px; font-size: 14px; }
.required { color: var(--color-danger); }
.form-actions { display: flex; gap: 12px; margin-top: 20px; }
.form-actions .btn { flex: 1; }
.modal-sm { max-width: 360px; }
</style>
