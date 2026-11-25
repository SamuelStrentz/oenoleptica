/** Vignerons. */
import type { SqlDb } from '@/db/sql'
import type { NouveauVigneron, Vigneron, VigneronListe } from '@/domain/types'

export const COLS_VIGNERON = [
  'prenom', 'nom', 'mail', 'adresse', 'cp', 'ville', 'departement', 'region', 'pays',
] as const

export function insererVigneron(db: SqlDb, v: NouveauVigneron): number {
  if (!v.nom?.trim()) throw new Error('Le nom du vigneron est obligatoire.')
  return db.run(
    `INSERT INTO vignerons (${COLS_VIGNERON.join(', ')}) VALUES (${COLS_VIGNERON.map(() => '?').join(', ')})`,
    COLS_VIGNERON.map((c) => v[c] ?? null),
  ).lastId
}

export function lireVigneron(db: SqlDb, id: number): Vigneron | undefined {
  return db.get<Vigneron>('SELECT * FROM vignerons WHERE id_vigneron = ?', [id])
}

/**
 * Vignerons triés par nom, avec leurs domaines et leur nombre de vins /
 * bouteilles. Les homonymes sont distingués par leur numéro.
 */
export function listerVignerons(db: SqlDb): VigneronListe[] {
  const lignes = db.all<Omit<VigneronListe, 'libelle'> & { prenom: string | null; nom: string }>(`
    SELECT g.id_vigneron, g.prenom, g.nom, g.ville, g.region,
           (SELECT GROUP_CONCAT(domaine, ', ') FROM
              (SELECT DISTINCT domaine FROM vins v
               WHERE v.id_vigneron = g.id_vigneron AND TRIM(COALESCE(v.domaine, '')) <> ''
               ORDER BY domaine COLLATE NOCASE)) AS domaines,
           (SELECT COUNT(*) FROM vins v WHERE v.id_vigneron = g.id_vigneron) AS nb_vins,
           (SELECT COALESCE(SUM(s.quantite), 0) FROM stock s
              JOIN vins v ON v.id_vin = s.id_vin WHERE v.id_vigneron = g.id_vigneron) AS bouteilles
    FROM vignerons g
    ORDER BY g.nom COLLATE NOCASE, g.prenom COLLATE NOCASE, g.id_vigneron`)
  const vus = new Set<string>()
  return lignes.map(({ prenom, nom, ...reste }) => {
    let libelle = [prenom, nom].filter(Boolean).join(' ')
    if (vus.has(libelle)) libelle += ` (n°${reste.id_vigneron})`
    vus.add(libelle)
    return { ...reste, libelle }
  })
}
