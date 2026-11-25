/** Avis (note / catégorie). */
import type { SqlDb } from '@/db/sql'

/** Catégories déjà utilisées (suggestions de saisie). */
export function listerCategories(db: SqlDb): string[] {
  return db
    .all<{ categorie: string }>(
      "SELECT DISTINCT categorie FROM avis WHERE categorie IS NOT NULL AND categorie <> '' ORDER BY categorie COLLATE NOCASE",
    )
    .map((r) => r.categorie)
}

/**
 * Ajoute un avis à un vin. Si le vin a une ligne d'avis vide (créée à
 * l'ajout du vin), elle est remplie au lieu d'en créer une deuxième.
 */
export function insererAvis(db: SqlDb, idVin: number, note: number | null, categorie: string | null): number {
  const vide = db.valeur<number>(
    'SELECT id_avis FROM avis WHERE id_vin = ? AND note IS NULL AND categorie IS NULL ORDER BY id_avis LIMIT 1',
    [idVin],
  )
  if (vide !== undefined) {
    db.run('UPDATE avis SET note = ?, categorie = ? WHERE id_avis = ?', [note, categorie, vide])
    return vide
  }
  return db.run('INSERT INTO avis (id_vin, note, categorie) VALUES (?, ?, ?)', [idVin, note, categorie]).lastId
}
