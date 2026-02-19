import DOMPurify from 'dompurify'

/**
 * Trusted iframe origins for embedded content.
 * Only iframes from these domains are allowed through DOMPurify.
 */
const ALLOWED_IFRAME_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'vimeo.com',
  'open.spotify.com',
  'w.soundcloud.com',
  'bandcamp.com',
  'codepen.io',
]

function isAllowedIframeHost(src: string): boolean {
  try {
    const host = new URL(src).hostname
    return ALLOWED_IFRAME_HOSTS.some(
      (d) => host === d || host.endsWith('.' + d),
    )
  } catch {
    return false
  }
}

// Register a hook once to filter iframes by origin
DOMPurify.addHook('uponSanitizeElement', (node) => {
  const el = node as Element
  if (el.tagName === 'IFRAME') {
    const src = el.getAttribute('src') || ''
    if (!isAllowedIframeHost(src)) {
      node.parentNode?.removeChild(node)
    }
  }
})

// Force all links in feed content to open in a new tab
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && (node as Element).hasAttribute('href')) {
    ;(node as Element).setAttribute('target', '_blank')
    ;(node as Element).setAttribute('rel', 'noopener noreferrer')
  }
})

const SANITIZE_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: [
    'allow',
    'allowfullscreen',
    'frameborder',
    'scrolling',
    'target',
    'srcset',
    'sizes',
    'loading',
  ],
  FORBID_ATTR: ['style'],
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, SANITIZE_CONFIG) as string
}
