import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { FileText, FileSpreadsheet, Upload, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api, type Document } from '@/lib/api'
import { useDocuments } from '@/hooks/use-documents'
import { useQueryClient } from '@tanstack/react-query'
import { DocumentDetail } from '@/components/DocumentDetail'

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function Documents() {
  const shouldReduceMotion = useReducedMotion()
  const { data: docs, isLoading } = useDocuments()
  const queryClient = useQueryClient()
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadFileName, setUploadFileName] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [docToDelete, setDocToDelete] = useState<Document | null>(null)
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDelete = useCallback(async () => {
    if (!docToDelete) return
    setDeleting(true)
    try {
      await api.documents.delete(docToDelete.id)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setDocToDelete(null)
    } catch (e) {
      console.error('Delete failed', e)
    }
    setDeleting(false)
  }, [docToDelete, queryClient])

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    setUploadFileName(file.name)
    setUploadProgress(0)
    try {
      await api.documents.upload(file, undefined, (p) => setUploadProgress(p))
      toast.success(file.name, { description: 'Uploaded successfully' })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    } catch (e) {
      console.error('Upload failed', e)
      toast.error('Upload failed', { description: 'Please try again.' })
    }
    setUploading(false)
    setUploadProgress(0)
  }, [queryClient])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }, [handleUpload])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => setDragging(false)

  const handlePick = () => inputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    e.target.value = ''
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Documents</h1>
          <p className="text-muted-foreground text-sm mt-1">Upload and manage your files.</p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handlePick}
        className={`relative rounded-2xl border-2 border-dashed p-10 mb-8 text-center cursor-pointer transition-shadow duration-200 ${
          dragging
            ? 'border-accent bg-accent/5'
            : 'border-border/50 hover:border-border hover:bg-secondary/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.csv,.txt"
          className="hidden"
          onChange={handleFileChange}
        />

        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div
              key="uploading"
              initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
              exit={shouldReduceMotion ? {} : { opacity: 0 }}
              className="w-full max-w-sm flex flex-col items-center gap-4"
            >
              <div className="flex items-center gap-2.5 w-full">
                <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-accent" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-medium text-foreground truncate">{uploadFileName}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {uploadProgress}% · Uploading
                  </p>
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-accent/10 overflow-hidden">
                <div
                  className="h-full w-full rounded-full bg-accent"
                  style={{
                    transform: `scaleX(${uploadProgress / 100})`,
                    transformOrigin: 'left',
                    transition: shouldReduceMotion
                      ? 'none'
                      : 'transform 250ms cubic-bezier(0.23, 1, 0.32, 1)',
                  }}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={shouldReduceMotion ? {} : { opacity: 0 }}
              animate={shouldReduceMotion ? {} : { opacity: 1 }}
              exit={shouldReduceMotion ? {} : { opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-accent" strokeWidth={1.5} />
              </div>
              <p className="text-[13px] text-foreground font-medium">
                Drop a file here or click to browse
              </p>
              <p className="text-[12px] text-muted-foreground">
                PDF, CSV, or TXT — up to 10 MB
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card/50 rounded-2xl border border-border/20 p-4 animate-pulse">
              <div className="h-4 w-48 rounded bg-muted-foreground/20" />
            </div>
          ))}
        </div>
      ) : docs?.length === 0 ? (
        <motion.div
          className="bg-card rounded-2xl border border-border/50 shadow-sm p-12 flex flex-col items-center justify-center gap-4"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <FileText className="w-10 h-10 text-muted-foreground/40" strokeWidth={1} />
          <p className="text-sm font-medium text-foreground">No documents yet</p>
          <p className="text-[13px] text-muted-foreground">Upload a file above to get started.</p>
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
          <p className="text-[13px] text-muted-foreground mb-3">{docs?.length} document{docs?.length !== 1 ? 's' : ''}</p>
          <AnimatePresence mode="popLayout">
            {docs?.map((doc) => {
              const Icon = iconMap[doc.file_type] || FileText
              const color = colorMap[doc.file_type] || 'text-muted-foreground'
              return (
                <motion.div
                  key={doc.id}
                  layout
                  className="bg-card rounded-2xl border border-border/30 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } },
                  }}
                  exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                  whileHover={shouldReduceMotion ? {} : { y: -1 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                  onClick={() => {
                    setSelectedDoc(doc)
                    setDetailOpen(true)
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${color} shrink-0`} strokeWidth={1.5} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{doc.filename}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {doc.file_type.toUpperCase()} · {formatSize(doc.file_size)} · {formatDate(doc.updated_at)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDocToDelete(doc)
                      }}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      aria-label={`Delete ${doc.filename}`}
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}
      <DocumentDetail
        doc={selectedDoc}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setSelectedDoc(null)
        }}
      />
      <Dialog open={!!docToDelete} onOpenChange={(o) => !o && !deleting && setDocToDelete(null)}>
        <DialogContent className="rounded-2xl p-6 gap-0">
          <DialogHeader className="p-0">
            <DialogTitle className="text-[15px] font-semibold text-left">Delete file?</DialogTitle>
            <DialogDescription className="mt-1.5">
              <span className="font-medium text-foreground">{docToDelete?.filename}</span> will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 mt-6">
            <button
              onClick={() => setDocToDelete(null)}
              className="px-4 py-1.5 rounded-lg text-[12px] font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
              No
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
