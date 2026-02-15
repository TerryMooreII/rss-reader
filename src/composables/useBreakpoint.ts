import { ref, onMounted, onUnmounted } from 'vue'

export function useBreakpoint() {
  const isMobile = ref(false)
  const isTablet = ref(false)
  const isDesktop = ref(false)

  const mobileQuery = window.matchMedia('(max-width: 767px)')
  const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1024px)')
  const desktopQuery = window.matchMedia('(min-width: 1025px)')

  function update() {
    isMobile.value = mobileQuery.matches
    isTablet.value = tabletQuery.matches
    isDesktop.value = desktopQuery.matches
  }

  function onMobileChange(e: MediaQueryListEvent | MediaQueryList) {
    isMobile.value = e.matches
  }

  function onTabletChange(e: MediaQueryListEvent | MediaQueryList) {
    isTablet.value = e.matches
  }

  function onDesktopChange(e: MediaQueryListEvent | MediaQueryList) {
    isDesktop.value = e.matches
  }

  // Set initial values immediately
  update()

  onMounted(() => {
    mobileQuery.addEventListener('change', onMobileChange)
    tabletQuery.addEventListener('change', onTabletChange)
    desktopQuery.addEventListener('change', onDesktopChange)
  })

  onUnmounted(() => {
    mobileQuery.removeEventListener('change', onMobileChange)
    tabletQuery.removeEventListener('change', onTabletChange)
    desktopQuery.removeEventListener('change', onDesktopChange)
  })

  return {
    isMobile,
    isTablet,
    isDesktop,
  }
}
