import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2, Save } from 'lucide-react'
import { api, type Note } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface NoteDialogProps {
  note: Note | null
  open: boolean
  onClose: () => void
}

export function NoteDialog({ note, open, onClose }: NoteDialogProps) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (note) setContent(note.content)
    else setContent('')
  }, [note])

  const isNew = !note

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isNew) {
        await api.notes.create({ content })
      } else {
        await api.notes.update(note.id, { content })
      }
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      onClose()
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!note) return
    setSaving(true)
    try {
      await api.notes.delete(note.id)
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      onClose()
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-6 gap-0">
        <DialogHeader className="p-0 mb-4">
          <DialogTitle className="text-[15px] font-semibold text-left">
            {isNew ? 'New Note' : 'Edit Note'}
          </DialogTitle>
        </DialogHeader>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note..."
          className="w-full h-48 bg-secondary/50 rounded-xl border border-border/50 p-4 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30 resize-none transition-shadow"
          autoFocus
        />

        <div className="flex items-center justify-between mt-4">
          {!isNew && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-destructive hover:bg-destructive/5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              Delete
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-[12px] font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
