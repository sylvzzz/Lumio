import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Bell, Settings } from 'lucide-react'

export function TopHeader() {
  const [searchFocused, setSearchFocused] = useState(false)

  return (
    <motion.div
      className="flex items-center justify-between mb-10"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.42, 0, 0.58, 1] }}
    >
      <div>
        <motion.h1
          className="text-3xl font-semibold tracking-tight text-foreground"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.42, 0, 0.58, 1] }}
        >
          Good morning, Alex.
        </motion.h1>
        <motion.p
          className="text-sm text-muted-foreground mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          Everything you need is ready.
        </motion.p>
      </div>
      <div className="flex items-center gap-3">
        <motion.div
          className="relative"
          animate={{ width: searchFocused ? 280 : 224 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search everything..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full h-9 bg-white rounded-xl border border-border/50 pl-9 pr-3 text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30 transition-shadow"
          />
        </motion.div>
        <motion.button
          className="w-9 h-9 rounded-xl bg-white border border-border/50 flex items-center justify-center hover:bg-secondary transition-colors relative"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Bell className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive">
            <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-50" />
          </span>
        </motion.button>
        <motion.button
          className="w-9 h-9 rounded-xl bg-white border border-border/50 flex items-center justify-center hover:bg-secondary transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Settings className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        </motion.button>
        <motion.div
          className="w-9 h-9 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-border cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-[13px] font-medium text-accent">A</span>
        </motion.div>
      </div>
    </motion.div>
  )
}
