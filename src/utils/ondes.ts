/**
 * Effet « goutte d'eau » au toucher : une onde part du point touché sur les
 * cartes, vignettes, listes et boutons (qu'ils aient une action ou non).
 * Un seul écouteur pour toute l'appli ; désactivé si l'utilisateur a demandé
 * de réduire les animations.
 */
const CIBLES = [
  '.vignette', '.vigneron', '.carte:not(form .carte)', '.btn', '.choix button', '.filtres button',
  '.onglets a', '.vins button', '.caves li button', '.puce', '.teintes button', '.suggestions button',
  '.options-liste button', '.raccourcis button', '.pas', '.tableau tbody td',
].join(', ')

export function installerOndes(): void {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  document.addEventListener(
    'pointerdown',
    (e) => {
      const cible = e.target as HTMLElement
      if (cible.closest('input, select, textarea')) return
      const hote = cible.closest<HTMLElement>(CIBLES)
      if (!hote || (hote as HTMLButtonElement).disabled) return
      const style = getComputedStyle(hote)
      if (style.position === 'static') hote.style.position = 'relative'
      if (style.overflow === 'visible') hote.style.overflow = 'hidden'
      const r = hote.getBoundingClientRect()
      const taille = Math.max(r.width, r.height) * 2.2
      const onde = document.createElement('span')
      onde.className = 'onde'
      onde.style.width = onde.style.height = `${taille}px`
      onde.style.left = `${e.clientX - r.left - taille / 2}px`
      onde.style.top = `${e.clientY - r.top - taille / 2}px`
      hote.appendChild(onde)
      onde.addEventListener('animationend', () => onde.remove(), { once: true })
    },
    { passive: true },
  )
}
