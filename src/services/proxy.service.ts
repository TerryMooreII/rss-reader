import { supabase } from '@/config/supabase'

export interface ArticleContent {
  title: string
  content: string
  excerpt: string
  author: string | null
  site_name: string | null
  image_url: string | null
}

export async function fetchArticleContent(
  url: string,
): Promise<ArticleContent> {
  const { data, error } = await supabase.functions.invoke('proxy-article', {
    body: { url },
  })

  if (error) throw error
  return data as ArticleContent
}
