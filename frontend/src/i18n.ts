// Central i18n module: the ONLY place with UI strings.
// All components read translations through useT() (hooks/useUser.ts),
// which derives the language from the user's configured settings.

export type Lang = 'pt' | 'en'

const pt = {
  // nav / sidebar
  navHome: 'Início',
  navCalendar: 'Calendário',
  navNotes: 'Notas',
  navDocuments: 'Documentos',
  navEmails: 'Emails',
  navTasks: 'Tarefas',
  navLumio: 'Lumio',
  navFaq: 'FAQ',
  navSettings: 'Definições',
  logout: 'Terminar sessão',

  // top header
  greetingMorning: 'Bom dia',
  greetingAfternoon: 'Boa tarde',
  greetingEvening: 'Boa noite',
  welcomeBack: 'Bem-vindo de volta!',
  searchPlaceholder: 'Pesquisar páginas, notas, documentos...',
  settingsTitle: 'Definições',
  lightTheme: 'Tema claro',
  darkTheme: 'Tema escuro',

  // AI panel / chat
  aiSubtitle: 'O teu assistente pessoal de IA',
  newChat: 'Nova conversa',
  closePanel: 'Fechar painel',
  send: 'Enviar mensagem',
  askAnything: 'Pergunta-me qualquer coisa sobre as tuas notas, documentos ou calendário.',
  askLumio: 'Pergunta ao Lumio qualquer coisa.',
  askLumioButton: 'Perguntar ao Lumio',
  askLumioPanel: 'Perguntar ao Lumio',
  openMenu: 'Abrir menu',
  closeMenu: 'Fechar menu',
  openChat: 'Abrir chat',
  chatAriaLabel: 'Chat do Lumio',
  menuAriaLabel: 'Menu',
  streamError: 'Desculpa, algo correu mal.',
  sendError: 'Desculpa, não consegui completar a resposta.',

  // source rows
  reading: 'A ler',
  read: 'Leu',

  // dashboard
  viewCalendar: 'Ver calendário',
  viewAll: 'Ver tudo',
  todaysEvents: 'Eventos hoje',
  pendingTasks: 'Tarefas pendentes',
  noPendingTasks: 'Sem tarefas pendentes',
  recentNotes: 'Notas recentes',
  noNotes: 'Sem notas',
  recentDocuments: 'Documentos recentes',
  noDocuments: 'Sem documentos',

  // notes
  notesTitle: 'Notas',
  notesSubtitle: 'Notas rápidas e lembretes.',
  newNote: 'Nova nota',
  noNotesYet: 'Ainda sem notas',
  createFirstNote: 'Cria a tua primeira nota para começar.',
  createNote: 'Criar nota',
  editNote: 'Editar nota',
  notePlaceholder: 'Escreve a tua nota...',

  // dialogs (shared)
  cancel: 'Cancelar',
  delete: 'Apagar',
  deleting: 'A apagar...',
  save: 'Guardar',
  saving: 'A guardar...',

  // tasks
  tasksTitle: 'Tarefas',
  tasksSubtitle: 'Mantém o controlo do que importa.',
  filterAll: 'Todas',
  filterActive: 'Ativas',
  filterDone: 'Concluídas',
  yourTasks: 'As tuas tarefas',
  addTaskPlaceholder: 'Adiciona uma tarefa...',
  add: 'Adicionar',
  taskRemaining: 'pendente',
  tasksRemaining: 'pendentes',
  allDone: 'Tudo feito',
  taskCompleted: 'concluída',
  tasksCompleted: 'concluídas',
  noTasksYet: 'Ainda sem tarefas',
  nothingHere: 'Nada aqui',
  addFirstTask: 'Adiciona a tua primeira tarefa para começar.',
  noCompletedTasks: 'Ainda não tens tarefas concluídas.',
  tasksCaughtUp: 'Está tudo em ordem.',
  deleteTask: 'Apagar tarefa',

  // calendar
  calendarTitle: 'Calendário',
  calendarSubtitle: 'A tua agenda num relance.',
  newEvent: 'Novo evento',
  today: 'Hoje',
  tomorrow: 'Amanhã',
  yesterday: 'Ontem',
  prevMonth: 'Mês anterior',
  nextMonth: 'Mês seguinte',
  upcoming: 'Próximos',
  nothingScheduled: 'Nada agendado',
  calendarCaughtUp: 'Está tudo em ordem.',
  more: 'mais',
  allDay: 'Todo o dia',
  eventTitlePlaceholder: 'Título do evento',
  start: 'Início',
  end: 'Fim',
  descriptionOptional: 'Descrição (opcional)',
  adding: 'A adicionar...',
  addEvent: 'Adicionar evento',
  event: 'Evento',

  // documents
  documentsTitle: 'Documentos',
  documentsSubtitle: 'Carrega e gere os teus ficheiros.',
  dropFile: 'Larga um ficheiro aqui ou clica para procurar',
  fileTypesHint: 'PDF, CSV ou TXT — até 10 MB',
  uploading: 'A carregar',
  uploadedSuccessfully: 'Carregado com sucesso',
  uploadFailed: 'Falha no upload',
  tryAgain: 'Tenta outra vez.',
  noDocumentsYet: 'Ainda sem documentos',
  uploadFirstDocument: 'Carrega um ficheiro acima para começar.',
  document: 'documento',
  documents: 'documentos',
  deleteFile: 'Apagar ficheiro?',
  deleteFileConfirm: 'será apagado permanentemente.',
  no: 'Não',
  download: 'Descarregar',
  noExtractedText: 'Não foi possível extrair texto deste ficheiro.',

  // inbox
  inboxTitle: 'Em desenvolvimento',
  inboxText: 'A funcionalidade de emails ainda está em desenvolvimento. Em breve estará disponível.',

  // settings
  settingsPageTitle: 'Definições',
  settingsSubtitle: 'Personaliza a tua experiência no Lumio',
  profile: 'Perfil',
  name: 'Nome',
  age: 'Idade',
  gender: 'Género',
  notSpecified: 'Não especificado',
  male: 'Masculino',
  female: 'Feminino',
  preferNotToSay: 'Prefiro não dizer',
  appearance: 'Aparência',
  theme: 'Tema',
  light: 'Claro',
  dark: 'Escuro',
  system: 'Sistema',
  language: 'Idioma',
  saveProfile: 'Guardar perfil',
  unsavedChanges: 'Tens alterações por guardar',
  apiKeyTitle: 'API Key',
  apiKeyDescription: 'Configura a tua chave API para usar o assistente IA',
  apiKeyPlaceholder: 'Insere a tua API key',
  provider: 'Provider',
  saveApiKey: 'Guardar API Key',
  settingsSaved: 'Alterações guardadas',
  settingsSavedDescription: 'As tuas definições foram guardadas com sucesso.',
  settingsError: 'Erro ao guardar definições',
  apiKeySaved: 'API Key guardada',
  apiKeySavedDescription: 'A tua chave foi guardada com sucesso.',
  apiKeyError: 'Erro ao guardar a API Key',

  // onboarding
  step: 'Passo',
  of: 'de',
  back: 'Voltar',
  whatsYourName: 'Como te queres chamar?',
  nameHelper: 'O nome que vamos usar para te tratar',
  namePlaceholder: 'Nome...',
  continue: 'Continuar',
  howOld: 'Qual a tua idade?',
  optional: 'Opcional',
  selectAge: 'Seleccionar idade',
  skip: 'Saltar',
  genderTitle: 'Género/Sexo',
  paidServiceTitle: 'Tens algum serviço de IA pago?',
  paidServiceHelper: 'Groq, OpenAI ou DeepSeek',
  yes: 'Sim',
  no2: 'Não',
  finalize: 'Finalizar',
  configureApiKey: 'Configurar API Key',
  apiKeyHelper: 'Escolhe o provider e insere a tua key',
  selectProvider: 'Seleccionar provider',
  apiKeyInputPlaceholder: 'API Key...',
  saveAndFinish: 'Guardar e finalizar',

  // intro
  introTagline: 'O teu workspace pessoal com IA. Centraliza notas, documentos, emails e calendário num só lugar.',
  start: 'Começar',
  startNow: 'Começar agora',
  whyTitle: 'Porquê usar o Lumio?',
  whyText: 'Em vez de ter tudo espalhado por diferentes apps, o Lumio junta tudo num workspace inteligente. O teu assistente IA tem acesso a todo o teu conteúdo e ajuda-te a encontrar, resumir e organizar sem perder tempo à procura.',
  privacyNote: 'Tudo no teu dispositivo. Simples, rápido e privado.',
  introMorning: 'Bom dia, Diogo',
  introReady: 'Tudo o que precisas está pronto.',
  introSearch: 'Pesquisar tudo...',
  quickAccess: 'Acesso rápido',
  introRecentNotes: 'Notas Recentes',
  introTodayAgenda: 'Agenda Hoje',
  introChatQuestion: 'O que diz o documento "Relatório Progresso.pdf" sobre o prazo?',
  introChatAnswer: 'No Relatório Progresso.pdf, o prazo para conclusão da fase 2 foi definido para 15 de Novembro de 2025. Foi também mencionado que serão necessários testes antes da entrega.',
  featureAI: 'IA Inteligente',
  featureAIDesc: 'Assistente que entende todo o teu conteúdo e responde com contexto',
  featureDocs: 'Documentos',
  featureDocsDesc: 'Carrega PDFs, Word, TXT e pesquisa em todos eles',
  featureNotes: 'Notas',
  featureNotesDesc: 'Organiza as tuas ideias num só lugar',
  featureCalendar: 'Calendário',
  featureCalendarDesc: 'Gere os teus eventos e compromissos',
  featureEmails: 'Emails',
  featureEmailsDesc: 'Tudo centralizado na tua caixa de entrada',
  featureChat: 'Chat com contexto',
  featureChatDesc: 'Pergunta ao Lumio sobre qualquer coisa que guardaste',

  // not found
  notFoundTitle: 'Página não encontrada',
  notFoundText: 'Esta página não existe ou foi movida.',
  goBack: 'Voltar',
  goHome: 'Ir para início',

  // auth error
  restrictedAccess: 'Acesso restrito',
  somethingWrong: 'Algo correu mal',
  restrictedText: 'Esta conta não tem acesso ao Lumio.',
  somethingWrongText: 'Algo correu mal... tenta outra vez.',
  tryAnotherAccount: 'Tentar outra conta',
  tryAgainShort: 'Tentar novamente',

  // lumio page
  lumioGreeting: 'Como posso ajudar?',
  lumioSubtitle: 'Pergunta-me qualquer coisa sobre as tuas notas, documentos e calendário.',
  lumioPlaceholder: 'Escreve a tua mensagem...',

  // FAQ
  faqPageTitle: 'FAQ & Como Usar',
  faqPageSubtitle: 'Tudo o que precisas saber sobre o Lumio',
  howToUseTitle: 'Como usar o Lumio',
  faqQuestionsTitle: 'Perguntas Frequentes',
} as const

