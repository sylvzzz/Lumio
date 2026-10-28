import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings as SettingsIcon, User, Moon, Sun, Monitor, Globe, Key, Palette } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { toast } from 'sonner'

const ages = Array.from({ length: 83 }, (_, i) => i + 13)

type Lang = 'pt' | 'en'

// Traduções fora do componente: não são recriadas a cada render
const texts = {
  pt: {
    title: 'Definições',
    subtitle: 'Personaliza a tua experiência no Lumio',
    profile: 'Perfil',
    name: 'Nome',
    age: 'Idade',
    gender: 'Género',
    not_specified: 'Não especificado',
    male: 'Masculino',
    female: 'Feminino',
    prefer_not_to_say: 'Prefiro não dizer',
    appearance: 'Aparência',
    theme: 'Tema',
    light: 'Claro',
    dark: 'Escuro',
    system: 'Sistema',
    language: 'Idioma',
    save: 'Guardar',
    saving: 'A guardar...',
    save_profile: 'Guardar perfil',
    unsaved_changes: 'Tens alterações por guardar',
    api_key_title: 'API Key',
    api_key_description: 'Configura a tua chave API para usar o assistente IA',
    api_key_placeholder: 'Insere a tua API key',
    provider: 'Provider',
    save_api_key: 'Guardar API Key',
    settings_saved: 'Alterações guardadas',
    settings_saved_description: 'As tuas definições foram guardadas com sucesso.',
    settings_error: 'Erro ao guardar definições',
    api_key_saved: 'API Key guardada',
    api_key_saved_description: 'A tua chave foi guardada com sucesso.',
    api_key_error: 'Erro ao guardar a API Key',
  },
  en: {
    title: 'Settings',
    subtitle: 'Personalize your Lumio experience',
    profile: 'Profile',
    name: 'Name',
    age: 'Age',
    gender: 'Gender',
    not_specified: 'Not specified',
    male: 'Male',
    female: 'Female',
    prefer_not_to_say: 'Prefer not to say',
    appearance: 'Appearance',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    language: 'Language',
    save: 'Save',
    saving: 'Saving...',
    save_profile: 'Save profile',
    unsaved_changes: 'You have unsaved changes',
    api_key_title: 'API Key',
    api_key_description: 'Configure your API key to use the AI assistant',
    api_key_placeholder: 'Enter your API key',
    provider: 'Provider',
    save_api_key: 'Save API Key',
    settings_saved: 'Changes saved',
    settings_saved_description: 'Your settings were saved successfully.',
    settings_error: 'Error saving settings',
    api_key_saved: 'API Key saved',
    api_key_saved_description: 'Your key was saved successfully.',
    api_key_error: 'Error saving API Key',
  },
} as const

type TextKey = keyof typeof texts['pt']

