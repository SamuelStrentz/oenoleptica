/** Messages éphémères (toasts). */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: number
  texte: string
  type: 'info' | 'erreur'
}

export const useUiStore = defineStore('ui', () => {
  const toasts = ref<Toast[]>([])
  let n = 0

  function toast(texte: string, type: Toast['type'] = 'info', duree = 2600) {
    const id = ++n
    toasts.value.push({ id, texte, type })
    setTimeout(() => (toasts.value = toasts.value.filter((t) => t.id !== id)), duree)
  }

  const erreur = (e: unknown) => toast(e instanceof Error ? e.message : String(e), 'erreur', 4500)

  return { toasts, toast, erreur }
})

/** Petite vibration (Android) pour confirmer un geste. */
export function vibrer(ms = 12) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* non supporté */
  }
}
