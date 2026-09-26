import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/config/supabase'
import type { ContentFilter } from '@/types/models'
import { useAuthStore } from './auth'

export type ContentFilterInput = Pick<
  ContentFilter,
  'keyword' | 'scope_type' | 'scope_id' | 'action'
> & { star_tag_id?: string | null }

export const useFilterStore = defineStore('filters', () => {
  const filters = ref<ContentFilter[]>([])

  const enabledFilters = computed(() => filters.value.filter((f) => f.enabled))
  const hideRules = computed(() => enabledFilters.value.filter((f) => f.action === 'hide'))
  const markReadRules = computed(() => enabledFilters.value.filter((f) => f.action === 'mark_read'))
  const autoStarRules = computed(() => enabledFilters.value.filter((f) => f.action === 'auto_star'))

  async function fetchFilters(): Promise<void> {
    const { data, error } = await supabase
      .from('content_filters')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    filters.value = (data ?? []) as ContentFilter[]
  }

  async function createFilter(input: ContentFilterInput): Promise<ContentFilter> {
    const { data, error } = await supabase
      .from('content_filters')
      .insert({
        user_id: useAuthStore().user!.id,
        keyword: input.keyword.trim(),
        scope_type: input.scope_type,
        scope_id: input.scope_id,
        action: input.action,
        star_tag_id: input.star_tag_id ?? null,
      })
      .select()
      .single()
    if (error) throw error

    const filter = data as ContentFilter
    filters.value.unshift(filter)
    return filter
  }

  async function updateFilter(
    id: string,
    updates: Partial<ContentFilterInput & Pick<ContentFilter, 'enabled'>>,
  ): Promise<void> {
    const { error } = await supabase.from('content_filters').update(updates).eq('id', id)
    if (error) throw error
    const filter = filters.value.find((f) => f.id === id)
    if (filter) Object.assign(filter, updates)
  }

  async function deleteFilter(id: string): Promise<void> {
    const { error } = await supabase.from('content_filters').delete().eq('id', id)
    if (error) throw error
    filters.value = filters.value.filter((f) => f.id !== id)
  }

  async function toggleFilter(id: string): Promise<void> {
    const filter = filters.value.find((f) => f.id === id)
    if (filter) await updateFilter(id, { enabled: !filter.enabled })
  }

  function reset(): void {
    filters.value = []
  }

  return {
    filters,
    enabledFilters,
    hideRules,
    markReadRules,
    autoStarRules,
    fetchFilters,
    createFilter,
    updateFilter,
    deleteFilter,
    toggleFilter,
    reset,
  }
})
