import { motion } from 'framer-motion'
import { FileText, FileSpreadsheet } from 'lucide-react'
import { useDocuments } from '@/hooks/use-documents'

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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function DocumentsCard() {
  const { data: documents, isLoading } = useDocuments()

  if (isLoading) {
    return (
      <div className="bg-card/50 rounded-2xl border border-border/20 p-6 animate-pulse">
        <div className="h-4 w-28 rounded bg-muted-foreground/20" />
        <div className="mt-5 space-y-3">
          <div className="h-4 w-full rounded bg-muted-foreground/10" />
          <div className="h-4 w-full rounded bg-muted-foreground/10" />
        </div>
      </div>
    )
  }

  const docs = documents?.slice(0, 3) ?? []

  return (
    <motion.div
      className="bg-card rounded-2xl border border-border/30 shadow-sm p-6 hover:shadow-md transition-shadow duration-200"
      whileHover={{ y: -1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <FileText className="w-4.5 h-4.5 text-muted-foreground" strokeWidth={1.5} />
        <h2 className="text-[15px] font-semibold tracking-tight">Documents</h2>
      </div>
      <div className="space-y-3">
        {docs.length === 0 && (
          <p className="text-[13px] text-muted-foreground">No documents yet</p>
        )}
        {docs.map((doc) => {
          const Icon = iconMap[doc.file_type] || FileText
          const color = colorMap[doc.file_type] || 'text-muted-foreground'
          return (
            <motion.div
              key={doc.id}
              className="flex items-center gap-3 group cursor-pointer"
              whileHover={{ x: 2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Icon className={`w-4.5 h-4.5 ${color} shrink-0`} strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{doc.filename}</p>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(doc.updated_at)}</span>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
