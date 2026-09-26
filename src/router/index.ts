import { createRouter, createWebHistory } from 'vue-router'
import { authGuard } from './guards'

const EntryListPage = () => import('@/pages/EntryListPage.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
  routes: [
    // Public / Marketing
    {
      path: '/',
      component: () => import('@/components/layout/MarketingLayout.vue'),
      children: [
        {
          path: '',
          name: 'marketing',
          component: () => import('@/pages/MarketingPage.vue'),
          meta: { requiresAuth: false },
        },
      ],
    },

    // Auth
    {
      path: '/',
      component: () => import('@/components/layout/AuthLayout.vue'),
      children: [
        {
          path: 'login',
          name: 'login',
          component: () => import('@/pages/LoginPage.vue'),
          meta: { requiresAuth: false, guestOnly: true },
        },
        {
          path: 'register',
          name: 'register',
          component: () => import('@/pages/RegisterPage.vue'),
          meta: { requiresAuth: false, guestOnly: true },
        },
        {
          path: 'forgot-password',
          name: 'forgot-password',
          component: () => import('@/pages/ForgotPasswordPage.vue'),
          meta: { requiresAuth: false, guestOnly: true },
        },
      ],
    },

    // Authenticated App
    {
      path: '/app',
      component: () => import('@/components/layout/AppLayout.vue'),
      meta: { requiresAuth: true },
      redirect: { name: 'all-entries' },
      children: [
        { path: 'all', name: 'all-entries', component: EntryListPage, meta: { filterType: 'all' } },
        { path: 'starred', name: 'starred-entries', component: EntryListPage, meta: { filterType: 'starred' } },
        { path: 'starred/tag/:starTagId', name: 'star-tag-entries', component: EntryListPage, meta: { filterType: 'star_tag' } },
        { path: 'feed/:feedId', name: 'feed-entries', component: EntryListPage, meta: { filterType: 'feed' } },
        { path: 'group/:groupId', name: 'group-entries', component: EntryListPage, meta: { filterType: 'group' } },
        { path: 'category/:category', name: 'category-entries', component: EntryListPage, meta: { filterType: 'category' } },
        { path: 'search', name: 'search-entries', component: EntryListPage, meta: { filterType: 'search' } },
        {
          path: 'discover',
          name: 'discover',
          component: () => import('@/pages/DiscoverPage.vue'),
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/pages/SettingsPage.vue'),
        },
        {
          path: 'admin',
          name: 'admin',
          component: () => import('@/pages/AdminPage.vue'),
          meta: { requiresAdmin: true },
        },
      ],
    },

    // Catch-all
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/NotFoundPage.vue'),
    },
  ],
})

router.beforeEach(authGuard)

export default router
