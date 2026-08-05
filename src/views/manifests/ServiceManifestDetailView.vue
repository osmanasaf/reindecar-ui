<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { serviceManifestsApi } from '@/api'
import { useToast, useFeatures } from '@/composables'
import { AccountingConfirmModal } from '@/components/accounting'
import ManifestFormCard from '@/components/manifests/ManifestFormCard.vue'
import ManifestPassengersCard from '@/components/manifests/ManifestPassengersCard.vue'
import ManifestDocumentsCard from '@/components/manifests/ManifestDocumentsCard.vue'
import { RcButton, RcDetailSkeleton, RcDropzone } from '@/components/rc'
import { RcIcon, type IconName } from '@/components/icons'
import { formatDateTime } from '@/utils/format'
import { resolveTripStatus } from '@/utils/tripStatus'
import type { UetdsManifest, UetdsManifestPreviewResponse } from '@/types/manifest'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { isEnabled } = useFeatures()

const manifest = ref<UetdsManifest | null>(null)
const loading = ref(true)
const showDeleteConfirm = ref(false)

// PDF & doğrulama
const pendingFile = ref<File | null>(null)
const preview = ref<UetdsManifestPreviewResponse | null>(null)
const previewing = ref(false)
const attaching = ref(false)

const manifestId = computed(() => Number(route.params.id))
const tripStatus = computed(() =>
  manifest.value ? resolveTripStatus(manifest.value.tripStartAt, manifest.value.tripEndAt) : null,
)

// ── Bölüm rayı (sticky nav + scroll-spy) ──
type RailKey = 'pdf' | 'form' | 'pax' | 'doc'
const activeSection = ref<RailKey>('pdf')
const sectionEls: Record<RailKey, HTMLElement | null> = { pdf: null, form: null, pax: null, doc: null }
let scrollContainer: HTMLElement | null = null

const railItems = computed(() => {
  const items: Array<{ key: RailKey; label: string; icon: IconName; badge?: string }> = [
    { key: 'pdf', label: 'PDF & doğrulama', icon: 'filePdf' },
    { key: 'form', label: 'Sefer bilgileri', icon: 'globe' },
  ]
  if (isEnabled('UETDS_PASSENGERS')) {
    items.push({ key: 'pax', label: 'Yolcular', icon: 'users', badge: String(manifest.value?.passengerCount ?? 0) })
  }
  if (isEnabled('UETDS_DOCUMENTS')) {
    items.push({ key: 'doc', label: 'Belgeler', icon: 'folder' })
  }
  return items
})

function setSectionEl(key: RailKey, el: unknown) {
  sectionEls[key] = el instanceof HTMLElement ? el : null
}

function findScrollParent(node: HTMLElement | null): HTMLElement | null {
  let el = node?.parentElement ?? null
  while (el) {
    const oy = getComputedStyle(el).overflowY
    if (/(auto|scroll|overlay)/.test(oy) && el.scrollHeight > el.clientHeight) return el
    el = el.parentElement
  }
  return null
}

function scrollToSection(key: RailKey) {
  activeSection.value = key
  const el = sectionEls[key]
  if (!el) return
  if (scrollContainer) {
    const top =
      scrollContainer.scrollTop +
      el.getBoundingClientRect().top -
      scrollContainer.getBoundingClientRect().top -
      16
    scrollContainer.scrollTo({ top, behavior: 'smooth' })
  } else {
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 72, behavior: 'smooth' })
  }
}

let spyScheduled = false
function onScroll() {
  if (spyScheduled) return
  spyScheduled = true
  requestAnimationFrame(() => {
    spyScheduled = false
    const anchorTop = scrollContainer ? scrollContainer.getBoundingClientRect().top + 120 : 132
    let current: RailKey = railItems.value[0]?.key ?? 'pdf'
    for (const item of railItems.value) {
      const el = sectionEls[item.key]
      if (el && el.getBoundingClientRect().top <= anchorTop) current = item.key
    }
    activeSection.value = current
  })
}

async function loadManifest() {
  loading.value = true
  try {
    manifest.value = await serviceManifestsApi.getById(manifestId.value)
  } catch (err) {
    toast.apiError(err, 'Manifesto yüklenemedi')
    router.push({ name: 'service-manifests' })
    return
  } finally {
    loading.value = false
  }
  await nextTick()
  scrollContainer = findScrollParent(sectionEls.pdf)
  ;(scrollContainer ?? window).addEventListener('scroll', onScroll, { passive: true })
  if (route.hash === '#yolcular' && isEnabled('UETDS_PASSENGERS')) {
    scrollToSection('pax')
  }
}

