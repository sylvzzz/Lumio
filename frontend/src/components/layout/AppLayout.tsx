import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Bot, Menu, MessageCircle, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Sidebar, SidebarContent } from './Sidebar'
import { TopHeader } from './TopHeader'
import { AIPanel } from './AIPanel'
import { useAIPanelStore } from '@/store/ai-panel'

const DESKTOP_QUERY = '(min-width: 1024px)'

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia(DESKTOP_QUERY).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY)
    const onChange = () => setIsDesktop(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isDesktop
}

// Keeps full-height overlays above the iOS keyboard when the visual viewport shrinks.
function useVisualViewport() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    const update = () => {
      root.style.setProperty('--vv-height', `${vv.height}px`)
      root.style.setProperty('--vv-top', `${vv.offsetTop}px`)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
}

function MobileTopBar({
  menuOpen,
  onOpenMenu,
  onOpenChat,
}: {
  menuOpen: boolean
  onOpenMenu: () => void
  onOpenChat: () => void
}) {
  return (
    <header className="lg:hidden flex items-center justify-between gap-2 min-h-14 px-3 pt-[env(safe-area-inset-top)] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] border-b border-border/50 bg-background/80 backdrop-blur-2xl shrink-0">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-accent/10 active:bg-accent/15"
      >
        <Menu className="w-5 h-5" strokeWidth={1.5} />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" strokeWidth={1.5} />
        </div>
        <span className="text-sm font-semibold tracking-tight">Lumio</span>
      </div>
      <button
        type="button"
        onClick={onOpenChat}
        aria-label="Open chat"
        aria-haspopup="dialog"
        className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-accent/10 active:bg-accent/15"
      >
        <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
      </button>
    </header>
  )
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <DialogPrimitive.Popup className="fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-[320px] flex-col border-r border-border/50 bg-sidebar backdrop-blur-2xl shadow-xl outline-none transition-transform duration-200 data-starting-style:-translate-x-full data-ending-style:-translate-x-full pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)]">
          <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground active:bg-accent/15"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <SidebarContent onNavigate={onClose} />
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function MobileChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <DialogPrimitive.Popup
          style={{ top: 'var(--vv-top, 0px)', height: 'var(--vv-height, 100dvh)' }}
          className="fixed inset-x-0 z-50 flex flex-col bg-background/95 backdrop-blur-2xl outline-none transition-transform duration-200 data-starting-style:translate-x-full data-ending-style:translate-x-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
        >
          <DialogPrimitive.Title className="sr-only">Lumio chat</DialogPrimitive.Title>
          <AIPanel />
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function AppLayout() {
  const location = useLocation()
  const shouldReduceMotion = useReducedMotion()
  const isDesktop = useIsDesktop()
  const open = useAIPanelStore((s) => s.open)
  const menuOpen = useAIPanelStore((s) => s.menuOpen)
  const width = useAIPanelStore((s) => s.width)
  const openPanel = useAIPanelStore((s) => s.openPanel)
  const closePanel = useAIPanelStore((s) => s.closePanel)
  const openMenu = useAIPanelStore((s) => s.openMenu)
  const closeMenu = useAIPanelStore((s) => s.closeMenu)

  useVisualViewport()

  useEffect(() => {
    if (location.pathname === '/lumio') closePanel()
  }, [location.pathname, closePanel])

  useEffect(() => {
    if (isDesktop) {
      closeMenu()
    } else {
      closePanel()
      closeMenu()
    }
  }, [isDesktop, closePanel, closeMenu])

  return (
    <div className="app-shell w-full flex overflow-hidden bg-canvas transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar menuOpen={menuOpen} onOpenMenu={openMenu} onOpenChat={openPanel} />
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] lg:px-10 lg:py-8">
          {location.pathname === '/' && <TopHeader />}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 6 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? {} : { opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: [0.42, 0, 0.58, 1] }}
              className={location.pathname === '/lumio' ? 'h-full' : undefined}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {isDesktop ? (
        <>
          <AnimatePresence initial={false}>
            {open && (
              <motion.aside
                key="ai-panel"
                initial={shouldReduceMotion ? {} : { opacity: 0, x: 40 }}
                animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? {} : { opacity: 0, x: 40 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ width }}
                className="relative h-full flex flex-col border-l border-border/50 bg-background/90 backdrop-blur-2xl shrink-0 transition-colors duration-300"
              >
                <AIPanel />
              </motion.aside>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {!open && (
              <motion.button
                onClick={openPanel}
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent text-white text-[12px] font-medium shadow-[0_12px_40px_rgba(0,0,0,0.15)]"
              >
                <Bot className="w-4 h-4" strokeWidth={1.5} />
                Ask Lumio
              </motion.button>
            )}
          </AnimatePresence>
        </>
      ) : (
        <MobileChat open={open} onClose={closePanel} />
      )}

      {!isDesktop && <MobileMenu open={menuOpen} onClose={closeMenu} />}
    </div>
  )
}
