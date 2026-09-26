<script setup lang="ts">
withDefaults(
  defineProps<{ title?: string; subtitle?: string; width?: string; padding?: string }>(),
  { title: undefined, subtitle: undefined, width: 'max-w-5xl', padding: 'py-20' },
)
</script>

<template>
  <section class="border-t" :class="padding">
    <div class="mx-auto px-4" :class="width">
      <div v-if="title" class="text-center">
        <h2 class="text-3xl font-bold text-text-primary sm:text-4xl">{{ title }}</h2>
        <p v-if="subtitle" class="mx-auto mt-4 max-w-2xl text-text-secondary">{{ subtitle }}</p>
      </div>
      <slot />
    </div>
  </section>
</template>
