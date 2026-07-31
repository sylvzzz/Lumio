import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Bot } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'
import { AIPanel } from './AIPanel'
import { useAIPanelStore } from '@/store/ai-panel'

const noHeaderRoutes = ['/']

export function AppLayout() {
  const location = useLocation()
  const showHeader = noHeaderRoutes.includes(location.pathname)
  const shouldReduceMotion = useReducedMotion()
  const open = useAIPanelStore((s) => s.open)
  const width = useAIPanelStore((s) => s.width)
  const openPanel = useAIPanelStore((s) => s.openPanel)
  const closePanel = useAIPanelStore((s) => s.closePanel)

  useEffect(() => {
    if (location.pathname === '/lumio') closePanel()
  }, [location.pathname, closePanel])

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-canvas transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto px-10 py-8">
          {showHeader && <TopHeader />}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 6 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? {} : { opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: [0.42, 0, 0.58, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

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
    </div>
  )
}
