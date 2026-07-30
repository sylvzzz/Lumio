import { FileText, FileSpreadsheet, Download, FileIcon } from 'lucide-react'
import type { Document } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DocumentDetailProps {
  doc: Document | null
  open: boolean
  onClose: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
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

function getDownloadUrl(doc: Document) {
  const base = '/api'
  return `${base}/documents/${doc.id}/download/`
}

export function DocumentDetail({ doc, open, onClose }: DocumentDetailProps) {
  if (!doc) return null

  const Icon = iconMap[doc.file_type] || FileIcon
  const color = colorMap[doc.file_type] || 'text-muted-foreground'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl rounded-2xl p-0 gap-0 overflow-hidden">
        <div className="p-6 pb-4 border-b border-border/30">
          <DialogHeader className="p-0">
            <div className="flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color} shrink-0`} strokeWidth={1.5} />
              <DialogTitle className="text-[15px] font-semibold text-left">
                {doc.filename}
              </DialogTitle>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
            <span>{doc.file_type.toUpperCase()}</span>
            <span>·</span>
            <span>{formatSize(doc.file_size)}</span>
            <span>·</span>
            <span>{formatDate(doc.created_at)}</span>
          </div>

          <div className="bg-secondary/30 rounded-xl p-4 text-[13px] text-foreground leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
            {doc.extracted_text || 'No text could be extracted from this file.'}
          </div>

          <a
            href={getDownloadUrl(doc)}
            download={doc.filename}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-[13px] font-medium hover:bg-accent/90 transition-colors"
          >
            <Download className="w-4 h-4" strokeWidth={1.5} />
            Download
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
