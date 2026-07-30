import { motion, useReducedMotion } from 'framer-motion'
import { CalendarCard } from '@/components/dashboard/CalendarCard'
import { NotesCard } from '@/components/dashboard/NotesCard'
import { DocumentsCard } from '@/components/dashboard/DocumentsCard'
import { EmailCard } from '@/components/dashboard/EmailCard'
import { TasksCard } from '@/components/dashboard/TasksCard'
import { SummaryCard } from '@/components/dashboard/SummaryCard'

const cards = [
  CalendarCard,
  NotesCard,
  DocumentsCard,
  EmailCard,
  TasksCard,
  SummaryCard,
]

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 20,
      mass: 0.8,
    },
  },
}

export function Dashboard() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      variants={shouldReduceMotion ? {} : container}
      initial={shouldReduceMotion ? undefined : "hidden"}
      animate={shouldReduceMotion ? undefined : "show"}
      className="grid grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-min"
    >
      {cards.map((Card, i) => (
        <motion.div key={i} variants={shouldReduceMotion ? {} : item}>
          <Card />
        </motion.div>
      ))}
    </motion.div>
  )
}
