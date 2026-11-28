/** Lecture et validation des saisies (mêmes règles que l'appli desktop). */

/** '' ou espaces -> null, sinon le texte nettoyé. */
export function texte(valeur: string | null | undefined): string | null {
  const v = (valeur ?? '').trim()
  return v === '' ? null : v
}

interface OptionsNombre {
  entier?: boolean
  min?: number
  max?: number
}

/**
 * '13,5' / '13.5' / '13,5 %' / '7,30 €' -> nombre ; '' -> null.
 * Lève une Error au message prêt à afficher si la saisie est invalide.
 */
export function nombre(brut: string | number | null | undefined, libelle: string, o: OptionsNombre = {}): number | null {
  if (brut === null || brut === undefined) return null
  const t = String(brut).replace(/[€%\s ]/g, '').replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  if (!Number.isFinite(n) || (o.entier && !Number.isInteger(n))) {
    throw new Error(`${libelle} : « ${String(brut).trim()} » n'est pas une valeur valide.`)
  }
  const e = /^la /i.test(libelle) ? 'e' : '' // « La note doit être inférieure… »
  if (o.min !== undefined && n < o.min) throw new Error(`${libelle} doit être supérieur${e} ou égal${e} à ${o.min}.`)
  if (o.max !== undefined && n > o.max) throw new Error(`${libelle} doit être inférieur${e} ou égal${e} à ${o.max}.`)
  return n
}

export function prix(brut: string | null | undefined): number | null {
  const p = nombre(brut, 'Le prix', { min: 0, max: 99999.99 })
  return p === null ? null : Math.round(p * 100) / 100
}

/** Date du jour au format stocké en base (AAAA-MM-JJ), en heure locale. */
export function aujourdhui(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const jj = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${jj}`
}

/** 7.3 -> '7,30 €' */
export function formaterPrix(p: number | null | undefined): string {
  if (p === null || p === undefined) return ''
  return p.toFixed(2).replace('.', ',') + ' €'
}

/** 16 -> '16', 16.5 -> '16,5' */
export function nombreCourt(n: number | null | undefined): string {
  if (n === null || n === undefined) return ''
  return String(Number(n.toFixed(2))).replace('.', ',')
}
