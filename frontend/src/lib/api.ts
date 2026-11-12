const API_BASE = '/api'
// Without a session we go back to '/': AuthGate shows the login screen (password or Google).
const LOGIN_URL = '/'
export const GOOGLE_LOGIN_URL = `${API_BASE}/login`

function redirectToLogin(): never {
  window.location.href = LOGIN_URL
  throw new Error('unauthorized')
}

async function apiFetch(
  url: string,
  init: RequestInit = {},
  redirectOn401 = true,
): Promise<Response> {
  const res = await fetch(`${API_BASE}${url}`, {
    credentials: 'same-origin',
    ...init,
  })
  if (res.status === 401 && redirectOn401) {
    window.location.href = LOGIN_URL
  }
  return res
}

async function fetchJSON<T>(url: string, redirectOn401 = true): Promise<T> {
  const res = await apiFetch(url, {}, redirectOn401)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

async function mutate<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await apiFetch(url, {
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

/*
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
}*/

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

export interface SourceFile {
  document_id: string
  name: string
}

export interface ChatStreamHandlers {
  onSources?: (files: SourceFile[]) => void
  onDelta?: (text: string) => void
  onDone?: (response: { user: ChatMessage; ai_response: ChatMessage }) => void
  onError?: (error: Error) => void
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

export interface AuthUser {
  email: string
  name?: string
}

export type LoginErrorCode =
  | 'invalid' | 'rate_limited' | 'failed'
  | 'not_allowed' | 'email_taken' | 'too_short' | 'too_long' | 'too_weak' | 'invalid_email'
export class LoginError extends Error {
  code: LoginErrorCode
  retryAfter?: number
  constructor(code: LoginErrorCode, retryAfter?: number) {
    super(code)
    this.code = code
    this.retryAfter = retryAfter
  }
}

export type PasswordErrorCode =
  | 'too_short' | 'too_long' | 'too_weak' | 'wrong_current_password' | 'rate_limited' | 'failed'
export class PasswordError extends Error {
  code: PasswordErrorCode
  constructor(code: PasswordErrorCode) {
    super(code)
    this.code = code
  }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export const api = {
  auth: {
    me: () => fetchJSON<AuthUser>('/me', false),
    login: async (email: string, password: string): Promise<AuthUser> => {
      let res: Response
      try {
        res = await apiFetch('/auth/login', {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ email, password }),
        }, false)
      } catch {
        throw new LoginError('failed')
      }
      if (res.ok) return res.json()
      if (res.status === 401) throw new LoginError('invalid')
      if (res.status === 429) {
        throw new LoginError('rate_limited', Number(res.headers.get('Retry-After')) || undefined)
      }
      throw new LoginError('failed')
    },
    register: async (name: string, email: string, password: string): Promise<AuthUser> => {
      let res: Response
      try {
        res = await apiFetch('/auth/register', {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ name, email, password }),
        }, false)
      } catch {
        throw new LoginError('failed')
      }
      if (res.ok) return res.json()
      const detail = (await res.json().catch(() => ({})))?.detail
      if (res.status === 403) throw new LoginError('not_allowed')
      if (res.status === 409) throw new LoginError('email_taken')
      if (res.status === 422 && ['too_short', 'too_long', 'too_weak', 'invalid_email'].includes(detail)) {
        throw new LoginError(detail)
      }
      if (res.status === 429) {
        throw new LoginError('rate_limited', Number(res.headers.get('Retry-After')) || undefined)
      }
      throw new LoginError('failed')
    },
    passwordStrength: async (password: string, email: string, signal?: AbortSignal): Promise<number> => {
      const res = await apiFetch('/auth/password-strength', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ password, email }),
        signal,
      }, false)
      if (!res.ok) throw new Error(`strength: ${res.status}`)
      return (await res.json()).score as number
    },
    hasPassword: async (): Promise<boolean> =>
      (await fetchJSON<{ has_password: boolean }>('/auth/password')).has_password,
    setPassword: async (newPassword: string, currentPassword?: string): Promise<void> => {
      const res = await apiFetch('/auth/password', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ new_password: newPassword, current_password: currentPassword }),
      }, false)
      if (res.ok) return
      const detail = (await res.json().catch(() => ({})))?.detail
      if (res.status === 422 && (detail === 'too_short' || detail === 'too_long' || detail === 'too_weak')) {
        throw new PasswordError(detail)
      }
      if (res.status === 403) throw new PasswordError('wrong_current_password')
      if (res.status === 429) throw new PasswordError('rate_limited')
      throw new PasswordError('failed')
    },
    logout: async () => {
      try {
        await apiFetch('/logout', { method: 'POST' }, false)
      } finally {
        window.location.href = '/'
      }
    },
  },
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
    upload: (file: File, folder?: string) =>
      new Promise<Document>((resolve, reject) => {
        const form = new FormData()
        form.append('file', file)
        if (folder) form.append('folder', folder)
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${API_BASE}/documents/`)
        xhr.onload = () => {
          if (xhr.status === 401) return redirectToLogin()
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
    createSession: (title?: string) => mutate<ChatSession>('/chat-sessions/', 'POST', { title: title ?? '' }),
    sendMessage: (session: string, content: string, timezone?: string) => mutate<ChatSendResponse>('/chat-messages/', 'POST', { session, content, role: 'user', timezone }),
    streamMessage: async (
      session: string,
      content: string,
      timezone: string | undefined,
      handlers: ChatStreamHandlers,
    ) => {
      const res = await apiFetch('/chat-messages/stream/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, content, role: 'user', timezone }),
      })
      if (!res.ok || !res.body) throw new Error(`API error: ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const dispatch = (raw: string) => {
        let event = 'message'
        const dataLines: string[] = []
        for (const line of raw.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim()
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
        }
        if (dataLines.length === 0) return
        const data = JSON.parse(dataLines.join('\n'))
        if (event === 'sources') handlers.onSources?.(data.files ?? [])
        else if (event === 'delta') handlers.onDelta?.(data.text ?? '')
        else if (event === 'done') handlers.onDone?.(data)
        else if (event === 'error') handlers.onError?.(new Error(data.message ?? 'Stream failed'))
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let boundary = buffer.indexOf('\n\n')
        while (boundary >= 0) {
          const raw = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          if (raw.trim()) dispatch(raw)
          boundary = buffer.indexOf('\n\n')
        }
      }
    },
  },
}
