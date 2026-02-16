<script setup lang="ts">
import { RouterLink } from 'vue-router'
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
} from '@heroicons/vue/24/outline'

const platforms = [
  { name: 'RSS / Atom', desc: 'Any standard feed', icon: RssIcon },
  { name: 'YouTube', desc: 'Channels & playlists', icon: PlayCircleIcon },
  { name: 'Reddit', desc: 'Subreddits & users', icon: GlobeAltIcon },
  { name: 'GitHub', desc: 'Releases & commits', icon: CommandLineIcon },
  { name: 'Bluesky', desc: 'Profile feeds', icon: BoltIcon },
  { name: 'Mastodon', desc: 'Profile feeds', icon: GlobeAltIcon },
]

const features = [
  {
    icon: ArrowPathIcon,
    title: 'Smart Feed Polling',
    desc: 'Adaptive polling that learns each feed\'s rhythm. Frequent updaters get checked often, quiet feeds less so. Always current, never wasteful.',
  },
  {
    icon: FolderIcon,
    title: 'Groups & Categories',
    desc: 'Organize feeds into custom groups. Browse 25+ categories from Tech to Cooking. One feed can live in multiple groups.',
  },
  {
    icon: MagnifyingGlassIcon,
    title: 'Full-Text Search',
    desc: 'Instantly search across every article from every feed you subscribe to. Find that piece you read last week in seconds.',
  },
  {
    icon: SwatchIcon,
    title: '4 Beautiful Themes',
    desc: 'Light for daytime, Dark for night owls, Midnight for the deep focus crowd, and Forest for something different.',
  },
  {
    icon: AdjustmentsHorizontalIcon,
    title: '3 Reading Modes',
    desc: 'Comfortable for leisurely browsing, Compact for power scanning, and Feed mode for inline reading without leaving your list.',
  },
  {
    icon: DevicePhoneMobileIcon,
    title: 'Installable PWA',
    desc: 'Install Acta on any device. Works offline. No app store needed. Your feeds in your pocket, always.',
  },
  {
    icon: KeyIcon,
    title: 'Keyboard First',
    desc: 'Navigate with j/k, star with s, search with /. Full keyboard control for readers who live in the fast lane.',
  },
  {
    icon: StarIcon,
    title: 'Star & Save',
    desc: 'Star the articles that matter. Build your personal reading list. Come back to them whenever you\'re ready.',
  },
  {
    icon: BoltIcon,
    title: 'Feed Discovery',
    desc: 'Don\'t know what to read? Browse our curated directory of feeds across 25+ categories and subscribe in one click.',
  },
  {
    icon: NewspaperIcon,
    title: 'Full Article Extraction',
    desc: 'Tired of truncated RSS excerpts? Acta can fetch the full article content so you can read everything right here.',
  },
  {
    icon: EyeIcon,
    title: 'Smart Read Tracking',
    desc: 'Mark-as-read on scroll, per-feed, per-group, or all at once. Acta tracks what you\'ve read so you never miss what\'s new.',
  },
  {
    icon: ArrowDownTrayIcon,
    title: 'OPML Import & Export',
    desc: 'Switching from another reader? Import your OPML file and you\'re set. Export anytime — your data is always yours.',
  },
  {
    icon: PlayCircleIcon,
    title: 'Embedded Media',
    desc: 'YouTube videos, podcasts, Spotify, Vimeo, SoundCloud — media plays right inside your reader. No tab-switching.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Private & Secure',
    desc: 'Row-level security on every query. Your subscriptions and reading habits are yours alone. No tracking, no ads.',
  },
  {
    icon: MoonIcon,
    title: 'Distraction-Free',
    desc: 'No algorithmic feeds. No engagement tricks. Just the content you chose, presented cleanly. Reading as it should be.',
  },
]

const shortcuts = [
  { key: 'j', label: 'Next' },
  { key: 'k', label: 'Previous' },
  { key: 's', label: 'Star' },
  { key: 'm', label: 'Read/Unread' },
  { key: 'o', label: 'Open' },
  { key: '/', label: 'Search' },
  { key: '?', label: 'Shortcuts' },
  { key: '↵', label: 'Reader' },
]
</script>

