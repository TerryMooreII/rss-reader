import {
  RssIcon,
  BoltIcon,
  MagnifyingGlassIcon,
  DevicePhoneMobileIcon,
  MoonIcon,
  FolderIcon,
  StarIcon,
  KeyIcon,
  ArrowDownTrayIcon,
  GlobeAltIcon,
  EyeIcon,
  NewspaperIcon,
  SwatchIcon,
  PlayCircleIcon,
  ShieldCheckIcon,
  CommandLineIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  FunnelIcon,
  TagIcon,
} from '@heroicons/vue/24/outline'

export const platforms = [
  { name: 'RSS / Atom', desc: 'Any standard feed', icon: RssIcon },
  { name: 'YouTube', desc: 'Channels & playlists', icon: PlayCircleIcon },
  { name: 'Reddit', desc: 'Subreddits & users', icon: GlobeAltIcon },
  { name: 'GitHub', desc: 'Releases & commits', icon: CommandLineIcon },
  { name: 'Bluesky', desc: 'Profile feeds', icon: BoltIcon },
  { name: 'Mastodon', desc: 'Profile feeds', icon: GlobeAltIcon },
]

export const features = [
  { icon: ArrowPathIcon, title: 'Smart Feed Polling', desc: "Adaptive polling that learns each feed's rhythm. Frequent updaters get checked often, quiet feeds less so. Always current, never wasteful." },
  { icon: FolderIcon, title: 'Groups & Categories', desc: 'Organize feeds into custom groups. Browse 25+ categories from Tech to Cooking. One feed can live in multiple groups.' },
  { icon: MagnifyingGlassIcon, title: 'Full-Text Search', desc: 'Instantly search across every article from every feed you subscribe to. Find that piece you read last week in seconds.' },
  { icon: SwatchIcon, title: '4 Beautiful Themes', desc: 'Light for daytime, Dark for night owls, Midnight for the deep focus crowd, and Forest for something different.' },
  { icon: AdjustmentsHorizontalIcon, title: '3 Reading Modes', desc: 'Comfortable for leisurely browsing, Compact for power scanning, and Feed mode for inline reading without leaving your list.' },
  { icon: DevicePhoneMobileIcon, title: 'Installable PWA', desc: 'Install Acta on any device. No app store needed. Your feeds in your pocket, always.' },
  { icon: KeyIcon, title: 'Keyboard First', desc: 'Navigate with j/k, star with s, search with /. Full keyboard control for readers who live in the fast lane.' },
  { icon: StarIcon, title: 'Star & Organize', desc: 'Star the articles that matter and organize them with custom tags. Build curated collections — "Read Later", "Research", whatever fits your workflow.' },
  { icon: BoltIcon, title: 'Feed Discovery', desc: "Don't know what to read? Browse our curated directory of feeds across 25+ categories and subscribe in one click." },
  { icon: NewspaperIcon, title: 'Inline Reading', desc: 'Read entries in a split pane or expand them right in your list. Full article links and archive links are one click away.' },
  { icon: EyeIcon, title: 'Smart Read Tracking', desc: "Entries are marked read as you open them, and you can clear a feed, a group, or everything at once. Acta tracks what you've read so you never miss what's new." },
  { icon: FunnelIcon, title: 'Content Filters', desc: 'Set up rules to automatically hide, mark as read, or star-and-tag entries by keyword. Apply globally or scope to specific feeds and groups.' },
  { icon: ArrowDownTrayIcon, title: 'OPML Import & Export', desc: "Switching from another reader? Import your OPML file and you're set. Export anytime — your data is always yours." },
  { icon: PlayCircleIcon, title: 'Embedded Media', desc: 'YouTube videos and podcast audio play right inside your reader. No tab-switching.' },
  { icon: ShieldCheckIcon, title: 'Private & Secure', desc: 'Row-level security on every query. Your subscriptions and reading habits are yours alone. No tracking, no ads.' },
  { icon: MoonIcon, title: 'Distraction-Free', desc: 'No algorithmic feeds. No engagement tricks. Just the content you chose, presented cleanly. Reading as it should be.' },
]

export const filterRules = [
  { icon: EyeIcon, tint: 'bg-red-500/10', color: 'text-red-400', title: 'Hide', desc: 'Suppress entries matching a keyword so they never clutter your feed.' },
  { icon: ArrowPathIcon, tint: 'bg-blue-500/10', color: 'text-blue-400', title: 'Mark as Read', desc: "Automatically mark routine updates as read so you can focus on what's new." },
  { icon: TagIcon, tint: 'bg-amber-500/10', color: 'text-amber-400', title: 'Auto Star & Tag', desc: 'Automatically star and tag matching entries into curated collections.' },
]

export const themes = [
  { name: 'Light', tagline: 'Clean & classic', bg: 'bg-white', panel: 'bg-[rgb(248,249,250)]', title: 'text-[rgb(33,37,41)]', sub: 'text-[rgb(86,95,103)]' },
  { name: 'Dark', tagline: 'Easy on the eyes', bg: 'bg-[rgb(24,24,27)]', panel: 'bg-[rgb(39,39,42)]', title: 'text-[rgb(244,244,245)]', sub: 'text-[rgb(161,161,170)]' },
  { name: 'Midnight', tagline: 'Deep focus', bg: 'bg-[rgb(15,23,42)]', panel: 'bg-[rgb(30,41,59)]', title: 'text-[rgb(226,232,240)]', sub: 'text-[rgb(148,163,184)]' },
  { name: 'Forest', tagline: 'Nature-inspired', bg: 'bg-[rgb(20,26,22)]', panel: 'bg-[rgb(30,40,33)]', title: 'text-[rgb(220,230,222)]', sub: 'text-[rgb(156,175,160)]' },
]

export const steps = [
  { title: 'Create an account', desc: 'Free, no credit card. Takes 10 seconds.' },
  { title: 'Add your feeds', desc: 'Paste any URL or import your OPML file. Discover new feeds in our directory.' },
  { title: 'Read on your terms', desc: 'Pick your theme, choose your layout, and enjoy distraction-free reading.' },
]

export const stats = [
  { value: '6+', label: 'Platforms Supported', sub: 'RSS, YouTube, Reddit, GitHub & more' },
  { value: '25+', label: 'Content Categories', sub: 'From Tech to Food to AI & ML' },
  { value: '0', label: 'Ads & Trackers', sub: 'Your reading stays private' },
]
