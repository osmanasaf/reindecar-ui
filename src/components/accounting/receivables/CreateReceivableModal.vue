<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { CreateReceivableRequest } from '@/types'
import { ReceivableType } from '@/types'
import { useEnumTranslations } from '@/composables'
import { SearchableSelect } from '@/components/common'
import DatePicker from '@/components/base/DatePicker.vue'
import { RcModal, RcButton, RcField, RcInput } from '@/components/rc'
import { customersApi } from '@/api'
import type { Customer } from '@/types'

const props = defineProps<{ open: boolean }>()

const emit = defineEmits<{
  close: []
  submit: [data: CreateReceivableRequest]
}>()

const { receivableTypes } = useEnumTranslations()

const form = ref<CreateReceivableRequest>({
  type: ReceivableType.OTHER,
  customerId: 0,
  description: '',
  amount: 0,
  dueDate: undefined,
})

const customers = ref<Customer[]>([])
const loadingCustomers = ref(false)
const submitting = ref(false)

const typeOptions = computed(() =>
  Object.values(ReceivableType).map(t => ({
    value: t,
    label: receivableTypes[t] ?? t,
  }))
)

const customerOptions = computed(() =>
  customers.value.map(c => ({
    value: c.id as number,
    label: c.displayName || `Müşteri #${c.id}`,
  }))
)

const selectedCustomerId = computed({
  get: () => (form.value.customerId > 0 ? form.value.customerId : null),
  set: (v: number | null) => { form.value.customerId = v ?? 0 },
})

onMounted(loadCustomers)

async function loadCustomers() {
  loadingCustomers.value = true
  try {
    const res = await customersApi.getAll({ page: 0, size: 500, sort: 'createdAt', direction: 'desc' })
    customers.value = res.content
  } catch {
    customers.value = []
  } finally {
    loadingCustomers.value = false
  }
}

function resetForm() {
  form.value = {
    type: ReceivableType.OTHER,
    customerId: 0,
    description: '',
    amount: 0,
    dueDate: undefined,
  }
}

function handleClose() {
  resetForm()
  emit('close')
}

function handleSubmit() {
  if (!form.value.customerId) return
  if (!form.value.description?.trim()) return
  if (!form.value.amount || form.value.amount <= 0) return
  submitting.value = true
  emit('submit', { ...form.value })
  submitting.value = false
  resetForm()
}
</script>

<template>
  <RcModal :open="open" title="Yeni Alacak" wide @close="handleClose">
    <div style="display: flex; flex-direction: column; gap: 14px">
      <RcField label="Tip" required>
        <SearchableSelect
          v-model="form.type"
          :options="typeOptions"
          placeholder="Tip seçin"
          search-placeholder="Ara..."
        />
      </RcField>

      <RcField label="Müşteri" required>
        <SearchableSelect
          v-model="selectedCustomerId"
          :options="customerOptions"
          placeholder="Müşteri seçin"
          search-placeholder="Müşteri ara..."
          :loading="loadingCustomers"
        />
      </RcField>

      <RcField label="Açıklama" required>
        <RcInput v-model="form.description" placeholder="Alacak açıklaması" />
      </RcField>

      <RcField label="Tutar (TL)" required>
        <RcInput v-model.number="form.amount" type="number" placeholder="0.00" />
      </RcField>

      <DatePicker
        v-model="form.dueDate"
        label="Vade Tarihi"
        placeholder="Vade tarihi"
      />
    </div>

    <template #footer>
      <RcButton variant="secondary" @click="handleClose">İptal</RcButton>
      <RcButton variant="accent" :disabled="submitting" @click="handleSubmit">
        Oluştur
      </RcButton>
    </template>
  </RcModal>
</template>
