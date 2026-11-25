/// <reference lib="webworker" />
/**
 * Web Worker qui possède la base SQLite.
 *
 * - Moteur : SQLite officiel compilé en WebAssembly.
 * - Stockage : OPFS « SAHPool » (fichier privé du navigateur, persistant).
 *   Contrairement au VFS « opfs » classique, il n'exige pas les en-têtes
 *   COOP/COEP, que GitHub Pages ne sait pas envoyer.
 * - Toutes les requêtes passent par les repositories (code synchrone) ;
 *   l'interface les appelle via un petit RPC (cf. client.ts).
 */
import sqlite3InitModule, { type SAHPoolUtil, type Sqlite3Static } from '@sqlite.org/sqlite-wasm'
import { SqlDb } from './sql'
import { creerStructure, migrer, verifierStructure } from '@/repositories/structure'
import { effacerVin, insererVin, listerCave, lireVinCave, statistiques } from '@/repositories/vins'
import { listerVignerons } from '@/repositories/vignerons'
import { lireCepages } from '@/repositories/cepages'
import { listerCategories } from '@/repositories/avis'
import { reglerStock } from '@/repositories/stock'
import { aujourdhui } from '@/domain/parsers'
import type { AjoutVin, InfoStockage } from '@/domain/types'

const FICHIER = '/cave.db'
const FICHIER_IMPORT = '/import.db'

let sqlite3: Sqlite3Static
let pool: SAHPoolUtil | null = null
let db: SqlDb | null = null

function base(): SqlDb {
  if (!db) throw new Error("Aucune cave n'est ouverte.")
  return db
}

function ouvrir(nom = FICHIER): SqlDb {
  const brute = pool ? new pool.OpfsSAHPoolDb(nom) : new sqlite3.oo1.DB(':memory:', 'c')
  const s = new SqlDb(brute)
  s.exec('PRAGMA foreign_keys = ON')
  return s
}

function fermer(): void {
  db?.brute.close()
  db = null
}

function info(): InfoStockage {
  return { etat: db ? 'prete' : 'absente', persistant: pool !== null, versionSqlite: sqlite3.version.libVersion }
}

/** Une base créée par l'appli desktop peut être en mode WAL : SAHPool ne le
 *  gère pas, on repasse l'en-tête en mode journal classique. */
function sansWal(octets: Uint8Array): Uint8Array {
  const copie = new Uint8Array(octets)
  if (copie[18] === 2) copie[18] = 1
  if (copie[19] === 2) copie[19] = 1
  return copie
}

const api = {
  async demarrer(): Promise<InfoStockage> {
    sqlite3 = await sqlite3InitModule()
    try {
      pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'cave-a-vin', initialCapacity: 8 })
    } catch (e) {
      console.warn('OPFS indisponible, cave en mémoire seulement :', e)
      pool = null
    }
    if (pool?.getFileNames().includes(FICHIER)) {
      db = ouvrir()
      migrer(db)
    }
    return info()
  },

  creerCave(): InfoStockage {
    if (db) throw new Error('Une cave existe déjà.')
    db = ouvrir()
    creerStructure(db)
    return info()
  },

  async importerCave(octets: Uint8Array): Promise<InfoStockage> {
    if (!pool) throw new Error("Le stockage du navigateur n'est pas disponible : import impossible.")
    const propres = sansWal(octets)
    // 1. contrôle du fichier dans un emplacement temporaire
    await pool.importDb(FICHIER_IMPORT, propres)
    try {
      const essai = ouvrir(FICHIER_IMPORT)
      try {
        verifierStructure(essai)
      } finally {
        essai.brute.close()
      }
    } finally {
      pool.unlink(FICHIER_IMPORT)
    }
    // 2. remplacement de la cave actuelle
    fermer()
    pool.unlink(FICHIER)
    await pool.importDb(FICHIER, propres)
    db = ouvrir()
    migrer(db)
    return info()
  },

  exporterCave(): Uint8Array {
    return sqlite3.capi.sqlite3_js_db_export(base().brute.pointer!)
  },

  supprimerCave(): InfoStockage {
    fermer()
    pool?.unlink(FICHIER)
    return info()
  },

  // --- Lecture
  cave: () => listerCave(base()),
  stats: () => statistiques(base()),
  vignerons: () => listerVignerons(base()),
  cepages: () => lireCepages(base()),
  categories: () => listerCategories(base()),

  // --- Écriture (chaque appel est enregistré immédiatement)
  ajouterVin(d: AjoutVin) {
    const id = insererVin(base(), d)
    return lireVinCave(base(), id)!
  },
  reglerStock(idVin: number, cible: number) {
    reglerStock(base(), idVin, cible, aujourdhui())
    return lireVinCave(base(), idVin)!
  },
  supprimerVin: (idVin: number) => effacerVin(base(), idVin),
}

export type ApiCave = typeof api

export interface Requete {
  id: number
  methode: keyof ApiCave
  args: unknown[]
}

export type Reponse =
  | { id: number; ok: true; resultat: unknown }
  | { id: number; ok: false; erreur: string }

// Les requêtes sont traitées une par une, dans l'ordre d'arrivée.
let file: Promise<void> = Promise.resolve()

self.onmessage = (ev: MessageEvent<Requete>) => {
  const { id, methode, args } = ev.data
  file = file.then(async () => {
    try {
      const fn = api[methode] as (...a: unknown[]) => unknown
      const resultat = await fn(...args)
      const transfert = resultat instanceof Uint8Array ? [resultat.buffer] : []
      self.postMessage({ id, ok: true, resultat } satisfies Reponse, { transfer: transfert })
    } catch (e) {
      const erreur = e instanceof Error ? e.message : String(e)
      self.postMessage({ id, ok: false, erreur } satisfies Reponse)
    }
  })
}
