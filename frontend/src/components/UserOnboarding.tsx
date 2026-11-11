import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Calendar, Venus, Mars, HelpCircle, Moon, Sun, ChevronLeft, Key, Zap } from 'lucide-react'
import { useT } from '@/hooks/useUser'

interface UserOnboardingProps {
  onComplete: (user: { name: string; gender: string | null; age: number | null }) => void
}

const ages = Array.from({ length: 83 }, (_, i) => i + 13)

function ThemeToggle() {
  const t = useT()
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
      className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] h-11 w-11 sm:h-9 sm:w-9 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-accent/5 transition-colors"
      aria-label={dark ? t.lightTheme : t.darkTheme}
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}

export function UserOnboarding({ onComplete }: UserOnboardingProps) {
  const t = useT()
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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain">
      <ThemeToggle />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 sm:p-8 w-full max-w-md max-h-[calc(100dvh_-_2rem)] overflow-y-auto overscroll-contain shadow-xl relative"
      >
        {step > 0 && (
          <button
            onClick={handleBack}
            className="absolute top-4 left-4 h-11 w-11 sm:h-9 sm:w-9 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-accent/5 transition-colors"
            aria-label={t.back}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <div className="text-center text-xs text-muted-foreground mb-4 mt-2">
          {t.step} {step + 1} {t.of} {hasPaidService === 'yes' ? 5 : 4}
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
                <h2 className="text-xl font-semibold">{t.whatsYourName}</h2>
                <p className="text-sm text-muted-foreground">{t.nameHelper}</p>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && handleNext()}
                placeholder={t.namePlaceholder}
                className="w-full h-11 sm:h-10 px-4 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
                autoFocus
              />
              <button
                onClick={handleNext}
                disabled={!name.trim()}
                className="w-full h-11 sm:h-10 bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t.continue}
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
                <h2 className="text-xl font-semibold">{t.howOld}</h2>
                <p className="text-sm text-muted-foreground">{t.optional}</p>
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
                className="w-full h-11 sm:h-10 px-4 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="">{t.selectAge}</option>
                {ages.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={skipAge}
                  className="flex-1 h-11 sm:h-10 bg-background border border-border rounded-xl hover:bg-accent/5 transition-colors"
                >
                  {t.skip}
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 h-11 sm:h-10 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors"
                >
                  {t.continue}
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
                <h2 className="text-xl font-semibold">{t.genderTitle}</h2>
                <p className="text-sm text-muted-foreground">{t.optional}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setGender('male')}
                  className={`h-20 rounded-xl border transition-colors flex flex-col items-center justify-center gap-1 ${
                    gender === 'male' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  <Mars className="w-5 h-5" />
                  <span className="text-xs">{t.male}</span>
                </button>
                <button
                  onClick={() => setGender('female')}
                  className={`h-20 rounded-xl border transition-colors flex flex-col items-center justify-center gap-1 ${
                    gender === 'female' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  <Venus className="w-5 h-5" />
                  <span className="text-xs">{t.female}</span>
                </button>
                <button
                  onClick={() => setGender('prefer_not_to_say')}
                  className={`h-20 rounded-xl border transition-colors flex flex-col items-center justify-center gap-1 ${
                    gender === 'prefer_not_to_say' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  <HelpCircle className="w-5 h-5" />
                  <span className="text-xs">{t.preferNotToSay}</span>
                </button>
              </div>
              <button
                onClick={handleNext}
                className="w-full h-11 sm:h-10 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors"
              >
                {t.continue}
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
                <h2 className="text-xl font-semibold">{t.paidServiceTitle}</h2>
                <p className="text-sm text-muted-foreground">{t.paidServiceHelper}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHasPaidService('yes')}
                  className={`h-12 rounded-xl border transition-colors ${
                    hasPaidService === 'yes' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  {t.yes}
                </button>
                <button
                  type="button"
                  onClick={() => setHasPaidService('no')}
                  className={`h-12 rounded-xl border transition-colors ${
                    hasPaidService === 'no' ? 'border-accent bg-accent/10' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  {t.no2}
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
                className="w-full h-11 sm:h-10 bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {hasPaidService === 'no' ? t.finalize : t.continue}
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
                <h2 className="text-xl font-semibold">{t.configureApiKey}</h2>
                <p className="text-sm text-muted-foreground">{t.apiKeyHelper}</p>
              </div>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full h-11 sm:h-10 px-4 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="">{t.selectProvider}</option>
                <option value="groq">Groq</option>
                <option value="openai">OpenAI</option>
                <option value="deepseek">DeepSeek</option>
              </select>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && provider && apiKey.trim() && handleNext()}
                placeholder={t.apiKeyInputPlaceholder}
                className="w-full h-11 sm:h-10 px-4 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <button
                onClick={handleNext}
                disabled={!provider || !apiKey.trim()}
                className="w-full h-11 sm:h-10 bg-accent text-white rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t.saveAndFinish}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
