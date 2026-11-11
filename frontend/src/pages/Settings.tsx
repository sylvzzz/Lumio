import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings as SettingsIcon, User, Moon, Sun, Monitor, Globe, Key, Palette } from 'lucide-react'
import { useUser, useT } from '@/hooks/useUser'
import { texts, type Lang } from '@/i18n'
import { toast } from 'sonner'

const ages = Array.from({ length: 83 }, (_, i) => i + 13)

export function Settings() {
  const { user, updateUser } = useUser()
  const t = useT()

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
    setSelectedLanguage(lang)
    setSaved(next)
  }, [user])

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

      // Propaga o idioma (e o perfil) para toda a aplicação instantaneamente
      updateUser({ name, gender, age: age === '' ? null : age, language: selectedLanguage })
      setSaved({ name, age, gender, language: selectedLanguage })

      toast.success(texts[selectedLanguage].settingsSaved, {
        description: texts[selectedLanguage].settingsSavedDescription,
      })
    } catch (e) {
      console.error(e)
      toast.error(t.settingsError)
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
      toast.success(t.apiKeySaved, {
        description: t.apiKeySavedDescription,
      })
    } catch (e) {
      console.error(e)
      toast.error(t.apiKeyError)
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
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.settingsPageTitle}</h1>
        </div>
        <p className="text-muted-foreground">{t.settingsSubtitle}</p>
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
            <h2 className="font-medium">{t.profile}</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{t.name}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 sm:h-10 px-3 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t.age}</label>
                <select
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full h-11 sm:h-10 px-3 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  <option value="">{t.notSpecified}</option>
                  {ages.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{t.gender}</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full h-11 sm:h-10 px-3 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  <option value="">{t.notSpecified}</option>
                  <option value="male">{t.male}</option>
                  <option value="female">{t.female}</option>
                  <option value="prefer_not_to_say">{t.preferNotToSay}</option>
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
            <h2 className="font-medium">{t.appearance}</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{t.theme}</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center justify-center gap-2 h-11 sm:h-10 rounded-xl border transition-colors ${
                    theme === 'light' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span className="text-sm">{t.light}</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center gap-2 h-11 sm:h-10 rounded-xl border transition-colors ${
                    theme === 'dark' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span className="text-sm">{t.dark}</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`flex items-center justify-center gap-2 h-11 sm:h-10 rounded-xl border transition-colors ${
                    theme === 'system' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span className="text-sm">{t.system}</span>
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t.language}</label>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value as Lang)}
                  className="flex-1 h-11 sm:h-10 px-3 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
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
            <h2 className="font-medium">{t.apiKeyTitle}</h2>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              {t.apiKeyDescription}
            </p>
            <div>
              <label className="text-sm font-medium mb-2 block">{t.provider}</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full h-11 sm:h-10 px-3 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="groq">Groq</option>
                <option value="openai">OpenAI</option>
                <option value="deepseek">DeepSeek</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t.apiKeyTitle}</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t.apiKeyPlaceholder}
                className="w-full h-11 sm:h-10 px-3 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <button
              onClick={saveApiKey}
              disabled={!apiKey.trim()}
              className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {t.saveApiKey}
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
              className="sticky bottom-[calc(1rem_+_env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center justify-between gap-3 p-3 pl-4 bg-card rounded-2xl border border-border shadow-lg"
            >
              <span className="text-sm text-muted-foreground">{t.unsavedChanges}</span>
              <button
                onClick={saveProfile}
                disabled={isSaving}
                className="px-6 py-2.5 min-h-11 bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                title={t.saveProfile}
              >
                {isSaving ? t.saving : t.saveProfile}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
