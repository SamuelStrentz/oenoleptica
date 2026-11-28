/**
 * Candidats pour la reconnaissance d'étiquette : les vins de la cave ouverte
 * et ceux du référentiel (base à part, importée par l'utilisateur, même
 * structure que la cave).
 */
import type { SqlDb } from '@/db/sql'
import type { CandidatEtiquette } from '@/domain/etiquette'
import type { NouveauVigneron } from '@/domain/types'
import { normaliser } from '@/domain/etiquette'
import { COLS_VIGNERON } from './vignerons'

export interface InfoReferentiel {
  vignerons: number
  vins: number
}

const COLS_VIN = 'v.domaine, v.cuvee, v.appellation, v.couleur, v.cepage, v.style, v.volume_alcool, v.format, v.prix'

type LigneVin = Omit<CandidatEtiquette, 'origine' | 'id_vigneron' | 'vigneron'>

export function infoReferentiel(ref: SqlDb): InfoReferentiel {
  return {
    vignerons: Number(ref.valeur('SELECT count(*) FROM vignerons')),
    vins: Number(ref.valeur('SELECT count(*) FROM vins')),
  }
}

export function candidatsCave(db: SqlDb): CandidatEtiquette[] {
  return db
    .all<LigneVin & { id_vigneron: number | null }>(`SELECT ${COLS_VIN}, v.id_vigneron FROM vins v`)
    .map((l) => ({ ...l, origine: 'cave', vigneron: null }))
}

/**
 * Vins du référentiel. Leur vigneron est rattaché à celui de la cave s'il y
 * existe déjà (même domaine, ou même nom et prénom) ; sinon il est fourni
 * complet, pour être créé avec le vin.
 */
export function candidatsReferentiel(ref: SqlDb, db: SqlDb): CandidatEtiquette[] {
  const parDomaine = new Map<string, number>()
  const parNom = new Map<string, number>()
  const colsCave = db.colonnes('vignerons')
  const avecDomaine = colsCave.includes('domaine')
  for (const v of db.all<{ id_vigneron: number; domaine: string | null; prenom: string | null; nom: string }>(
    `SELECT id_vigneron, ${avecDomaine ? 'domaine' : 'NULL AS domaine'}, prenom, nom FROM vignerons`,
  )) {
    if (v.domaine) parDomaine.set(normaliser(v.domaine), v.id_vigneron)
    parNom.set(normaliser(`${v.prenom ?? ''} ${v.nom}`), v.id_vigneron)
  }
  // les vins de la cave rattachent aussi un domaine à son vigneron
  for (const v of db.all<{ domaine: string; id_vigneron: number }>('SELECT domaine, id_vigneron FROM vins WHERE id_vigneron IS NOT NULL')) {
    const cle = normaliser(v.domaine)
    if (!parDomaine.has(cle)) parDomaine.set(cle, v.id_vigneron)
  }

  const colsRef = ref.colonnes('vignerons')
  const selVigneron = COLS_VIGNERON.map((c) => (colsRef.includes(c) ? `g.${c} AS g_${c}` : `NULL AS g_${c}`)).join(', ')
  const lignes = ref.all<Record<string, unknown>>(
    `SELECT ${COLS_VIN}, ${selVigneron}, g.id_vigneron AS g_id FROM vins v LEFT JOIN vignerons g ON g.id_vigneron = v.id_vigneron`,
  )
  return lignes.map((l) => {
    const vin: LigneVin = {
      domaine: String(l.domaine), cuvee: l.cuvee as string | null, appellation: l.appellation as string | null,
      couleur: l.couleur as string | null, cepage: l.cepage as string | null, style: l.style as string | null,
      volume_alcool: l.volume_alcool as number | null, format: l.format as string | null, prix: l.prix as number | null,
    }
    if (l.g_id === null || l.g_id === undefined || !l.g_nom) return { ...vin, origine: 'referentiel', id_vigneron: null, vigneron: null }
    const g = Object.fromEntries(COLS_VIGNERON.map((c) => [c, (l[`g_${c}`] as string | null) ?? null])) as unknown as NouveauVigneron
    const id = parDomaine.get(normaliser(g.domaine ?? vin.domaine)) ?? parNom.get(normaliser(`${g.prenom ?? ''} ${g.nom}`)) ?? null
    return { ...vin, origine: 'referentiel', id_vigneron: id, vigneron: id ? null : g }
  })
}
