<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-bg-primary px-4">
    <div class="text-center">
      <p class="text-6xl font-bold text-accent mb-4">404</p>
      <h1 class="text-2xl font-bold text-text-primary mb-2">Page not found</h1>
      <p class="text-text-secondary mb-6">The page you're looking for doesn't exist.</p>
      <RouterLink to="/" class="btn-primary">Go home</RouterLink>
    </div>
  </div>
</template>