export type TextKey = keyof typeof pt

// Compile-time parity: `en` must define exactly the same keys as `pt`.
const en: Record<TextKey, string> = {
  navHome: 'Home',
  navCalendar: 'Calendar',
  navNotes: 'Notes',
  navDocuments: 'Documents',
  navEmails: 'Emails',
  navTasks: 'Tasks',
  navLumio: 'Lumio',
  navFaq: 'FAQ',
  navSettings: 'Settings',
  logout: 'Log out',

  greetingMorning: 'Good morning',
  greetingAfternoon: 'Good afternoon',
  greetingEvening: 'Good evening',
  welcomeBack: 'Welcome back!',
  searchPlaceholder: 'Search pages, notes, documents...',
  settingsTitle: 'Settings',
  lightTheme: 'Light theme',
  darkTheme: 'Dark theme',

  aiSubtitle: 'Your personal AI assistant',
  newChat: 'New Chat',
  closePanel: 'Close panel',
  send: 'Send message',
  askAnything: 'Ask me anything about your notes, documents, emails, or calendar.',
  askLumio: 'Ask Lumio anything.',
  askLumioButton: 'Ask Lumio',
  askLumioPanel: 'Ask Lumio',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  openChat: 'Open chat',
  chatAriaLabel: 'Lumio chat',
  menuAriaLabel: 'Menu',
  streamError: 'Sorry, something went wrong.',
  sendError: "Sorry, I couldn't complete that answer.",

  reading: 'Reading',
  read: 'Read',

  viewCalendar: 'View calendar',
  viewAll: 'View all',
  todaysEvents: "Today's events",
  pendingTasks: 'Pending tasks',
  noPendingTasks: 'No pending tasks',
  recentNotes: 'Recent notes',
  noNotes: 'No notes',
  recentDocuments: 'Recent documents',
  noDocuments: 'No documents',

  notesTitle: 'Notes',
  notesSubtitle: 'Quick thoughts and reminders.',
  newNote: 'New Note',
  noNotesYet: 'No notes yet',
  createFirstNote: 'Create your first note to get started.',
  createNote: 'Create Note',
  editNote: 'Edit Note',
  notePlaceholder: 'Write your note...',

  cancel: 'Cancel',
  delete: 'Delete',
  deleting: 'Deleting...',
  save: 'Save',
  saving: 'Saving...',

  tasksTitle: 'Tasks',
  tasksSubtitle: 'Keep track of what matters.',
  filterAll: 'All',
  filterActive: 'Active',
  filterDone: 'Done',
  yourTasks: 'Your tasks',
  addTaskPlaceholder: 'Add a task...',
  add: 'Add',
  taskRemaining: 'remaining',
  tasksRemaining: 'remaining',
  allDone: 'All done',
  taskCompleted: 'completed',
  tasksCompleted: 'completed',
  noTasksYet: 'No tasks yet',
  nothingHere: 'Nothing here',
  addFirstTask: 'Add your first task to get started.',
  noCompletedTasks: 'No completed tasks yet.',
  tasksCaughtUp: "You're all caught up.",
  deleteTask: 'Delete task',

  calendarTitle: 'Calendar',
  calendarSubtitle: 'Your schedule at a glance.',
  newEvent: 'New Event',
  today: 'Today',
  tomorrow: 'Tomorrow',
  yesterday: 'Yesterday',
  prevMonth: 'Previous month',
  nextMonth: 'Next month',
  upcoming: 'Upcoming',
  nothingScheduled: 'Nothing scheduled',
  calendarCaughtUp: "You're all caught up.",
  more: 'more',
  allDay: 'All day',
  eventTitlePlaceholder: 'Event title',
  start: 'Start',
  end: 'End',
  descriptionOptional: 'Description (optional)',
  adding: 'Adding...',
  addEvent: 'Add Event',
  event: 'Event',

  documentsTitle: 'Documents',
  documentsSubtitle: 'Upload and manage your files.',
  dropFile: 'Drop a file here or click to browse',
  fileTypesHint: 'PDF, CSV or TXT — up to 10 MB',
  uploading: 'Uploading',
  uploadedSuccessfully: 'Uploaded successfully',
  uploadFailed: 'Upload failed',
  tryAgain: 'Please try again.',
  noDocumentsYet: 'No documents yet',
  uploadFirstDocument: 'Upload a file above to get started.',
  document: 'document',
  documents: 'documents',
  deleteFile: 'Delete file?',
  deleteFileConfirm: 'will be permanently deleted.',
  no: 'No',
  download: 'Download',
  noExtractedText: 'No text could be extracted from this file.',

  inboxTitle: 'Under development',
  inboxText: 'The email feature is still under development. It will be available soon.',

  settingsPageTitle: 'Settings',
  settingsSubtitle: 'Personalize your Lumio experience',
  profile: 'Profile',
  name: 'Name',
  age: 'Age',
  gender: 'Gender',
  notSpecified: 'Not specified',
  male: 'Male',
  female: 'Female',
  preferNotToSay: 'Prefer not to say',
  appearance: 'Appearance',
  theme: 'Theme',
  light: 'Light',
  dark: 'Dark',
  system: 'System',
  language: 'Language',
  saveProfile: 'Save profile',
  unsavedChanges: 'You have unsaved changes',
  apiKeyTitle: 'API Key',
  apiKeyDescription: 'Configure your API key to use the AI assistant',
  apiKeyPlaceholder: 'Enter your API key',
  provider: 'Provider',
  saveApiKey: 'Save API Key',
  settingsSaved: 'Changes saved',
  settingsSavedDescription: 'Your settings were saved successfully.',
  settingsError: 'Error saving settings',
  apiKeySaved: 'API Key saved',
  apiKeySavedDescription: 'Your key was saved successfully.',
  apiKeyError: 'Error saving API Key',

  step: 'Step',
  of: 'of',
  back: 'Back',
  whatsYourName: 'What should we call you?',
  nameHelper: 'The name we will use to address you',
  namePlaceholder: 'Name...',
  continue: 'Continue',
  howOld: 'How old are you?',
  optional: 'Optional',
  selectAge: 'Select age',
  skip: 'Skip',
  genderTitle: 'Gender/Sex',
  paidServiceTitle: 'Do you have a paid AI service?',
  paidServiceHelper: 'Groq, OpenAI or DeepSeek',
  yes: 'Yes',
  no2: 'No',
  finalize: 'Finish',
  configureApiKey: 'Configure API Key',
  apiKeyHelper: 'Choose the provider and enter your key',
  selectProvider: 'Select provider',
  apiKeyInputPlaceholder: 'API Key...',
  saveAndFinish: 'Save and finish',

  introTagline: 'Your personal AI workspace. Notes, documents, emails and calendar, all in one place.',
  start: 'Get started',
  startNow: 'Get started now',
  whyTitle: 'Why use Lumio?',
  whyText: 'Instead of having everything scattered across different apps, Lumio brings it all together in one smart workspace. Your AI assistant has access to all your content and helps you find, summarize and organize it without wasting time searching.',
  privacyNote: 'Everything on your device. Simple, fast and private.',
  introMorning: 'Good morning, Diogo',
  introReady: 'Everything you need is ready.',
  introSearch: 'Search everything...',
  quickAccess: 'Quick access',
  introRecentNotes: 'Recent Notes',
  introTodayAgenda: "Today's Schedule",
  introChatQuestion: 'What does the "Progress Report.pdf" document say about the deadline?',
  introChatAnswer: 'In Progress Report.pdf, the deadline for completing phase 2 was set to November 15, 2025. It was also mentioned that testing will be needed before delivery.',
  featureAI: 'Smart AI',
  featureAIDesc: 'An assistant that understands all your content and answers with context',
  featureDocs: 'Documents',
  featureDocsDesc: 'Upload PDFs, Word, TXT and search across all of them',
  featureNotes: 'Notes',
  featureNotesDesc: 'Organize your ideas in one place',
  featureCalendar: 'Calendar',
  featureCalendarDesc: 'Manage your events and appointments',
  featureEmails: 'Emails',
  featureEmailsDesc: 'Everything centralized in your inbox',
  featureChat: 'Context-aware chat',
  featureChatDesc: 'Ask Lumio about anything you have saved',

  notFoundTitle: 'Page not found',
  notFoundText: 'This page does not exist or was moved.',
  goBack: 'Go back',
  goHome: 'Go home',

  restrictedAccess: 'Restricted Access',
  somethingWrong: 'Something went wrong',
  restrictedText: 'This account does not have access to Lumio.',
  somethingWrongText: 'Something went wrong... please try again.',
  tryAnotherAccount: 'Try another account',
  tryAgainShort: 'Try again',

  lumioGreeting: 'How can I help?',
  lumioSubtitle: 'Ask me anything about your notes, documents and calendar.',
  lumioPlaceholder: 'Type your message...',

  faqPageTitle: 'FAQ & How to Use',
  faqPageSubtitle: 'Everything you need to know about Lumio',
  howToUseTitle: 'How to use Lumio',
  faqQuestionsTitle: 'Frequently Asked Questions',
}

