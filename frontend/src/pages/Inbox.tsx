import { useState, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Inbox as InboxIcon, Archive } from 'lucide-react'
import { useEmails } from '@/hooks/use-emails'
import { EmailDetail } from '@/components/EmailDetail'
import type { Email } from '@/lib/api'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function Inbox() {
  const shouldReduceMotion = useReducedMotion()
  const { data: emails, isLoading } = useEmails()
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const dragStartX = useRef(0)
  const swipedId = useRef<string | null>(null)

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-1">Inbox</h1>
      <p className="text-muted-foreground text-sm mb-8">Your connected emails.</p>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card/50 rounded-2xl border border-border/20 p-4 animate-pulse">
              <div className="h-4 w-40 rounded bg-muted-foreground/20" />
              <div className="mt-1 h-3 w-64 rounded bg-muted-foreground/10" />
            </div>
          ))}
        </div>
      ) : emails?.length === 0 ? (
        <motion.div
          className="bg-card rounded-2xl border border-border/50 shadow-sm p-12 flex flex-col items-center justify-center gap-4"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <InboxIcon className="w-10 h-10 text-muted-foreground/40" strokeWidth={1} />
          <p className="text-sm font-medium text-foreground">No emails yet</p>
          <p className="text-[13px] text-muted-foreground">Connect Gmail or Outlook to see your inbox here.</p>
        </motion.div>
      ) : (
        <motion.div
          className="space-y-2"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.04 } },
          }}
        >
          <AnimatePresence mode="popLayout">
            {emails?.filter((e) => !dismissedIds.has(e.id)).map((email) => (
              <motion.div
                key={email.id}
                layout
                className="relative overflow-hidden rounded-2xl"
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } },
                }}
                exit={shouldReduceMotion ? {} : { opacity: 0, x: -200, transition: { duration: 0.2, ease: 'easeOut' } }}
                whileHover={shouldReduceMotion ? {} : { y: -1 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                drag={shouldReduceMotion ? false : "x"}
                dragConstraints={{ left: -300, right: 0 }}
                dragElastic={{ left: 0.5, right: 0 }}
                onDragStart={() => {
                  dragStartX.current = 0
                  swipedId.current = email.id
                }}
                onDragEnd={(_e, info) => {
                  const velocity = info.velocity.x
                  const offset = info.offset.x
                  const threshold = Math.max(80, Math.abs(velocity) * 0.5)
                  if (offset < -threshold) {
                    setDismissedIds((prev) => new Set(prev).add(email.id))
                  }
                  swipedId.current = null
                }}
                onClick={() => {
                  setSelectedEmail(email)
                  setDetailOpen(true)
                }}
              >
                <div className="absolute inset-0 bg-red-500/10 flex items-center justify-end pr-4 rounded-2xl">
                  <Archive className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                </div>
                <div className="bg-card rounded-2xl border border-border/30 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer relative">
                  <div className="flex items-center gap-3">
                    {!email.is_read && <div className="w-2 h-2 rounded-full bg-accent shrink-0" />}
                    {email.is_read && <div className="w-2 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-[13px] ${email.is_read ? 'font-medium' : 'font-semibold'} text-foreground`}>
                          {email.from_name || email.from_email}
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(email.received_at)}</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{email.subject}</p>
                      <p className="text-[12px] text-muted-foreground/60 mt-0.5 line-clamp-1">{email.body_text}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <EmailDetail
        email={selectedEmail}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setSelectedEmail(null)
        }}
      />
    </div>
  )
}
