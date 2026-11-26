/** Création, contrôle et mise à niveau de la structure d'une cave. */
import type { SqlDb } from '@/db/sql'
import { COLONNES_AJOUTEES, CEPAGES_INITIAUX, ORDRES_CREATE, TABLES_REQUISES, VERSION_DONNEES } from '@/db/schema'
import { COLONNES_PROFIL, ORDRE_CREATE_PROFILS, PROFILS_INITIAUX } from '@/db/profils-cepages'
import { cleCepage } from '@/domain/cepages'
import { ORDRE_CREATE_DEGUSTATIONS } from './degustations'

/** Crée toutes les tables et triggers dans une base vide + cépages usuels et leurs profils. */
export function creerStructure(db: SqlDb): void {
  db.tx(() => {
    for (const ordre of ORDRES_CREATE) db.exec(ordre)
    semerCepages(db)
    db.exec(ORDRE_CREATE_PROFILS)
    semerProfils(db)
    db.exec(ORDRE_CREATE_DEGUSTATIONS)
    for (const [table, colonne, type] of COLONNES_AJOUTEES) {
      if (!db.colonnes(table).includes(colonne)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${colonne} ${type}`)
    }
    db.exec(`PRAGMA user_version = ${VERSION_DONNEES}`)
  })
}

/**
 * Notes globales sur 100. Les anciennes notes sont converties :
 * jusqu'à 10 → ×10 (notes saisies sur 10), de 10 à 20 → ×5 (sur 20),
 * au-delà de 20 → déjà sur 100, inchangées.
 */
function notesSur100(db: SqlDb): number {
  let n = 0
  for (const table of ['avis', 'degustations']) {
    if (!db.tableExiste(table)) continue
    n += db.run(`UPDATE ${table} SET note = ROUND(CASE WHEN note <= 10 THEN note * 10 ELSE note * 5 END, 1)
                 WHERE note IS NOT NULL AND note <= 20`).changes
  }
  return n
}

/** Domaine d'un vigneron : repris de ses vins quand il n'en a qu'un. */
function domainesDesVignerons(db: SqlDb): void {
  db.run(`UPDATE vignerons SET domaine = (
            SELECT MIN(v.domaine) FROM vins v WHERE v.id_vigneron = vignerons.id_vigneron)
          WHERE TRIM(COALESCE(domaine, '')) = ''
            AND (SELECT COUNT(DISTINCT v.domaine) FROM vins v WHERE v.id_vigneron = vignerons.id_vigneron) = 1`)
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
        if (table === 'vignerons' && colonne === 'domaine') domainesDesVignerons(db)
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
    if (!db.tableExiste('degustations')) {
      db.exec(ORDRE_CREATE_DEGUSTATIONS)
      faits.push('degustations')
    }
    const version = Number(db.valeur('PRAGMA user_version') ?? 0)
    if (version < 1) {
      const n = notesSur100(db)
      if (n) faits.push(`${n} note(s) sur 100`)
    }
    if (version < 2 && db.colonnes('vins').includes('format')) {
      for (const [ancien, nouveau] of [['150 cl', '1,5 L'], ['300 cl', '3 L']]) {
        db.run('UPDATE vins SET format = ? WHERE REPLACE(LOWER(format), \' \', \'\') = ?', [nouveau, ancien.replace(' ', '')])
      }
    }
    if (version < VERSION_DONNEES) db.exec(`PRAGMA user_version = ${VERSION_DONNEES}`)
  })
  return faits
}
