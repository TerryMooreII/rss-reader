<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { RssIcon } from '@heroicons/vue/24/solid'
</script>

<template>
  <div class="min-h-screen bg-bg-primary">
    <!-- Header -->
    <header class="border-b">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <RouterLink to="/" class="flex items-center gap-2">
          <RssIcon class="h-7 w-7 text-accent" />
          <span class="text-xl font-bold text-text-primary">Acta</span>
        </RouterLink>
        <nav class="flex items-center gap-4">
          <RouterLink to="/login" class="btn-ghost text-sm">Sign in</RouterLink>
          <RouterLink to="/register" class="btn-primary text-sm">Get Started</RouterLink>
        </nav>
      </div>
    </header>

    <!-- Content -->
    <main>
      <RouterView />
    </main>

    <!-- Footer -->
    <footer class="border-t py-8">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 text-center text-sm text-text-muted">
        <p>&copy; 2026 Acta. A modern RSS reader for the curious mind.</p>
      </div>
    </footer>
  </div>
</template>
