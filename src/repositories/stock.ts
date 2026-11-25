/** Stock et mouvements : toute variation de stock passe par un mouvement tracé. */
import type { SqlDb } from '@/db/sql'
import type { Mouvement, MouvementHistorique, TypeMouvement } from '@/domain/types'

export function stockDe(db: SqlDb, idVin: number): number {
  return Number(db.valeur('SELECT COALESCE(SUM(quantite), 0) FROM stock WHERE id_vin = ?', [idVin]))
}

/**
 * Entrée ou sortie de bouteilles : écrit dans mouvements_stock ET met à jour
 * stock (via le trigger trg_mouv_maj_stock, ou à la main s'il est absent).
 * Retourne le nouveau stock.
 */
export function enregistrerMouvement(
  db: SqlDb, idVin: number, type: TypeMouvement, quantite: number, date: string,
): number {
  if (type !== 'entrée' && type !== 'sortie') throw new Error(`Type de mouvement inconnu : ${type}`)
  if (!Number.isInteger(quantite) || quantite <= 0) throw new Error('La quantité doit être un entier positif.')
  return db.tx(() => {
    db.run('INSERT OR IGNORE INTO stock (id_vin, quantite) VALUES (?, 0)', [idVin])
    const actuel = stockDe(db, idVin)
    const variation = type === 'entrée' ? quantite : -quantite
    if (actuel + variation < 0) {
      throw new Error(`Stock insuffisant : ${actuel} bouteille(s) en stock, ${quantite} demandée(s).`)
    }
    db.run(
      'INSERT INTO mouvements_stock (id_vin, type_mouvement, quantite_mouvement, date_mouvement) VALUES (?, ?, ?, ?)',
      [idVin, type, quantite, date],
    )
    if (!db.triggerExiste('trg_mouv_maj_stock')) {
      db.run('UPDATE stock SET quantite = quantite + ? WHERE id_vin = ?', [variation, idVin])
    }
    return stockDe(db, idVin)
  })
}

/**
 * Fixe le stock d'un vin à « cible » : enregistre l'entrée ou la sortie
 * correspondant à l'écart. Ne fait rien si le stock est déjà bon.
 */
export function reglerStock(db: SqlDb, idVin: number, cible: number, date: string): number {
  if (!Number.isInteger(cible) || cible < 0) throw new Error('Le stock doit être un entier positif ou nul.')
  const actuel = stockDe(db, idVin)
  if (cible === actuel) return actuel
  return enregistrerMouvement(db, idVin, cible > actuel ? 'entrée' : 'sortie', Math.abs(cible - actuel), date)
}

/** Mouvements d'un vin, du plus récent au plus ancien. */
export function mouvementsDuVin(db: SqlDb, idVin: number): Mouvement[] {
  return db.all<Mouvement>(
    `SELECT id_mouv, id_vin, type_mouvement, quantite_mouvement, date_mouvement
     FROM mouvements_stock WHERE id_vin = ? ORDER BY date_mouvement DESC, id_mouv DESC`, [idVin])
}

/** Historique complet des entrées / sorties, avec le vin concerné. */
export function historique(db: SqlDb): MouvementHistorique[] {
  return db.all<MouvementHistorique>(`
    SELECT m.id_mouv, m.id_vin, m.type_mouvement, m.quantite_mouvement, m.date_mouvement,
           v.domaine, v.millesime, v.appellation, v.cuvee, v.couleur, v.prix
    FROM mouvements_stock m LEFT JOIN vins v ON v.id_vin = m.id_vin
    ORDER BY m.date_mouvement DESC, m.id_mouv DESC`)
}
