import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Calendar, ChevronRight } from 'lucide-react'
import { useCalendarEvents } from '@/hooks/use-calendar'

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function CalendarCard() {
  const { data: events, isLoading } = useCalendarEvents()
  const navigate = useNavigate()

  const todayEvents = (events ?? [])
    .filter((e) => {
      const start = new Date(e.start_time)
      const end = new Date(e.end_time)
      const today = new Date()
      return (
        start.getFullYear() === today.getFullYear() &&
        start.getMonth() === today.getMonth() &&
        start.getDate() === today.getDate() &&
        end.getTime() > Date.now()
      )
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 3)

  if (isLoading) {
    return (
      <div className="bg-card/50 rounded-2xl border border-border/20 p-6 animate-pulse">
        <div className="h-4 w-28 rounded bg-muted-foreground/20" />
        <div className="mt-5 space-y-3">
          <div className="h-3 w-full rounded bg-muted-foreground/10" />
          <div className="h-3 w-3/4 rounded bg-muted-foreground/10" />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="bg-card rounded-2xl border border-border/30 shadow-sm p-6 hover:shadow-md transition-shadow duration-200"
      whileHover={{ y: -1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4.5 h-4.5 text-muted-foreground" strokeWidth={1.5} />
          <h2 className="text-[15px] font-semibold tracking-tight">Today's Schedule</h2>
        </div>
      </div>
      <div className="space-y-3">
        {todayEvents.length === 0 && (
          <p className="text-[13px] text-muted-foreground">No events today</p>
        )}
        {todayEvents.map((event, i) => (
          <motion.div
            key={event.id}
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
            <span className="text-[13px] text-muted-foreground w-16 shrink-0">{formatTime(event.start_time)}</span>
            <span className="text-[13px] font-medium text-foreground">{event.title}</span>
          </motion.div>
        ))}
      </div>
      <motion.button
        onClick={() => navigate('/calendar')}
        className="mt-5 flex items-center gap-1 text-[12px] font-medium text-accent hover:text-accent/80 transition-colors"
        whileHover={{ x: 2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        View Calendar <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
      </motion.button>
    </motion.div>
  )
}
