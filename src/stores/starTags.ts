import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/config/supabase'
import type { StarTag } from '@/types/models'
import { useAuthStore } from './auth'

export const useStarTagStore = defineStore('starTags', () => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const tags = ref<StarTag[]>([])
  const loading = ref(false)
  const expandedStarred = ref(
    localStorage.getItem('acta_expanded_starred') !== 'collapsed',
  )

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  const sortedTags = computed(() => {
    return [...tags.value].sort((a, b) => a.position - b.position)
  })

  const tagById = computed(() => {
    return (id: string): StarTag | undefined => tags.value.find((t) => t.id === id)
  })

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function fetchTags(): Promise<void> {
    loading.value = true

    try {
      const { data: tagRows, error: tagError } = await supabase
        .from('star_tags')
        .select('*')
        .order('position', { ascending: true })

      if (tagError) throw tagError

      // Fetch unread counts via RPC
      const authStore = useAuthStore()
      const { data: unreadData, error: unreadError } = await supabase.rpc(
        'get_star_tag_unread_counts',
        { p_user_id: authStore.user!.id },
      )

      const unreadMap = new Map<string, number>()
      if (!unreadError && unreadData) {
        for (const row of unreadData as { star_tag_id: string; unread_count: number }[]) {
          unreadMap.set(row.star_tag_id, row.unread_count)
        }
      }

      tags.value = ((tagRows ?? []) as StarTag[]).map((t) => ({
        ...t,
        unread_count: unreadMap.get(t.id) ?? 0,
      }))
    } catch (err: unknown) {
      console.error('Failed to fetch star tags:', err)
    } finally {
      loading.value = false
    }
  }

  async function createTag(name: string): Promise<StarTag | null> {
    try {
      const authStore = useAuthStore()
      const position = tags.value.length
      const { data, error: insertError } = await supabase
        .from('star_tags')
        .insert({ user_id: authStore.user!.id, name, position })
        .select()
        .single()

      if (insertError) throw insertError

      const newTag = { ...(data as StarTag), unread_count: 0 }
      tags.value.push(newTag)
      return newTag
    } catch (err: unknown) {
      console.error('Failed to create star tag:', err)
      return null
    }
  }

  async function renameTag(id: string, name: string): Promise<void> {
    try {
      const { error: updateError } = await supabase
        .from('star_tags')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (updateError) throw updateError

      const tag = tags.value.find((t) => t.id === id)
      if (tag) tag.name = name
    } catch (err: unknown) {
      console.error('Failed to rename star tag:', err)
    }
  }

  async function deleteTag(id: string): Promise<void> {
    try {
      const { error: deleteError } = await supabase
        .from('star_tags')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      tags.value = tags.value.filter((t) => t.id !== id)
    } catch (err: unknown) {
      console.error('Failed to delete star tag:', err)
    }
  }

  function toggleStarred(): void {
    expandedStarred.value = !expandedStarred.value
    localStorage.setItem(
      'acta_expanded_starred',
      expandedStarred.value ? 'open' : 'collapsed',
    )
  }

  function updateUnreadCount(tagId: string, delta: number): void {
    const tag = tags.value.find((t) => t.id === tagId)
    if (tag) {
      tag.unread_count = Math.max(0, (tag.unread_count ?? 0) + delta)
    }
  }

  return {
    // State
    tags,
    loading,
    expandedStarred,
    // Getters
    sortedTags,
    tagById,
    // Actions
    fetchTags,
    createTag,
    renameTag,
    deleteTag,
    toggleStarred,
    updateUnreadCount,
  }
})
