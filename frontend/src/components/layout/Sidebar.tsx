import { NavLink } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Sparkles,
  Home,
  Calendar,
  StickyNote,
  FileText,
  Inbox,
  CheckSquare,
  Bot,
  Settings,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/notes', icon: StickyNote, label: 'Notes' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/inbox', icon: Inbox, label: 'Emails' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/lumio', icon: Bot, label: 'Lumio' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <aside className="w-[260px] h-full flex flex-col border-r border-border/50 bg-sidebar backdrop-blur-2xl shrink-0 transition-colors duration-300">
      <div className="px-5 pt-7 pb-6">
        <motion.div
          className="flex items-center gap-2.5"
          initial={shouldReduceMotion ? {} : { opacity: 0, x: -12 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.42, 0, 0.58, 1] }}
        >
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shadow-sm">
            <Sparkles className="w-4.5 h-4.5 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight">Lumio</span>
            <p className="text-[11px] text-muted-foreground leading-none mt-0.5">AI Workspace</p>
          </div>
        </motion.div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item, i) => (
          <motion.div
            key={item.to}
            initial={shouldReduceMotion ? {} : { opacity: 0, x: -12 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * i, ease: [0.42, 0, 0.58, 1] }}
          >
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors duration-150 ${
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-black/[0.03]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId={shouldReduceMotion ? undefined : "sidebar-active"}
                      className="absolute inset-0 bg-secondary rounded-xl"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <motion.div
                    className="flex items-center gap-3 relative z-10 w-full"
                    whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  >
                    <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </motion.div>
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-border/50">
        <motion.div
          className="flex items-center gap-3 px-2"
          initial={shouldReduceMotion ? {} : { opacity: 0 }}
          animate={shouldReduceMotion ? {} : { opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-border">
            <span className="text-[13px] font-medium text-accent">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate">Alex Morgan</p>
            <p className="text-[11px] text-muted-foreground truncate">Personal Workspace</p>
          </div>
        </motion.div>
      </div>
    </aside>
  )
}
