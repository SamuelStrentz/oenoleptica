/** Fiches de dégustation (table degustations). */
import type { SqlDb } from '@/db/sql'
import type { Degustation } from '@/domain/profil/types'
import { insererAvis } from './avis'
import { enregistrerMouvement, stockDe } from './stock'

export const ORDRE_CREATE_DEGUSTATIONS = `CREATE TABLE degustations (
    id_degustation   INTEGER PRIMARY KEY AUTOINCREMENT,
    id_vin           INTEGER NOT NULL REFERENCES vins(id_vin) ON DELETE CASCADE,
    date_degustation TEXT NOT NULL,
    teinte           REAL,
    intensite_robe   REAL,
    intensite_nez    REAL,
    aromes           TEXT,
    sucre            REAL,
    acidite          REAL,
    amertume         REAL,
    salinite         REAL,
    alcool           REAL,
    tanins           REAL,
    corps            REAL,
    effervescence    REAL,
    longueur         REAL,
    note             REAL,
    conclusion       TEXT,
    commentaire      TEXT
)`

const COLONNES = [
  'id_vin', 'date_degustation', 'teinte', 'intensite_robe', 'intensite_nez', 'aromes', 'sucre', 'acidite',
  'amertume', 'salinite', 'alcool', 'tanins', 'corps', 'effervescence', 'longueur', 'note', 'conclusion', 'commentaire',
] as const

type Ligne = Omit<Degustation, 'aromes'> & { aromes: string | null }

function versObjet(l: Ligne): Degustation {
  let aromes: Record<string, number> = {}
  try {
    aromes = l.aromes ? JSON.parse(l.aromes) : {}
  } catch {
    /* texte illisible : ignoré */
  }
  return { ...l, aromes }
}

export function degustationsDuVin(db: SqlDb, idVin: number): Degustation[] {
  if (!db.tableExiste('degustations')) return []
  return db.all<Ligne>('SELECT * FROM degustations WHERE id_vin = ? ORDER BY date_degustation DESC, id_degustation DESC', [idVin])
    .map(versObjet)
}

/** Dernière dégustation de chaque vin dégusté (pour l'apprentissage). */
export function dernieresDegustations(db: SqlDb): Degustation[] {
  if (!db.tableExiste('degustations')) return []
  return db.all<Ligne>(`
    SELECT d.* FROM degustations d
    WHERE d.id_degustation = (SELECT d2.id_degustation FROM degustations d2 WHERE d2.id_vin = d.id_vin
                              ORDER BY d2.date_degustation DESC, d2.id_degustation DESC LIMIT 1)`).map(versObjet)
}

/**
 * Enregistre une dégustation. Avec une note : alimente aussi la table avis.
 * Avec retirerBouteille : enregistre une sortie de stock. Tout ou rien.
 */
export function insererDegustation(db: SqlDb, d: Degustation, retirerBouteille: boolean): number {
  return db.tx(() => {
    const id = db.run(
      `INSERT INTO degustations (${COLONNES.join(', ')}) VALUES (${COLONNES.map(() => '?').join(', ')})`,
      COLONNES.map((c) => (c === 'aromes' ? JSON.stringify(d.aromes ?? {}) : (d[c] ?? null))),
    ).lastId
    if (d.note !== null) insererAvis(db, d.id_vin, d.note, null)
    if (retirerBouteille && stockDe(db, d.id_vin) > 0) {
      enregistrerMouvement(db, d.id_vin, 'sortie', 1, d.date_degustation)
    }
    return id
  })
}

export function supprimerDegustation(db: SqlDb, id: number): void {
  db.run('DELETE FROM degustations WHERE id_degustation = ?', [id])
}
