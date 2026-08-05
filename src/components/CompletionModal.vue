<template>
  <RcModal :open="show" wide @close="$emit('close')">
    <template #header>
      <div>
        <h2 class="rc-modal__title">
          <RcIcon name="checkCircle" :size="20" class="rc-modal__title-icon" />
          {{ title }}
        </h2>
        <div class="rc-modal__sub">
          {{ type === 'damage' ? 'Onarım' : 'Bakım' }} maliyetini ve servis bilgisini kaydet
        </div>
      </div>
    </template>

    <section class="rcm-completion__section">
      <h3 class="rcm-completion__section-title">Maliyet bilgileri</h3>

      <div class="rc-modal-form">
        <RcField
          v-if="estimatedCost"
          class="rc-modal-form__full"
          label="Tahmini maliyet (başlangıç)"
          :hint="`${type === 'damage' ? 'Hasar' : 'Bakım'} oluşturulurken girilen tahmini tutar`"
        >
          <input class="rc-input" type="text" :value="formatCurrency(estimatedCost)" disabled />
        </RcField>

        <RcField
          class="rc-modal-form__full"
          label="Gerçek maliyet"
          required
          :error="errors.costAmount"
        >
          <input
            v-model.number="form.costAmount"
            class="rc-input"
            type="number"
            step="0.01"
            min="0"
            placeholder="Gerçek maliyeti giriniz"
          />
        </RcField>

        <RcField label="Para birimi">
          <SearchableSelect
            v-model="form.costCurrency"
            :options="currencyOptions"
            placeholder="Para birimi seçin"
            search-placeholder="Ara…"
          />
        </RcField>

        <DatePicker
          v-model="form.completionDate"
          label="Tamamlanma tarihi *"
          placeholder="Tamamlanma tarihi"
          :max="today"
        />
      </div>
    </section>

    <section class="rcm-completion__section">
      <h3 class="rcm-completion__section-title">
        Servis sağlayıcı
        <span class="rcm-completion__section-tag">
          {{ type === 'maintenance' ? 'Zorunlu' : 'Opsiyonel' }}
        </span>
      </h3>
      <p class="rcm-completion__section-desc">
        {{ type === 'damage' ? 'Onarımı yapan servisi seçerseniz' : 'Bakımı yapan servisi seçin,' }}
        otomatik olarak <strong>borç kaydı</strong> oluşturulur.
      </p>

      <div class="rc-modal-form">
        <RcField
          class="rc-modal-form__full"
          label="Servis sağlayıcı"
          :required="type === 'maintenance'"
          :error="errors.serviceProviderId"
        >
          <SearchableSelect
            v-model="form.serviceProviderId"
            :options="serviceProviderOptions"
            placeholder="Seçilmedi"
            search-placeholder="Sağlayıcı ara…"
            clearable
            :error="!!errors.serviceProviderId"
          />
        </RcField>

        <div class="rc-modal-form__full rcm-completion__provider-actions">
          <RcButton variant="secondary" size="sm" @click="openServiceProviders">
            <RcIcon name="plus" :size="14" />
            Servis sağlayıcı ekle / yönet
          </RcButton>
          <span class="rcm-completion__hint">Yeni sekmede açılır.</span>
        </div>

        <template v-if="form.serviceProviderId">
          <RcField class="rc-modal-form__full" label="Fatura no" hint="Opsiyonel">
            <input
              v-model="form.invoiceNumber"
              class="rc-input"
              type="text"
              placeholder="Fatura numarası"
            />
          </RcField>

          <DatePicker
            v-model="form.invoiceDate"
            label="Fatura tarihi"
            placeholder="Fatura tarihi"
          />

          <DatePicker
            v-model="form.paymentDueDate"
            label="Ödeme vadesi"
            placeholder="Ödeme vadesi"
          />
        </template>
      </div>
    </section>

    <section v-if="type === 'damage' && hasRental" class="rcm-completion__section">
      <h3 class="rcm-completion__section-title">Müşteri faturalandırma</h3>
      <label class="rc-modal-check">
        <input v-model="form.chargeCustomer" type="checkbox" />
        Müşteriye fatura kes
      </label>
      <p class="rcm-completion__section-desc">
        Müşteriye otomatik <strong>alacak kaydı</strong> oluşturulur.
      </p>
    </section>

    <section class="rcm-completion__summary">
      <h3 class="rcm-completion__section-title">Özet</h3>
      <div class="rc-modal-summary">
        <span>{{ type === 'damage' ? 'Onarım' : 'Bakım' }} maliyeti</span>
        <span class="rc-modal-summary__value rc-num">
          {{ formatCurrency(form.costAmount || 0) }}
        </span>
      </div>
      <div v-if="form.serviceProviderId" class="rc-modal-summary">
        <span>
          <RcIcon name="arrowUpRight" :size="13" class="rcm-completion__summary-icon" />
          Borç kaydı
        </span>
        <span class="rc-modal-summary__value">{{ selectedProviderName }}</span>
      </div>
      <div v-if="type === 'damage' && form.chargeCustomer" class="rc-modal-summary">
        <span>
          <RcIcon name="arrowRight" :size="13" class="rcm-completion__summary-icon" />
          Alacak kaydı
        </span>
        <span class="rc-modal-summary__value">Müşteri</span>
      </div>
    </section>

    <template #footer>
      <RcButton variant="ghost" @click="$emit('close')">Vazgeç</RcButton>
      <RcButton
        variant="accent"
        :disabled="!isFormValid"
        :loading="processing"
        @click="handleSubmit"
      >
        <RcIcon name="check" :size="14" />
        Tamamla
      </RcButton>
    </template>
  </RcModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'
