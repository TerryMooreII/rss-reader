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
    return ALLOWED_IFRAME_HOSTS.some((d) => host === d || host.endsWith('.' + d))
  } catch {
    return false
  }
}

/** Set per `sanitizeHtml` call; DOMPurify hooks are global. */
let linksInNewTab = true

DOMPurify.addHook('uponSanitizeElement', (node) => {
  const el = node as Element
  if (el.tagName === 'IFRAME') {
    const src = el.getAttribute('src') || ''
    if (!isAllowedIframeHost(src)) node.parentNode?.removeChild(node)
  }
})

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  const el = node as Element
  if (el.tagName === 'A' && el.hasAttribute('href')) {
    if (linksInNewTab) el.setAttribute('target', '_blank')
    else el.removeAttribute('target')
    el.setAttribute('rel', 'noopener noreferrer')
  }
  // Defer offscreen images and iframes inside article bodies.
  if (el.tagName === 'IMG' || el.tagName === 'IFRAME') {
    if (!el.hasAttribute('loading')) el.setAttribute('loading', 'lazy')
  }
})

const SANITIZE_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'srcset', 'sizes', 'loading'],
  FORBID_ATTR: ['style'],
}

export function sanitizeHtml(html: string, options: { newTab?: boolean } = {}): string {
  linksInNewTab = options.newTab ?? true
  return DOMPurify.sanitize(html, SANITIZE_CONFIG) as string
}

export { cleanAuthor } from './html'
