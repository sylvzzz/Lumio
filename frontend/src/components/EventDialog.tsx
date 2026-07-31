import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const EVENT_COLORS = [
  '#0071e3', '#ff3b30', '#ff9f0a', '#ffcc00',
  '#34c759', '#5ac8fa', '#af52de', '#ff2d55',
]

interface EventDialogProps {
  open: boolean
  onClose: () => void
  initialDate?: Date | null
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toDateInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function EventDialog({ open, onClose, initialDate }: EventDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [color, setColor] = useState(EVENT_COLORS[0])
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('10:00')
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (open) {
      const base = initialDate ?? new Date()
      const date = toDateInput(base)
      setTitle('')
      setDescription('')
      setAllDay(false)
      setColor(EVENT_COLORS[0])
      setStartDate(date)
      setStartTime('09:00')
      setEndDate(date)
      setEndTime('10:00')
    }
  }, [open, initialDate])

  const startTimestamp = new Date(`${startDate}T${startTime}:00`).getTime()
  const endTimestamp = allDay
    ? new Date(`${endDate}T23:59:59`).getTime()
    : new Date(`${endDate}T${endTime}:00`).getTime()
  const valid = title.trim().length > 0 && endTimestamp > startTimestamp

  const handleSave = async () => {
    if (!valid) return
    setSaving(true)
    try {
      await api.calendar.create({
        title: title.trim(),
        description: description.trim(),
        start_time: new Date(`${startDate}T${allDay ? '00:00:00' : `${startTime}:00`}`).toISOString(),
        end_time: new Date(`${endDate}T${allDay ? '23:59:59' : `${endTime}:00`}`).toISOString(),
        all_day: allDay,
        color,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      onClose()
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6 gap-0">
        <DialogHeader className="p-0 mb-5">
          <DialogTitle className="text-[15px] font-semibold text-left">New Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            autoFocus
            className="w-full rounded-xl border border-border/50 bg-secondary/50 px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30 transition-shadow"
          />

          <div className="flex items-center justify-between px-1">
            <span className="text-[12px] font-medium text-muted-foreground">All day</span>
            <button
              onClick={() => setAllDay((v) => !v)}
              role="switch"
              aria-checked={allDay}
              className={cn(
                'relative h-6 w-10 rounded-full transition-colors',
                allDay ? 'bg-accent' : 'bg-muted-foreground/30',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                  allDay ? 'translate-x-[18px]' : 'translate-x-0.5',
                )}
              />
            </button>
          </div>

          <div className="flex items-center gap-3 px-1">
            <span className="w-10 text-[12px] font-medium text-muted-foreground shrink-0">Start</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 min-w-0 rounded-xl border border-border/50 bg-secondary/50 px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30 transition-shadow"
            />
            {!allDay && (
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-28 rounded-xl border border-border/50 bg-secondary/50 px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30 transition-shadow"
              />
            )}
          </div>

          <div className="flex items-center gap-3 px-1">
            <span className="w-10 text-[12px] font-medium text-muted-foreground shrink-0">End</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 min-w-0 rounded-xl border border-border/50 bg-secondary/50 px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30 transition-shadow"
            />
            {!allDay && (
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-28 rounded-xl border border-border/50 bg-secondary/50 px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30 transition-shadow"
              />
            )}
          </div>

          <div className="flex items-center gap-2 px-1 pt-1">
            {EVENT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={cn(
                  'h-6 w-6 rounded-full transition-transform hover:scale-110',
                  color === c && 'ring-2 ring-foreground/40 ring-offset-2 ring-offset-popover',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full rounded-xl border border-border/50 bg-secondary/50 px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30 resize-none transition-shadow"
          />
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-[12px] font-medium text-muted-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !valid}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
            {saving ? 'Adding...' : 'Add Event'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