// ── PDF akışı ──
async function onFilesSelected(files: File[]) {
  const file = files[0]
  if (!file || !manifest.value) return
  pendingFile.value = file
  preview.value = null
  previewing.value = true
  try {
    preview.value = await serviceManifestsApi.previewFromPdf(manifest.value.rentalId, file)
  } catch (err) {
    toast.apiError(err, 'PDF önizlenemedi')
    pendingFile.value = null
  } finally {
    previewing.value = false
  }
}

function cancelPending() {
  pendingFile.value = null
  preview.value = null
}

async function attachPending() {
  if (!pendingFile.value || !manifest.value) return
  attaching.value = true
  try {
    manifest.value = await serviceManifestsApi.attachPdf(manifest.value.id, pendingFile.value)
    toast.success('PDF eklendi')
    pendingFile.value = null
    preview.value = null
  } catch (err) {
    toast.apiError(err, 'PDF yüklenemedi')
  } finally {
    attaching.value = false
  }
}

async function handleDeleteManifest() {
  try {
    await serviceManifestsApi.remove(manifestId.value)
    toast.success('Manifesto silindi')
    router.push({ name: 'service-manifests' })
  } catch (err) {
    toast.apiError(err, 'Silinemedi')
  } finally {
    showDeleteConfirm.value = false
  }
}