<template>
  <div class="bg-bg-primary">
    <!-- Hero -->
    <section class="relative overflow-hidden py-24 sm:py-36">
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.03]"
        style="
          background-image: radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0);
          background-size: 40px 40px;
        "
      />
      <div class="relative mx-auto max-w-4xl px-4 text-center">
        <div
          class="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium text-text-secondary"
        >
          <RssIcon class="h-3.5 w-3.5 text-accent" />
          RSS, YouTube, Reddit, GitHub, Bluesky, Mastodon &mdash; all in one place
        </div>

        <h1 class="text-5xl font-bold tracking-tight text-text-primary sm:text-7xl">
          Take back your
          <span
            class="bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent"
          >
            reading
          </span>
        </h1>

        <p class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary sm:text-xl">
          Acta is a modern, open RSS reader that puts you in control. Follow anything with a feed
          &mdash; blogs, YouTube channels, subreddits, GitHub repos, Mastodon profiles &mdash; in
          one clean, beautiful interface. No algorithms. No ads. Just your content.
        </p>

        <div class="mt-10 flex items-center justify-center gap-4">
          <RouterLink
            to="/register"
            class="btn-primary px-8 py-3.5 text-base font-semibold shadow-lg shadow-accent/20 transition-shadow hover:shadow-xl hover:shadow-accent/30"
          >
            Start Reading Free
          </RouterLink>
          <RouterLink to="/login" class="btn-ghost px-6 py-3.5 text-base"> Sign in </RouterLink>
        </div>
      </div>
    </section>

    <!-- Platform Support -->
    <section class="border-t py-20">
      <div class="mx-auto max-w-5xl px-4">
        <div class="text-center">
          <h2 class="text-3xl font-bold text-text-primary sm:text-4xl">
            One reader for everything you follow
          </h2>
          <p class="mx-auto mt-4 max-w-2xl text-text-secondary">
            Just paste a URL. Acta automatically detects the platform and converts it into a feed.
            No need to hunt down RSS links.
          </p>
        </div>

        <div class="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div
            v-for="platform in platforms"
            :key="platform.name"
            class="group flex flex-col items-center gap-3 rounded-xl border bg-bg-secondary/50 p-5 transition-colors hover:border-accent/30 hover:bg-accent/5"
          >
            <component
              :is="platform.icon"
              class="h-8 w-8 text-text-muted transition-colors group-hover:text-accent"
            />
            <div class="text-center">
              <div class="text-sm font-semibold text-text-primary">{{ platform.name }}</div>
              <div class="mt-0.5 text-xs text-text-muted">{{ platform.desc }}</div>
            </div>
          </div>
        </div>

        <p class="mt-6 text-center text-sm text-text-muted">
          Plus any site that publishes an RSS or Atom feed &mdash; that's millions of sources.
        </p>
      </div>
    </section>

    <!-- Features Grid -->
    <section class="border-t py-20">
      <div class="mx-auto max-w-6xl px-4">
        <div class="text-center">
          <h2 class="text-3xl font-bold text-text-primary sm:text-4xl">
            Packed with everything you need
          </h2>
          <p class="mx-auto mt-4 max-w-2xl text-text-secondary">
            Built for readers who refuse to settle. Powerful features wrapped in a clean,
            distraction-free interface.
          </p>
        </div>

        <div class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="group rounded-xl border bg-bg-secondary/50 p-6 transition-colors hover:border-accent/30 hover:bg-accent/5"
          >
            <div
              class="mb-4 inline-flex rounded-lg bg-accent/10 p-2.5 transition-colors group-hover:bg-accent/15"
            >
              <component :is="feature.icon" class="h-5 w-5 text-accent" />
            </div>
            <h3 class="text-lg font-semibold text-text-primary">{{ feature.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-text-secondary">{{ feature.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Keyboard Shortcuts Showcase -->
    <section class="border-t py-20">
      <div class="mx-auto max-w-5xl px-4">
        <div class="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 class="text-3xl font-bold text-text-primary sm:text-4xl">
              Keyboard-driven reading
            </h2>
            <p class="mt-4 text-text-secondary leading-relaxed">
              Vim-style navigation for readers who think at the speed of keystrokes. Browse, star,
              and manage your feeds without ever touching the mouse.
            </p>
            <p class="mt-4 text-sm text-text-muted">
              Press <kbd class="rounded border bg-bg-tertiary px-1.5 py-0.5 text-xs font-mono text-text-primary">?</kbd>
              in the app to see all shortcuts.
            </p>
          </div>

          <div class="grid grid-cols-4 gap-3">
            <div
              v-for="shortcut in shortcuts"
              :key="shortcut.key"
              class="flex flex-col items-center gap-2 rounded-lg border bg-bg-secondary/50 p-4"
            >
              <kbd
                class="flex h-10 w-10 items-center justify-center rounded-lg border bg-bg-primary font-mono text-lg font-semibold text-text-primary shadow-sm"
              >
                {{ shortcut.key }}
              </kbd>
              <span class="text-xs text-text-muted">{{ shortcut.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Themes Showcase -->
    <section class="border-t py-20">
      <div class="mx-auto max-w-5xl px-4">
        <div class="text-center">
          <h2 class="text-3xl font-bold text-text-primary sm:text-4xl">
            Your vibe, your theme
          </h2>
          <p class="mx-auto mt-4 max-w-2xl text-text-secondary">
            Four handcrafted themes designed for comfortable reading at any hour. Switch instantly.
          </p>
        </div>

        <div class="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <!-- Light -->
          <div class="overflow-hidden rounded-xl border">
            <div class="h-24 bg-white" />
            <div class="border-t bg-[rgb(248,249,250)] p-3">
              <div class="text-sm font-semibold text-[rgb(33,37,41)]">Light</div>
              <div class="text-xs text-[rgb(86,95,103)]">Clean & classic</div>
            </div>
          </div>
          <!-- Dark -->
          <div class="overflow-hidden rounded-xl border">
            <div class="h-24 bg-[rgb(24,24,27)]" />
            <div class="border-t bg-[rgb(39,39,42)] p-3">
              <div class="text-sm font-semibold text-[rgb(244,244,245)]">Dark</div>
              <div class="text-xs text-[rgb(161,161,170)]">Easy on the eyes</div>
            </div>
          </div>
          <!-- Midnight -->
          <div class="overflow-hidden rounded-xl border">
            <div class="h-24 bg-[rgb(15,23,42)]" />
            <div class="border-t bg-[rgb(30,41,59)] p-3">
              <div class="text-sm font-semibold text-[rgb(226,232,240)]">Midnight</div>
              <div class="text-xs text-[rgb(148,163,184)]">Deep focus</div>
            </div>
          </div>
          <!-- Forest -->
          <div class="overflow-hidden rounded-xl border">
            <div class="h-24 bg-[rgb(20,26,22)]" />
            <div class="border-t bg-[rgb(30,40,33)] p-3">
              <div class="text-sm font-semibold text-[rgb(220,230,222)]">Forest</div>
              <div class="text-xs text-[rgb(156,175,160)]">Nature-inspired</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="border-t py-20">
      <div class="mx-auto max-w-4xl px-4">
        <div class="text-center">
          <h2 class="text-3xl font-bold text-text-primary sm:text-4xl">
            Up and running in seconds
          </h2>
        </div>

        <div class="mt-14 grid gap-8 sm:grid-cols-3">
          <div class="text-center">
            <div
              class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-xl font-bold text-accent"
            >
              1
            </div>
            <h3 class="font-semibold text-text-primary">Create an account</h3>
            <p class="mt-2 text-sm text-text-secondary">Free, no credit card. Takes 10 seconds.</p>
          </div>
          <div class="text-center">
            <div
              class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-xl font-bold text-accent"
            >
              2
            </div>
            <h3 class="font-semibold text-text-primary">Add your feeds</h3>
            <p class="mt-2 text-sm text-text-secondary">
              Paste any URL or import your OPML file. Discover new feeds in our directory.
            </p>
          </div>
          <div class="text-center">
            <div
              class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-xl font-bold text-accent"
            >
              3
            </div>
            <h3 class="font-semibold text-text-primary">Read on your terms</h3>
            <p class="mt-2 text-sm text-text-secondary">
              Pick your theme, choose your layout, and enjoy distraction-free reading.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Social Proof / Value Props -->
    <section class="border-t py-20">
      <div class="mx-auto max-w-5xl px-4">
        <div class="grid gap-8 sm:grid-cols-3">
          <div class="rounded-xl border bg-bg-secondary/50 p-8 text-center">
            <div class="text-4xl font-bold text-accent">6+</div>
            <div class="mt-2 text-sm font-medium text-text-primary">Platforms Supported</div>
            <div class="mt-1 text-xs text-text-muted">RSS, YouTube, Reddit, GitHub & more</div>
          </div>
          <div class="rounded-xl border bg-bg-secondary/50 p-8 text-center">
            <div class="text-4xl font-bold text-accent">25+</div>
            <div class="mt-2 text-sm font-medium text-text-primary">Content Categories</div>
            <div class="mt-1 text-xs text-text-muted">From Tech to Food to AI & ML</div>
          </div>
          <div class="rounded-xl border bg-bg-secondary/50 p-8 text-center">
            <div class="text-4xl font-bold text-accent">0</div>
            <div class="mt-2 text-sm font-medium text-text-primary">Ads & Trackers</div>
            <div class="mt-1 text-xs text-text-muted">Your reading stays private</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="border-t py-24">
      <div class="mx-auto max-w-4xl px-4 text-center">
        <h2 class="text-3xl font-bold text-text-primary sm:text-4xl">
          Stop scrolling. Start reading.
        </h2>
        <p class="mx-auto mt-4 max-w-xl text-lg text-text-secondary">
          Take control of your information diet. No algorithms deciding what you see, no ads
          interrupting your reading, no data harvesting. Just you and the content you chose.
        </p>
        <div class="mt-10 flex items-center justify-center gap-4">
          <RouterLink
            to="/register"
            class="btn-primary px-8 py-3.5 text-base font-semibold shadow-lg shadow-accent/20 transition-shadow hover:shadow-xl hover:shadow-accent/30"
          >
            Create your free account
          </RouterLink>
        </div>
        <p class="mt-4 text-sm text-text-muted">No credit card required. Import your feeds and go.</p>
      </div>
    </section>
  </div>
</template>
