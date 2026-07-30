import { Calendar, Clock } from 'lucide-react'
import type { CalendarEvent } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface EventDetailProps {
  event: CalendarEvent | null
  open: boolean
  onClose: () => void
}

export function EventDetail({ event, open, onClose }: EventDetailProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6 gap-0">
        <DialogHeader className="p-0 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: event?.color }} />
            <DialogTitle className="text-[15px] font-semibold text-left">
              {event?.title || 'Event'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
            <Calendar className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>
              {event?.start_time && new Date(event.start_time).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
            <Clock className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>
              {event?.start_time && new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              {' – '}
              {event?.end_time && new Date(event.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
          {event?.description && (
            <div className="bg-secondary/30 rounded-xl p-4 text-[13px] text-foreground leading-relaxed mt-2">
              {event.description}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
