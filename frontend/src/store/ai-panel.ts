import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const AI_PANEL_MIN_WIDTH = 280
export const AI_PANEL_MAX_WIDTH = 560
export const AI_PANEL_DEFAULT_WIDTH = 380

interface AIPanelState {
  open: boolean
  width: number
  openPanel: () => void
  closePanel: () => void
  setWidth: (width: number) => void
}

export const useAIPanelStore = create<AIPanelState>()(
  persist(
    (set) => ({
      open: true,
      width: AI_PANEL_DEFAULT_WIDTH,
      openPanel: () => set({ open: true }),
      closePanel: () => set({ open: false }),
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
