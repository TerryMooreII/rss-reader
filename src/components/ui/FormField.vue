<script setup lang="ts">
withDefaults(defineProps<{ label: string; required?: boolean; hint?: string }>(), {
  required: false,
  hint: undefined,
})
</script>

<template>
  <div>
    <label class="field-label">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>
    <slot />
    <p v-if="hint" class="mt-1 text-xs text-text-muted">{{ hint }}</p>
  </div>
</template>
