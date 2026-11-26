/**
 * Statistiques de la cave (onglet « Statistiques ») : répartitions des
 * bouteilles en cave par couleur, appellation, département, maturité.
 * La maturité vient de la fenêtre de dégustation du moteur de profil.
 */
import type { SqlDb } from '@/db/sql'
import type { VinCave } from '@/domain/types'
import type { Fenetre } from '@/domain/profil/types'
import { listerCave } from './vins'
import { profilDuVin } from './profil'

export interface Part {
  libelle: string
  bouteilles: number
  vins: number
}

export type Maturite = 'jeune' | 'attendre' | 'deguster' | 'vite' | 'passe' | 'inconnu'

export const MATURITES: Record<Maturite, string> = {
  jeune: 'Trop jeune',
  attendre: 'Peut attendre',
  deguster: 'À déguster',
  vite: 'À boire vite',
  passe: 'Probablement passé',
  inconnu: 'Non millésimé',
}

export interface VinPrioritaire {
  id_vin: number
  domaine: string
  millesime: number | null
  appellation: string | null
  couleur: string | null
  quantite: number
  fenetre: string
  maturite: Maturite
}

export interface TableauDeBord {
  bouteilles: number
  vins: number
  valeur: number
  prixMoyen: number | null
  noteMoyenne: number | null
  ageMoyen: number | null
  couleurs: Part[]
  appellations: Part[]
  departements: Part[]
  maturite: (Part & { cle: Maturite })[]
  /** À boire vite / passés d'abord, puis à leur apogée. */
  prioritaires: VinPrioritaire[]
}

/** Range un vin selon sa fenêtre de dégustation. */
export function maturiteDe(f: Fenetre): Maturite {
  switch (f.etat) {
    case 'attendre':
      return 'jeune'
    case 'pret':
      // « Prêt, peut encore attendre » (vin de garde) ou « À boire » (vin à boire jeune)
      return f.libelle === 'À boire' ? 'deguster' : 'attendre'
    case 'apogee':
      return 'deguster'
    case 'boire-vite':
      return 'vite'
    case 'passe':
      return 'passe'
    default:
      return 'inconnu'
  }
}

const AUTRES = 'Autres'

/** Regroupe en parts, triées par bouteilles ; au-delà de `max`, le reste va dans « Autres ». */
export function repartir(vins: VinCave[], cle: (v: VinCave) => string | null, max = 8): Part[] {
  const parts = new Map<string, Part>()
  for (const v of vins) {
    const libelle = cle(v)?.trim() || 'Non renseigné'
    const p = parts.get(libelle) ?? { libelle, bouteilles: 0, vins: 0 }
    p.bouteilles += v.quantite
    p.vins++
    parts.set(libelle, p)
  }
  const triees = [...parts.values()].sort((a, b) => b.bouteilles - a.bouteilles || a.libelle.localeCompare(b.libelle, 'fr'))
  if (triees.length <= max) return triees
  const reste = triees.slice(max - 1)
  return [
    ...triees.slice(0, max - 1),
    { libelle: AUTRES, bouteilles: reste.reduce((s, p) => s + p.bouteilles, 0), vins: reste.reduce((s, p) => s + p.vins, 0) },
  ]
}

/** Couleur ramenée à Rouge / Blanc / Rosé / Effervescent. */
function familleCouleur(v: VinCave): string | null {
  const c = v.couleur?.toLowerCase() ?? ''
  if (!c) return null
  if (c.includes('effervescent') || c.includes('pétillant')) return 'Effervescent'
  if (c.startsWith('rouge')) return 'Rouge'
  if (c.startsWith('ros')) return 'Rosé'
  if (c.startsWith('blanc')) return 'Blanc'
  return v.couleur
}

export function tableauDeBord(db: SqlDb, annee = new Date().getFullYear()): TableauDeBord {
  const enCave = listerCave(db).filter((v) => v.quantite > 0)
  const departements = new Map(
    db.all<{ id_vigneron: number; departement: string | null }>('SELECT id_vigneron, departement FROM vignerons')
      .map((g) => [g.id_vigneron, g.departement]),
  )
  const bouteilles = enCave.reduce((s, v) => s + v.quantite, 0)
  const avecPrix = enCave.filter((v) => v.prix !== null)
  const bouteillesAvecPrix = avecPrix.reduce((s, v) => s + v.quantite, 0)
  const valeur = avecPrix.reduce((s, v) => s + v.quantite * v.prix!, 0)
  const notes = enCave.filter((v) => v.note !== null).map((v) => v.note!)
  const millesimes = enCave.filter((v) => v.millesime !== null)
  const ages = millesimes.reduce((s, v) => s + (annee - v.millesime!) * v.quantite, 0)
  const nbAges = millesimes.reduce((s, v) => s + v.quantite, 0)

  // maturité : fenêtre du moteur de profil, vin par vin
  const maturite = new Map<Maturite, Part & { cle: Maturite }>()
  const prioritaires: VinPrioritaire[] = []
  for (const v of enCave) {
    const f = profilDuVin(db, v.id_vin, annee).fenetre
    const m = maturiteDe(f)
    const p = maturite.get(m) ?? { cle: m, libelle: MATURITES[m], bouteilles: 0, vins: 0 }
    p.bouteilles += v.quantite
    p.vins++
    maturite.set(m, p)
    if (m === 'vite' || m === 'passe' || f.etat === 'apogee') {
      prioritaires.push({
        id_vin: v.id_vin, domaine: v.domaine, millesime: v.millesime, appellation: v.appellation,
        couleur: v.couleur, quantite: v.quantite, fenetre: f.libelle, maturite: m,
      })
    }
  }
  const rang: Record<Maturite, number> = { passe: 0, vite: 1, deguster: 2, attendre: 3, jeune: 4, inconnu: 5 }
  prioritaires.sort((a, b) => rang[a.maturite] - rang[b.maturite] || (a.millesime ?? 0) - (b.millesime ?? 0))

  return {
    bouteilles,
    vins: enCave.length,
    valeur,
    prixMoyen: bouteillesAvecPrix ? valeur / bouteillesAvecPrix : null,
    noteMoyenne: notes.length ? notes.reduce((s, n) => s + n, 0) / notes.length : null,
    ageMoyen: nbAges ? ages / nbAges : null,
    couleurs: repartir(enCave, familleCouleur, 6),
    appellations: repartir(enCave, (v) => v.appellation),
    departements: repartir(enCave, (v) => (v.id_vigneron ? departements.get(v.id_vigneron) ?? null : null)),
    maturite: (Object.keys(MATURITES) as Maturite[]).map((m) => maturite.get(m)).filter((p): p is Part & { cle: Maturite } => !!p),
    prioritaires: prioritaires.slice(0, 8),
  }
}
