import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { CheckSquare, ChevronRight } from 'lucide-react'
import { useTasks } from '@/hooks/use-tasks'
import { api, type Task } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'

export function TasksCard() {
  const { data: tasks, isLoading } = useTasks()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const toggleTask = async (task: Task) => {
    queryClient.setQueryData<Task[]>(['tasks'], (old) =>
      old?.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)) ?? old,
    )
    try {
      await api.tasks.update(task.id, { done: !task.done })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    } catch (e) {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      console.error(e)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-card/50 rounded-2xl border border-border/20 p-6 animate-pulse">
        <div className="h-4 w-28 rounded bg-muted-foreground/20" />
        <div className="mt-5 space-y-3">
          <div className="h-3 w-full rounded bg-muted-foreground/10" />
          <div className="h-3 w-3/4 rounded bg-muted-foreground/10" />
        </div>
      </div>
    )
  }

  const visible = (tasks ?? [])
    .slice()
    .sort((a, b) => Number(a.done) - Number(b.done))
    .slice(0, 4)
  const remaining = (tasks ?? []).filter((t) => !t.done).length

  return (
    <motion.div
      className="bg-card rounded-2xl border border-border/30 shadow-sm p-6 hover:shadow-md transition-shadow duration-200"
      whileHover={{ y: -1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <CheckSquare className="w-4.5 h-4.5 text-muted-foreground" strokeWidth={1.5} />
        <h2 className="text-[15px] font-semibold tracking-tight">Today's Tasks</h2>
      </div>
      <div className="space-y-3">
        {visible.length === 0 && (
          <p className="text-[13px] text-muted-foreground">No tasks yet</p>
        )}
        {visible.map((task) => (
          <motion.div
            key={task.id}
            className="flex items-center gap-3 group cursor-pointer"
            onClick={() => toggleTask(task)}
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
              className={`text-[13px] truncate ${
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
      {remaining > 0 && (
        <p className="text-[11px] text-muted-foreground mt-4">{remaining} remaining</p>
      )}
      <motion.button
        onClick={() => navigate('/tasks')}
        className="mt-4 flex items-center gap-1 text-[12px] font-medium text-accent hover:text-accent/80 transition-colors"
        whileHover={{ x: 2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        View Tasks <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
      </motion.button>
    </motion.div>
  )
}