export const texts: Record<Lang, Record<TextKey, string>> = { pt, en }

// Pluralized helpers built on the dictionaries.
export function readSourcesLabel(lang: Lang, count: number): string {
  return lang === 'pt'
    ? `Leu ${count} ${count === 1 ? 'fonte' : 'fontes'}`
    : `Read ${count} ${count === 1 ? 'source' : 'sources'}`
}

export function documentsCountLabel(lang: Lang, count: number): string {
  return `${count} ${count === 1 ? texts[lang].document : texts[lang].documents}`
}

export function tasksRemainingLabel(lang: Lang, count: number): string {
  const t = texts[lang]
  return `${count} ${count === 1 ? t.taskRemaining : t.tasksRemaining}`
}

export function tasksCompletedLabel(lang: Lang, count: number): string {
  const t = texts[lang]
  return `${count} ${count === 1 ? t.taskCompleted : t.tasksCompleted}`
}

// Date/locale helpers: every component derives the locale from here.
export function localeOf(lang: Lang): string {
  return lang === 'pt' ? 'pt-PT' : 'en-US'
}

export function weekdayShorts(lang: Lang): string[] {
  // Nov 1-7, 2026 is a Sunday..Saturday week.
  return Array.from({ length: 7 }, (_, i) =>
    new Date(2026, 10, 1 + i).toLocaleDateString(localeOf(lang), { weekday: 'short' }),
  )
}

