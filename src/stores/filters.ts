import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/config/supabase'
import type { ContentFilter } from '@/types/models'
import { useAuthStore } from './auth'

export const useFilterStore = defineStore('filters', () => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const filters = ref<ContentFilter[]>([])
  const loading = ref(false)

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  const enabledFilters = computed(() => filters.value.filter((f) => f.enabled))

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function fetchFilters(): Promise<void> {
    loading.value = true

    try {
      const { data, error } = await supabase
        .from('content_filters')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      filters.value = (data ?? []) as ContentFilter[]
    } catch (err: unknown) {
      console.error('Failed to fetch filters:', err)
    } finally {
      loading.value = false
    }
  }

  async function createFilter(input: {
    keyword: string
    scope_type: 'global' | 'feed' | 'group'
    scope_id: string | null
    action: 'hide' | 'mark_read' | 'auto_star'
    star_tag_id?: string | null
  }): Promise<ContentFilter | null> {
    try {
      const authStore = useAuthStore()
      const { data, error } = await supabase
        .from('content_filters')
        .insert({
          user_id: authStore.user!.id,
          keyword: input.keyword.trim(),
          scope_type: input.scope_type,
          scope_id: input.scope_id,
          action: input.action,
          star_tag_id: input.star_tag_id ?? null,
        })
        .select()
        .single()

      if (error) throw error

      const newFilter = data as ContentFilter
      filters.value.unshift(newFilter)
      return newFilter
    } catch (err: unknown) {
      console.error('Failed to create filter:', err)
      return null
    }
  }

  async function updateFilter(
    id: string,
    updates: Partial<Pick<ContentFilter, 'keyword' | 'scope_type' | 'scope_id' | 'action' | 'enabled' | 'star_tag_id'>>,
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('content_filters')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      const filter = filters.value.find((f) => f.id === id)
      if (filter) {
        Object.assign(filter, updates)
      }
    } catch (err: unknown) {
      console.error('Failed to update filter:', err)
    }
  }

  async function deleteFilter(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('content_filters')
        .delete()
        .eq('id', id)

      if (error) throw error

      filters.value = filters.value.filter((f) => f.id !== id)
    } catch (err: unknown) {
      console.error('Failed to delete filter:', err)
    }
  }

  async function toggleFilter(id: string): Promise<void> {
    const filter = filters.value.find((f) => f.id === id)
    if (!filter) return
    await updateFilter(id, { enabled: !filter.enabled })
  }

  return {
    // State
    filters,
    loading,
    // Getters
    enabledFilters,
    // Actions
    fetchFilters,
    createFilter,
    updateFilter,
    deleteFilter,
    toggleFilter,
  }
})
