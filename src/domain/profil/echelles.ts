/**
 * Échelle commune : la même pour le profil calculé, la fiche de dégustation et
 * les graphiques. Notes de 0 à 5 par demi-points ; chaque cran a son mot.
 * La longueur se mesure en caudalies (secondes).
 */

export type Sens = 'vue' | 'nez' | 'gout' | 'toucher'

export type Critere =
  | 'intensite_robe'
  | 'intensite_nez'
  | 'sucre'
  | 'acidite'
  | 'amertume'
  | 'salinite'
  | 'alcool'
  | 'tanins'
  | 'corps'
  | 'effervescence'
  | 'longueur'

export interface DefCritere {
  cle: Critere
  libelle: string
  sens: Sens
  /** 6 mots, du cran 0 au cran 5 (pour la longueur : tranches de caudalies). */
  mots: readonly string[]
  max: number
  pas: number
  unite?: string
}

export const CRITERES: readonly DefCritere[] = [
  { cle: 'intensite_robe', libelle: 'Intensité de la robe', sens: 'vue', max: 5, pas: 0.5,
    mots: ['très pâle', 'pâle', 'légère', 'moyenne', 'soutenue', 'profonde'] },
  { cle: 'intensite_nez', libelle: 'Intensité du nez', sens: 'nez', max: 5, pas: 0.5,
    mots: ['fermé', 'discret', 'léger', 'expressif', 'intense', 'explosif'] },
  { cle: 'sucre', libelle: 'Sucre', sens: 'gout', max: 5, pas: 0.5,
    mots: ['sec', 'sec tendre', 'demi-sec', 'moelleux', 'liquoreux', 'très liquoreux'] },
  { cle: 'acidite', libelle: 'Acidité', sens: 'gout', max: 5, pas: 0.5,
    mots: ['plate', 'molle', 'souple', 'fraîche', 'vive', 'nerveuse'] },
  { cle: 'amertume', libelle: 'Amertume', sens: 'gout', max: 5, pas: 0.5,
    mots: ['absente', 'à peine perceptible', 'légère', 'présente', 'marquée', 'dominante'] },
  { cle: 'salinite', libelle: 'Salinité', sens: 'gout', max: 5, pas: 0.5,
    mots: ['absente', 'discrète', 'légère', 'saline', 'très saline', 'iodée'] },
  { cle: 'alcool', libelle: 'Alcool', sens: 'gout', max: 5, pas: 0.5,
    mots: ['faible', 'léger', 'équilibré', 'généreux', 'chaud', 'brûlant'] },
  { cle: 'tanins', libelle: 'Tanins', sens: 'toucher', max: 5, pas: 0.5,
    mots: ['absents', 'fondus', 'souples', 'présents', 'fermes', 'astringents'] },
  { cle: 'corps', libelle: 'Corps', sens: 'toucher', max: 5, pas: 0.5,
    mots: ['maigre', 'léger', 'moyen', 'étoffé', 'puissant', 'massif'] },
  { cle: 'effervescence', libelle: 'Effervescence', sens: 'toucher', max: 5, pas: 0.5,
    mots: ['tranquille', 'perlant', 'légère', 'crémeuse', 'vive', 'explosive'] },
  { cle: 'longueur', libelle: 'Longueur', sens: 'toucher', max: 12, pas: 1, unite: 'caudalies',
    mots: ['très courte', 'courte', 'moyenne', 'longue', 'très longue', 'exceptionnelle'] },
]

export const PAR_CLE: Record<Critere, DefCritere> = Object.fromEntries(CRITERES.map((c) => [c.cle, c])) as Record<Critere, DefCritere>

export const LIBELLES_SENS: Record<Sens, string> = { vue: 'Vue', nez: 'Nez', gout: 'Goût', toucher: 'Toucher' }

/** Le mot correspondant à une valeur (ex. acidité 4,2 -> « vive »). */
export function motPour(critere: Critere, valeur: number | null | undefined): string {
  if (valeur === null || valeur === undefined) return '—'
  const def = PAR_CLE[critere]
  if (critere === 'longueur') {
    const seuils = [2, 4, 6, 8, 10]
    const i = seuils.findIndex((s) => valeur < s)
    return def.mots[i === -1 ? 5 : i]
  }
  // arrondi « au demi inférieur » : 4,5 -> liquoreux (et non très liquoreux)
  return def.mots[Math.max(0, Math.min(5, Math.round(valeur - 0.01)))]
}

// ------------------------------------------------------------------ robe
export type FamilleCouleur = 'rouge' | 'blanc' | 'rose'

export interface Teinte {
  libelle: string
  couleur: string // pour la pastille
}

/** Échelles de teinte, de la plus jeune (0) à la plus évoluée (5). */
export const TEINTES: Record<FamilleCouleur, readonly Teinte[]> = {
  rouge: [
    { libelle: 'violacé', couleur: '#5B1E4F' },
    { libelle: 'pourpre', couleur: '#6E1235' },
    { libelle: 'rubis', couleur: '#8E1B2E' },
    { libelle: 'grenat', couleur: '#7A2027' },
    { libelle: 'tuilé', couleur: '#8F3B26' },
    { libelle: 'brique', couleur: '#9A5A35' },
  ],
  blanc: [
    { libelle: 'vert pâle', couleur: '#EEF0C8' },
    { libelle: 'jaune pâle', couleur: '#F3EBB0' },
    { libelle: 'paille', couleur: '#EFD98A' },
    { libelle: 'doré', couleur: '#E6C25E' },
    { libelle: 'or', couleur: '#D9A73A' },
    { libelle: 'ambré', couleur: '#C07E2C' },
  ],
  rose: [
    { libelle: 'gris', couleur: '#F4DCD6' },
    { libelle: 'pâle', couleur: '#F5C9C3' },
    { libelle: 'pêche', couleur: '#F4B49C' },
    { libelle: 'saumon', couleur: '#EE9C8A' },
    { libelle: 'framboise', couleur: '#E07A8A' },
    { libelle: "pelure d'oignon", couleur: '#D9906A' },
  ],
}

export function familleCouleur(couleur: string | null | undefined): FamilleCouleur {
  const c = (couleur ?? '').toLowerCase()
  if (c.startsWith('rouge')) return 'rouge'
  if (c.startsWith('ros')) return 'rose'
  return 'blanc'
}

export function teinte(famille: FamilleCouleur, valeur: number): Teinte {
  return TEINTES[famille][Math.max(0, Math.min(5, Math.round(valeur)))]
}

/** Arrondi au pas de l'échelle (0,5 par défaut) et borné. */
export function arrondir(valeur: number, max = 5, pas = 0.5): number {
  return Math.max(0, Math.min(max, Math.round(valeur / pas) * pas))
}
