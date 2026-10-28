import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, User, Moon, Sun, Monitor, Globe, Key, Palette } from 'lucide-react'
import { useUser } from '@/hooks/useUser'

const ages = Array.from({ length: 83 }, (_, i) => i + 13)

export function Settings() {
  const { user } = useUser()
  const [name, setName] = useState(user?.name || '')
  const [age, setAge] = useState<number | ''>(user?.age || '')
  const [gender, setGender] = useState(user?.gender || '')
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'pt')
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored) return stored
    return 'system'
  })
  const [provider, setProvider] = useState('groq')
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    setName(user?.name || '')
    setAge(user?.age || '')
    setGender(user?.gender || '')
  }, [user])

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
    try {
      await fetch('/api/user/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gender, age: age === '' ? null : age }),
      })
    } catch (e) {
      console.error(e)
    }
  }

  const saveApiKey = async () => {
    if (!apiKey.trim()) return
    try {
      await fetch('/api/api-key/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, api_key: apiKey.trim() }),
      })
      setApiKey('')
      alert('API Key guardada com sucesso')
    } catch (e) {
      console.error(e)
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
          <h1 className="text-3xl font-semibold tracking-tight">Definições</h1>
        </div>
        <p className="text-muted-foreground">Personaliza a tua experiência no Lumio</p>
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
            <h2 className="font-medium">Perfil</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Idade</label>
                <select
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full h-10 px-3 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  <option value="">Não especificado</option>
                  {ages.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Género</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full h-10 px-3 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  <option value="">Não especificado</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                  <option value="prefer_not_to_say">Prefiro não dizer</option>
                </select>
              </div>
            </div>
            <button
              onClick={saveProfile}
              className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors text-sm"
            >
              Guardar perfil
            </button>
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
            <h2 className="font-medium">Aparência</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tema</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center justify-center gap-2 h-10 rounded-xl border transition-colors ${
                    theme === 'light' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span className="text-sm">Claro</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center gap-2 h-10 rounded-xl border transition-colors ${
                    theme === 'dark' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span className="text-sm">Escuro</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`flex items-center justify-center gap-2 h-10 rounded-xl border transition-colors ${
                    theme === 'system' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span className="text-sm">Sistema</span>
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Idioma</label>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
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
            <h2 className="font-medium">API Key</h2>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Configura a tua chave API para usar o assistente IA
            </p>
            <div>
              <label className="text-sm font-medium mb-2 block">Provider</label>
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
              <label className="text-sm font-medium mb-2 block">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Insere a tua API key"
                className="w-full h-10 px-3 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <button
              onClick={saveApiKey}
              disabled={!apiKey.trim()}
              className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Guardar API Key
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