import { RcModal, RcButton, RcField } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { CompleteMaintenanceForm, MarkDamageRepairedForm } from '@/types'

interface Props {
  show: boolean
  type: 'damage' | 'maintenance'
  title: string
  estimatedCost?: number
  hasRental?: boolean
  serviceProviders: Array<{ id: number; name: string }>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  submit: [form: MarkDamageRepairedForm | CompleteMaintenanceForm]
}>()
const router = useRouter()

const processing = ref(false)
const errors = ref<Record<string, string>>({})

const currencyOptions = [
  { value: 'TRY', label: 'TRY (₺)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' }
]

const serviceProviderOptions = computed(() =>
  props.serviceProviders.map(p => ({ value: p.id, label: p.name }))
)

const form = ref({
  completionDate: new Date().toISOString().split('T')[0] ?? '',
  costAmount: 0,
  costCurrency: 'TRY',
  serviceProviderId: null as number | null,
  invoiceNumber: '',
  invoiceDate: '',
  paymentDueDate: '',
  chargeCustomer: true
})

const today = computed(() => new Date().toISOString().split('T')[0] ?? '')

const isFormValid = computed(() => {
  if (!form.value.costAmount || form.value.costAmount <= 0) return false
  if (!form.value.completionDate) return false
  if (props.type === 'maintenance' && !form.value.serviceProviderId) return false
  return true
})

const selectedProviderName = computed(() => {
  const provider = props.serviceProviders.find(p => p.id === form.value.serviceProviderId)
  return provider?.name || ''
})

watch(() => props.show, (show) => {
  if (show) {
    // Reset form
    form.value.completionDate = new Date().toISOString().split('T')[0] ?? ''
    form.value.costAmount = props.estimatedCost || 0
    form.value.costCurrency = 'TRY'
    form.value.serviceProviderId = null
    form.value.invoiceNumber = ''
    form.value.invoiceDate = ''
    form.value.chargeCustomer = true
    
    // Set default due date (30 days from now)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)
    form.value.paymentDueDate = dueDate.toISOString().split('T')[0] ?? ''
    
    errors.value = {}
  }
})

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: form.value.costCurrency || 'TRY'
  }).format(amount)
}

function validate(): boolean {
  errors.value = {}
  
  if (!form.value.costAmount || form.value.costAmount <= 0) {
    errors.value.costAmount = 'Maliyet girilmelidir'
  }
  
  if (props.type === 'maintenance' && !form.value.serviceProviderId) {
    errors.value.serviceProviderId = 'Servis sağlayıcı seçilmelidir'
  }
  
  return Object.keys(errors.value).length === 0
}

function handleSubmit() {
  if (!validate()) return
  
  if (props.type === 'damage') {
    const damageForm: MarkDamageRepairedForm = {
      repairedDate: form.value.completionDate,
      repairCostAmount: form.value.costAmount,
      repairCostCurrency: form.value.costCurrency || undefined,
      serviceProviderId: form.value.serviceProviderId || undefined,
      invoiceNumber: form.value.invoiceNumber || undefined,
      invoiceDate: form.value.invoiceDate || undefined,
      paymentDueDate: form.value.paymentDueDate || undefined,
      chargeCustomer: form.value.chargeCustomer
    }
    emit('submit', damageForm)
  } else {
    const maintenanceForm: CompleteMaintenanceForm = {
      completionDate: form.value.completionDate,
      costAmount: form.value.costAmount,
      costCurrency: form.value.costCurrency || undefined,
      serviceProviderId: form.value.serviceProviderId!,
      invoiceNumber: form.value.invoiceNumber || undefined,
      invoiceDate: form.value.invoiceDate || undefined,
      paymentDueDate: form.value.paymentDueDate || undefined
    }
    emit('submit', maintenanceForm)
  }
}

function openServiceProviders() {
  const route = router.resolve({
    name: 'service-providers',
    query: { create: '1' }
  })
  const popup = window.open(route.href, '_blank', 'noopener')
  if (!popup) {
    emit('close')
    router.push({ name: 'service-providers', query: { create: '1' } })
  }
}
</script>

<style scoped>
.rcm-completion__section {
  padding-bottom: 18px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--rc-border-subtle);
}

.rcm-completion__section:last-of-type {
  border-bottom: none;
}

.rcm-completion__section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 4px;
  font-size: var(--rc-fs-14);
  font-weight: var(--rc-fw-semibold);
}

.rcm-completion__section-tag {
  padding: 2px 6px;
  border-radius: var(--rc-r-4);
  background: var(--rc-surface-2);
  color: var(--rc-text-muted);
  font-size: var(--rc-fs-11);
  font-weight: var(--rc-fw-medium);
  text-transform: uppercase;
  letter-spacing: var(--rc-tracking-wide);
}

.rcm-completion__section-desc {
  margin: 0 0 12px;
  font-size: var(--rc-fs-13);
  color: var(--rc-text-muted);
}

.rcm-completion__hint {
  font-size: var(--rc-fs-12);
  color: var(--rc-text-faint);
}

.rcm-completion__provider-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.rcm-completion__summary {
  padding: 14px;
  background: var(--rc-surface-2);
  border-radius: var(--rc-r-8);
}

.rcm-completion__summary .rc-modal-summary {
  background: transparent;
  padding: 6px 0;
}

.rcm-completion__summary-icon {
  vertical-align: -2px;
  margin-right: 4px;
  color: var(--rc-text-muted);
}
</style>
