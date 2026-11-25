/** Création, contrôle et mise à niveau de la structure d'une cave. */
import type { SqlDb } from '@/db/sql'
import { COLONNES_AJOUTEES, CEPAGES_INITIAUX, ORDRES_CREATE, TABLES_REQUISES } from '@/db/schema'
import { COLONNES_PROFIL, ORDRE_CREATE_PROFILS, PROFILS_INITIAUX } from '@/db/profils-cepages'
import { cleCepage } from '@/domain/cepages'

/** Crée toutes les tables et triggers dans une base vide + cépages usuels et leurs profils. */
export function creerStructure(db: SqlDb): void {
  db.tx(() => {
    for (const ordre of ORDRES_CREATE) db.exec(ordre)
    semerCepages(db)
    db.exec(ORDRE_CREATE_PROFILS)
    semerProfils(db)
  })
}

function semerCepages(db: SqlDb): void {
  for (const [nom, type] of CEPAGES_INITIAUX) {
    db.run('INSERT OR IGNORE INTO cepages (nom, type) VALUES (?, ?)', [nom, type])
  }
}

/** Ajoute le profil type des cépages connus qui n'en ont pas encore. Retourne le nombre ajouté. */
export function semerProfils(db: SqlDb): number {
  const parCle = new Map(Object.entries(PROFILS_INITIAUX).map(([nom, p]) => [cleCepage(nom), p]))
  const sansProfil = db.all<{ id_cepage: number; nom: string }>(
    `SELECT c.id_cepage, c.nom FROM cepages c
     LEFT JOIN profils_cepages p ON p.id_cepage = c.id_cepage WHERE p.id_profil IS NULL`)
  let n = 0
  for (const { id_cepage, nom } of sansProfil) {
    const p = parCle.get(cleCepage(nom))
    if (!p) continue
    db.run(
      `INSERT INTO profils_cepages (id_cepage, ${COLONNES_PROFIL.join(', ')})
       VALUES (?, ${COLONNES_PROFIL.map(() => '?').join(', ')})`,
      [id_cepage, ...COLONNES_PROFIL.map((c) => p[c])],
    )
    n++
  }
  return n
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
 * desktop, mais automatique) : colonnes manquantes, table cepages, table
 * profils_cepages. Retourne la liste des changements appliqués.
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
      semerCepages(db)
      faits.push('cepages')
    }
    if (!db.tableExiste('profils_cepages')) {
      db.exec(ORDRE_CREATE_PROFILS)
      semerProfils(db)
      faits.push('profils_cepages')
    }
  })
  return faits
}
