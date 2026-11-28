/**
 * Reconnaissance d'étiquette : à partir du texte lu par l'OCR, retrouve le vin
 * le plus probable parmi ta cave et le référentiel, et extrait les indices
 * lisibles directement (millésime, degré, contenance, couleur).
 *
 * Code pur (pas d'accès à la base) : testable et indépendant de l'OCR.
 */
import type { NouveauVigneron } from './types'

/** Un vin connu auquel comparer l'étiquette. */
export interface CandidatEtiquette {
  origine: 'cave' | 'referentiel'
  domaine: string
  cuvee: string | null
  appellation: string | null
  couleur: string | null
  cepage: string | null
  style: string | null
  volume_alcool: number | null
  format: string | null
  prix: number | null
  /** Vigneron déjà présent dans la cave ouverte (sinon null). */
  id_vigneron: number | null
  /** Vigneron du référentiel absent de la cave, à créer (sinon null). */
  vigneron: NouveauVigneron | null
}

export interface IndicesEtiquette {
  millesime: number | null
  volume_alcool: number | null
  format: string | null
  couleur: string | null
  /** L'étiquette porte la mention « sec ». */
  sec: boolean
}

export interface Proposition extends CandidatEtiquette {
  /** Entre 0 et 1. */
  score: number
}

export interface ResultatEtiquette {
  texte: string
  indices: IndicesEtiquette
  propositions: Proposition[]
}

/** Seuil sous lequel une proposition n'est pas montrée. */
export const SCORE_MIN = 0.35

/** Mots trop courants pour identifier un domaine ou une cuvée. */
const MOTS_VIDES = new Set([
  'domaine', 'domaines', 'chateau', 'clos', 'cru', 'cave', 'caves', 'vignoble', 'vignobles', 'maison', 'famille',
  'de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'et', 'en', 'au', 'aux', 'a', 'cuvee', 'vin', 'vins', 'grand',
  'appellation', 'controlee', 'protegee', 'origine', 'aoc', 'aop', 'igp', 'france', 'produit', 'mis', 'bouteille',
  'propriete', 'jurancon', 'sec', 'moelleux', 'blanc', 'rouge', 'rose',
])

