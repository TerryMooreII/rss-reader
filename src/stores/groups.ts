import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/config/supabase'
import type { Group } from '@/types/models'
import { useAuthStore } from './auth'

export const useGroupStore = defineStore('groups', () => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const groups = ref<Group[]>([])
  const groupFeeds = ref<Map<string, string[]>>(new Map())
  const loading = ref(false)
  const expandedGroups = ref<Set<string>>(
    new Set(JSON.parse(localStorage.getItem('acta_expanded_groups') || '[]')),
  )

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /** Groups sorted by their position field. */
  const sortedGroups = computed(() => {
    return [...groups.value].sort((a, b) => a.position - b.position)
  })

  /** Return a group by its id. */
  const groupById = computed(() => {
    return (id: string): Group | undefined => groups.value.find((g) => g.id === id)
  })

  /** Return the feed ids belonging to a group. */
  const feedsByGroup = computed(() => {
    return (groupId: string): string[] => groupFeeds.value.get(groupId) ?? []
  })

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Fetch all groups (ordered by position), their feed associations, and their
   * unread counts.
   */
  async function fetchGroups(): Promise<void> {
    loading.value = true

    try {
      // 1. Groups ordered by position
      const { data: groupRows, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .order('position', { ascending: true })

      if (groupError) throw groupError

      // 2. Group-feed associations
      const { data: gfRows, error: gfError } = await supabase
        .from('group_feeds')
        .select('group_id, feed_id')

      if (gfError) throw gfError

      const gfMap = new Map<string, string[]>()
      if (gfRows) {
        for (const row of gfRows as { group_id: string; feed_id: string }[]) {
          const existing = gfMap.get(row.group_id) ?? []
          existing.push(row.feed_id)
          gfMap.set(row.group_id, existing)
        }
      }
      groupFeeds.value = gfMap

      // 3. Group unread counts via RPC
      const authStore = useAuthStore()
      const { data: unreadData, error: unreadError } = await supabase.rpc(
        'get_group_unread_counts',
        { p_user_id: authStore.user!.id },
      )

      const unreadMap = new Map<string, number>()
      if (!unreadError && unreadData) {
        for (const row of unreadData as { group_id: string; unread_count: number }[]) {
          unreadMap.set(row.group_id, row.unread_count)
        }
      }

      // Assemble groups with unread counts
      groups.value = ((groupRows ?? []) as Group[]).map((g) => ({
        ...g,
        unread_count: unreadMap.get(g.id) ?? 0,
      }))
    } catch (err: unknown) {
      console.error('Failed to fetch groups:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new group.
   */
  async function createGroup(name: string): Promise<Group | null> {
    try {
      const position = groups.value.length
      const { data, error: insertError } = await supabase
        .from('groups')
        .insert({ name, position })
        .select()
        .single()

      if (insertError) throw insertError

      const newGroup = data as Group
      groups.value.push(newGroup)
      return newGroup
    } catch (err: unknown) {
      console.error('Failed to create group:', err)
      return null
    }
  }

  /**
   * Rename an existing group.
   */
  async function renameGroup(id: string, name: string): Promise<void> {
    try {
      const { error: updateError } = await supabase
        .from('groups')
        .update({ name })
        .eq('id', id)

      if (updateError) throw updateError

      const group = groups.value.find((g) => g.id === id)
      if (group) {
        group.name = name
      }
    } catch (err: unknown) {
      console.error('Failed to rename group:', err)
    }
  }

  /**
   * Delete a group by id.
   */
  async function deleteGroup(id: string): Promise<void> {
    try {
      const { error: deleteError } = await supabase
        .from('groups')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      groups.value = groups.value.filter((g) => g.id !== id)
      groupFeeds.value.delete(id)
      expandedGroups.value.delete(id)
    } catch (err: unknown) {
      console.error('Failed to delete group:', err)
    }
  }

  /**
   * Reorder groups by updating each group's position to match its index in the
   * provided array of ids.
   */
  async function reorderGroups(orderedIds: string[]): Promise<void> {
    try {
      const updates = orderedIds.map((id, index) =>
        supabase.from('groups').update({ position: index }).eq('id', id),
      )

      await Promise.all(updates)

      // Apply locally
      for (const group of groups.value) {
        const newIndex = orderedIds.indexOf(group.id)
        if (newIndex !== -1) {
          group.position = newIndex
        }
      }
    } catch (err: unknown) {
      console.error('Failed to reorder groups:', err)
    }
  }

  /**
   * Add a feed to a group.
   */
  async function addFeedToGroup(groupId: string, feedId: string): Promise<void> {
    try {
      const { error: insertError } = await supabase
        .from('group_feeds')
        .insert({ group_id: groupId, feed_id: feedId })

      if (insertError) throw insertError

      const existing = groupFeeds.value.get(groupId) ?? []
      existing.push(feedId)
      groupFeeds.value.set(groupId, existing)
    } catch (err: unknown) {
      console.error('Failed to add feed to group:', err)
    }
  }

  /**
   * Remove a feed from a group.
   */
  async function removeFeedFromGroup(groupId: string, feedId: string): Promise<void> {
    try {
      const { error: deleteError } = await supabase
        .from('group_feeds')
        .delete()
        .eq('group_id', groupId)
        .eq('feed_id', feedId)

      if (deleteError) throw deleteError

      const existing = groupFeeds.value.get(groupId) ?? []
      groupFeeds.value.set(
        groupId,
        existing.filter((id) => id !== feedId),
      )
    } catch (err: unknown) {
      console.error('Failed to remove feed from group:', err)
    }
  }

  /**
   * Toggle a group's expanded/collapsed state in the sidebar.
   */
  function toggleGroup(id: string): void {
    if (expandedGroups.value.has(id)) {
      expandedGroups.value.delete(id)
    } else {
      expandedGroups.value.add(id)
    }
    persistExpandedGroups()
  }

  /** Persist expanded groups to localStorage. */
  function persistExpandedGroups(): void {
    localStorage.setItem('acta_expanded_groups', JSON.stringify([...expandedGroups.value]))
  }

  return {
    // State
    groups,
    groupFeeds,
    loading,
    expandedGroups,
    // Getters
    sortedGroups,
    groupById,
    feedsByGroup,
    // Actions
    fetchGroups,
    createGroup,
    renameGroup,
    deleteGroup,
    reorderGroups,
    addFeedToGroup,
    removeFeedFromGroup,
    toggleGroup,
  }
})
