import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/config/supabase'
import type { StarTag } from '@/types/models'
import { useAuthStore } from './auth'

const LS_EXPANDED = 'acta:expandedStarred'

export const useStarTagStore = defineStore('starTags', () => {
  const tags = ref<StarTag[]>([])
  /** Unread starred entries per tag; populated by the feed store's counts RPC. */
  const unreadCounts = ref<Map<string, number>>(new Map())
  const expandedStarred = ref(localStorage.getItem(LS_EXPANDED) !== 'collapsed')

  const sortedTags = computed(() => [...tags.value].sort((a, b) => a.position - b.position))
  const tagMap = computed(() => new Map(tags.value.map((t) => [t.id, t])))

  function tagById(id: string): StarTag | undefined {
    return tagMap.value.get(id)
  }

  function unreadFor(tagId: string): number {
    return unreadCounts.value.get(tagId) ?? 0
  }

  async function fetchTags(): Promise<void> {
    const { data, error } = await supabase
      .from('star_tags')
      .select('id, user_id, name, position, created_at, updated_at')
      .order('position', { ascending: true })
    if (error) throw error
    tags.value = (data ?? []) as StarTag[]
  }

  async function createTag(name: string): Promise<StarTag> {
    const { data, error } = await supabase
      .from('star_tags')
      .insert({ user_id: useAuthStore().user!.id, name, position: tags.value.length })
      .select()
      .single()
    if (error) throw error
    const tag = data as StarTag
    tags.value.push(tag)
    return tag
  }

  async function renameTag(id: string, name: string): Promise<void> {
    const { error } = await supabase.from('star_tags').update({ name }).eq('id', id)
    if (error) throw error
    const tag = tagMap.value.get(id)
    if (tag) tag.name = name
  }

  async function deleteTag(id: string): Promise<void> {
    const { error } = await supabase.from('star_tags').delete().eq('id', id)
    if (error) throw error
    tags.value = tags.value.filter((t) => t.id !== id)
    unreadCounts.value.delete(id)
  }

  function toggleStarred(): void {
    expandedStarred.value = !expandedStarred.value
    localStorage.setItem(LS_EXPANDED, expandedStarred.value ? 'open' : 'collapsed')
  }

  function setUnreadCounts(rows: { star_tag_id: string; unread_count: number }[]): void {
    unreadCounts.value = new Map(rows.map((r) => [r.star_tag_id, r.unread_count]))
  }

  function setUnreadCount(tagId: string, count: number): void {
    unreadCounts.value.set(tagId, Math.max(0, count))
  }

  function adjustUnread(tagId: string, delta: number): void {
    setUnreadCount(tagId, unreadFor(tagId) + delta)
  }

  function reset(): void {
    tags.value = []
    unreadCounts.value = new Map()
  }

  return {
    tags,
    unreadCounts,
    expandedStarred,
    sortedTags,
    tagById,
    unreadFor,
    fetchTags,
    createTag,
    renameTag,
    deleteTag,
    toggleStarred,
    setUnreadCounts,
    setUnreadCount,
    adjustUnread,
    reset,
  }
})
