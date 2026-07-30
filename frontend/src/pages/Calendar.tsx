import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar as CalendarIcon } from 'lucide-react'
import { useCalendarEvents } from '@/hooks/use-calendar'
import { EventDetail } from '@/components/EventDetail'
import type { CalendarEvent } from '@/lib/api'

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function Calendar() {
  const { data: events, isLoading } = useCalendarEvents()
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-1">Calendar</h1>
      <p className="text-muted-foreground text-sm mb-8">Your schedule at a glance.</p>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/50 rounded-2xl border border-border/20 p-5 animate-pulse">
              <div className="h-4 w-48 rounded bg-muted-foreground/20" />
              <div className="mt-2 h-3 w-32 rounded bg-muted-foreground/10" />
            </div>
          ))}
        </div>
      ) : events?.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-12 flex flex-col items-center justify-center gap-4">
          <CalendarIcon className="w-10 h-10 text-muted-foreground/40" strokeWidth={1} />
          <p className="text-sm font-medium text-foreground">No events yet</p>
          <p className="text-[13px] text-muted-foreground">Add events to see your calendar here.</p>
        </div>
      ) : (
        <motion.div
          className="space-y-3"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06 } },
          }}
        >
          {events?.map((event) => (
            <motion.div
              key={event.id}
              className="bg-white rounded-2xl border border-border/30 shadow-sm p-5 hover:shadow-md transition-all cursor-pointer"
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } },
              }}
              whileHover={{ y: -1 }}
              onClick={() => {
                setSelectedEvent(event)
                setDetailOpen(true)
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-foreground">{event.title}</h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {formatDate(event.start_time)} · {formatTime(event.start_time)} – {formatTime(event.end_time)}
                  </p>
                </div>
              </div>
              {event.description && (
                <p className="text-[13px] text-muted-foreground mt-2 ml-6">{event.description}</p>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      <EventDetail
        event={selectedEvent}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setSelectedEvent(null)
        }}
      />
    </div>
  )
}