export function Settings() {
  const { user } = useUser()

  // Idioma APLICADO (usado na interface e no localStorage)
  const [language, setLanguage] = useState<Lang>(() => (user?.language as Lang) ?? 'pt')
  // Idioma ESCOLHIDO no select (só passa a aplicado ao clicar em Guardar)
  const [selectedLanguage, setSelectedLanguage] = useState<Lang>(() => (user?.language as Lang) ?? 'pt')

  const [name, setName] = useState(user?.name || '')
  const [age, setAge] = useState<number | ''>(user?.age || '')
  const [gender, setGender] = useState(user?.gender || '')
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored) return stored
    return 'system'
  })
  const [provider, setProvider] = useState('groq')
  const [apiKey, setApiKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Últimos valores guardados: serve de comparação para saber se há alterações
  const [saved, setSaved] = useState<{
    name: string
    age: number | ''
    gender: string
    language: Lang
  }>({
    name: user?.name || '',
    age: user?.age || '',
    gender: user?.gender || '',
    language: (user?.language as Lang) ?? 'pt',
  })

  const getText = (key: TextKey) => texts[language][key]

  const isDirty =
    name !== saved.name ||
    age !== saved.age ||
    gender !== saved.gender ||
    selectedLanguage !== saved.language

  // Sincroniza tudo quando o utilizador carrega/atualiza
  useEffect(() => {
    const lang = (user?.language as Lang) ?? 'pt'
    const next = {
      name: user?.name || '',
      age: (user?.age || '') as number | '',
      gender: user?.gender || '',
      language: lang,
    }
    setName(next.name)
    setAge(next.age)
    setGender(next.gender)
    setLanguage(lang)
    setSelectedLanguage(lang)
    setSaved(next)
  }, [user])

  // Guarda no localStorage apenas o idioma aplicado
  useEffect(() => {
    localStorage.setItem('language', language)
  }, [language])

  useEffect(() => {
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', prefersDark)
      localStorage.removeItem('theme')
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark')
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  const saveProfile = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/user/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          gender,
          age: age === '' ? null : age,
          language: selectedLanguage,
        }),
      })
      if (!res.ok) throw new Error('Falha ao guardar')

      // Só agora a interface muda de idioma e o botão desaparece
      setLanguage(selectedLanguage)
      setSaved({ name, age, gender, language: selectedLanguage })

      toast.success(texts[selectedLanguage].settings_saved, {
        description: texts[selectedLanguage].settings_saved_description,
      })
    } catch (e) {
      console.error(e)
      toast.error(texts[language].settings_error)
    } finally {
      setIsSaving(false)
    }
  }

  const saveApiKey = async () => {
    if (!apiKey.trim()) return
    try {
      const res = await fetch('/api/api-key/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, api_key: apiKey.trim() }),
      })
      if (!res.ok) throw new Error('Falha ao guardar')
      setApiKey('')
      toast.success(getText('api_key_saved'), {
        description: getText('api_key_saved_description'),
      })
    } catch (e) {
      console.error(e)
      toast.error(getText('api_key_error'))
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="w-6 h-6 text-accent" />
          <h1 className="text-3xl font-semibold tracking-tight">{getText('title')}</h1>
        </div>
        <p className="text-muted-foreground">{getText('subtitle')}</p>
      </motion.div>

      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border/50 overflow-hidden"
        >
          <div className="flex items-center gap-2 p-4 border-b border-border/50">
            <User className="w-4 h-4 text-accent" />
            <h2 className="font-medium">{getText('profile')}</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{getText('name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{getText('age')}</label>
                <select
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full h-10 px-3 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  <option value="">{getText('not_specified')}</option>
                  {ages.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{getText('gender')}</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full h-10 px-3 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  <option value="">{getText('not_specified')}</option>
                  <option value="male">{getText('male')}</option>
                  <option value="female">{getText('female')}</option>
                  <option value="prefer_not_to_say">{getText('prefer_not_to_say')}</option>
                </select>
              </div>
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
            <Palette className="w-4 h-4 text-accent" />
            <h2 className="font-medium">{getText('appearance')}</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{getText('theme')}</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center justify-center gap-2 h-10 rounded-xl border transition-colors ${
                    theme === 'light' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span className="text-sm">{getText('light')}</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center gap-2 h-10 rounded-xl border transition-colors ${
                    theme === 'dark' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span className="text-sm">{getText('dark')}</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`flex items-center justify-center gap-2 h-10 rounded-xl border transition-colors ${
                    theme === 'system' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span className="text-sm">{getText('system')}</span>
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{getText('language')}</label>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value as Lang)}
                  className="flex-1 h-10 px-3 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  <option value="pt">Português</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border/50 overflow-hidden"
        >
          <div className="flex items-center gap-2 p-4 border-b border-border/50">
            <Key className="w-4 h-4 text-accent" />
            <h2 className="font-medium">{getText('api_key_title')}</h2>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              {getText('api_key_description')}
            </p>
            <div>
              <label className="text-sm font-medium mb-2 block">{getText('provider')}</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full h-10 px-3 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="groq">Groq</option>
                <option value="openai">OpenAI</option>
                <option value="deepseek">DeepSeek</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{getText('api_key_title')}</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={getText('api_key_placeholder')}
                className="w-full h-10 px-3 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <button
              onClick={saveApiKey}
              disabled={!apiKey.trim()}
              className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {getText('save_api_key')}
            </button>
          </div>
        </motion.div>

        {/*
          Barra de guardar: fica DENTRO da coluna da página (sticky, não fixed),
          por isso nunca sai da coluna e não cobre o botão nem o painel do chat.
          Só existe quando há alterações.
        */}
        <AnimatePresence>
          {isDirty && (
            <motion.div
              key="save-bar"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.15 }}
              className="sticky bottom-4 z-10 flex items-center justify-between gap-4 p-3 pl-4 bg-card rounded-2xl border border-border shadow-lg"
            >
              <span className="text-sm text-muted-foreground">{getText('unsaved_changes')}</span>
              <button
                onClick={saveProfile}
                disabled={isSaving}
                className="px-6 py-2.5 bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                title={getText('save_profile')}
              >
                {isSaving ? getText('saving') : getText('save')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}