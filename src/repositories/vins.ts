/** Vins : lecture de la cave, ajout, modification, suppression. */
import type { SqlDb } from '@/db/sql'
import type { AjoutVin, ChampsVin, Statistiques, VinCave, VinDetail } from '@/domain/types'
import { aujourdhui } from '@/domain/parsers'
import { cepagesDuVin, memoriserCepages } from './cepages'
import { insererVigneron, lireVigneron } from './vignerons'
import { mouvementsDuVin } from './stock'

/**
 * La cave : un vin par ligne avec son stock, la région du vigneron, la note
 * moyenne et les catégories (= vue « Standard » de l'appli desktop).
 */
export function listerCave(db: SqlDb): VinCave[] {
  return db.all<VinCave>(`
    SELECT v.id_vin, v.id_vigneron, v.domaine, v.millesime, v.appellation, v.cuvee, v.cru,
           v.couleur, v.prix, v.cepage, v.volume_alcool, v.format,
           COALESCE(s.quantite, 0) AS quantite, g.region,
           ROUND(AVG(a.note), 1) AS note, GROUP_CONCAT(DISTINCT a.categorie) AS categories
    FROM vins v
    LEFT JOIN vignerons g ON g.id_vigneron = v.id_vigneron
    LEFT JOIN stock s     ON s.id_vin = v.id_vin
    LEFT JOIN avis a      ON a.id_vin = v.id_vin
    GROUP BY v.id_vin
    ORDER BY v.domaine COLLATE NOCASE, v.millesime, v.id_vin`)
}

export function lireVinCave(db: SqlDb, idVin: number): VinCave | undefined {
  return listerCave(db).find((v) => v.id_vin === idVin)
}

/** Fiche complète d'un vin : vigneron, avis, mouvements, cépages et leurs profils. */
export function lireDetailVin(db: SqlDb, idVin: number): VinDetail {
  const vin = lireVinCave(db, idVin)
  if (!vin) throw new Error('Vin introuvable.')
  return {
    vin,
    vigneron: vin.id_vigneron ? lireVigneron(db, vin.id_vigneron) ?? null : null,
    avis: db.all(
      'SELECT note, categorie FROM avis WHERE id_vin = ? AND (note IS NOT NULL OR categorie IS NOT NULL) ORDER BY id_avis',
      [idVin]),
    mouvements: mouvementsDuVin(db, idVin),
    cepages: cepagesDuVin(db, vin.cepage),
  }
}

function verifierChamps(d: ChampsVin): void {
  if (!d.domaine?.trim()) throw new Error('Le domaine est obligatoire.')
}

/**
 * Ajoute un vin et tout ce qui s'y rattache (cf. inserer_vin en Python) :
 * vigneron éventuel, ligne de stock, mouvement d'entrée si quantité > 0,
 * ligne d'avis, cépages inconnus. Tout ou rien. Retourne id_vin.
 */
export function insererVin(db: SqlDb, d: AjoutVin, date = aujourdhui()): number {
  verifierChamps(d)
  if (!Number.isInteger(d.quantite) || d.quantite < 0) throw new Error('La quantité doit être un entier positif ou nul.')
  return db.tx(() => {
    const idVigneron = d.vigneron_nouveau ? insererVigneron(db, d.vigneron_nouveau) : d.vigneron_id

    const idVin = db.run(
      `INSERT INTO vins (id_vigneron, domaine, cepage, millesime, appellation, cuvee, cru,
                         couleur, prix, volume_alcool, format)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [idVigneron, d.domaine.trim(), d.cepage, d.millesime, d.appellation, d.cuvee, d.cru,
        d.couleur, d.prix, d.volume_alcool, d.format],
    ).lastId

    // Ligne de stock toujours présente (le trigger s'en charge normalement)
    db.run('INSERT OR IGNORE INTO stock (id_vin, quantite) VALUES (?, 0)', [idVin])

    if (d.quantite > 0) {
      db.run(
        "INSERT INTO mouvements_stock (id_vin, type_mouvement, quantite_mouvement, date_mouvement) VALUES (?, 'entrée', ?, ?)",
        [idVin, d.quantite, date],
      )
      if (!db.triggerExiste('trg_mouv_maj_stock')) {
        db.run('UPDATE stock SET quantite = quantite + ? WHERE id_vin = ?', [d.quantite, idVin])
      }
    }

    // Ligne d'avis toujours créée (vide si rien de saisi), comme le desktop
    db.run('INSERT INTO avis (id_vin, note, categorie) VALUES (?, ?, ?)', [idVin, d.note, d.categorie])

    memoriserCepages(db, [[d.cepage, d.couleur]])
    return idVin
  })
}

/** Met à jour les champs d'un vin (sauf l'id). */
export function majVin(db: SqlDb, idVin: number, idVigneron: number | null, d: ChampsVin): void {
  verifierChamps(d)
  db.tx(() => {
    const { changes } = db.run(
      `UPDATE vins SET id_vigneron = ?, domaine = ?, cepage = ?, millesime = ?, appellation = ?,
              cuvee = ?, cru = ?, couleur = ?, prix = ?, volume_alcool = ?, format = ?
       WHERE id_vin = ?`,
      [idVigneron, d.domaine.trim(), d.cepage, d.millesime, d.appellation, d.cuvee, d.cru,
        d.couleur, d.prix, d.volume_alcool, d.format, idVin],
    )
    if (changes === 0) throw new Error('Vin introuvable.')
    memoriserCepages(db, [[d.cepage, d.couleur]])
  })
}

/** Supprime un vin et ses lignes liées (mouvements, stock, avis). */
export function effacerVin(db: SqlDb, idVin: number): void {
  db.tx(() => {
    if (db.tableExiste('degustations')) db.run('DELETE FROM degustations WHERE id_vin = ?', [idVin])
    db.run('DELETE FROM mouvements_stock WHERE id_vin = ?', [idVin])
    db.run('DELETE FROM stock WHERE id_vin = ?', [idVin])
    db.run('DELETE FROM avis WHERE id_vin = ?', [idVin])
    if (db.run('DELETE FROM vins WHERE id_vin = ?', [idVin]).changes === 0) {
      throw new Error('Vin introuvable.')
    }
  })
}

export function statistiques(db: SqlDb): Statistiques {
  return db.get<Statistiques>(`
    SELECT (SELECT COUNT(*) FROM vins) AS vins,
           (SELECT COUNT(*) FROM stock WHERE quantite > 0) AS vins_en_stock,
           (SELECT COALESCE(SUM(quantite), 0) FROM stock) AS bouteilles,
           (SELECT COUNT(*) FROM vignerons) AS vignerons,
           (SELECT COALESCE(SUM(s.quantite * v.prix), 0) FROM stock s
              JOIN vins v ON v.id_vin = s.id_vin WHERE v.prix IS NOT NULL) AS valeur`)!
}
