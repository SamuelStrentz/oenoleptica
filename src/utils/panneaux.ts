/**
 * Les panneaux (BottomSheet) ajoutent une entrée dans l'historique pour que
 * le bouton retour d'Android les ferme. Quand un panneau est fermé par le
 * code, on revient en arrière d'une entrée : il faut attendre que ce retour
 * soit terminé avant de naviguer ailleurs, sinon il annulerait la navigation.
 */
let retourEnCours: Promise<void> = Promise.resolve()

export function retourHistorique(): void {
  retourEnCours = new Promise((fini) => {
    const terminer = () => {
      window.removeEventListener('popstate', terminer)
      clearTimeout(secours)
      fini()
    }
    const secours = setTimeout(terminer, 400)
    window.addEventListener('popstate', terminer)
    history.back()
  })
}

/** À attendre avant un router.push qui suit la fermeture d'un panneau. */
export function apresPanneau(): Promise<void> {
  return new Promise((ok) => setTimeout(() => retourEnCours.then(ok), 0))
}
