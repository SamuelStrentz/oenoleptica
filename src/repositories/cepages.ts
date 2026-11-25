/** Table cepages : référence des cépages et de leur couleur de pastille. */
import type { SqlDb } from '@/db/sql'
import { CEPAGES_INITIAUX } from '@/db/schema'
import {
  cleCepage, decouperCepages, majusculeInitiale, typeDepuisCouleur, type TypeCepage,
} from '@/domain/cepages'
import type { Cepages } from '@/domain/types'

/** {nom: 'rouge' | 'blanc' | null} : cépages usuels + ceux de la table. */
export function lireCepages(db: SqlDb): Cepages {
  const cepages: Cepages = Object.fromEntries(CEPAGES_INITIAUX) as Cepages
  if (db.tableExiste('cepages')) {
    for (const { nom, type } of db.all<{ nom: string; type: TypeCepage }>('SELECT nom, type FROM cepages')) {
      if (nom && (type || !(nom in cepages))) cepages[nom] = type
    }
  }
  return cepages
}

/**
 * Range dans la table cepages les cépages inconnus d'une sauvegarde.
 * paires : [texte du cépage, couleur du vin]. À appeler dans une transaction.
 */
export function memoriserCepages(db: SqlDb, paires: [string | null, string | null][]): void {
  const trouves = new Map<string, [string, string | null]>()
  for (const [texteCepage, couleur] of paires) {
    for (const nom of decouperCepages(texteCepage)) {
      const cle = cleCepage(nom)
      if (!trouves.has(cle)) trouves.set(cle, [nom, couleur])
    }
  }
  if (!trouves.size || !db.tableExiste('cepages')) return
  const connus = new Set(Object.keys(lireCepages(db)).map(cleCepage))
  for (const [cle, [nom, couleur]] of trouves) {
    if (connus.has(cle)) continue
    db.run('INSERT OR IGNORE INTO cepages (nom, type) VALUES (?, ?)', [
      majusculeInitiale(nom),
      typeDepuisCouleur(couleur),
    ])
  }
}
