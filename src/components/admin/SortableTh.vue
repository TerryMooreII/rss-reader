<script setup lang="ts">
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'

defineProps<{ column: string; activeColumn: string; ascending: boolean }>()
const emit = defineEmits<{ sort: [column: string] }>()
</script>

<template>
  <th class="pb-2 font-medium cursor-pointer select-none" @click="emit('sort', column)">
    <span class="inline-flex items-center gap-1">
      <slot />
      <ChevronUpIcon v-if="activeColumn === column && ascending" class="h-3 w-3" />
      <ChevronDownIcon v-else-if="activeColumn === column && !ascending" class="h-3 w-3" />
    </span>
  </th>
</template>