onMounted(() => {
  void loadManifest()
})
onBeforeUnmount(() => {
  ;(scrollContainer ?? window).removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div class="rc-page">
    <div class="rc-page__toolbar">
      <RcButton variant="secondary" @click="router.push({ name: 'service-manifests' })">
        <RcIcon name="chevronLeft" :size="14" />
        Listeye dön
      </RcButton>
      <RcButton variant="danger" :disabled="!manifest" @click="showDeleteConfirm = true">Sil</RcButton>
    </div>

    <RcDetailSkeleton v-if="loading" />

    <div v-else-if="manifest" class="md-layout rc-animate-in">
      <!-- Rail -->
      <aside class="md-rail">
        <div class="md-summary">
          <div class="md-summary__trip rc-mono">{{ manifest.uetdsTripNumber }}</div>
          <div class="md-summary__meta">{{ manifest.vehiclePlate }}</div>
          <div class="md-summary__badges">
            <span
              v-if="tripStatus"
              class="md-tstatus"
              :class="`md-tstatus--${tripStatus.key}`"
            >{{ tripStatus.label }}</span>
            <span class="md-src" :class="manifest.source === 'UPLOAD' ? 'md-src--pdf' : 'md-src--manual'">
              {{ manifest.source === 'UPLOAD' ? 'PDF' : 'Manuel' }}
            </span>
          </div>
        </div>

        <!-- Manifestonun bağlı olduğu kiralamaya dönüş: doğrudan UETDS sekmesine götürür -->
        <RouterLink
          class="md-parent"
          :to="{ name: 'rental-detail', params: { id: manifest.rentalId }, query: { tab: 'uetds' } }"
        >
          <span class="md-parent__icon"><RcIcon name="key" :size="15" /></span>
          <span class="md-parent__text">
            <span class="md-parent__label">Bağlı kiralama</span>
            <span class="md-parent__value rc-mono">{{ manifest.rentalNumber }}</span>
          </span>
          <RcIcon name="chevronRight" :size="15" class="md-parent__chevron" />
        </RouterLink>

        <nav class="md-nav">
          <button
            v-for="item in railItems"
            :key="item.key"
            type="button"
            class="md-nav__item"
            :class="{ 'md-nav__item--on': activeSection === item.key }"
            @click="scrollToSection(item.key)"
          >
            <RcIcon :name="item.icon" :size="15" />
            <span class="md-nav__label">{{ item.label }}</span>
            <span v-if="item.badge" class="md-nav__badge rc-mono">{{ item.badge }}</span>
          </button>
        </nav>
      </aside>

      <!-- Sections -->
      <div class="md-sections">
        <!-- PDF & doğrulama -->
        <section :ref="(el) => setSectionEl('pdf', el)" class="rc-card">
          <div class="rc-card__head">
            <div class="rc-card__head-lead">
              <span class="rc-card__icon"><RcIcon name="filePdf" :size="16" /></span>
              <div>
                <h2 class="rc-card__title">PDF &amp; doğrulama</h2>
                <div class="rc-card__desc">Manifesto belgesini yükle, plakayı doğrula ve ekle</div>
              </div>
            </div>
          </div>
          <div class="rc-card__body md-pdf">
            <!-- Yeni seçilen belgenin plaka doğrulaması -->
            <template v-if="preview">
              <div v-if="preview.plateMatches" class="rc-callout rc-callout--ok">
                <span class="rc-callout__icon"><RcIcon name="checkCircle" :size="18" :stroke-width="1.8" /></span>
                <div class="rc-callout__text">
                  <div class="rc-callout__title">Plaka doğrulandı</div>
                  <div class="rc-callout__desc">
                    Belgedeki plaka ({{ preview.parsedVehiclePlate || manifest.vehiclePlate }}) kiralama aracıyla eşleşiyor.
                  </div>
                  <div class="rc-callout__actions">
                    <RcButton variant="accent" size="sm" :loading="attaching" @click="attachPending">
                      Belgeyi ekle
                    </RcButton>
                    <RcButton variant="ghost" size="sm" :disabled="attaching" @click="cancelPending">
                      Vazgeç
                    </RcButton>
                  </div>
                </div>
              </div>
              <div v-else class="rc-callout rc-callout--warn">
                <span class="rc-callout__icon"><RcIcon name="warning" :size="18" :stroke-width="1.8" /></span>
                <div class="rc-callout__text">
                  <div class="rc-callout__title">Plaka uyuşmazlığı</div>
                  <div class="rc-callout__desc">
                    Belgede <strong>{{ preview.parsedVehiclePlate || '—' }}</strong>, kiralamada
                    <strong>{{ preview.rentalVehiclePlate || manifest.vehiclePlate }}</strong> görünüyor.
                    Devam etmeden önce doğrulayın.
                  </div>
                  <div class="rc-callout__actions">
                    <RcButton variant="accent" size="sm" :loading="attaching" @click="attachPending">
                      Yine de kabul et
                    </RcButton>
                    <RcButton variant="ghost" size="sm" :disabled="attaching" @click="cancelPending">
                      Vazgeç
                    </RcButton>
                  </div>
                </div>
              </div>
            </template>

            <!-- Yüklü belgenin durumu -->
            <template v-else-if="manifest.pdfFile">
              <div v-if="manifest.pdfPlateMatches === false" class="rc-callout rc-callout--warn">
                <span class="rc-callout__icon"><RcIcon name="warning" :size="18" :stroke-width="1.8" /></span>
                <div class="rc-callout__text">
                  <div class="rc-callout__title">Plaka uyuşmazlığı kabul edildi</div>
                  <div class="rc-callout__desc">
                    Yüklü belgede <strong>{{ manifest.parsedPlate || '—' }}</strong>, kiralamada
                    <strong>{{ manifest.vehiclePlate }}</strong> görünüyor.
                  </div>
                </div>
              </div>
              <div v-else-if="manifest.pdfPlateMatches === true" class="rc-callout rc-callout--ok">
                <span class="rc-callout__icon"><RcIcon name="checkCircle" :size="18" :stroke-width="1.8" /></span>
                <div class="rc-callout__text">
                  <div class="rc-callout__title">Plaka doğrulandı</div>
                  <div class="rc-callout__desc">Belge plakası kiralama aracıyla eşleşiyor.</div>
                </div>
              </div>
              <div class="rc-filerow">
                <span class="rc-filerow__badge rc-mono">PDF</span>
                <div class="rc-filerow__text">
                  <div class="rc-filerow__name">{{ manifest.pdfFile.fileName }}</div>
                  <div class="rc-filerow__meta">{{ formatDateTime(manifest.createdAt) }}</div>
                </div>
              </div>
            </template>

            <!-- Belge yok: neden önemli olduğunu anlat -->
            <div v-else class="rc-callout rc-callout--muted">
              <span class="rc-callout__icon"><RcIcon name="filePdf" :size="18" /></span>
              <div class="rc-callout__text">
                <div class="rc-callout__title">Belge eklenmedi</div>
                <div class="rc-callout__desc">
                  Manuel giriş — PDF ekleyerek plaka doğrulamasını kolaylaştırın.
                </div>
              </div>
            </div>

            <RcDropzone
              v-if="!preview"
              accept="application/pdf"
              icon="filePdf"
              :compact="!!manifest.pdfFile"
              :busy="previewing"
              busy-label="PDF okunuyor…"
              :title="manifest.pdfFile ? 'Belgeyi değiştir' : 'PDF\'yi buraya sürükle veya seç'"
              :hint="manifest.pdfFile ? 'Yeni PDF yükleyince plaka yeniden doğrulanır' : 'Yalnızca PDF · plaka otomatik doğrulanır'"
              @select="onFilesSelected"
            />
          </div>
        </section>

        <!-- Sefer bilgileri -->
        <div :ref="(el) => setSectionEl('form', el)">
          <ManifestFormCard :manifest="manifest" @updated="manifest = $event" />
        </div>

        <!-- Yolcular -->
        <div :ref="(el) => setSectionEl('pax', el)">
          <ManifestPassengersCard :manifest-id="manifestId" />
        </div>

        <!-- Belgeler -->
        <div :ref="(el) => setSectionEl('doc', el)">
          <ManifestDocumentsCard :manifest-id="manifestId" />
        </div>
      </div>
    </div>

    <AccountingConfirmModal
      :open="showDeleteConfirm"
      title="Manifestoyu sil"
      message="Bu sefer manifestosu kalıcı olarak silinecek."
      confirm-label="Sil"
      variant="danger"
      @close="showDeleteConfirm = false"
      @confirm="handleDeleteManifest"
    />
  </div>
</template>

<style scoped>
.md-layout {
  display: grid;
  grid-template-columns: 212px 1fr;
  gap: 24px;
  align-items: start;
}

/* Rail */
.md-rail {
  position: sticky;
  top: 8px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.md-summary {
  background: var(--rc-surface);
  border: 1px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-12);
  padding: 16px;
  box-shadow: var(--rc-shadow-sm);
}
.md-summary__trip { font-size: 14px; font-weight: 600; }
.md-summary__meta { font-size: 12px; color: var(--rc-text-muted); margin-top: 3px; line-height: 1.4; }
.md-summary__badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.md-tstatus,
.md-src {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: var(--rc-r-full);
}
.md-tstatus--upcoming { background: var(--rc-accent-subtle); color: var(--rc-blue-700); }
.md-tstatus--ongoing { background: var(--rc-success-50); color: var(--rc-success-700); }
.md-tstatus--done { background: var(--rc-surface-2); color: var(--rc-text-muted); }
.md-src--pdf { background: var(--rc-info-50); color: var(--rc-info-700); }
.md-src--manual { background: var(--rc-surface-2); color: var(--rc-text-muted); }

/* Bağlı kiralama kısayolu */
.md-parent {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-10);
  background: var(--rc-surface);
  color: inherit;
  text-decoration: none;
  transition: background var(--rc-dur-fast), border-color var(--rc-dur-fast);
}
.md-parent:hover { background: var(--rc-surface-hover); border-color: var(--rc-border); }
.md-parent:focus-visible { outline: none; border-color: var(--rc-accent); box-shadow: var(--rc-focus-ring); }
.md-parent__icon {
  width: 28px;
  height: 28px;
  border-radius: var(--rc-r-8);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--rc-accent-subtle);
  color: var(--rc-accent);
  flex-shrink: 0;
}
.md-parent__text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.md-parent__label { font-size: 11px; color: var(--rc-text-muted); }
.md-parent__value {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--rc-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.md-parent__chevron { color: var(--rc-text-faint); flex-shrink: 0; }

.md-nav { display: flex; flex-direction: column; gap: 2px; }
.md-nav__item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  height: 34px;
  padding: 0 11px;
  border-radius: var(--rc-r-8);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  color: var(--rc-text-soft);
  transition: background var(--rc-dur-fast), color var(--rc-dur-fast);
}
.md-nav__item:hover { background: var(--rc-surface-hover); color: var(--rc-text); }
.md-nav__item--on { background: var(--rc-accent-subtle); color: var(--rc-accent); }
.md-nav__label { flex: 1; }
.md-nav__badge { font-size: 11px; font-weight: 600; }

/* Sections */
.md-sections { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

/* PDF & doğrulama — bildirim, dosya satırı ve bırakma alanı
   rc-primitives.css'teki ortak sınıflardan gelir. */
.md-pdf {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 900px) {
  .md-layout { grid-template-columns: 1fr; }
  .md-rail { position: static; }
  .md-nav { flex-direction: row; flex-wrap: wrap; }
  .md-nav__item { width: auto; }
}
</style>
