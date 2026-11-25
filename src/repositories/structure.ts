/** Création, contrôle et mise à niveau de la structure d'une cave. */
import type { SqlDb } from '@/db/sql'
import { COLONNES_AJOUTEES, CEPAGES_INITIAUX, ORDRES_CREATE, TABLES_REQUISES } from '@/db/schema'

/** Crée toutes les tables et triggers dans une base vide + cépages usuels. */
export function creerStructure(db: SqlDb): void {
  db.tx(() => {
    for (const ordre of ORDRES_CREATE) db.exec(ordre)
    for (const [nom, type] of CEPAGES_INITIAUX) {
      db.run('INSERT OR IGNORE INTO cepages (nom, type) VALUES (?, ?)', [nom, type])
    }
  })
}

/** Lève une erreur si la base ne ressemble pas à une cave à vin. */
export function verifierStructure(db: SqlDb): void {
  const manquantes = TABLES_REQUISES.filter((t) => !db.tableExiste(t))
  if (manquantes.length) {
    throw new Error(
      `Ce fichier n'est pas une cave à vin : table(s) manquante(s) : ${manquantes.join(', ')}.`,
    )
  }
}

/**
 * Met à niveau une base ancienne (équivalent de « _verifier_colonnes » du
 * desktop, mais automatique) : colonnes manquantes + table cepages.
 * Retourne la liste des changements appliqués.
 */
export function migrer(db: SqlDb): string[] {
  const faits: string[] = []
  db.tx(() => {
    for (const [table, colonne, type] of COLONNES_AJOUTEES) {
      if (!db.colonnes(table).includes(colonne)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${colonne} ${type}`)
        faits.push(`${table}.${colonne}`)
      }
    }
    if (!db.tableExiste('cepages')) {
      db.exec(ORDRES_CREATE.find((o) => o.startsWith('CREATE TABLE cepages'))!)
      for (const [nom, type] of CEPAGES_INITIAUX) {
        db.run('INSERT OR IGNORE INTO cepages (nom, type) VALUES (?, ?)', [nom, type])
      }
      faits.push('cepages')
    }
  })
  return faits
}
