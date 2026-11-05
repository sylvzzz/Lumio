import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

type HastNode = {
  type: string
  value?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

function toWordSpans(node: HastNode) {
  if (!node.children) return
  const next: HastNode[] = []
  for (const child of node.children) {
    if (child.type === 'text' && child.value) {
      for (const part of child.value.split(/(\s+)/)) {
        if (!part) continue
        if (/^\s+$/.test(part)) {
          next.push({ type: 'text', value: part })
        } else {
          next.push({
            type: 'element',
            tagName: 'span',
            properties: { className: ['stream-word'] },
            children: [{ type: 'text', value: part }],
          })
        }
      }
    } else {
      toWordSpans(child)
      next.push(child)
    }
  }
  node.children = next
}

function rehypeStreamWords(options: { cursor: boolean }) {
  return (tree: HastNode) => {
    toWordSpans(tree)
    if (!options.cursor) return

    const words: HastNode[] = []
    const collect = (node: HastNode) => {
      const className = node.properties?.className
      if (
        node.type === 'element' &&
        Array.isArray(className) &&
        className.includes('stream-word')
      ) {
        words.push(node)
      }
      node.children?.forEach(collect)
    }
    collect(tree)

    const last = words.at(-1)
    if (last) {
      last.children = [
        ...(last.children ?? []),
        {
          type: 'element',
          tagName: 'span',
          properties: { className: ['stream-cursor'], 'aria-hidden': 'true' },
          children: [],
        },
      ]
    }
  }
}

export function Markdown({ children, streaming = false }: { children: string; streaming?: boolean }) {
  return (
    <div className={`text-[13px] leading-relaxed break-words [&_p:not(:last-child)]:mb-2 [&_h1]:mb-1 [&_h2]:mb-1 [&_h3]:mb-1 [&_h1]:text-[14px] [&_h2]:text-[14px] [&_h3]:text-[13px] [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_ul]:space-y-0.5 [&_ol]:space-y-0.5 [&_li]:my-0.5 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_hr]:border-border/50 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded-md [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_pre]:rounded-xl [&_pre]:bg-secondary/70 [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_table]:text-left [&_th]:font-semibold [&_td]:py-0.5 ${streaming ? 'streaming' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[[rehypeStreamWords, { cursor: streaming }]]}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
