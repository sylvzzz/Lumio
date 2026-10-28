import { motion } from 'framer-motion'
import { HelpCircle, BookOpen } from 'lucide-react'

const howToUse = `**Como usar o Lumio**

**O que é o Lumio?**
O Lumio é o teu workspace pessoal com IA. Centraliza notas, documentos, emails, calendário e tarefas num só lugar, com um assistente inteligente que tem acesso a todo o teu conteúdo.

**Primeiros passos**
1. Configura o teu perfil no primeiro acesso (nome, idade e género).
2. Carrega documentos (.PDF, .DOCX, .TXT, .MD) na secção Documentos.
3. Cria notas, eventos no calendário e tarefas conforme necessidades.
4. Usa o chat "Lumio" ou "Ask Lumio" para perguntar sobre o teu conteúdo.

**Funcionalidades principais**

**Notas**
- Cria e edita notas rapidamente
- Todas as notas são pesquisáveis pelo assistente

**Documentos**
- Upload de ficheiros suportados
- O Lumio lê e indexa o conteúdo para responder com base neles
- Pesquisa global em todos os documentos

**Calendário**
- Adiciona eventos com data, hora e descrição
- Visualiza a agenda no dashboard e na página Calendário

**Tarefas**
- Cria tarefas pendentes/concluídas
- Acompanha o que falta fazer no dashboard

**Chat com IA**
- Pergunta qualquer coisa sobre as tuas notas, documentos ou calendário
- O assistente responde com base no teu conteúdo quando relevante
- Podes ter conversas com histórico guardado

**Dicas**
- Sê específico nas perguntas para obter melhores respostas
- Carrega documentos importantes para o assistente os ter em contexto
- Usa a pesquisa global para encontrar rapidamente qualquer coisa
- O tema claro/escuro pode ser alterado no header`

const faqs = [
  {
    q: 'O que é o Lumio?',
    a: 'O Lumio é um workspace pessoal com IA que centraliza notas, documentos, emails, calendário e tarefas, com um assistente que responde com base no teu conteúdo.'
  },
  {
    q: 'Preciso de internet para usar?',
    a: 'Precisas de internet para o chat com IA (usa API do Groq). As notas, documentos e calendário ficam guardados localmente.'
  },
  {
    q: 'Que formatos de ficheiro são suportados?',
    a: 'PDF, DOCX, TXT e MD.'
  },
  {
    q: 'O Lumio guarda os meus dados onde?',
    a: 'Tudo fica guardado localmente na pasta data/ do backend (notas, calendário, tarefas, documentos e histórico de chat).'
  },
  {
    q: 'Como funciona o assistente?',
    a: 'Ao fazer perguntas, o Lumio pesquisa o teu conteúdo indexado e usa-o para dar respostas contextualizadas.'
  },
  {
    q: 'Posso apagar documentos?',
    a: 'Sim, podes apagar documentos na secção Documentos. Ao apagar, são removidos também do índice.'
  },
  {
    q: 'As notas aparecem nas respostas do chat?',
    a: 'Sim. Notas e eventos criados são automaticamente sincronizados e indexados para o assistente poder usá-los.'
  },
  {
    q: 'Como altero o tema?',
    a: 'Usa o botão de sol/lua no cabeçalho para alternar entre modo claro e escuro.'
  },
  {
    q: 'O que acontece se não tiver API key?',
    a: 'O chat com IA não funciona sem LLM_API_KEY configurada no backend/.env, mas podes continuar a usar notas, documentos e calendário normalmente.'
  },
]

export function FAQ() {
  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="w-6 h-6 text-accent" />
          <h1 className="text-3xl font-semibold tracking-tight">FAQ & Como Usar</h1>
        </div>
        <p className="text-muted-foreground">Tudo o que precisas saber sobre o Lumio</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl border border-border/50 mb-6 overflow-hidden"
      >
        <div className="flex items-center gap-2 p-4 border-b border-border/50">
          <BookOpen className="w-4 h-4 text-accent" />
          <h2 className="font-medium text-lg">Como usar o Lumio</h2>
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
          <h2 className="font-medium text-lg">Perguntas Frequentes</h2>
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
