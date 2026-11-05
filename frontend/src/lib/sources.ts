import type { LocalMessage } from '@/hooks/use-chat-composer'
import type { SourceFile } from '@/lib/api'

const sourceCache = new WeakMap<object, SourceFile[]>()

export function sourceFiles(msg: LocalMessage): SourceFile[] {
  if (msg.files?.length) return msg.files
  const cached = sourceCache.get(msg)
  if (cached) return cached
  const files: SourceFile[] = []
  const seen = new Set<string>()
  for (const raw of msg.sources ?? []) {
    if (!raw || typeof raw !== 'object') continue
    const path = (raw as { file_path?: unknown }).file_path
    if (typeof path !== 'string') continue
    const base = path.split('/').pop() ?? path
    const name = base.replace(/^[0-9a-f]{32}_/, '')
    if (seen.has(name)) continue
    seen.add(name)
    files.push({ document_id: base, name })
  }
  sourceCache.set(msg, files)
  return files
}

