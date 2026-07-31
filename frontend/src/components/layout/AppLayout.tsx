import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'
import { AIPanel } from './AIPanel'

const noHeaderRoutes = ['/']

export function AppLayout() {
  const location = useLocation()
  const showHeader = noHeaderRoutes.includes(location.pathname)
  const shouldReduceMotion = useReducedMotion()

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
      <AIPanel />
    </div>
  )
}
