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

function Toaster() {
  const dark = useSyncExternalStore(subscribe, getDark, () => false)
  const panelOpen = useAIPanelStore((s) => s.open)
  const panelWidth = useAIPanelStore((s) => s.width)

  return (
    <Sonner
      theme={dark ? 'dark' : 'light'}
      position="top-right"
      offset={{ top: 24, right: panelOpen ? panelWidth + 16 : 24 }}
      gap={8}
      closeButton
    />
  )
}

export { Toaster }
