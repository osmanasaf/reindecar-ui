<script setup lang="ts">
import { ref } from 'vue'
import { RcIcon } from '@/components/icons'
import {
  RcAvatar,
  RcBadge,
  RcButton,
  RcEmpty,
  RcField,
  RcInput,
  RcKbd,
  RcMark,
  RcModal,
  RcPageHeader,
  RcStatusPill,
  RcTabs,
} from '@/components/rc'
import { fmtNum, fmtTRY } from '@/utils/format'

const activeTab = ref('overview')
const modalOpen = ref(false)
const inputValue = ref('34 ABC 123')

const tabs = [
  { id: 'overview', label: 'Genel' },
  { id: 'details', label: 'Detay', count: 3 },
]
</script>

<template>
  <div class="rc-page">
    <RcPageHeader title="Design System v2" subtitle="Modül 01 — Foundation primitives">
      <template #actions>
        <RcButton variant="secondary">
          <RcIcon name="download" /> Dışa aktar
        </RcButton>
        <RcButton variant="primary" @click="modalOpen = true">
          <RcIcon name="plus" /> Modal aç
        </RcButton>
      </template>
    </RcPageHeader>

    <section class="dev-section">
      <h2>Marka</h2>
      <RcMark suffix="v2" />
    </section>

    <section class="dev-section">
      <h2>Butonlar</h2>
      <div class="dev-row">
        <RcButton>Default</RcButton>
        <RcButton variant="primary">Primary</RcButton>
        <RcButton variant="accent">Accent</RcButton>
        <RcButton variant="secondary">Secondary</RcButton>
        <RcButton variant="ghost">Ghost</RcButton>
        <RcButton variant="danger">Danger</RcButton>
        <RcButton variant="secondary" size="sm">Küçük</RcButton>
        <RcButton variant="primary">
          Yeni Kiralama <RcKbd>N</RcKbd>
        </RcButton>
        <RcButton variant="ghost" icon aria-label="Bildirimler">
          <RcIcon name="bell" />
        </RcButton>
      </div>
    </section>

    <section class="dev-section">
      <h2>Badge & durum</h2>
      <div class="dev-row">
        <RcBadge>Default</RcBadge>
        <RcBadge variant="success" dot>Başarılı</RcBadge>
        <RcBadge variant="warning">Uyarı</RcBadge>
        <RcBadge variant="danger">Tehlike</RcBadge>
        <RcBadge variant="accent">Accent</RcBadge>
        <RcStatusPill status="ACTIVE" />
        <RcStatusPill status="AVAILABLE" />
        <RcStatusPill status="available" />
        <RcStatusPill status="OVERDUE" />
        <RcStatusPill status="MAINTENANCE" />
        <RcStatusPill status="INACTIVE" />
        <RcStatusPill status="SOLD" />
      </div>
    </section>

    <section class="dev-section">
      <h2>Form</h2>
      <div class="dev-form-grid">
        <RcField label="Plaka" hint="Örn: 34 ABC 123">
          <RcInput v-model="inputValue" placeholder="Plaka girin" class="rc-mono" />
        </RcField>
        <RcField label="Arama">
          <div class="rc-input-group">
            <RcIcon name="search" />
            <input placeholder="Plaka, müşteri…" />
          </div>
        </RcField>
      </div>
    </section>

    <section class="dev-section">
      <h2>Avatar & format</h2>
      <div class="dev-row">
        <RcAvatar>AK</RcAvatar>
        <RcAvatar size="lg">RC</RcAvatar>
        <span class="rc-num">{{ fmtTRY(125000) }}</span>
        <span class="rc-num">{{ fmtNum(190612) }} km</span>
      </div>
    </section>

    <section class="dev-section">
      <h2>Tabs</h2>
      <RcTabs v-model="activeTab" :tabs="tabs" />
      <p class="dev-muted">Aktif sekme: {{ activeTab }}</p>
    </section>

    <section class="dev-section">
      <h2>Tablo</h2>
      <div class="rc-card">
        <table class="rc-table">
          <thead>
            <tr>
              <th>Plaka</th>
              <th>Model</th>
              <th>Durum</th>
              <th class="rc-right">Günlük</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="rc-mono">34 ABC 123</td>
              <td>BMW 320i</td>
              <td><RcStatusPill status="rented" /></td>
              <td class="rc-right rc-num">{{ fmtTRY(2800) }}</td>
            </tr>
            <tr>
              <td class="rc-mono">06 XYZ 456</td>
              <td>Mercedes C200</td>
              <td><RcStatusPill status="available" /></td>
              <td class="rc-right rc-num">{{ fmtTRY(3200) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="dev-section">
      <h2>Boş durum</h2>
      <div class="rc-card">
        <RcEmpty title="Kayıt bulunamadı" description="Filtreleri değiştirmeyi deneyin.">
          <template #icon>
            <RcIcon name="inbox" :size="40" />
          </template>
          <template #action>
            <RcButton variant="secondary">Filtreleri sıfırla</RcButton>
          </template>
        </RcEmpty>
      </div>
    </section>

    <section class="dev-section">
      <h2>İkon seti</h2>
      <div class="dev-icon-grid">
        <span v-for="name in (['search','plus','car','key','users','chart','receipt','card','settings','bell'] as const)" :key="name" class="dev-icon-cell">
          <RcIcon :name="name" />
          <small>{{ name }}</small>
        </span>
      </div>
    </section>

    <RcModal
      :open="modalOpen"
      title="Örnek modal"
      subtitle="RcModal · Escape veya dış tıklama ile kapanır"
      wide
      @close="modalOpen = false"
    >
      <p>Modal içeriği burada. Kiralama, hasar ve ödeme formları bu yapıyı kullanacak.</p>
      <template #footer>
        <span class="rc-spacer" />
        <RcButton variant="ghost" @click="modalOpen = false">İptal</RcButton>
        <RcButton variant="primary" @click="modalOpen = false">Kaydet</RcButton>
      </template>
    </RcModal>
  </div>
</template>

<style scoped>
.dev-section {
  margin-bottom: 32px;
}
.dev-section h2 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--rc-text-soft);
  letter-spacing: -0.01em;
}
.dev-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.dev-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  max-width: 520px;
}
.dev-muted {
  margin-top: 8px;
  font-size: 12px;
  color: var(--rc-text-muted);
}
.dev-icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 8px;
}
.dev-icon-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-r-8);
  font-size: 10px;
  color: var(--rc-text-muted);
}
</style>
