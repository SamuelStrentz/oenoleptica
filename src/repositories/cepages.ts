/** Table cepages : référence des cépages et de leur couleur de pastille. */
import type { SqlDb } from '@/db/sql'
import { CEPAGES_INITIAUX } from '@/db/schema'
import {
  cleCepage, decouperCepages, majusculeInitiale, typeDepuisCouleur, type TypeCepage,
} from '@/domain/cepages'
import type { CepageDuVin, Cepages, ProfilOrganoleptique } from '@/domain/types'
import { COLONNES_PROFIL } from '@/db/profils-cepages'
import { semerProfils } from './structure'

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
  if (db.tableExiste('profils_cepages')) semerProfils(db)
}

/** Cépages d'un texte « Gamay, Syrah » avec leur type et leur profil organoleptique. */
export function cepagesDuVin(db: SqlDb, texteCepage: string | null): CepageDuVin[] {
  const noms = decouperCepages(texteCepage)
  if (!noms.length) return []
  const types = lireCepages(db)
  const typeParCle = new Map(Object.entries(types).map(([n, t]) => [cleCepage(n), t]))
  const profils = new Map<string, ProfilOrganoleptique>()
  if (db.tableExiste('profils_cepages')) {
    for (const l of db.all<ProfilOrganoleptique & { nom: string }>(
      `SELECT c.nom, ${COLONNES_PROFIL.map((k) => 'p.' + k).join(', ')}
       FROM profils_cepages p JOIN cepages c ON c.id_cepage = p.id_cepage`)) {
      const { nom, ...profil } = l
      profils.set(cleCepage(nom), profil)
    }
  }
  return noms.map((nom) => ({
    nom,
    type: typeParCle.get(cleCepage(nom)) ?? null,
    profil: profils.get(cleCepage(nom)) ?? null,
  }))
}
