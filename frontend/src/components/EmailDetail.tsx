import { Mail, User, Clock } from 'lucide-react'
import type { Email } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface EmailDetailProps {
  email: Email | null
  open: boolean
  onClose: () => void
}

export function EmailDetail({ email, open, onClose }: EmailDetailProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl rounded-2xl p-0 gap-0 overflow-hidden">
        <div className="p-6 pb-4 border-b border-border/30">
          <DialogHeader className="p-0">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4.5 h-4.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
              <DialogTitle className="text-[15px] font-semibold text-left">
                {email?.subject || 'Email'}
              </DialogTitle>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-[13px]">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-accent" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-medium text-foreground">{email?.from_name || email?.from_email}</p>
              <p className="text-muted-foreground text-[12px]">{email?.from_email}</p>
            </div>
            <div className="flex items-center gap-1 ml-auto text-muted-foreground">
              <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="text-[12px]">
                {email?.received_at && new Date(email.received_at).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {email?.to && email.to.length > 0 && (
            <p className="text-[12px] text-muted-foreground">
              To: {email.to.join(', ')}
            </p>
          )}

          <div className="bg-secondary/30 rounded-xl p-4 text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
            {email?.body_text || 'No content'}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
