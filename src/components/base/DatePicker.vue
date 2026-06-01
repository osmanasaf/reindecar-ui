<script setup lang="ts">

import { computed } from 'vue'

import { VueDatePicker } from '@vuepic/vue-datepicker'

import { tr } from 'date-fns/locale'



interface Props {

  modelValue: string | undefined

  min?: string

  max?: string

  placeholder?: string

  label?: string

  disabled?: boolean

}



const props = withDefaults(defineProps<Props>(), {

  placeholder: 'Tarih seçin',

  disabled: false

})



const emit = defineEmits<{

  'update:modelValue': [value: string]

  closed: []

}>()



const internalValue = computed({

  get: () => (props.modelValue && props.modelValue.length >= 10 ? new Date(props.modelValue + 'T00:00:00') : null),

  set: (v: Date | null) => {

    if (!v) {

      emit('update:modelValue', '')

      return

    }

    const y = v.getFullYear()

    const m = String(v.getMonth() + 1).padStart(2, '0')

    const d = String(v.getDate()).padStart(2, '0')

    emit('update:modelValue', `${y}-${m}-${d}`)

  }

})



const minDate = computed(() =>

  props.min ? new Date(props.min + 'T00:00:00') : undefined

)

const maxDate = computed(() =>

  props.max ? new Date(props.max + 'T00:00:00') : undefined

)



function onUpdateModelValue(value: Date | null) {

  if (!value) {

    emit('update:modelValue', '')

    return

  }

  const y = value.getFullYear()

  const m = String(value.getMonth() + 1).padStart(2, '0')

  const d = String(value.getDate()).padStart(2, '0')

  emit('update:modelValue', `${y}-${m}-${d}`)

}

</script>



<template>

  <div class="rc-datepicker-wrap notranslate" translate="no">

    <label v-if="label" class="rc-datepicker-label">{{ label }}</label>

    <VueDatePicker

      :model-value="internalValue"

      :min-date="minDate"

      :max-date="maxDate"

      :placeholder="placeholder"

      :disabled="disabled"

      :locale="tr"

      format="dd.MM.yyyy"

      :formats="{ input: 'dd.MM.yyyy', preview: 'dd.MM.yyyy' }"

      :enable-time-picker="false"

      auto-apply

      :teleport="false"

      class="rc-datepicker-input rc-datepicker-date-only"

      @update:model-value="onUpdateModelValue"

      @closed="emit('closed')"

    />

  </div>

</template>


