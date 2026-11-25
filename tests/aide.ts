import sqlite3InitModule from '@sqlite.org/sqlite-wasm'
import { SqlDb } from '@/db/sql'
import { creerStructure } from '@/repositories/structure'
import type { AjoutVin } from '@/domain/types'

const sqlite3 = await sqlite3InitModule()

/** Base vierge en mémoire, éventuellement déjà structurée. */
export function nouvelleBase(structuree = true): SqlDb {
  const db = new SqlDb(new sqlite3.oo1.DB(':memory:', 'c'))
  db.exec('PRAGMA foreign_keys = ON')
  if (structuree) creerStructure(db)
  return db
}

export function vin(modifs: Partial<AjoutVin> = {}): AjoutVin {
  return {
    domaine: 'Domaine Gramenon', millesime: 2021, appellation: 'Côtes du Rhône',
    cuvee: 'Poignée de raisins', cru: null, couleur: 'Rouge', prix: 18.5,
    cepage: 'Grenache, Syrah', volume_alcool: 13.5, format: '75 cl',
    vigneron_id: null, vigneron_nouveau: null, quantite: 0, note: null, categorie: null,
    ...modifs,
  }
}
