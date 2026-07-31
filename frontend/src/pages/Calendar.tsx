import { useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useCalendarEvents } from '@/hooks/use-calendar'
import { EventDetail } from '@/components/EventDetail'
import { EventDialog } from '@/components/EventDialog'
import { cn } from '@/lib/utils'
import type { CalendarEvent } from '@/lib/api'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function startOfDay(d: Date) {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(d: Date, n: number) {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function isSameDay(a: Date, b: Date) {
  return dateKey(a) === dateKey(b)
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function timeRange(event: CalendarEvent) {
  if (event.all_day) return 'All day'
  const start = new Date(event.start_time)
  const end = new Date(event.end_time)
  if (isSameDay(start, end)) {
    return `${formatTime(event.start_time)} – ${formatTime(event.end_time)}`
  }
  const short = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${short(start)} – ${short(end)}`
}

function dayLabel(d: Date) {
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export function Calendar() {
  const shouldReduceMotion = useReducedMotion()
  const { data: events, isLoading } = useCalendarEvents()
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogDate, setDialogDate] = useState<Date | null>(null)
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [dir, setDir] = useState(0)

  const today = startOfDay(new Date())
  const monthKey = `${viewDate.getFullYear()}-${viewDate.getMonth()}`

  const grid = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
    const start = addDays(first, -first.getDay())
    return Array.from({ length: 42 }, (_, i) => addDays(start, i))
  }, [viewDate])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events ?? []) {
      const start = startOfDay(new Date(event.start_time))
      const end = startOfDay(new Date(event.end_time))
      for (let day = start; day <= end; day = addDays(day, 1)) {
        const key = dateKey(day)
        const list = map.get(key)
        if (list) list.push(event)
        else map.set(key, [event])
      }
    }
    return map
  }, [events])

  const upcoming = useMemo(() => {
    const filtered = (events ?? [])
      .filter((e) => new Date(e.end_time) >= today)
      .slice()
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 12)
    const groups: { key: string; label: string; events: CalendarEvent[] }[] = []
    for (const event of filtered) {
      const key = dateKey(new Date(event.start_time))
      const last = groups[groups.length - 1]
      if (last && last.key === key) last.events.push(event)
      else groups.push({ key, label: dayLabel(new Date(event.start_time)), events: [event] })
    }
    return groups
  }, [events, today])

  const openEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setDetailOpen(true)
  }

  const goPrev = () => {
    setDir(-1)
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }

  const goNext = () => {
    setDir(1)
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  const goToday = () => {
    const now = new Date()
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  const openCreateDialog = (date: Date | null) => {
    setDialogDate(date)
    setDialogOpen(true)
  }

  const monthLabel = `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">Your schedule at a glance.</p>
        </div>
        <motion.button
          onClick={() => openCreateDialog(null)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-[13px] font-medium hover:bg-accent/90 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          New Event
        </motion.button>
      </div>

      {isLoading ? (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 w-full min-w-0 bg-card/50 rounded-2xl border border-border/20 p-5 animate-pulse">
            <div className="h-7 w-56 rounded bg-muted-foreground/20" />
            <div className="mt-5 grid grid-cols-7 gap-px">
              {Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="h-16 rounded bg-muted-foreground/10" />
              ))}
            </div>
          </div>
          <div className="w-full lg:w-80 shrink-0 bg-card/50 rounded-2xl border border-border/20 p-5 animate-pulse">
            <div className="h-4 w-24 rounded bg-muted-foreground/20" />
            <div className="mt-5 space-y-3">
              <div className="h-3 w-full rounded bg-muted-foreground/10" />
              <div className="h-3 w-3/4 rounded bg-muted-foreground/10" />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 w-full min-w-0">
            <div className="bg-card rounded-2xl border border-border/30 shadow-sm overflow-hidden">
              <div className="relative flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={goToday}
                    className="rounded-lg border border-border/50 bg-card px-3 py-1.5 text-[12px] font-medium text-foreground shadow-sm hover:bg-muted/60 active:scale-95 transition-all"
                  >
                    Today
                  </button>
                  <button
                    onClick={goPrev}
                    aria-label="Previous month"
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground active:scale-90 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={goNext}
                    aria-label="Next month"
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground active:scale-90 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.h2
                    key={monthKey}
                    initial={shouldReduceMotion ? {} : { opacity: 0, y: 6 }}
                    animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? {} : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: [0.42, 0, 0.58, 1] }}
                    className="absolute inset-x-0 text-center pointer-events-none text-[15px] font-semibold tracking-tight"
                  >
                    {monthLabel}
                  </motion.h2>
                </AnimatePresence>
                <div className="w-24 shrink-0" />
              </div>

              <div className="grid grid-cols-7 border-b border-border/30">
                {DAY_NAMES.map((name) => (
                  <div
                    key={name}
                    className="py-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {name}
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait" initial={false} custom={dir}>
                <motion.div
                  key={monthKey}
                  custom={dir}
                  initial={shouldReduceMotion ? {} : { opacity: 0, x: dir * 20 }}
                  animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
                  exit={shouldReduceMotion ? {} : { opacity: 0, x: dir * -20 }}
                  transition={{ duration: 0.2, ease: [0.42, 0, 0.58, 1] }}
                >
                  <div className="grid grid-cols-7">
                    {grid.map((day, i) => {
                      const inMonth = day.getMonth() === viewDate.getMonth()
                      const isToday = isSameDay(day, today)
                      const key = dateKey(day)
                      const dayEvents = (eventsByDay.get(key) ?? []).slice(0, 3)
                      const moreCount = (eventsByDay.get(key) ?? []).length - dayEvents.length
                      return (
                        <div
                          key={key}
                          className={cn(
                            'h-[92px] lg:h-[108px] overflow-hidden border-b border-r border-border/30 p-1.5 transition-colors cursor-pointer',
                            i % 7 === 6 && 'border-r-0',
                            i >= 35 && 'border-b-0',
                            !inMonth && 'bg-muted/20',
                            isToday && 'bg-accent/[0.04]',
                            'hover:bg-muted/40',
                          )}
                          onClick={() => openCreateDialog(day)}
                        >
                          <div className="flex items-center justify-center">
                            <span
                              className={cn(
                                'flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-medium',
                                isToday
                                  ? 'bg-accent text-white shadow-sm'
                                  : inMonth
                                    ? 'text-foreground'
                                    : 'text-muted-foreground/40',
                              )}
                            >
                              {day.getDate()}
                            </span>
                          </div>
                          <div className="mt-1.5 space-y-1 px-0.5">
                            {dayEvents.map((event) => (
                              <button
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEvent(event)
                                }}
                                className="block w-full truncate rounded-md px-1.5 py-[3px] text-left text-[10px] font-medium text-white hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: event.color }}
                              >
                                {event.title}
                              </button>
                            ))}
                            {moreCount > 0 && (
                              <p className="px-1.5 text-[10px] font-medium text-muted-foreground">
                                +{moreCount} more
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-card rounded-2xl border border-border/30 shadow-sm p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <CalendarIcon className="w-4.5 h-4.5 text-muted-foreground" strokeWidth={1.5} />
                <h2 className="text-[15px] font-semibold tracking-tight">Upcoming</h2>
              </div>

              {upcoming.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <CalendarIcon className="w-8 h-8 text-muted-foreground/30" strokeWidth={1} />
                  <p className="text-[13px] font-medium text-foreground">Nothing scheduled</p>
                  <p className="text-[12px] text-muted-foreground">You're all caught up.</p>
                </div>
              ) : (
                <motion.div
                  className="space-y-5"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.05 } },
                  }}
                >
                  {upcoming.map((group) => (
                    <div key={group.key}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        {group.label}
                      </p>
                      <div className="space-y-0.5">
                        {group.events.map((event) => (
                          <motion.button
                            key={event.id}
                            variants={{
                              hidden: { opacity: 0, x: -6 },
                              show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
                            }}
                            whileHover={shouldReduceMotion ? {} : { x: 2 }}
                            whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                            onClick={() => openEvent(event)}
                            className="w-full text-left flex items-start gap-3 rounded-xl px-2.5 py-2 hover:bg-muted/60 transition-colors"
                          >
                            <div
                              className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                              style={{ backgroundColor: event.color }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-medium text-foreground truncate">{event.title}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{timeRange(event)}</p>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}

      <EventDialog
        open={dialogOpen}
        initialDate={dialogDate}
        onClose={() => {
          setDialogOpen(false)
          setDialogDate(null)
        }}
      />

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
