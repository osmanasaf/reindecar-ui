<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { serviceManifestsApi } from '@/api'
import { useToast, useFeatures } from '@/composables'
import { AccountingConfirmModal } from '@/components/accounting'
import ManifestFormCard from '@/components/manifests/ManifestFormCard.vue'
import ManifestPassengersCard from '@/components/manifests/ManifestPassengersCard.vue'
import ManifestDocumentsCard from '@/components/manifests/ManifestDocumentsCard.vue'
import { RcButton, RcDetailSkeleton } from '@/components/rc'
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
const fileInput = ref<HTMLInputElement | null>(null)

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
function pickFile() {
  fileInput.value?.click()
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
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
      <div style="display: flex; gap: 8px">
        <RcButton
          variant="secondary"
          @click="router.push({ name: 'rental-detail', params: { id: manifest?.rentalId } })"
        >
          <RcIcon name="key" :size="14" />
          Kiralamaya git
        </RcButton>
        <RcButton variant="danger" @click="showDeleteConfirm = true">Sil</RcButton>
      </div>
    </div>

    <RcDetailSkeleton v-if="loading" />

    <div v-else-if="manifest" class="md-layout rc-animate-in">
      <!-- Rail -->
      <aside class="md-rail">
        <div class="md-summary">
          <div class="md-summary__trip rc-mono">{{ manifest.uetdsTripNumber }}</div>
          <div class="md-summary__meta">{{ manifest.vehiclePlate }} · {{ manifest.rentalNumber }}</div>
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
          <div class="rc-card__body">
            <input
              ref="fileInput"
              type="file"
              accept="application/pdf"
              style="display: none"
              @change="onFileSelected"
            />

            <div v-if="previewing" class="md-verify md-verify--muted">
              <RcIcon name="clock" :size="18" />
              <div><div class="md-verify__title">PDF okunuyor…</div></div>
            </div>

            <template v-else-if="preview">
              <div v-if="preview.plateMatches" class="md-verify md-verify--ok">
                <RcIcon name="checkCircle" :size="18" :stroke-width="1.8" />
                <div class="md-verify__text">
                  <div class="md-verify__title">Plaka doğrulandı</div>
                  <div class="md-verify__desc">
                    Belgedeki plaka ({{ preview.parsedVehiclePlate || manifest.vehiclePlate }}) kiralama aracıyla eşleşiyor.
                  </div>
                  <div class="md-verify__actions">
                    <button type="button" class="md-btn md-btn--solid" :disabled="attaching" @click="attachPending">
                      Belgeyi ekle
                    </button>
                    <button type="button" class="md-btn md-btn--ghost" :disabled="attaching" @click="cancelPending">
                      Vazgeç
                    </button>
                  </div>
                </div>
              </div>
              <div v-else class="md-verify md-verify--warn">
                <RcIcon name="warning" :size="18" :stroke-width="1.8" />
                <div class="md-verify__text">
                  <div class="md-verify__title">Plaka uyuşmazlığı</div>
                  <div class="md-verify__desc">
                    Belgede <b>{{ preview.parsedVehiclePlate || '—' }}</b>, kiralamada
                    <b>{{ preview.rentalVehiclePlate || manifest.vehiclePlate }}</b> görünüyor. Devam etmeden önce doğrulayın.
                  </div>
                  <div class="md-verify__actions">
                    <button type="button" class="md-btn md-btn--warn" :disabled="attaching" @click="attachPending">
                      Yine de kabul et
                    </button>
                    <button type="button" class="md-btn md-btn--ghost" :disabled="attaching" @click="pickFile">
                      Belgeyi değiştir
                    </button>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="manifest.pdfFile">
              <div v-if="manifest.pdfPlateMatches === false" class="md-verify md-verify--warn" style="margin-bottom: 12px">
                <RcIcon name="warning" :size="18" :stroke-width="1.8" />
                <div class="md-verify__text">
                  <div class="md-verify__title">Plaka uyuşmazlığı kabul edildi</div>
                  <div class="md-verify__desc">
                    Yüklü belgede <b>{{ manifest.parsedPlate || '—' }}</b>, kiralamada
                    <b>{{ manifest.vehiclePlate }}</b> görünüyor.
                  </div>
                </div>
              </div>
              <div v-else-if="manifest.pdfPlateMatches === true" class="md-verify md-verify--ok" style="margin-bottom: 12px">
                <RcIcon name="checkCircle" :size="18" :stroke-width="1.8" />
                <div class="md-verify__text">
                  <div class="md-verify__title">Plaka doğrulandı</div>
                  <div class="md-verify__desc">Belge plakası kiralama aracıyla eşleşiyor.</div>
                </div>
              </div>
              <div class="md-file">
                <span class="md-file__badge rc-mono">PDF</span>
                <div class="md-file__text">
                  <div class="md-file__name">{{ manifest.pdfFile.fileName }}</div>
                  <div class="md-file__meta">{{ formatDateTime(manifest.createdAt) }}</div>
                </div>
                <button type="button" class="md-btn md-btn--ghost" @click="pickFile">Değiştir</button>
              </div>
            </template>

            <div v-else class="md-verify md-verify--muted">
              <RcIcon name="filePdf" :size="18" />
              <div class="md-verify__text">
                <div class="md-verify__title">Belge eklenmedi</div>
                <div class="md-verify__desc">Manuel giriş — PDF ekleyerek plaka doğrulamasını kolaylaştırın.</div>
                <div class="md-verify__actions">
                  <button type="button" class="md-btn md-btn--solid" @click="pickFile">PDF yükle</button>
                </div>
              </div>
            </div>
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

/* PDF & doğrulama */
.md-verify {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 13px 15px;
  border-radius: var(--rc-r-10);
  border: 1px solid transparent;
}
.md-verify--ok { background: var(--rc-success-50); border-color: color-mix(in srgb, var(--rc-success-500) 22%, transparent); color: var(--rc-success-700); }
.md-verify--warn { background: var(--rc-warning-50); border-color: color-mix(in srgb, var(--rc-warning-500) 26%, transparent); color: var(--rc-warning-700); }
.md-verify--muted { background: var(--rc-surface-2); border-color: var(--rc-border-subtle); color: var(--rc-text-muted); }
.md-verify__text { flex: 1; min-width: 0; }
.md-verify__title { font-size: 13px; font-weight: 600; }
.md-verify__desc { font-size: 12.5px; color: var(--rc-text-soft); margin-top: 2px; }
.md-verify__actions { display: flex; gap: 8px; margin-top: 10px; }

.md-file {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--rc-border-subtle);
  border-radius: var(--rc-r-10);
  background: var(--rc-surface-2);
}
.md-file__badge {
  width: 34px;
  height: 40px;
  border-radius: var(--rc-r-4);
  background: var(--rc-danger-50);
  color: var(--rc-danger-700);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 600;
  flex-shrink: 0;
}
.md-file__text { flex: 1; min-width: 0; }
.md-file__name { font-size: 13px; font-weight: 500; }
.md-file__meta { font-size: 12px; color: var(--rc-text-muted); }

.md-btn {
  height: 28px;
  padding: 0 12px;
  border-radius: var(--rc-r-6);
  font-size: 12px;
  font-weight: 600;
}
.md-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.md-btn--solid { background: var(--rc-text); color: var(--rc-text-inverse); }
.md-btn--warn { background: var(--rc-warning-700); color: #fff; }
.md-btn--ghost {
  background: var(--rc-surface);
  border: 1px solid var(--rc-border);
  color: var(--rc-text-soft);
  font-weight: 500;
}
.md-btn--ghost:hover { background: var(--rc-surface-hover); }

@media (max-width: 900px) {
  .md-layout { grid-template-columns: 1fr; }
  .md-rail { position: static; }
  .md-nav { flex-direction: row; flex-wrap: wrap; }
  .md-nav__item { width: auto; }
}
</style>
