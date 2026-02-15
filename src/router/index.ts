import { createRouter, createWebHistory } from 'vue-router'
import { authGuard } from './guards'

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
        {
          path: 'all',
          name: 'all-entries',
          component: () => import('@/pages/AllEntriesPage.vue'),
        },
        {
          path: 'starred',
          name: 'starred-entries',
          component: () => import('@/pages/StarredEntriesPage.vue'),
        },
        {
          path: 'feed/:feedId',
          name: 'feed-entries',
          component: () => import('@/pages/FeedEntriesPage.vue'),
          props: true,
        },
        {
          path: 'group/:groupId',
          name: 'group-entries',
          component: () => import('@/pages/GroupEntriesPage.vue'),
          props: true,
        },
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
