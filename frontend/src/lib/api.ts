const API_BASE = '/api'

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

async function mutate<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

export interface Note {
  id: string
  content: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id: string
  title: string
  description: string
  start_time: string
  end_time: string
  all_day: boolean
  color: string
}

export interface CalendarEventInput {
  title: string
  description: string
  start_time: string
  end_time: string
  all_day: boolean
  color: string
  timezone?: string
}

export interface Task {
  id: string
  title: string
  done: boolean
  created_at: string
  updated_at: string
}

export interface Email {
  id: string
  account: string
  subject: string
  from_email: string
  from_name: string
  to: string[]
  cc: string[]
  bcc: string[]
  body_text: string
  received_at: string
  is_read: boolean
  is_starred: boolean
}

export interface Document {
  id: string
  folder: string | null
  filename: string
  file_type: string
  file_size: number
  storage_path: string
  extracted_text: string
  created_at: string
  updated_at: string
}

export interface DocumentFolder {
  id: string
  name: string
  parent: string | null
  created_at: string
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  created_at: string
  updated_at?: string
}

export interface ChatMessage {
  id: string
  session: string
  role: 'user' | 'assistant'
  content: string
  sources: unknown[]
  created_at: string
}

export interface ChatSendResponse {
  id: string
  session: string
  role: 'user'
  content: string
  sources: unknown[]
  created_at: string
  ai_response: ChatMessage
}

export const api = {
  notes: {
    list: () => fetchJSON<Note[]>('/notes/'),
    get: (id: string) => fetchJSON<Note>(`/notes/${id}/`),
    create: (data: { content: string }) => mutate<Note>('/notes/', 'POST', data),
    update: (id: string, data: { content: string }) => mutate<Note>(`/notes/${id}/`, 'PATCH', data),
    delete: (id: string) => mutate<void>(`/notes/${id}/`, 'DELETE'),
  },
  calendar: {
    list: () => fetchJSON<CalendarEvent[]>('/calendar-events/'),
    create: (data: CalendarEventInput) => mutate<CalendarEvent>('/calendar-events/', 'POST', data),
  },
  emails: {
    list: () => fetchJSON<Email[]>('/emails/'),
  },
  tasks: {
    list: () => fetchJSON<Task[]>('/tasks/'),
    create: (data: { title: string }) => mutate<Task>('/tasks/', 'POST', data),
    update: (id: string, data: { title?: string; done?: boolean }) => mutate<Task>(`/tasks/${id}/`, 'PATCH', data),
    delete: (id: string) => mutate<void>(`/tasks/${id}/`, 'DELETE'),
  },
  documents: {
    list: () => fetchJSON<Document[]>('/documents/'),
    folders: () => fetchJSON<DocumentFolder[]>('/document-folders/'),
    delete: (id: string) => mutate<void>(`/documents/${id}/`, 'DELETE'),
    upload: (file: File, folder?: string, onProgress?: (percent: number) => void) =>
      new Promise<Document>((resolve, reject) => {
        const form = new FormData()
        form.append('file', file)
        if (folder) form.append('folder', folder)
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${API_BASE}/documents/`)
        if (onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              onProgress(Math.min(99, Math.round((e.loaded / e.total) * 99)))
            }
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText) as Document)
            } catch {
              reject(new Error('Invalid response'))
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`))
          }
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(form)
      }),
  },
  chat: {
    sessions: () => fetchJSON<ChatSession[]>('/chat-sessions/'),
    createSession: (title?: string) => mutate<ChatSession>('/chat-sessions/', 'POST', { title: title || 'New Chat' }),
    sendMessage: (session: string, content: string, timezone?: string) => mutate<ChatSendResponse>('/chat-messages/', 'POST', { session, content, role: 'user', timezone }),
  },
}
