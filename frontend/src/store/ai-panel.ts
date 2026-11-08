import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const AI_PANEL_MIN_WIDTH = 280
export const AI_PANEL_MAX_WIDTH = 560
export const AI_PANEL_DEFAULT_WIDTH = 380

interface AIPanelState {
  open: boolean
  menuOpen: boolean
  width: number
  openPanel: () => void
  closePanel: () => void
  openMenu: () => void
  closeMenu: () => void
  setWidth: (width: number) => void
}

const isDesktopViewport =
  typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches

export const useAIPanelStore = create<AIPanelState>()(
  persist(
    (set) => ({
      open: isDesktopViewport,
      menuOpen: false,
      width: AI_PANEL_DEFAULT_WIDTH,
      openPanel: () => set({ open: true, menuOpen: false }),
      closePanel: () => set({ open: false }),
      openMenu: () => set({ open: false, menuOpen: true }),
      closeMenu: () => set({ menuOpen: false }),
      setWidth: (w) =>
        set({
          width: Math.min(AI_PANEL_MAX_WIDTH, Math.max(AI_PANEL_MIN_WIDTH, w)),
        }),
    }),
    {
      name: 'lumio-ai-panel',
      partialize: (s) => ({ width: s.width }),
    },
  ),
)
