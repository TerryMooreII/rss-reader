export const PAGE_SIZE = 25

export const FEED_CATEGORIES = [
  { value: 'technology', label: 'Technology', icon: 'CpuChipIcon' },
  { value: 'science', label: 'Science', icon: 'BeakerIcon' },
  { value: 'business', label: 'Business', icon: 'BriefcaseIcon' },
  { value: 'finance', label: 'Finance', icon: 'BanknotesIcon' },
  { value: 'politics', label: 'Politics', icon: 'BuildingLibraryIcon' },
  { value: 'world_news', label: 'World News', icon: 'GlobeAltIcon' },
  { value: 'entertainment', label: 'Entertainment', icon: 'FilmIcon' },
  { value: 'sports', label: 'Sports', icon: 'TrophyIcon' },
  { value: 'health', label: 'Health', icon: 'HeartIcon' },
  { value: 'food', label: 'Food & Cooking', icon: 'CakeIcon' },
  { value: 'travel', label: 'Travel', icon: 'GlobeAmericasIcon' },
  { value: 'education', label: 'Education', icon: 'AcademicCapIcon' },
  { value: 'design', label: 'Design & UX', icon: 'SwatchIcon' },
  { value: 'gaming', label: 'Gaming', icon: 'PuzzlePieceIcon' },
  { value: 'music', label: 'Music', icon: 'MusicalNoteIcon' },
  { value: 'photography', label: 'Photography', icon: 'CameraIcon' },
  { value: 'programming', label: 'Programming', icon: 'CodeBracketIcon' },
  { value: 'security', label: 'Security', icon: 'ShieldCheckIcon' },
  { value: 'ai_ml', label: 'AI & Machine Learning', icon: 'SparklesIcon' },
  { value: 'open_source', label: 'Open Source', icon: 'CommandLineIcon' },
  { value: 'comics', label: 'Comics & Humor', icon: 'FaceSmileIcon' },
  { value: 'podcasts', label: 'Podcasts', icon: 'MicrophoneIcon' },
  { value: 'videos', label: 'Videos', icon: 'VideoCameraIcon' },
  { value: 'personal_blog', label: 'Personal Blog', icon: 'PencilSquareIcon' },
  { value: 'other', label: 'Other', icon: 'TagIcon' },
] as const

export type FeedCategory = (typeof FEED_CATEGORIES)[number]['value']

export const KEYBOARD_SHORTCUTS = [
  { key: 'j', description: 'Next entry' },
  { key: 'k', description: 'Previous entry' },
  { key: 's', description: 'Star / unstar entry' },
  { key: 'm', description: 'Toggle read / unread' },
  { key: 'o', description: 'Open in browser' },
  { key: 'Enter', description: 'Open reader view' },
  { key: 'Escape', description: 'Close reader view' },
  { key: '/', description: 'Focus search' },
  { key: '?', description: 'Show keyboard shortcuts' },
] as const
