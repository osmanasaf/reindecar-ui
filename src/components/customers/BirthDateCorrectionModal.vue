<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { customersApi } from '@/api'
import { useToast, useValidation, rules } from '@/composables'
import DatePicker from '@/components/base/DatePicker.vue'
import { RcModal, RcButton, RcField } from '@/components/rc'
import { RcIcon } from '@/components/icons'
import type { Customer } from '@/types'

const props = defineProps<{
  open: boolean
  customer: Customer | null
}>()

const emit = defineEmits<{
  close: []
  updated: [customer: Customer]
}>()

const toast = useToast()
const submitting = ref(false)
const birthDate = ref('')

const displayName = computed(() => props.customer?.displayName ?? '')

const formRules = computed(() => ({
  birthDate: {
    value: birthDate.value,
    rules: [
      rules.required('Doğum tarihi seçiniz'),
      rules.minAge(18, 'Müşteri en az 18 yaşında olmalıdır'),
    ],
  },
}))

const { validateForm, getError, hasError, touch } = useValidation(() => formRules.value)

function resolveBirthDateYmd(customer: Customer | null): string {
  if (!customer) return ''
  const raw = customer.personalInfo?.birthDate ?? customer.birthDate
  if (!raw) return ''
  return raw.split('T')[0] ?? ''
}

watch(
  () => [props.open, props.customer?.id] as const,
  ([isOpen]) => {
    if (!isOpen) return
    birthDate.value = resolveBirthDateYmd(props.customer)
  },
  { immediate: true },
)

async function save() {
  if (!props.customer || !validateForm(formRules.value)) return

  submitting.value = true
  try {
    const updated = await customersApi.patchBirthDate(props.customer.id, {
      birthDate: birthDate.value,
    })
    toast.success('Doğum tarihi güncellendi')
    emit('updated', updated)
    emit('close')
  } catch (err) {
    toast.apiError(err, 'Doğum tarihi güncellenemedi')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <RcModal :open="open && !!customer" @close="emit('close')">
    <template #header>
      <div>
        <h2 class="rc-modal__title">
          <RcIcon name="calendar" :size="20" style="vertical-align: -3px; margin-right: 8px" />
          Doğum tarihini düzelt
        </h2>
        <div v-if="customer" class="rc-modal__sub">{{ displayName }}</div>
      </div>
    </template>

    <div class="rc-alert rc-alert--info" style="margin-bottom: 16px">
      <RcIcon name="info" :size="16" />
      <span>
        Bu işlem yalnızca kimlik doğrulama veya veri düzeltme amacıyla kullanılmalıdır.
        Genel müşteri düzenleme ekranından doğum tarihi değiştirilemez.
      </span>
    </div>

    <RcField label="Yeni doğum tarihi" :class="{ 'rc-field--error': hasError('birthDate') }">
      <DatePicker
        v-model="birthDate"
        placeholder="Doğum tarihi"
        @closed="touch('birthDate')"
      />
      <span v-if="hasError('birthDate')" class="rc-field__hint rc-field__hint--error">{{ getError('birthDate') }}</span>
    </RcField>

    <template #footer>
      <span class="rc-spacer" />
      <RcButton variant="ghost" @click="emit('close')">Vazgeç</RcButton>
      <RcButton variant="accent" :disabled="submitting" @click="save">
        <RcIcon name="check" :size="14" />
        Kaydet
      </RcButton>
    </template>
  </RcModal>
</template>
