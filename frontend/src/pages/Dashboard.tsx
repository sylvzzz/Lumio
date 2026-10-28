import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, CheckSquare, FileText, StickyNote } from 'lucide-react'
import { api, type CalendarEvent, type Task, type Note, type Document } from '@/lib/api'
import { Link } from 'react-router-dom'

const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function Dashboard() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [documents, setDocuments] = useState<Document[]>([])

  useEffect(() => {
    api.calendar.list().then(setEvents).catch(() => {})
    api.tasks.list().then(setTasks).catch(() => {})
    api.notes.list().then(setNotes).catch(() => {})
    api.documents.list().then(setDocuments).catch(() => {})
  }, [])

  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startWeekDay = (firstDay.getDay() + 6) % 7

  const days = []
  for (let i = 0; i < startWeekDay; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const hasEvent = (day: number) => {
    if (!day) return false
    return events.some((e) => {
      const d = new Date(e.start_time)
      return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
  }

  const pendingTasks = tasks.filter((t) => !t.done).slice(0, 5)
  const recentNotes = notes.slice(0, 4)
  const recentDocs = documents.slice(0, 4)

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const todayEvents = events
    .filter((e) => {
      const d = new Date(e.start_time)
      return d.toDateString() === today.toDateString()
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-3 bg-card rounded-2xl border border-border/50 overflow-hidden"
        >
          <div className="flex items-center justify-between p-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              <h2 className="font-medium text-sm">
                {today.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
              </h2>
            </div>
            <Link to="/calendar" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Ver calendário
            </Link>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {weekDays.map((d) => (
                <div key={d} className="text-center text-[11px] text-muted-foreground py-0.5">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {days.slice(0, 35).map((day, i) => (
                <div
                  key={i}
                  className={`relative h-7 flex items-center justify-center text-xs rounded-md ${
                    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
                      ? 'bg-accent text-white'
                      : day
                      ? 'hover:bg-accent/5'
                      : ''
                  }`}
                >
                  {day && (
                    <>
                      {day}
                      {hasEvent(day) && day !== today.getDate() && (
                        <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-orange-500" />
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            {todayEvents.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                <p className="text-[11px] text-muted-foreground mb-1">Eventos hoje</p>
                {todayEvents.slice(0, 2).map((event) => (
                  <div key={event.id} className="flex items-center gap-2 text-[11px]">
                    <div className="w-0.5 h-3 rounded-full" style={{ backgroundColor: event.color || '#f97316' }} />
                    <span className="font-medium">{event.title}</span>
                    <span className="text-muted-foreground">{formatTime(event.start_time)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:col-span-2 bg-card rounded-2xl border border-border/50 overflow-hidden"
        >
          <div className="flex items-center justify-between p-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-green-500" />
              <h2 className="font-medium text-sm">Tarefas pendentes</h2>
            </div>
            <Link to="/tasks" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Ver tudo
            </Link>
          </div>
          <div className="p-3 space-y-0.5">
            {pendingTasks.length === 0 ? (
              <div className="text-center py-6">
                <CheckSquare className="w-7 h-7 text-muted-foreground/50 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Sem tarefas pendentes</p>
              </div>
            ) : (
              pendingTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-accent/5 transition-colors">
                  <div className="w-3 h-3 rounded-full border-2 border-border" />
                  <span className="text-xs flex-1 truncate">{task.title}</span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-card rounded-2xl border border-border/50 overflow-hidden"
        >
          <div className="flex items-center justify-between p-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-accent" />
              <h2 className="font-medium text-sm">Notas recentes</h2>
            </div>
            <Link to="/notes" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Ver tudo
            </Link>
          </div>
          <div className="p-3 space-y-1">
            {recentNotes.length === 0 ? (
              <div className="text-center py-5">
                <StickyNote className="w-7 h-7 text-muted-foreground/50 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Sem notas</p>
              </div>
            ) : (
              recentNotes.map((note) => (
                <div key={note.id} className="p-1.5 rounded-xl hover:bg-accent/5 transition-colors">
                  <p className="text-xs line-clamp-1 text-muted-foreground">
                    {note.content.replace(/\n/g, ' ').slice(0, 80)}
                  </p>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-card rounded-2xl border border-border/50 overflow-hidden"
        >
          <div className="flex items-center justify-between p-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-500" />
              <h2 className="font-medium text-sm">Documentos recentes</h2>
            </div>
            <Link to="/documents" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Ver tudo
            </Link>
          </div>
          <div className="p-3 space-y-0.5">
            {recentDocs.length === 0 ? (
              <div className="text-center py-5">
                <FileText className="w-7 h-7 text-muted-foreground/50 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Sem documentos</p>
              </div>
            ) : (
              recentDocs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-accent/5 transition-colors">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs flex-1 truncate">{doc.filename}</span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
