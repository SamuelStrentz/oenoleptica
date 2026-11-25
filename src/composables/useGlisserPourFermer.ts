/**
 * Glisser vers le bas pour fermer un panneau.
 *
 * Le geste démarre depuis la languette, ou depuis n'importe où dans le panneau
 * quand son contenu est déjà défilé tout en haut. Le panneau suit le doigt ;
 * relâché assez bas (ou d'un geste rapide), il se ferme, sinon il revient.
 */
import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

const SEUIL_DISTANCE = 0.25 // part de la hauteur du panneau
const SEUIL_VITESSE = 0.6 // px/ms
const DUREE_ANIMATION = 200 // ms

export function useGlisserPourFermer(panneau: Ref<HTMLElement | undefined>, fermer: () => void) {
  /** Décalage courant (px), pour le voile. */
  const decalage = ref(0)
  let debutY = 0
  let debutT = 0
  let actif = false
  let candidat = false

  function poser(px: number, anime: boolean) {
    const el = panneau.value
    if (!el) return
    el.style.transition = anime ? `transform ${DUREE_ANIMATION}ms cubic-bezier(0.2, 0.9, 0.3, 1)` : 'none'
    el.style.transform = px ? `translateY(${px}px)` : ''
    decalage.value = px
  }

  function surDebut(e: TouchEvent) {
    const el = panneau.value
    if (!el || e.touches.length !== 1) return
    const depuisLanguette = (e.target as HTMLElement).closest('[data-languette]') !== null
    candidat = depuisLanguette || el.scrollTop <= 0
    actif = false
    debutY = e.touches[0].clientY
    debutT = performance.now()
  }

  function surDeplacement(e: TouchEvent) {
    const el = panneau.value
    if (!el || !candidat) return
    const dy = e.touches[0].clientY - debutY
    if (!actif) {
      if (dy <= 4) {
        if (dy < -4) candidat = false // le doigt monte : défilement normal du contenu
        return
      }
      actif = true
    }
    e.preventDefault() // empêche le défilement / le « tirer pour actualiser »
    poser(dy, false)
  }

  function surFin() {
    const el = panneau.value
    if (!el || !actif) {
      candidat = false
      return
    }
    const dy = decalage.value
    const vitesse = dy / Math.max(performance.now() - debutT, 1)
    actif = false
    candidat = false
    if (dy > el.offsetHeight * SEUIL_DISTANCE || vitesse > SEUIL_VITESSE) {
      poser(el.offsetHeight, true)
      // le panneau est détruit à la fermeture : inutile de le remettre en place
      setTimeout(() => {
        decalage.value = 0
        fermer()
      }, DUREE_ANIMATION)
    } else {
      poser(0, true)
    }
  }

  // Les écouteurs « touchmove » doivent être non passifs pour pouvoir bloquer le défilement
  watch(panneau, (el, ancien) => {
    ancien?.removeEventListener('touchstart', surDebut)
    ancien?.removeEventListener('touchmove', surDeplacement)
    ancien?.removeEventListener('touchend', surFin)
    ancien?.removeEventListener('touchcancel', surFin)
    if (!el) return
    el.addEventListener('touchstart', surDebut, { passive: true })
    el.addEventListener('touchmove', surDeplacement, { passive: false })
    el.addEventListener('touchend', surFin)
    el.addEventListener('touchcancel', surFin)
  })

  onBeforeUnmount(() => {
    const el = panneau.value
    el?.removeEventListener('touchstart', surDebut)
    el?.removeEventListener('touchmove', surDeplacement)
    el?.removeEventListener('touchend', surFin)
    el?.removeEventListener('touchcancel', surFin)
  })

  return { decalage }
}
