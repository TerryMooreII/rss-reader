<script setup lang="ts" generic="T extends string">
defineProps<{ tabs: { id: T; label: string }[]; modelValue: T }>()
const emit = defineEmits<{ 'update:modelValue': [id: T] }>()
</script>

<template>
  <div class="mb-6 flex flex-wrap gap-1 border-b" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      role="tab"
      :class="modelValue === tab.id ? 'tab-active' : 'tab'"
      :aria-selected="modelValue === tab.id"
      @click="emit('update:modelValue', tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
