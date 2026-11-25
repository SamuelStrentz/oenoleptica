/** Vignerons. */
import type { SqlDb } from '@/db/sql'
import type { LigneCatalogue, LiensVigneron, NouveauVigneron, Vigneron, VigneronListe } from '@/domain/types'

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

export function majVigneron(db: SqlDb, id: number, v: NouveauVigneron): void {
  if (!v.nom?.trim()) throw new Error('Le nom du vigneron est obligatoire.')
  const { changes } = db.run(
    `UPDATE vignerons SET ${COLS_VIGNERON.map((c) => `${c} = ?`).join(', ')} WHERE id_vigneron = ?`,
    [...COLS_VIGNERON.map((c) => v[c] ?? null), id],
  )
  if (changes === 0) throw new Error('Vigneron introuvable.')
}

const SOUS_REQUETE = 'SELECT id_vin FROM vins WHERE id_vigneron = ?'

/** Ce qui sera supprimé avec un vigneron : vins, bouteilles, avis, mouvements. */
export function compterLiensVigneron(db: SqlDb, id: number): LiensVigneron {
  return {
    vins: Number(db.valeur('SELECT COUNT(*) FROM vins WHERE id_vigneron = ?', [id])),
    stock: Number(db.valeur(`SELECT COALESCE(SUM(quantite), 0) FROM stock WHERE id_vin IN (${SOUS_REQUETE})`, [id])),
    avis: Number(db.valeur(
      `SELECT COUNT(*) FROM avis WHERE id_vin IN (${SOUS_REQUETE}) AND (note IS NOT NULL OR categorie IS NOT NULL)`, [id])),
    mouvements: Number(db.valeur(`SELECT COUNT(*) FROM mouvements_stock WHERE id_vin IN (${SOUS_REQUETE})`, [id])),
  }
}

/** Supprime un vigneron, ses vins et le stock / avis / mouvements de ces vins. */
export function effacerVigneron(db: SqlDb, id: number): void {
  db.tx(() => {
    if (db.tableExiste('degustations')) db.run(`DELETE FROM degustations WHERE id_vin IN (${SOUS_REQUETE})`, [id])
    db.run(`DELETE FROM mouvements_stock WHERE id_vin IN (${SOUS_REQUETE})`, [id])
    db.run(`DELETE FROM stock WHERE id_vin IN (${SOUS_REQUETE})`, [id])
    db.run(`DELETE FROM avis WHERE id_vin IN (${SOUS_REQUETE})`, [id])
    db.run('DELETE FROM vins WHERE id_vigneron = ?', [id])
    if (db.run('DELETE FROM vignerons WHERE id_vigneron = ?', [id]).changes === 0) {
      throw new Error('Vigneron introuvable.')
    }
  })
}

/** Catalogue d'un vigneron : ses vins (tous domaines), avec prix et stock. */
export function catalogueVigneron(db: SqlDb, id: number): LigneCatalogue[] {
  return db.all<LigneCatalogue>(`
    SELECT v.id_vin, v.domaine, v.cepage, v.millesime, v.appellation, v.cuvee, v.cru, v.couleur,
           v.prix, COALESCE(s.quantite, 0) AS quantite
    FROM vins v LEFT JOIN stock s ON s.id_vin = v.id_vin
    WHERE v.id_vigneron = ?
    ORDER BY v.domaine COLLATE NOCASE, v.millesime, v.appellation COLLATE NOCASE,
             v.cepage COLLATE NOCASE, v.id_vin`, [id])
}
