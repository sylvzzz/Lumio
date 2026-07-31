export function TopBar({ title }: { title: string }) {
  return (
    <header className="h-10 flex items-center justify-center px-6 border-b border-border/50 bg-card/80 backdrop-blur-2xl">
      <span className="text-[13px] font-medium text-muted-foreground">{title}</span>
    </header>
  )
}
