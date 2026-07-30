import { motion } from 'framer-motion'
import { Inbox } from 'lucide-react'
import { useEmails } from '@/hooks/use-emails'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function EmailCard() {
  const { data: emails, isLoading } = useEmails()

  if (isLoading) {
    return (
      <div className="bg-white/50 rounded-2xl border border-border/20 p-6 animate-pulse">
        <div className="h-4 w-20 rounded bg-muted-foreground/20" />
        <div className="mt-5 space-y-3">
          <div className="h-8 w-full rounded bg-muted-foreground/10" />
          <div className="h-8 w-full rounded bg-muted-foreground/10" />
        </div>
      </div>
    )
  }

  const recent = emails?.slice(0, 4) ?? []

  return (
    <motion.div
      className="bg-white rounded-2xl border border-border/30 shadow-sm p-6 hover:shadow-md transition-all duration-200"
      whileHover={{ y: -1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <Inbox className="w-4.5 h-4.5 text-muted-foreground" strokeWidth={1.5} />
        <h2 className="text-[15px] font-semibold tracking-tight">Inbox</h2>
      </div>
      <div className="space-y-3">
        {recent.length === 0 && (
          <p className="text-[13px] text-muted-foreground">No emails yet</p>
        )}
        {recent.map((email) => (
          <motion.div
            key={email.id}
            className="flex items-center gap-3 group cursor-pointer"
            whileHover={{ x: 2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {email.is_read ? (
              <div className="w-1.5 h-1.5 shrink-0" />
            ) : (
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-accent shrink-0"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <div className="flex-1 min-w-0">
              <span className={`text-[13px] ${email.is_read ? 'font-medium' : 'font-semibold'} text-foreground truncate block`}>
                {email.from_name || email.from_email}
              </span>
              <p className="text-[12px] text-muted-foreground truncate">{email.subject}</p>
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(email.received_at)}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