/** Minuscules, sans accents ni ponctuation. */
export function normaliser(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function mots(t: string): string[] {
  return normaliser(t).split(' ').filter(Boolean)
}

/** Mots significatifs (sans les mots vides ni les nombres). */
export function motsCles(t: string | null): string[] {
  if (!t) return []
  return [...new Set(mots(t).filter((m) => m.length > 1 && !MOTS_VIDES.has(m) && !/^\d+$/.test(m)))]
}

/** Distance de Levenshtein, arrêtée dès qu'elle dépasse max. */
export function distance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prec = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cour = [i]
    let mini = i
    for (let j = 1; j <= b.length; j++) {
      cour[j] = Math.min(prec[j] + 1, cour[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      mini = Math.min(mini, cour[j])
    }
    if (mini > max) return max + 1
    prec = cour
  }
  return prec[b.length]
}

/** Tolérance aux erreurs de lecture : 1 lettre dès 5 lettres, 2 dès 9. */
function proche(mot: string, lus: Set<string>): boolean {
  if (lus.has(mot)) return true
  const tolerance = mot.length >= 9 ? 2 : mot.length >= 5 ? 1 : 0
  if (!tolerance) return false
  for (const l of lus) if (distance(mot, l, tolerance) <= tolerance) return true
  return false
}

/** Part des mots attendus retrouvés dans le texte lu (0 à 1). */
function couverture(attendus: string[], lus: Set<string>, texteColle: string): number {
  if (!attendus.length) return 0
  // l'OCR colle parfois deux mots : « bruBache »
  const trouves = attendus.filter((m) => proche(m, lus) || (m.length >= 4 && texteColle.includes(m)))
  return trouves.length / attendus.length
}

/** Indices lisibles sur l'étiquette, sans rien connaître du vin. */
export function extraireIndices(texte: string): IndicesEtiquette {
  const brut = texte.replace(/\s+/g, ' ')
  const n = normaliser(texte)

  const annees = [...brut.matchAll(/\b(19[5-9]\d|20[0-4]\d)\b/g)].map((m) => Number(m[1]))
  const anneeMax = new Date().getFullYear()
  const millesime = annees.find((a) => a <= anneeMax) ?? null

  let volume_alcool: number | null = null
  const alc = brut.match(/\b(\d{1,2})(?:\s*[.,]\s*(\d))?\s*%\s*(?:vol|alc)?/i)
  if (alc) {
    const v = Number(`${alc[1]}.${alc[2] ?? 0}`)
    if (v >= 5 && v <= 23) volume_alcool = v
  }

  let format: string | null = null
  const cl = brut.match(/\b(\d{2,3}(?:[.,]5)?)\s*c\s*l\b/i)
  const ml = brut.match(/\b(\d{3,5})\s*m\s*l\b/i)
  const l = brut.match(/\b(\d{1,2}(?:[.,]\d)?)\s*l(?:itres?)?\b/i)
  if (cl) format = `${cl[1].replace('.', ',')} cl`
  else if (ml) format = formatDepuisCl(Number(ml[1]) / 10)
  else if (l) format = formatDepuisCl(Number(l[1].replace(',', '.')) * 100)

  let couleur: string | null = null
  if (/\brose\b/.test(n)) couleur = 'Rosé'
  else if (/\brouge\b/.test(n)) couleur = 'Rouge'
  else if (/\bblanc\b/.test(n)) couleur = 'Blanc'

  return { millesime, volume_alcool, format, couleur, sec: /\bsec\b/.test(n) }
}

function formatDepuisCl(cl: number): string | null {
  if (!Number.isFinite(cl) || cl < 10 || cl > 2000) return null
  if (cl < 100) return `${String(cl).replace('.', ',')} cl`
  return `${String(cl / 100).replace('.', ',')} L`
}

/**
 * Note un candidat :
 * - domaine (60 %) : part des mots clés du domaine retrouvés (racine carrée) ;
 * - cuvée (30 %) : part des mots clés de la cuvée ; sans nom de cuvée, demi-point ;
 * - appellation (10 %) : la présence de « sec » concorde avec l'appellation.
 * Sans aucun mot du domaine retrouvé, le candidat est écarté.
 */
export function noter(c: CandidatEtiquette, lus: Set<string>, texteColle: string, sec: boolean): number {
  // racine carrée : « Château Lapuyade » seul suffit pour « Clos Marie Louise & Château Lapuyade »
  const motsDomaine = motsCles(c.domaine)
  const dom = Math.sqrt(couverture(motsDomaine, lus, texteColle))
  if (dom === 0) return 0
  // « C de Cauhapé » : le nom du domaine ne compte pas comme mot de la cuvée
  const motsCuvee = motsCles(c.cuvee).filter((m) => !motsDomaine.includes(m))
  const cuv = motsCuvee.length ? couverture(motsCuvee, lus, texteColle) : 0.5
  const appSec = /\bsec\b/.test(normaliser(c.appellation ?? '')) || normaliser(c.style ?? '') === 'sec'
  const app = sec === appSec ? 1 : 0
  return Math.round((0.6 * dom + 0.3 * cuv + 0.1 * app) * 1000) / 1000
}

/** Les meilleures propositions (3 au plus), un vin de la cave passant avant son double du référentiel. */
export function rapprocher(texte: string, candidats: CandidatEtiquette[], max = 3): ResultatEtiquette {
  const indices = extraireIndices(texte)
  const lus = new Set(mots(texte))
  const texteColle = normaliser(texte).replace(/ /g, '')
  const vus = new Set<string>()
  const propositions = candidats
    .map((c) => ({ ...c, score: noter(c, lus, texteColle, indices.sec) }))
    .filter((p) => p.score >= SCORE_MIN)
    .sort((a, b) => b.score - a.score || (a.origine === 'cave' ? -1 : 1) - (b.origine === 'cave' ? -1 : 1))
    .filter((p) => {
      const cle = normaliser(`${p.domaine}|${p.cuvee ?? ''}|${p.appellation ?? ''}`)
      if (vus.has(cle)) return false
      vus.add(cle)
      return true
    })
    .slice(0, max)
  return { texte, indices, propositions }
}
