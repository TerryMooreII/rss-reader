import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/config/supabase'
import type { Group } from '@/types/models'
import { useAuthStore } from './auth'
import { useFeedStore } from './feeds'

const LS_EXPANDED = 'acta:expandedGroups'

function loadExpanded(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(LS_EXPANDED) || '[]'))
  } catch {
    return new Set()
  }
}

export const useGroupStore = defineStore('groups', () => {
  const groups = ref<Group[]>([])
  const groupFeeds = ref<Map<string, string[]>>(new Map())
  const expandedGroups = ref<Set<string>>(loadExpanded())

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  const sortedGroups = computed(() => [...groups.value].sort((a, b) => a.position - b.position))

  const groupMap = computed(() => new Map(groups.value.map((g) => [g.id, g])))

  function groupById(id: string): Group | undefined {
    return groupMap.value.get(id)
  }

  function feedsByGroup(groupId: string): string[] {
    return groupFeeds.value.get(groupId) ?? []
  }

  /** Feed ids per group as Sets, for O(1) membership checks. */
  const groupFeedSets = computed(() => {
    const map = new Map<string, Set<string>>()
    for (const [groupId, feedIds] of groupFeeds.value) map.set(groupId, new Set(feedIds))
    return map
  })

  function isFeedInGroup(groupId: string, feedId: string): boolean {
    return groupFeedSets.value.get(groupId)?.has(feedId) ?? false
  }

  const allGroupedFeedIds = computed(() => {
    const set = new Set<string>()
    for (const feedIds of groupFeeds.value.values()) for (const id of feedIds) set.add(id)
    return set
  })

  /** Unread per group, derived from per-feed counts in the feed store. */
  const unreadByGroup = computed(() => {
    const feedMap = useFeedStore().feedMap
    const map = new Map<string, number>()
    for (const [groupId, feedIds] of groupFeeds.value) {
      let sum = 0
      for (const id of feedIds) sum += feedMap.get(id)?.unread_count ?? 0
      map.set(groupId, sum)
    }
    return map
  })

  function unreadFor(groupId: string): number {
    return unreadByGroup.value.get(groupId) ?? 0
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function fetchGroups(): Promise<void> {
    const [groupsResult, gfResult] = await Promise.all([
      supabase
        .from('groups')
        .select('id, user_id, name, icon, position, created_at, updated_at')
        .order('position', { ascending: true }),
      supabase.from('group_feeds').select('group_id, feed_id'),
    ])
    if (groupsResult.error) throw groupsResult.error
    if (gfResult.error) throw gfResult.error

    const gfMap = new Map<string, string[]>()
    for (const row of (gfResult.data ?? []) as { group_id: string; feed_id: string }[]) {
      const list = gfMap.get(row.group_id)
      if (list) list.push(row.feed_id)
      else gfMap.set(row.group_id, [row.feed_id])
    }
    groupFeeds.value = gfMap
    groups.value = (groupsResult.data ?? []) as Group[]
  }

  async function createGroup(name: string): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .insert({ name, position: groups.value.length, user_id: useAuthStore().user!.id })
      .select()
      .single()
    if (error) throw error

    const newGroup = data as Group
    groups.value.push(newGroup)
    return newGroup
  }

  async function renameGroup(id: string, name: string): Promise<void> {
    const { error } = await supabase.from('groups').update({ name }).eq('id', id)
    if (error) throw error
    const group = groupMap.value.get(id)
    if (group) group.name = name
  }

  async function deleteGroup(id: string): Promise<void> {
    const { error } = await supabase.from('groups').delete().eq('id', id)
    if (error) throw error
    groups.value = groups.value.filter((g) => g.id !== id)
    groupFeeds.value.delete(id)
    expandedGroups.value.delete(id)
    persistExpanded()
  }

  /** One upsert with every group's new position. */
  async function reorderGroups(orderedIds: string[]): Promise<void> {
    const userId = useAuthStore().user!.id
    const rows = orderedIds.flatMap((id, position) => {
      const g = groupMap.value.get(id)
      return g ? [{ id, user_id: userId, name: g.name, position }] : []
    })
    const { error } = await supabase.from('groups').upsert(rows, { onConflict: 'id' })
    if (error) throw error

    for (const row of rows) {
      const g = groupMap.value.get(row.id)
      if (g) g.position = row.position
    }
  }

  async function addFeedToGroup(groupId: string, feedId: string): Promise<void> {
    if (isFeedInGroup(groupId, feedId)) return
    const { error } = await supabase.from('group_feeds').insert({ group_id: groupId, feed_id: feedId })
    if (error) throw error
    groupFeeds.value.set(groupId, [...feedsByGroup(groupId), feedId])
  }

  async function removeFeedFromGroup(groupId: string, feedId: string): Promise<void> {
    const { error } = await supabase
      .from('group_feeds')
      .delete()
      .eq('group_id', groupId)
      .eq('feed_id', feedId)
    if (error) throw error
    groupFeeds.value.set(groupId, feedsByGroup(groupId).filter((id) => id !== feedId))
  }

  /** Local-only cleanup after an unsubscribe (the DB cascades the rows). */
  function removeFeedEverywhere(feedId: string): void {
    for (const [groupId, feedIds] of groupFeeds.value) {
      if (feedIds.includes(feedId)) {
        groupFeeds.value.set(groupId, feedIds.filter((id) => id !== feedId))
      }
    }
  }

  function setExpanded(id: string, expanded: boolean): void {
    if (expanded) expandedGroups.value.add(id)
    else expandedGroups.value.delete(id)
    persistExpanded()
  }

  function toggleGroup(id: string): void {
    setExpanded(id, !expandedGroups.value.has(id))
  }

  function persistExpanded(): void {
    localStorage.setItem(LS_EXPANDED, JSON.stringify([...expandedGroups.value]))
  }

  function reset(): void {
    groups.value = []
    groupFeeds.value = new Map()
  }

  return {
    groups,
    groupFeeds,
    expandedGroups,
    sortedGroups,
    groupMap,
    groupById,
    feedsByGroup,
    groupFeedSets,
    isFeedInGroup,
    allGroupedFeedIds,
    unreadByGroup,
    unreadFor,
    fetchGroups,
    createGroup,
    renameGroup,
    deleteGroup,
    reorderGroups,
    addFeedToGroup,
    removeFeedFromGroup,
    removeFeedEverywhere,
    setExpanded,
    toggleGroup,
    reset,
  }
})
