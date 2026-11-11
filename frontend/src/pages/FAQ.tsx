import { motion } from 'framer-motion'
import { HelpCircle, BookOpen } from 'lucide-react'
import { useT, useLang } from '@/hooks/useUser'
import { faqHowToUse, faqItems } from '@/i18n'

export function FAQ() {
  const t = useT()
  const lang = useLang()
  const howToUse = faqHowToUse[lang]
  const faqs = faqItems[lang]

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="w-6 h-6 text-accent" />
          <h1 className="text-3xl font-semibold tracking-tight">{t.faqPageTitle}</h1>
        </div>
        <p className="text-muted-foreground">{t.faqPageSubtitle}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl border border-border/50 mb-6 overflow-hidden"
      >
        <div className="flex items-center gap-2 p-4 border-b border-border/50">
          <BookOpen className="w-4 h-4 text-accent" />
          <h2 className="font-medium text-lg">{t.howToUseTitle}</h2>
        </div>
        <div className="p-6">
          <div className="text-base leading-relaxed space-y-2">
            {howToUse.split('\n').map((line, i) => {
              if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={i} className="font-semibold text-lg mt-4 mb-2 first:mt-0">{line.replace(/\*\*/g, '')}</p>
              }
              if (line.match(/^\d+\./)) {
                return <p key={i} className="ml-4">{line}</p>
              }
              if (line.startsWith('- ')) {
                return <p key={i} className="ml-4">• {line.slice(2)}</p>
              }
              if (line.trim() === '') {
                return <div key={i} className="h-2" />
              }
              return <p key={i}>{line.replace(/\*\*/g, '')}</p>
            })}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl border border-border/50 overflow-hidden"
      >
        <div className="flex items-center gap-2 p-4 border-b border-border/50">
          <HelpCircle className="w-4 h-4 text-accent" />
          <h2 className="font-medium text-lg">{t.faqQuestionsTitle}</h2>
        </div>
        <div className="divide-y divide-border/50">
          {faqs.map((faq, i) => (
            <div key={i} className="p-4">
              <h3 className="font-medium mb-2">{faq.q}</h3>
              <p className="text-sm text-muted-foreground">{faq.a}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
