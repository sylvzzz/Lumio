import { motion } from 'framer-motion'
import { Construction } from 'lucide-react'

export function Inbox() {
  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
          <Construction className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Em desenvolvimento</h1>
        <p className="text-muted-foreground max-w-md">
          A funcionalidade de emails ainda está em desenvolvimento. Em breve estará disponível.
        </p>
      </motion.div>
    </div>
  )
}
