import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-[13px] leading-relaxed break-words [&_p:not(:last-child)]:mb-2 [&_h1]:mb-1 [&_h2]:mb-1 [&_h3]:mb-1 [&_h1]:text-[14px] [&_h2]:text-[14px] [&_h3]:text-[13px] [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_ul]:space-y-0.5 [&_ol]:space-y-0.5 [&_li]:my-0.5 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_hr]:border-border/50 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded-md [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_pre]:rounded-xl [&_pre]:bg-secondary/70 [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_table]:text-left [&_th]:font-semibold [&_td]:py-0.5">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{children}</ReactMarkdown>
    </div>
  )
}
