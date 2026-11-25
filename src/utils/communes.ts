/**
 * Recherche de communes françaises via l'API publique geo.api.gouv.fr
 * (gratuite, sans clé). Hors ligne : on renvoie simplement une liste vide
 * et la saisie reste manuelle.
 */
import { ancienneRegion } from '@/domain/regions'

export interface Commune {
  ville: string
  cp: string
  departement: string
  codeDepartement: string
  region: string | null
  pays: string
}

interface ReponseApi {
  nom: string
  codesPostaux: string[]
  codeDepartement: string
  departement?: { code: string; nom: string }
}

const API = 'https://geo.api.gouv.fr/communes'
const CHAMPS = 'nom,codesPostaux,codeDepartement,departement'

async function interroger(params: Record<string, string>, signal?: AbortSignal): Promise<Commune[]> {
  const url = `${API}?${new URLSearchParams({ ...params, fields: CHAMPS, boost: 'population', limit: '8' })}`
  try {
    const r = await fetch(url, { signal })
    if (!r.ok) return []
    const lignes = (await r.json()) as ReponseApi[]
    // une commune peut avoir plusieurs codes postaux : une suggestion par CP
    return lignes.flatMap((c) =>
      (c.codesPostaux.length ? c.codesPostaux : ['']).map((cp) => ({
        ville: c.nom,
        cp,
        departement: c.departement?.nom ?? '',
        codeDepartement: c.codeDepartement,
        region: ancienneRegion(c.codeDepartement),
        pays: 'France',
      })),
    )
  } catch {
    return [] // hors ligne ou requête annulée
  }
}

export function chercherParNom(nom: string, signal?: AbortSignal): Promise<Commune[]> {
  return nom.trim().length < 2 ? Promise.resolve([]) : interroger({ nom: nom.trim() }, signal)
}

export function chercherParCp(cp: string, signal?: AbortSignal): Promise<Commune[]> {
  return /^\d{5}$/.test(cp.trim()) ? interroger({ codePostal: cp.trim() }, signal) : Promise.resolve([])
}
