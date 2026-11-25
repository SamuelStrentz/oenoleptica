/**
 * Appui long sur un élément (ex. un vigneron de la liste).
 *   const appui = useAppuiLong()
 *   <li v-on="appui.ecouteurs(() => ouvrirMenu(v))" @click="appui.clicNormal() && ouvrir(v)">
 * Le clic qui suit un appui long est ignoré.
 */
import { onBeforeUnmount } from 'vue'
import { vibrer } from '@/stores/ui'

const DELAI = 480 // ms
const TOLERANCE = 10 // px : au-delà, c'est un défilement, pas un appui

export function useAppuiLong() {
  let minuteur: ReturnType<typeof setTimeout> | undefined
  let depart = { x: 0, y: 0 }
  let declenche = false

  const annuler = () => clearTimeout(minuteur)

  function ecouteurs(action: () => void) {
    return {
      pointerdown: (e: PointerEvent) => {
        declenche = false
        depart = { x: e.clientX, y: e.clientY }
        annuler()
        minuteur = setTimeout(() => {
          declenche = true
          vibrer(25)
          action()
        }, DELAI)
      },
      pointermove: (e: PointerEvent) => {
        if (Math.hypot(e.clientX - depart.x, e.clientY - depart.y) > TOLERANCE) annuler()
      },
      pointerup: annuler,
      pointercancel: annuler,
      pointerleave: annuler,
      contextmenu: (e: Event) => e.preventDefault(), // pas de menu du navigateur
    }
  }

  /** true si le clic est un vrai clic (et pas la fin d'un appui long). */
  function clicNormal(): boolean {
    const etait = declenche
    declenche = false
    return !etait
  }

  onBeforeUnmount(annuler)
  return { ecouteurs, clicNormal }
}
