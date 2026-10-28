import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { AppLayout } from '@/components/layout/AppLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Inbox } from '@/pages/Inbox'
import { Notes } from '@/pages/Notes'
import { Documents } from '@/pages/Documents'
import { Calendar } from '@/pages/Calendar'
import { Tasks } from '@/pages/Tasks'
import { Lumio } from '@/pages/Lumio'
import { FAQ } from '@/pages/FAQ'
import { Settings } from '@/pages/Settings'
import { NotFound } from '@/pages/NotFound'
import { Intro } from '@/pages/Intro'
import { useUser } from '@/hooks/useUser'
import { UserOnboarding } from '@/components/UserOnboarding'
import { Toaster } from '@/components/ui/sonner'

const queryClient = new QueryClient()

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'lumio', element: <Lumio /> },
      { path: 'inbox', element: <Inbox /> },
      { path: 'notes', element: <Notes /> },
      { path: 'documents', element: <Documents /> },
      { path: 'calendar', element: <Calendar /> },
      { path: 'tasks', element: <Tasks /> },
      { path: 'faq', element: <FAQ /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
])

function Root() {
  const { loading, needsOnboarding, updateUser } = useUser()
  const [showIntro, setShowIntro] = useState(() => {
    return localStorage.getItem('lumio_intro_seen') !== 'true'
  })

  if (loading) return null

  if (showIntro) {
    return (
      <Intro
        onContinue={() => {
          localStorage.setItem('lumio_intro_seen', 'true')
          setShowIntro(false)
        }}
      />
    )
  }

  if (needsOnboarding) {
    return <UserOnboarding onComplete={(u) => updateUser(u)} />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)