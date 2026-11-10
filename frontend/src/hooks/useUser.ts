import { useEffect } from 'react'
import { create } from 'zustand'
import { texts, type Lang, type TextKey } from '@/i18n'

export interface UserProfile {
  name?: string | null
  gender?: string | null
  age?: number | null
  language?: 'pt' | 'en' | string | null
}

interface UserState {
  user: UserProfile
  loading: boolean
  needsOnboarding: boolean
}

function initialLanguage(): Lang {
  const stored = localStorage.getItem('language')
  if (stored === 'pt' || stored === 'en') return stored
  return navigator.language?.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

// Single shared store: every component reads the same language, and a
// change made anywhere (e.g. Settings) propagates globally.
const useUserStore = create<UserState>(() => ({
  user: { language: initialLanguage() },
  loading: true,
  needsOnboarding: false,
}))

let fetched = false
function fetchUser() {
  if (fetched) return
  fetched = true
  fetch('/api/user/')
    .then((res) => res.json())
    .then((data) => {
      useUserStore.setState({
        user: data || {},
        loading: false,
        needsOnboarding: !data || !data.name,
      })
    })
    .catch(() => {
      useUserStore.setState({ loading: false, needsOnboarding: true })
    })
}

// Persist the language across sessions and keep <html lang> in sync.
let lastSynced = ''
function syncLang(user: UserProfile) {
  const lang: Lang = user?.language === 'pt' ? 'pt' : 'en'
  if (lang === lastSynced) return
  lastSynced = lang
  localStorage.setItem('language', lang)
  if (typeof document !== 'undefined') document.documentElement.lang = lang
}
syncLang(useUserStore.getState().user)
useUserStore.subscribe((state) => syncLang(state.user))

export function currentLang(): Lang {
  return useUserStore.getState().user?.language === 'pt' ? 'pt' : 'en'
}

// Subscribing language hook: re-renders the component on language change.
export function useLang(): Lang {
  useEffect(() => {
    fetchUser()
  }, [])
  return useUserStore((s) => (s.user?.language === 'pt' ? 'pt' : 'en'))
}

export function useUser() {
  useEffect(() => {
    fetchUser()
  }, [])
  const user = useUserStore((s) => s.user)
  const loading = useUserStore((s) => s.loading)
  const needsOnboarding = useUserStore((s) => s.needsOnboarding)

  // Update the shared store (and thus every subscribed component).
  const updateUser = (newUser: UserProfile) => {
    useUserStore.setState({ user: newUser, needsOnboarding: false })
  }

  return { user, loading, needsOnboarding, updateUser }
}

// Translation hook: returns the dictionary for the configured language.
export function useT(): Record<TextKey, string> {
  return texts[useLang()]
}
