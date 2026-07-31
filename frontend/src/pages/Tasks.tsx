import { useState, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { CheckSquare, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { useTasks } from '@/hooks/use-tasks'
import { api, type Task } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'active' | 'done'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'done', label: 'Done' },
]

export function Tasks() {
  const shouldReduceMotion = useReducedMotion()
  const { data: tasks, isLoading } = useTasks()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('all')
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)

  const activeCount = (tasks ?? []).filter((t) => !t.done).length
  const doneCount = (tasks ?? []).length - activeCount

  const visible = useMemo(() => {
    const sorted = [...(tasks ?? [])].sort(
      (a, b) => Number(a.done) - Number(b.done),
    )
    if (filter === 'all') return sorted
    return sorted.filter((t) => (filter === 'done' ? t.done : !t.done))
  }, [tasks, filter])

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

  const addTask = async () => {
    const title = input.trim()
    if (!title || adding) return
    setAdding(true)
    setInput('')
    try {
      await api.tasks.create({ title })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    } catch (e) {
      console.error(e)
    }
    setAdding(false)
  }

  const deleteTask = async (id: string) => {
    queryClient.setQueryData<Task[]>(['tasks'], (old) =>
      old?.filter((t) => t.id !== id) ?? old,
    )
    try {
      await api.tasks.delete(id)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    } catch (e) {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      console.error(e)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') addTask()
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-1">Tasks</h1>
      <p className="text-muted-foreground text-sm mb-8">Keep track of what matters.</p>

      {isLoading ? (
        <div className="bg-card/50 rounded-2xl border border-border/20 p-6 animate-pulse">
          <div className="h-4 w-40 rounded bg-muted-foreground/20" />
          <div className="mt-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-4.5 h-4.5 rounded-full bg-muted-foreground/10" />
                <div className="h-3 w-2/3 rounded bg-muted-foreground/10" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/30 shadow-sm">
          <div className="p-6 pb-0 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <CheckSquare className="w-4.5 h-4.5 text-muted-foreground" strokeWidth={1.5} />
              <h2 className="text-[15px] font-semibold tracking-tight">Your tasks</h2>
            </div>
            <div className="inline-flex items-center gap-1 bg-secondary/60 rounded-xl p-1 self-start sm:self-auto">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    'px-3.5 py-1 rounded-lg text-[12px] font-medium transition-colors',
                    filter === f.key
                      ? 'bg-card shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {f.label}
                  {f.key === 'all' && tasks && tasks.length > 0 && (
                    <span className="ml-1.5 text-[11px] text-muted-foreground/70">{tasks.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 pb-4">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a task..."
                className="flex-1 bg-secondary/50 rounded-xl border border-border/50 px-4 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30 transition-shadow"
              />
              <motion.button
                onClick={addTask}
                disabled={adding || !input.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-white text-[13px] font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                Add
              </motion.button>
            </div>
          </div>

          <div className="px-6 pb-2">
            <div className="flex items-center justify-between border-t border-border/30 pt-4 mb-1">
              <p className="text-[12px] font-medium text-muted-foreground">
                {activeCount > 0 ? `${activeCount} remaining` : 'All done'}
              </p>
              {doneCount > 0 && (
                <p className="text-[12px] text-muted-foreground/70">{doneCount} completed</p>
              )}
            </div>
          </div>

          <div className="px-6 pb-6">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground/30" strokeWidth={1} />
                <p className="text-[13px] font-medium text-foreground">
                  {tasks?.length === 0 ? 'No tasks yet' : 'Nothing here'}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {tasks?.length === 0
                    ? 'Add your first task to get started.'
                    : filter === 'done'
                      ? 'No completed tasks yet.'
                      : 'You\'re all caught up.'}
                </p>
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.04 } },
                }}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {visible.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      className="group flex items-center gap-3 rounded-xl px-2 py-2 -mx-2 hover:bg-muted/50 transition-colors"
                      variants={{
                        hidden: { opacity: 0, y: 6 },
                        show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
                      }}
                      exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                    >
                      <motion.button
                        onClick={() => toggleTask(task)}
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer text-left"
                        whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                      >
                        <div className="relative w-4.5 h-4.5 shrink-0">
                          <motion.div
                            className={cn(
                              'absolute inset-0 rounded-full border-2 transition-colors',
                              task.done ? 'bg-accent border-accent' : 'border-border group-hover:border-accent/50',
                            )}
                            animate={task.done ? { scale: [1, 1.3, 1] } : { scale: 1 }}
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
                          className={cn(
                            'text-[13px] truncate',
                            task.done ? 'text-muted-foreground' : 'text-foreground font-medium',
                          )}
                          animate={{ textDecoration: task.done ? 'line-through' : 'none' }}
                          transition={{ duration: 0.2 }}
                        >
                          {task.title}
                        </motion.span>
                      </motion.button>
                      <motion.button
                        onClick={() => deleteTask(task.id)}
                        aria-label="Delete task"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/5 transition-all"
                        whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
