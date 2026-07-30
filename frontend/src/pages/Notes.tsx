import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { StickyNote, Plus } from 'lucide-react'
import { useNotes } from '@/hooks/use-notes'
import { NoteDialog } from '@/components/NoteDialog'
import type { Note } from '@/lib/api'

export function Notes() {
  const { data: notes, isLoading } = useNotes()
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const openNote = useCallback((note: Note) => {
    setSelectedNote(note)
    setCreating(false)
    setDialogOpen(true)
  }, [])

  const createNote = useCallback(() => {
    setSelectedNote(null)
    setCreating(true)
    setDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setSelectedNote(null)
    setCreating(false)
  }, [])

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Notes</h1>
          <p className="text-muted-foreground text-sm mt-1">Quick thoughts and reminders.</p>
        </div>
        <motion.button
          onClick={createNote}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-[13px] font-medium hover:bg-accent/90 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          New Note
        </motion.button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/50 rounded-2xl border border-border/20 p-5 animate-pulse">
              <div className="h-4 w-40 rounded bg-muted-foreground/20" />
              <div className="mt-2 h-3 w-full rounded bg-muted-foreground/10" />
            </div>
          ))}
        </div>
      ) : notes?.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-12 flex flex-col items-center justify-center gap-4">
          <StickyNote className="w-10 h-10 text-muted-foreground/40" strokeWidth={1} />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No notes yet</p>
            <p className="text-[13px] text-muted-foreground mt-1">Create your first note to get started.</p>
          </div>
          <motion.button
            onClick={createNote}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-[13px] font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            Create Note
          </motion.button>
        </div>
      ) : (
        <motion.div
          className="space-y-3"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.05 } },
          }}
        >
          {notes?.map((note) => {
            const [title, ...rest] = note.content.split('\n')
            const preview = rest.join(' ').slice(0, 100) || '...'
            return (
              <motion.div
                key={note.id}
                className="bg-white rounded-2xl border border-border/30 shadow-sm p-5 hover:shadow-md transition-all cursor-pointer"
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } },
                }}
                whileHover={{ y: -1 }}
                onClick={() => openNote(note)}
              >
                <p className="text-[13px] font-medium text-foreground">{title}</p>
                {preview !== '...' && (
                  <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2">{preview}</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-3">
                  {new Date(note.updated_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  })}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      <NoteDialog
        note={creating ? null : selectedNote}
        open={dialogOpen}
        onClose={closeDialog}
      />
    </div>
  )
}
