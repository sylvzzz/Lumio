import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import type { SourceFile } from '@/lib/api'
import { useT, useLang } from '@/hooks/useUser'
import { readSourcesLabel } from '@/i18n'

export function SourceRows({ files, animate }: { files: SourceFile[]; animate: boolean }) {
  const t = useT()
  const lang = useLang()
  const [visible, setVisible] = useState(animate ? 0 : files.length)
  const [read, setRead] = useState(animate ? 0 : files.length)
  const [collapsed, setCollapsed] = useState(!animate)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!animate) {
      setVisible(files.length)
      setRead(files.length)
      setCollapsed(files.length > 0)
      setExpanded(false)
      return
    }
    setVisible(0)
    setRead(0)
    setCollapsed(false)
    setExpanded(false)
    const timers: number[] = []
    files.forEach((_, i) => {
      timers.push(window.setTimeout(() => setVisible(i + 1), i * 320))
      timers.push(window.setTimeout(() => setRead(i + 1), i * 320 + 360))
    })
    const end = Math.max(0, files.length - 1) * 320 + 360
    timers.push(window.setTimeout(() => setCollapsed(true), end + 900))
    return () => timers.forEach(clearTimeout)
  }, [files, animate])

  if (files.length === 0) return null

  if (collapsed && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="-ml-1 mb-1.5 flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
      >
        <Check className="h-3 w-3 text-emerald-500" strokeWidth={2} />
        <span>{readSourcesLabel(lang, files.length)}</span>
        <ChevronDown className="h-3 w-3" strokeWidth={1.75} />
      </button>
    )
  }

  return (
    <div className="mb-1.5 space-y-0.5 text-[11px] text-muted-foreground">
      {files.map((file, i) => {
        if (i >= visible) return null
        const isRead = i < read
        return (
          <motion.div
            key={`${file.document_id}-${i}`}
            initial={{ opacity: 0, y: 1 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="-ml-1 flex items-center gap-1.5 px-1"
          >
            {isRead ? (
              <Check className="h-3 w-3 shrink-0 text-emerald-500" strokeWidth={2} />
            ) : (
              <Loader2 className="h-3 w-3 shrink-0 animate-spin" strokeWidth={1.75} />
            )}
            <span className="truncate">
              {isRead ? t.read : t.reading} {file.name}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
