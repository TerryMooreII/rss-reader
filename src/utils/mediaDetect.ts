export interface YouTubeMedia {
  type: 'youtube'
  videoId: string
}

export interface PodcastMedia {
  type: 'podcast'
  audioUrl: string
}

export type Media = YouTubeMedia | PodcastMedia

export function detectYouTubeVideo(
  entryUrl: string | null | undefined,
  contentHtml: string | null | undefined,
): string | null {
  // Check entry URL for youtube.com/watch?v= or youtu.be/
  if (entryUrl) {
    const watchMatch = entryUrl.match(
      /(?:youtube\.com\/watch\?.*v=|youtu\.be\/)([\w-]{11})/i,
    )
    if (watchMatch) return watchMatch[1]
  }

  // Check content HTML for youtube.com/embed/ iframes
  if (contentHtml) {
    const embedMatch = contentHtml.match(
      /youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/i,
    )
    if (embedMatch) return embedMatch[1]
  }

  return null
}

export function detectAudioEnclosure(
  contentHtml: string | null | undefined,
): string | null {
  if (!contentHtml) return null

  // Look for <audio src="...">
  const audioMatch = contentHtml.match(/<audio[^>]*src=["']([^"']+)["']/i)
  if (audioMatch) return audioMatch[1]

  // Look for <source src="...mp3"> or similar audio formats
  const sourceMatch = contentHtml.match(
    /<source[^>]*src=["']([^"']+\.(?:mp3|m4a|ogg|wav|aac))["']/i,
  )
  if (sourceMatch) return sourceMatch[1]

  return null
}

export function detectMedia(
  entryUrl: string | null | undefined,
  contentHtml: string | null | undefined,
): Media | null {
  const videoId = detectYouTubeVideo(entryUrl, contentHtml)
  if (videoId) return { type: 'youtube', videoId }

  const audioUrl = detectAudioEnclosure(contentHtml)
  if (audioUrl) return { type: 'podcast', audioUrl }

  return null
}
