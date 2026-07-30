import { motion } from 'framer-motion'
import { StickyNote } from 'lucide-react'
import { useNotes } from '@/hooks/use-notes'

export function NotesCard() {
  const { data: notes, isLoading } = useNotes()

  if (isLoading) {
    return (
      <div className="bg-white/50 rounded-2xl border border-border/20 p-6 animate-pulse">
        <div className="h-4 w-28 rounded bg-muted-foreground/20" />
        <div className="mt-5 space-y-2">
          <div className="h-14 rounded-xl bg-muted-foreground/10" />
          <div className="h-14 rounded-xl bg-muted-foreground/10" />
        </div>
      </div>
    )
  }

  const recentNotes = notes?.slice(0, 3) ?? []

  return (
    <motion.div
      className="bg-white rounded-2xl border border-border/30 shadow-sm p-6 hover:shadow-md transition-all duration-200"
      whileHover={{ y: -1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <StickyNote className="w-4.5 h-4.5 text-muted-foreground" strokeWidth={1.5} />
        <h2 className="text-[15px] font-semibold tracking-tight">Recent Notes</h2>
      </div>
      <div className="space-y-2">
        {recentNotes.length === 0 && (
          <p className="text-[13px] text-muted-foreground">No notes yet</p>
        )}
        {recentNotes.map((note) => {
          const [title, ...rest] = note.content.split('\n')
          const preview = rest.join(' ').slice(0, 60) || '...'
          return (
            <motion.div
              key={note.id}
              className="bg-secondary/50 rounded-xl px-4 py-3 hover:bg-secondary transition-colors cursor-pointer"
              whileHover={{ x: 2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <p className="text-[13px] font-medium text-foreground">{title}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">{preview}</p>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
