/**
 * Apprentissage à partir de tes dégustations.
 *
 * Pour chaque vin dégusté, on mesure l'écart entre ta note et le profil
 * calculé. Ces écarts sont moyennés à trois niveaux, du plus général au plus
 * précis : ton palais (tous les vins), l'appellation, le vigneron. Chaque
 * moyenne est « freinée » tant qu'elle repose sur peu de dégustations :
 * correction = moyenne × n / (n + k). Une seule dégustation pèse donc peu.
 */
import { CRITERES, type Critere } from './echelles'
import type { Effets } from './connaissances/terroir'
import type { Correction } from './types'

export interface Observation {
  idVin: number
  idVigneron: number | null
  appellation: string | null
  /** Profil calculé SANS corrections. */
  prediction: Record<Critere, number>
  /** Valeurs notées (null = non noté). */
  degustation: Partial<Record<Critere, number | null>>
}

const K = { palais: 6, appellation: 6, vigneron: 5 }
const PLAFOND: Partial<Record<Critere, number>> = { longueur: 2 }

function moyenneFreinee(ecarts: number[], k: number, critere: Critere): number {
  if (!ecarts.length) return 0
  const m = ecarts.reduce((a, b) => a + b, 0) / ecarts.length
  const freinee = (m * ecarts.length) / (ecarts.length + k)
  const plafond = PLAFOND[critere] ?? 1
  return Math.max(-plafond, Math.min(plafond, Math.round(freinee * 100) / 100))
}

/** Calcule les corrections applicables à un vin donné. */
export function corrections(obs: Observation[], idVigneron: number | null, appellation: string | null): Correction[] {
  if (!obs.length) return []
  const palais: Effets = {}
  const parApp: Effets = {}
  const parVig: Effets = {}
  const nApp = obs.filter((o) => appellation && o.appellation === appellation).length
  const nVig = obs.filter((o) => idVigneron !== null && o.idVigneron === idVigneron).length

  for (const { cle } of CRITERES) {
    const ecart = (o: Observation) => {
      const v = o.degustation[cle]
      return v === null || v === undefined ? null : v - o.prediction[cle]
    }
    const tous = obs.map((o) => ({ o, e: ecart(o) })).filter((x): x is { o: Observation; e: number } => x.e !== null)
    palais[cle] = moyenneFreinee(tous.map((x) => x.e), K.palais, cle)
    const reste1 = tous.filter((x) => appellation && x.o.appellation === appellation).map((x) => x.e - (palais[cle] ?? 0))
    parApp[cle] = moyenneFreinee(reste1, K.appellation, cle)
    const reste2 = tous.filter((x) => idVigneron !== null && x.o.idVigneron === idVigneron)
      .map((x) => x.e - (palais[cle] ?? 0) - (x.o.appellation === appellation ? parApp[cle] ?? 0 : 0))
    parVig[cle] = moyenneFreinee(reste2, K.vigneron, cle)
  }

  const resultat: Correction[] = [{ couche: 'Ton palais', effets: palais, n: obs.length }]
  if (nApp) resultat.push({ couche: `Tes dégustations de ${appellation}`, effets: parApp, n: nApp })
  if (nVig) resultat.push({ couche: 'Tes dégustations de ce vigneron', effets: parVig, n: nVig })
  return resultat
}
