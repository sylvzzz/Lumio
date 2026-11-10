import { NavLink } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useT } from '@/hooks/useUser'
import {
  Bot, Home, Calendar, StickyNote, FileText, Inbox,
  CheckSquare, Settings, HelpCircle, LogOut,
} from 'lucide-react'
import { api } from '@/lib/api'

interface SidebarContentProps {
  onNavigate?: () => void
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const shouldReduceMotion = useReducedMotion()
  const t = useT()

  const navItems = [
    { to: '/', icon: Home, label: t.navHome },
    { to: '/calendar', icon: Calendar, label: t.navCalendar },
    { to: '/notes', icon: StickyNote, label: t.navNotes },
    { to: '/documents', icon: FileText, label: t.navDocuments },
    { to: '/inbox', icon: Inbox, label: t.navEmails },
    { to: '/tasks', icon: CheckSquare, label: t.navTasks },
    { to: '/lumio', icon: Bot, label: t.navLumio },
    { to: '/faq', icon: HelpCircle, label: t.navFaq },
    { to: '/settings', icon: Settings, label: t.navSettings },
  ]

  return (
    <>
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

      <nav className="flex-1 overflow-y-auto overscroll-contain px-3 space-y-1" aria-label={t.menuAriaLabel}>
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
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 lg:py-2 rounded-xl text-[13px] transition-all duration-200 ${
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
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, x: -12 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: navItems.length * 0.03, ease: [0.42, 0, 0.58, 1] }}
        >
          <button
            type="button"
            onClick={() => api.auth.logout()}
            className="w-full flex items-center gap-3 px-3 py-3 lg:py-2 rounded-xl text-[13px] text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            <span>{t.logout}</span>
          </button>
        </motion.div>
      </nav>

      <div className="p-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] lg:pb-4">
        <div className="text-[11px] text-muted-foreground/60 px-2">Lumio · Local</div>
      </div>
    </>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden w-[260px] h-full flex-col border-r border-border/50 bg-sidebar backdrop-blur-2xl shrink-0 transition-colors duration-300">
      <SidebarContent />
    </aside>
  )
}
