import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Search, Bell, Settings, FileText, StickyNote, Mail, Calendar, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface SearchResult {
  id: string
  type: 'note' | 'document' | 'email' | 'calendar'
  title: string
  preview: string
  url: string
}

const iconMap: Record<string, typeof StickyNote> = {
  note: StickyNote,
  document: FileText,
  email: Mail,
  calendar: Calendar,
}

const colorMap: Record<string, string> = {
  note: 'text-accent',
  document: 'text-red-500',
  email: 'text-blue-500',
  calendar: 'text-orange-500',
}

const labelMap: Record<string, string> = {
  note: 'Note',
  document: 'Document',
  email: 'Email',
  calendar: 'Event',
}

export function TopHeader() {
  const shouldReduceMotion = useReducedMotion()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search/?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results || [])
      setOpen(true)
    } catch {
      setResults([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, doSearch])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    navigate(result.url)
  }

  return (
    <motion.div
      className="flex items-center justify-between mb-10"
      initial={shouldReduceMotion ? {} : { opacity: 0, y: -8 }}
      animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.42, 0, 0.58, 1] }}
    >
      <div>
        <motion.h1
          className="text-3xl font-semibold tracking-tight text-foreground"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.42, 0, 0.58, 1] }}
        >
          Good morning, Alex.
        </motion.h1>
        <motion.p
          className="text-sm text-muted-foreground mt-1"
          initial={shouldReduceMotion ? {} : { opacity: 0 }}
          animate={shouldReduceMotion ? {} : { opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          Everything you need is ready.
        </motion.p>
      </div>
      <div className="flex items-center gap-3">
        <div ref={containerRef} className="relative">
          <motion.div
            className="relative"
            animate={{ width: open || query ? 320 : 224 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (results.length > 0) setOpen(true) }}
              placeholder="Search everything..."
              className="w-full h-9 bg-white rounded-xl border border-border/50 pl-9 pr-3 text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30 transition-shadow"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              </div>
            )}
          </motion.div>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 6, scale: 0.97 }}
                animate={shouldReduceMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
                exit={shouldReduceMotion ? {} : { opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.15, ease: [0.42, 0, 0.58, 1] }}
                className="absolute top-full right-0 mt-2 w-[480px] bg-white rounded-2xl border border-border/50 shadow-apple-lg overflow-hidden z-50"
                style={{ transformOrigin: 'top right' }}
              >
                {results.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-[13px] text-muted-foreground">No results found.</p>
                  </div>
                ) : (
                  <div className="py-2">
                    <p className="px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      {results.length} result{results.length !== 1 ? 's' : ''}
                    </p>
                    {results.map((result) => {
                      const Icon = iconMap[result.type] || StickyNote
                      const color = colorMap[result.type] || 'text-muted-foreground'
                      return (
                        <motion.button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleSelect(result)}
                          className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors text-left"
                          whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                        >
                          <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                            <Icon className={`w-4 h-4 ${color}`} strokeWidth={1.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium text-foreground truncate">
                                {result.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md shrink-0">
                                {labelMap[result.type]}
                              </span>
                            </div>
                            {result.preview && (
                              <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">
                                {result.preview}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-1.5" strokeWidth={1.5} />
                        </motion.button>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          className="w-9 h-9 rounded-xl bg-white border border-border/50 flex items-center justify-center hover:bg-secondary transition-colors relative"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          <Bell className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive">
            <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-50" />
          </span>
        </motion.button>
        <motion.button
          className="w-9 h-9 rounded-xl bg-white border border-border/50 flex items-center justify-center hover:bg-secondary transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          <Settings className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        </motion.button>
        <motion.div
          className="w-9 h-9 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-border cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          <span className="text-[13px] font-medium text-accent">A</span>
        </motion.div>
      </div>
    </motion.div>
  )
}
