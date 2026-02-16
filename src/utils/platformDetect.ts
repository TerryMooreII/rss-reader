export interface PlatformHint {
  platform: string
  label: string
  description: string
}

const patterns: Array<{
  regex: RegExp
  platform: string
  label: string
  description: string
}> = [
  {
    regex: /youtube\.com\/@[\w-]+/i,
    platform: 'youtube',
    label: 'YouTube Channel',
    description: 'Will resolve to channel feed',
  },
  {
    regex: /youtube\.com\/channel\/UC[\w-]+/i,
    platform: 'youtube',
    label: 'YouTube Channel',
    description: 'Will resolve to channel feed',
  },
  {
    regex: /youtube\.com\/playlist\?list=/i,
    platform: 'youtube',
    label: 'YouTube Playlist',
    description: 'Will resolve to playlist feed',
  },
  {
    regex: /reddit\.com\/r\/[\w]+/i,
    platform: 'reddit',
    label: 'Reddit',
    description: 'Will resolve to subreddit RSS feed',
  },
  {
    regex: /reddit\.com\/user\/[\w]+/i,
    platform: 'reddit',
    label: 'Reddit User',
    description: 'Will resolve to user RSS feed',
  },
  {
    regex: /github\.com\/[\w.-]+\/[\w.-]+\/commits/i,
    platform: 'github',
    label: 'GitHub Commits',
    description: 'Will resolve to commits Atom feed',
  },
  {
    regex: /github\.com\/[\w.-]+\/[\w.-]+\/?$/i,
    platform: 'github',
    label: 'GitHub Repo',
    description: 'Will resolve to releases Atom feed',
  },
  {
    regex: /bsky\.app\/profile\/[\w.-]+/i,
    platform: 'bluesky',
    label: 'Bluesky',
    description: 'Will resolve via RSS bridge',
  },
  {
    regex: /[\w.-]+\.\w+\/@[\w]+$/i,
    platform: 'mastodon',
    label: 'Mastodon',
    description: 'Will resolve to profile RSS feed',
  },
]

export function detectPlatformHint(url: string): PlatformHint | null {
  if (!url || url.length < 8) return null
  try {
    // Ensure it looks like a URL
    const normalized = url.startsWith('http') ? url : `https://${url}`
    new URL(normalized)
  } catch {
    return null
  }

  for (const p of patterns) {
    if (p.regex.test(url)) {
      return { platform: p.platform, label: p.label, description: p.description }
    }
  }

  return null
}
