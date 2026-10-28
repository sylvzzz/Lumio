import { useState, useEffect } from 'react'

export interface UserProfile {
  name?: string | null
  gender?: string | null
  age?: number | null
  language?: 'pt' | 'en' | string | null
}

export function useUser() {
  const [user, setUser] = useState<UserProfile>({})
  const [loading, setLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    fetch('/api/user/')
      .then((res) => res.json())
      .then((data) => {
        setUser(data || {})
        if (!data || !data.name) {
          setNeedsOnboarding(true)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        setNeedsOnboarding(true)
      })
  }, [])

  const updateUser = (newUser: UserProfile) => {
    setUser(newUser)
    setNeedsOnboarding(false)
  }

  return { user, loading, needsOnboarding, updateUser }
}