export function monthName(lang: Lang, month: number): string {
  return new Date(2026, month, 1).toLocaleDateString(localeOf(lang), { month: 'long' })
}

// FAQ content, per language.
export const faqHowToUse: Record<Lang, string> = {
  pt: `**Como usar o Lumio**

**O que é o Lumio?**
O Lumio é o teu workspace pessoal com IA. Centraliza notas, documentos, emails, calendário e tarefas num só lugar, com um assistente inteligente que tem acesso a todo o teu conteúdo.

**Primeiros passos**
1. Configura o teu perfil no primeiro acesso (nome, idade e género).
2. Carrega documentos (.PDF, .DOCX, .TXT, .MD) na secção Documentos.
3. Cria notas, eventos no calendário e tarefas conforme necessidades.
4. Usa o chat "Lumio" ou "Perguntar ao Lumio" para perguntar sobre o teu conteúdo.

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
- O tema claro/escuro pode ser alterado no cabeçalho`,

  en: `**How to use Lumio**

**What is Lumio?**
Lumio is your personal AI workspace. It brings notes, documents, emails, calendar and tasks together in one place, with a smart assistant that has access to all your content.

**Getting started**
1. Set up your profile on first access (name, age and gender).
2. Upload documents (.PDF, .DOCX, .TXT, .MD) in the Documents section.
3. Create notes, calendar events and tasks as you need them.
4. Use the "Lumio" chat or "Ask Lumio" to ask questions about your content.

**Main features**

**Notes**
- Create and edit notes quickly
- All notes are searchable by the assistant

**Documents**
- Upload supported files
- Lumio reads and indexes the content to answer based on it
- Global search across all documents

**Calendar**
- Add events with date, time and description
- View your schedule on the dashboard and the Calendar page

**Tasks**
- Create pending/completed tasks
- Track what is left to do on the dashboard

**AI chat**
- Ask anything about your notes, documents or calendar
- The assistant answers based on your content when relevant
- You can have conversations with saved history

**Tips**
- Be specific in your questions to get better answers
- Upload important documents so the assistant has them in context
- Use global search to quickly find anything
- The light/dark theme can be changed in the header`,
}

