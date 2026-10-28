import { NavLink } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Bot,
  Home,
  Calendar,
  StickyNote,
  FileText,
  Inbox,
  CheckSquare,
  Settings,
  HelpCircle,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/notes', icon: StickyNote, label: 'Notes' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/inbox', icon: Inbox, label: 'Emails' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/lumio', icon: Bot, label: 'Lumio' },
  { to: '/faq', icon: HelpCircle, label: 'FAQ' },
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
            <Bot className="w-4.5 h-4.5 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Lumio</div>
            <div className="text-[11px] text-muted-foreground">Workspace</div>
          </div>
        </motion.div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item, i) => (
          <motion.div
            key={item.to}
            initial={shouldReduceMotion ? {} : { opacity: 0, x: -12 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.03, ease: [0.42, 0, 0.58, 1] }}
          >
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all duration-200 ${
                  isActive
                    ? 'bg-accent/10 text-accent font-medium shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/5'
                }`
              }
            >
              <item.icon className="w-4 h-4" strokeWidth={1.5} />
              <span>{item.label}</span>
            </NavLink>
          </motion.div>
        ))}
      </nav>

      <div className="p-4">
        <div className="text-[11px] text-muted-foreground/60 px-2">Lumio · Local</div>
      </div>
    </aside>
  )
}
