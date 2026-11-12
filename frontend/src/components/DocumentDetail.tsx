import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FileText, FileSpreadsheet, Download, FileIcon, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Document } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useT, useLang } from '@/hooks/useUser'
import { localeOf } from '@/i18n'

interface DocumentDetailProps {
  doc: Document | null
  open: boolean
  onClose: () => void
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const iconMap: Record<string, typeof FileText> = {
  pdf: FileText,
  csv: FileSpreadsheet,
  txt: FileText,
}

const colorMap: Record<string, string> = {
  pdf: 'text-red-500',
  csv: 'text-green-600',
  txt: 'text-blue-500',
}

function getViewUrl(doc: Document) {
  return `/api/documents/${doc.id}/view/`
}

function getDownloadUrl(doc: Document) {
  return `/api/documents/${doc.id}/download/`
}

export function DocumentDetail({ doc, open, onClose }: DocumentDetailProps) {
  const t = useT()
  const locale = localeOf(useLang())
  const [deleting, setDeleting] = useState(false)
  const queryClient = useQueryClient()

  if (!doc) return null

  const Icon = iconMap[doc.file_type] || FileIcon
  const color = colorMap[doc.file_type] || 'text-muted-foreground'
  const isPdf = doc.file_type === 'pdf'

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.documents.delete(doc.id)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success(t.notifyDocumentDeleted.replace('{name}', () => doc.filename))
      onClose()
    } catch (e) {
      console.error(e)
      toast.error(t.actionFailed, { description: t.tryAgain })
    }
    setDeleting(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={`rounded-2xl p-0 gap-0 overflow-hidden ${isPdf ? 'sm:max-w-4xl max-h-[calc(100dvh_-_2rem)]' : 'sm:max-w-xl'}`}>
        <div className="p-4 sm:p-6 pb-4 border-b border-border/30 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <DialogHeader className="p-0 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <Icon className={`w-5 h-5 ${color} shrink-0`} strokeWidth={1.5} />
              <DialogTitle className="text-[15px] font-semibold text-left truncate">
                {doc.filename}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 min-h-11 sm:min-h-0 rounded-lg text-[12px] font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              {deleting ? t.deleting : t.delete}
            </button>
            <a
              href={getDownloadUrl(doc)}
              download={doc.filename}
              className="flex items-center gap-1.5 px-3 py-1.5 min-h-11 sm:min-h-0 rounded-lg bg-accent text-white text-[12px] font-medium hover:bg-accent/90 transition-colors"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
              {t.download}
            </a>
          </div>
        </div>

        <div className={isPdf ? '' : 'p-4 sm:p-6 space-y-4'}>
          {!isPdf && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
              <span>{doc.file_type.toUpperCase()}</span>
              <span>·</span>
              <span>{formatSize(doc.file_size)}</span>
              <span>·</span>
              <span>{formatDate(doc.created_at, locale)}</span>
            </div>
          )}

          {isPdf ? (
            <div className="w-full h-[60dvh] sm:h-[70vh] bg-canvas">
              <iframe
                src={getViewUrl(doc)}
                className="w-full h-full border-0"
                title={doc.filename}
              />
            </div>
          ) : (
            <div className="bg-secondary/30 rounded-xl p-4 text-[13px] text-foreground leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
              {doc.extracted_text || t.noExtractedText}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
