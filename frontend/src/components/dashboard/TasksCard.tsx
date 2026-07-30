import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare } from 'lucide-react'

const initialTasks = [
  { title: 'Review design system PR', done: false },
  { title: 'Prepare Q4 presentation', done: true },
  { title: 'Reply to Sarah about meeting', done: false },
  { title: 'Update project roadmap', done: false },
]

export function TasksCard() {
  const [tasks, setTasks] = useState(initialTasks)

  const toggle = (i: number) => {
    setTasks((prev) =>
      prev.map((t, idx) => (idx === i ? { ...t, done: !t.done } : t))
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-border/30 shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-2.5 mb-5">
        <CheckSquare className="w-4.5 h-4.5 text-muted-foreground" strokeWidth={1.5} />
        <h2 className="text-[15px] font-semibold tracking-tight">Today's Tasks</h2>
      </div>
      <div className="space-y-3">
        {tasks.map((task, i) => (
          <motion.div
            key={task.title}
            className="flex items-center gap-3 group cursor-pointer"
            onClick={() => toggle(i)}
            whileTap={{ scale: 0.97 }}
            layout
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="relative w-4.5 h-4.5 shrink-0">
              <motion.div
                className={`absolute inset-0 rounded-full border-2 transition-colors ${
                  task.done ? 'bg-accent border-accent' : 'border-border group-hover:border-accent/50'
                }`}
                animate={{
                  scale: task.done ? [1, 1.3, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
              >
                <AnimatePresence>
                  {task.done && (
                    <motion.svg
                      className="w-full h-full text-white p-0.5"
                      viewBox="0 0 12 12"
                      fill="none"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      exit={{ pathLength: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <path
                        d="M2 6L5 9L10 3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </motion.svg>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
            <motion.span
              className={`text-[13px] ${
                task.done ? 'text-muted-foreground' : 'text-foreground font-medium'
              }`}
              animate={{ textDecoration: task.done ? 'line-through' : 'none' }}
              transition={{ duration: 0.2 }}
            >
              {task.title}
            </motion.span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
