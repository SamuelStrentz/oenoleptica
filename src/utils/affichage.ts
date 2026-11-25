/** Petites aides d'affichage. */

/** Couleur de la pastille d'un vin d'après sa couleur saisie. */
export function couleurPastille(couleur: string | null | undefined): string {
  const c = (couleur ?? '').toLowerCase()
  if (c.startsWith('rouge')) return 'var(--vin-rouge)'
  if (c.startsWith('blanc')) return 'var(--vin-blanc)'
  if (c.startsWith('ros')) return 'var(--vin-rose)'
  return 'var(--vin-autre)'
}

/** 'Cuvée X · 1er cru' (morceaux vides ignorés). */
export function joindre(...morceaux: (string | number | null | undefined)[]): string {
  return morceaux.filter((m) => m !== null && m !== undefined && String(m).trim() !== '').join(' · ')
}

export function pluriel(n: number, mot: string, motPluriel = mot + 's'): string {
  return `${n.toLocaleString('fr-FR')} ${n > 1 ? motPluriel : mot}`
}

/** '2026-11-25' -> '25/11/2026' */
export function dateCourte(iso: string): string {
  const [a, m, j] = iso.split('-')
  return j && m && a ? `${j}/${m}/${a}` : iso
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** '2026-11-25' -> 'Novembre 2026' */
export function moisAnnee(iso: string): string {
  const [a, m] = iso.split('-')
  const nom = MOIS[Number(m) - 1]
  return nom ? `${nom.charAt(0).toUpperCase()}${nom.slice(1)} ${a}` : iso
}
