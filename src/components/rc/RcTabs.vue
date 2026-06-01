<script setup lang="ts">
const model = defineModel<string>({ required: true })

defineProps<{
  tabs: { id: string; label: string; count?: number }[]
}>()
</script>

<template>
  <div class="rc-tabs" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      role="tab"
      class="rc-tab"
      :class="{ 'rc-tab--active': model === tab.id }"
      :aria-selected="model === tab.id"
      @click="model = tab.id"
    >
      {{ tab.label }}
      <span v-if="tab.count != null" class="rc-badge">{{ tab.count }}</span>
    </button>
  </div>
</template>
