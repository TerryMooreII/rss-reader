<script setup lang="ts" generic="T extends string | number">
import type { Component } from 'vue'

export interface SegmentOption<V> {
  value: V
  label: string
  icon?: Component
  /** Extra classes when selected (e.g. a star tint). */
  activeClass?: string
}

/**
 * A set of mutually exclusive choices.
 * - `pill`   compact toggle on a grey track (Unread / All)
 * - `joined` bordered buttons sharing edges (filter actions)
 * - `cards`  grid of outlined cards (settings)
 */
const props = withDefaults(
  defineProps<{
    modelValue: T
    options: SegmentOption<T>[]
    variant?: 'pill' | 'joined' | 'cards'
    size?: 'sm' | 'md'
    gridClass?: string
    label?: string
  }>(),
  { variant: 'pill', size: 'sm', gridClass: 'grid-cols-2', label: undefined },
)
const emit = defineEmits<{ 'update:modelValue': [value: T] }>()

function select(value: T) {
  if (value !== props.modelValue) emit('update:modelValue', value)
}
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    :class="{
      'flex rounded-lg bg-bg-secondary': variant === 'pill',
      'p-0.5 text-xs': variant === 'pill' && size === 'sm',
      'p-1 text-sm': variant === 'pill' && size === 'md',
      'flex overflow-hidden rounded-lg border border-border': variant === 'joined',
      ['grid gap-2 ' + gridClass]: variant === 'cards',
    }"
  >
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      class="font-medium transition-colors"
      :class="[
        variant === 'pill' && (size === 'sm' ? 'rounded-md px-2.5 py-1' : 'flex-1 rounded-md px-3 py-1.5'),
        variant === 'pill' && (modelValue === opt.value ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-secondary'),
        variant === 'joined' && (size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'),
        variant === 'joined' && 'border-l border-border first:border-l-0',
        variant === 'joined' &&
          (modelValue === opt.value
            ? opt.activeClass || 'bg-accent/10 text-accent'
            : 'bg-bg-primary text-text-secondary hover:bg-bg-hover'),
        variant === 'cards' && 'rounded-lg border px-3 py-2 text-sm',
        variant === 'cards' &&
          (modelValue === opt.value ? 'border-accent bg-accent/10 text-accent' : 'text-text-secondary hover:bg-bg-hover'),
      ]"
      :aria-pressed="modelValue === opt.value"
      @click="select(opt.value)"
    >
      <component :is="opt.icon" v-if="opt.icon" class="mr-1 inline h-4 w-4" />
      {{ opt.label }}
    </button>
  </div>
</template>
