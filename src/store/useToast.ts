import { create } from 'zustand'
import { uid } from '../lib/id'

export type ToastTone = 'default' | 'success' | 'danger'

export interface Toast {
  id: string
  message: string
  tone: ToastTone
}

interface ToastState {
  toasts: Toast[]
  push: (message: string, tone?: ToastTone) => void
  dismiss: (id: string) => void
}

const DURATION = 3000

export const useToast = create<ToastState>()((set, get) => ({
  toasts: [],

  push: (message, tone = 'default') => {
    const id = uid()
    set({ toasts: [...get().toasts, { id, message, tone }] })
    window.setTimeout(() => get().dismiss(id), DURATION)
  },

  dismiss: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}))
