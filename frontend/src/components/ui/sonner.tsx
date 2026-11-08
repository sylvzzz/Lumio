import { useSyncExternalStore } from 'react'
import { Toaster as Sonner } from 'sonner'
import { useAIPanelStore } from '@/store/ai-panel'

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

function getDark() {
  return document.documentElement.classList.contains('dark')
}

function subscribeViewport(callback: () => void) {
  const mql = window.matchMedia('(min-width: 1024px)')
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getIsDesktop() {
  return window.matchMedia('(min-width: 1024px)').matches
}

function Toaster() {
  const dark = useSyncExternalStore(subscribe, getDark, () => false)
  const isDesktop = useSyncExternalStore(subscribeViewport, getIsDesktop, () => false)
  const panelOpen = useAIPanelStore((s) => s.open)
  const panelWidth = useAIPanelStore((s) => s.width)

  return (
    <Sonner
      theme={dark ? 'dark' : 'light'}
      position="top-right"
      offset={{
        top: isDesktop ? 24 : 'calc(3.5rem + env(safe-area-inset-top) + 0.5rem)',
        right: isDesktop && panelOpen ? panelWidth + 16 : 16,
      }}
      gap={8}
      closeButton
    />
  )
}

export { Toaster }