export interface FaqItem {
  q: string
  a: string
}

export const faqItems: Record<Lang, FaqItem[]> = {
  pt: [
    {
      q: 'O que é o Lumio?',
      a: 'O Lumio é um workspace pessoal com IA que centraliza notas, documentos, emails, calendário e tarefas, com um assistente que responde com base no teu conteúdo.',
    },
    {
      q: 'Preciso de internet para usar?',
      a: 'Precisas de internet para o chat com IA (usa API do Groq). As notas, documentos e calendário ficam guardados localmente.',
    },
    {
      q: 'Que formatos de ficheiro são suportados?',
      a: 'PDF, DOCX, TXT e MD.',
    },
    {
      q: 'O Lumio guarda os meus dados onde?',
      a: 'Tudo fica guardado localmente na pasta data/ do backend (notas, calendário, tarefas, documentos e histórico de chat).',
    },
    {
      q: 'Como funciona o assistente?',
      a: 'Ao fazer perguntas, o Lumio pesquisa o teu conteúdo indexado e usa-o para dar respostas contextualizadas.',
    },
    {
      q: 'Posso apagar documentos?',
      a: 'Sim, podes apagar documentos na secção Documentos. Ao apagar, são removidos também do índice.',
    },
    {
      q: 'As notas aparecem nas respostas do chat?',
      a: 'Sim. Notas e eventos criados são automaticamente sincronizados e indexados para o assistente poder usá-los.',
    },
    {
      q: 'Como altero o tema?',
      a: 'Usa o botão de sol/lua no cabeçalho para alternar entre modo claro e escuro.',
    },
    {
      q: 'O que acontece se não tiver API key?',
      a: 'O chat com IA não funciona sem LLM_API_KEY configurada no backend/.env, mas podes continuar a usar notas, documentos e calendário normalmente.',
    },
    {
      q: 'Como mudo o idioma?',
      a: 'Vai a Definições e escolhe o idioma na secção Aparência. O idioma aplica-se a toda a aplicação, incluindo o assistente.',
    },
  ],
  en: [
    {
      q: 'What is Lumio?',
      a: 'Lumio is a personal AI workspace that centralizes notes, documents, emails, calendar and tasks, with an assistant that answers based on your content.',
    },
    {
      q: 'Do I need internet to use it?',
      a: 'You need internet for the AI chat (it uses the Groq API). Notes, documents and calendar are stored locally.',
    },
    {
      q: 'Which file formats are supported?',
      a: 'PDF, DOCX, TXT and MD.',
    },
    {
      q: 'Where does Lumio store my data?',
      a: 'Everything is stored locally in the backend data/ folder (notes, calendar, tasks, documents and chat history).',
    },
    {
      q: 'How does the assistant work?',
      a: 'When you ask questions, Lumio searches your indexed content and uses it to give contextualized answers.',
    },
    {
      q: 'Can I delete documents?',
      a: 'Yes, you can delete documents in the Documents section. Deleting them also removes them from the index.',
    },
    {
      q: 'Do notes show up in chat answers?',
      a: 'Yes. Notes and events you create are automatically synced and indexed so the assistant can use them.',
    },
    {
      q: 'How do I change the theme?',
      a: 'Use the sun/moon button in the header to switch between light and dark mode.',
    },
    {
      q: 'What happens if I have no API key?',
      a: 'The AI chat does not work without LLM_API_KEY configured in backend/.env, but you can still use notes, documents and calendar normally.',
    },
    {
      q: 'How do I change the language?',
      a: 'Go to Settings and choose the language in the Appearance section. The language applies to the whole app, including the assistant.',
    },
  ],
}
