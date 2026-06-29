<script setup lang="ts">
import { useFeatures } from '@/composables'
import type { FeatureKey } from '@/types/feature'

const props = defineProps<{
    feature: FeatureKey
}>()

const { isEnabled } = useFeatures()
</script>

<template>
  <slot v-if="isEnabled(feature)" />
</template>
