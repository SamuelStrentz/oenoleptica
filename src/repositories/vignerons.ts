/** Vignerons. */
import type { SqlDb } from '@/db/sql'
import type { LigneCatalogue, LiensVigneron, NouveauVigneron, Vigneron, VigneronListe } from '@/domain/types'

export const COLS_VIGNERON = [
  'domaine', 'prenom', 'nom', 'mail', 'adresse', 'cp', 'ville', 'departement', 'region', 'pays',
] as const

export function insererVigneron(db: SqlDb, v: NouveauVigneron): number {
  if (!v.nom?.trim()) throw new Error('Le nom du vigneron est obligatoire.')
  return db.run(
    `INSERT INTO vignerons (${COLS_VIGNERON.join(', ')}) VALUES (${COLS_VIGNERON.map(() => '?').join(', ')})`,
    COLS_VIGNERON.map((c) => v[c] ?? null),
  ).lastId
}

/**
 * Ajoute les vignerons absents de la base (même nom et prénom = déjà là).
 * Tout ou rien. Retourne le nombre d'ajoutés et d'ignorés.
 */
export function importerVignerons(db: SqlDb, liste: NouveauVigneron[]): { ajoutes: number; ignores: number } {
  return db.tx(() => {
    let ajoutes = 0
    for (const v of liste) {
      const existe = db.valeur(
        "SELECT 1 FROM vignerons WHERE nom = ? COLLATE NOCASE AND COALESCE(prenom, '') = ? COLLATE NOCASE",
        [v.nom.trim(), v.prenom ?? ''])
      if (existe) continue
      insererVigneron(db, v)
      ajoutes++
    }
    return { ajoutes, ignores: liste.length - ajoutes }
  })
}

/** Tous les vignerons, fiches complètes (export). */
export function tousLesVignerons(db: SqlDb): Vigneron[] {
  return db.all<Vigneron>('SELECT * FROM vignerons ORDER BY nom COLLATE NOCASE, prenom COLLATE NOCASE, id_vigneron')
}

export function lireVigneron(db: SqlDb, id: number): Vigneron | undefined {
  return db.get<Vigneron>('SELECT * FROM vignerons WHERE id_vigneron = ?', [id])
}

/**
 * Vignerons triés par prénom, avec leurs domaines et leur nombre de vins /
 * bouteilles. Les homonymes sont distingués par leur numéro.
 */
export function listerVignerons(db: SqlDb): VigneronListe[] {
  const lignes = db.all<Omit<VigneronListe, 'libelle'> & { prenom: string | null; nom: string; domaine: string | null }>(`
    SELECT g.id_vigneron, g.domaine, g.prenom, g.nom, g.ville, g.region,
           (SELECT GROUP_CONCAT(domaine, ', ') FROM
              (SELECT DISTINCT domaine FROM vins v
               WHERE v.id_vigneron = g.id_vigneron AND TRIM(COALESCE(v.domaine, '')) <> ''
               ORDER BY domaine COLLATE NOCASE)) AS domaines,
           (SELECT COUNT(*) FROM vins v WHERE v.id_vigneron = g.id_vigneron) AS nb_vins,
           (SELECT COALESCE(SUM(s.quantite), 0) FROM stock s
              JOIN vins v ON v.id_vin = s.id_vin WHERE v.id_vigneron = g.id_vigneron) AS bouteilles
    FROM vignerons g
    ORDER BY COALESCE(NULLIF(TRIM(g.prenom), ''), g.nom) COLLATE NOCASE, g.nom COLLATE NOCASE, g.id_vigneron`)
  const vus = new Set<string>()
  return lignes.map(({ prenom, nom, domaine, ...reste }) => {
    let libelle = [prenom, nom].filter(Boolean).join(' ')
    if (vus.has(libelle)) libelle += ` (n°${reste.id_vigneron})`
    vus.add(libelle)
    // le domaine du vigneron d'abord, puis ceux de ses vins (sans doublon)
    const tous = [domaine?.trim(), ...(reste.domaines?.split(', ') ?? [])].filter((d): d is string => !!d)
    const uniques = tous.filter((d, i) => tous.findIndex((x) => x.toLowerCase() === d.toLowerCase()) === i)
    return { ...reste, domaines: uniques.join(', ') || null, libelle }
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
