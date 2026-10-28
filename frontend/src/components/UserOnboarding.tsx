import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Calendar, Venus, Mars, HelpCircle, Moon, Sun, ChevronLeft, Key, Zap } from 'lucide-react'

interface UserOnboardingProps {
  onComplete: (user: { name: string; gender: string | null; age: number | null }) => void
}

const ages = Array.from({ length: 83 }, (_, i) => i + 13)

function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof document === 'undefined') return false
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return document.documentElement.classList.contains('dark')
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <button
      onClick={() => setDark(!dark)}
      className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-accent/5 transition-colors"
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}

export function UserOnboarding({ onComplete }: UserOnboardingProps) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [age, setAge] = useState<number | ''>('')
  const [gender, setGender] = useState<string | null>(null)
  const [hasPaidService, setHasPaidService] = useState<string | null>(null)
  const [provider, setProvider] = useState<string>('')
  const [apiKey, setApiKey] = useState('')

  const handleNext = () => {
    if (step === 0 && name.trim()) {
      setStep(1)
    } else if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    } else if (step === 3) {
      if (hasPaidService === 'no') {
        finish()
      } else if (hasPaidService === 'yes' && provider) {
        setStep(4)
      }
    } else if (step === 4 && apiKey.trim()) {
      finish()
    }
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  const finish = async () => {
    const userData = { name: name.trim(), gender, age: age === '' ? null : age }
    try {
      await fetch('/api/user/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      if (hasPaidService === 'yes' && provider && apiKey.trim()) {
        await fetch('/api/api-key/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider, api_key: apiKey.trim() }),
        })
      }
    } catch (e) {
      console.error(e)
    }
    onComplete(userData)
  }

  const skipAge = () => {
    setAge('')
    setStep(2)
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <ThemeToggle />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-8 w-full max-w-md shadow-xl relative"
      >
        {step > 0 && (
          <button
            onClick={handleBack}
            className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-accent/5 transition-colors"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <div className="text-center text-xs text-muted-foreground mb-4 mt-2">
          Passo {step + 1} de {hasPaidService === 'yes' ? 5 : 4}
        </div>
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                  <User className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-xl font-semibold">Como te queres chamar?</h2>
                <p className="text-sm text-muted-foreground">O nome que vamos usar para te tratar</p>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && handleNext()}
                placeholder="Nome..."
                className="w-full h-10 px-4 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
                autoFocus
              />
              <button
                onClick={handleNext}
                disabled={!name.trim()}
                className="w-full h-10 bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continuar
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-xl font-semibold">Qual a tua idade?</h2>
                <p className="text-sm text-muted-foreground">Opcional</p>
              </div>
              <select
                value={age}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '') setAge('')
                  else {
                    const n = parseInt(v)
                    if (!isNaN(n) && n >= 13 && n <= 95) setAge(n)
                  }
                }}
                className="w-full h-10 px-4 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="">Seleccionar idade</option>
                {ages.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={skipAge}
                  className="flex-1 h-10 bg-background border border-border rounded-xl hover:bg-accent/5 transition-colors"
                >
                  Saltar
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 h-10 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Género/Sexo</h2>
                <p className="text-sm text-muted-foreground">Opcional</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setGender('male')}
                  className={`h-20 rounded-xl border transition-colors flex flex-col items-center justify-center gap-1 ${
                    gender === 'male' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  <Mars className="w-5 h-5" />
                  <span className="text-xs">Masculino</span>
                </button>
                <button
                  onClick={() => setGender('female')}
                  className={`h-20 rounded-xl border transition-colors flex flex-col items-center justify-center gap-1 ${
                    gender === 'female' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  <Venus className="w-5 h-5" />
                  <span className="text-xs">Feminino</span>
                </button>
                <button
                  onClick={() => setGender('prefer_not_to_say')}
                  className={`h-20 rounded-xl border transition-colors flex flex-col items-center justify-center gap-1 ${
                    gender === 'prefer_not_to_say' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  <HelpCircle className="w-5 h-5" />
                  <span className="text-xs">Prefiro não dizer</span>
                </button>
              </div>
              <button
                onClick={handleNext}
                className="w-full h-10 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors"
              >
                Continuar
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                  <Zap className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-xl font-semibold">Tens algum serviço de IA pago?</h2>
                <p className="text-sm text-muted-foreground">Groq, OpenAI ou DeepSeek</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHasPaidService('yes')}
                  className={`h-12 rounded-xl border transition-colors ${
                    hasPaidService === 'yes' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setHasPaidService('no')}
                  className={`h-12 rounded-xl border transition-colors ${
                    hasPaidService === 'no' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  Não
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (hasPaidService === 'no') {
                    finish()
                  } else if (hasPaidService === 'yes') {
                    setStep(4)
                  }
                }}
                disabled={!hasPaidService}
                className="w-full h-10 bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {hasPaidService === 'no' ? 'Finalizar' : 'Continuar'}
              </button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                  <Key className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-xl font-semibold">Configurar API Key</h2>
                <p className="text-sm text-muted-foreground">Escolhe o provider e insere a tua key</p>
              </div>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full h-10 px-4 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="">Seleccionar provider</option>
                <option value="groq">Groq</option>
                <option value="openai">OpenAI</option>
                <option value="deepseek">DeepSeek</option>
              </select>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && provider && apiKey.trim() && handleNext()}
                placeholder="API Key..."
                className="w-full h-10 px-4 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <button
                onClick={handleNext}
                disabled={!provider || !apiKey.trim()}
                className="w-full h-10 bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Guardar e finalizar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
