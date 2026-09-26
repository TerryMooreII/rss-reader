import 'vue-router'
import type { EntryFilterType } from './models'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    requiresAdmin?: boolean
    /** Which entry list `EntryListPage` should show for this route. */
    filterType?: EntryFilterType
  }
}
