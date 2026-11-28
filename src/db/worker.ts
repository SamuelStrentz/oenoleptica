/// <reference lib="webworker" />
/**
 * Web Worker qui possède les bases SQLite.
 *
 * - Moteur : SQLite officiel compilé en WebAssembly.
 * - Stockage : OPFS « SAHPool » (fichiers privés du navigateur, persistants).
 *   Contrairement au VFS « opfs » classique, il n'exige pas les en-têtes
 *   COOP/COEP, que GitHub Pages ne sait pas envoyer.
 * - Plusieurs caves possibles : une cave = un fichier « /<nom>.db ».
 * - Toutes les requêtes passent par les repositories (code synchrone) ;
 *   l'interface les appelle via un petit RPC (cf. client.ts).
 */
import sqlite3InitModule, { type SAHPoolUtil, type Sqlite3Static } from '@sqlite.org/sqlite-wasm'
import { SqlDb } from './sql'
import { creerStructure, migrer, verifierStructure } from '@/repositories/structure'
import {
  effacerVin, insererVin, listerCave, lireDetailVin, lireVinCave, majVin, statistiques,
} from '@/repositories/vins'
import {
  catalogueVigneron, compterLiensVigneron, effacerVigneron, insererVigneron, listerVignerons, tousLesVignerons, importerVignerons,
  lireVigneron, majVigneron,
} from '@/repositories/vignerons'
import { lireCepages } from '@/repositories/cepages'
import { definirAvis, listerCategories } from '@/repositories/avis'
import { historique, reglerStock } from '@/repositories/stock'
import { aujourdhui } from '@/domain/parsers'
import { profilDuVin } from '@/repositories/profil'
import { tableauDeBord } from '@/repositories/statistiques'
import { degustationsDuVin, insererDegustation, supprimerDegustation } from '@/repositories/degustations'
import { candidatsCave, candidatsReferentiel, infoReferentiel, type InfoReferentiel } from '@/repositories/referentiel'
import { rapprocher, type ResultatEtiquette } from '@/domain/etiquette'
import type { Degustation } from '@/domain/profil/types'
import type { AjoutVin, Cave, ChampsVin, FicheVin, InfoStockage, NouveauVigneron } from '@/domain/types'

const FICHIER_IMPORT = '/__import__.db'
/** Référentiel de vins importé par l'utilisateur (jamais livré avec l'appli). */
const FICHIER_REFERENTIEL = '/__referentiel__.db'
const FICHIERS_INTERNES = [FICHIER_IMPORT, FICHIER_REFERENTIEL]
/** Fichier de la cave créée au lot 1 (avant les caves multiples). */
const FICHIER_HISTORIQUE = '/cave.db'

let sqlite3: Sqlite3Static
let pool: SAHPoolUtil | null = null
let db: SqlDb | null = null
let fichierCourant: string | null = null
let referentiel: SqlDb | null = null

function base(): SqlDb {
  if (!db) throw new Error("Aucune cave n'est ouverte.")
  return db
}

// ---------------------------------------------------------------- caves
function nomDeFichier(fichier: string): string {
  return fichier === FICHIER_HISTORIQUE ? 'Ma cave' : fichier.replace(/^\//, '').replace(/\.db$/i, '')
}

function decoder(f: string): string {
  try {
    return decodeURIComponent(f)
  } catch {
    return f
  }
}

/** Nom tel que le pool le range en interne (chemin d'URL encodé). Nécessaire
 *  pour importDb() et unlink(), qui ne l'encodent pas eux-mêmes. */
function chemin(fichier: string): string {
  return new URL(fichier, 'file://localhost/').pathname
}

function fichierDeNom(nom: string): string {
  const propre = nom.replace(/[\\/:*?"<>|#%]/g, '').replace(/\s+/g, ' ').trim()
  if (!propre) throw new Error('Donne un nom à la cave.')
  if (propre.length > 60) throw new Error('Nom de cave trop long (60 caractères maximum).')
  return `/${propre}.db`
}

function listerCaves(): Cave[] {
  if (!pool) return fichierCourant ? [{ fichier: fichierCourant, nom: nomDeFichier(fichierCourant) }] : []
  return pool
    .getFileNames()
    // le pool range les noms sous forme d'URL (« Ma%20cave.db ») : on les décode
    .map(decoder)
    .filter((f) => /\.db$/i.test(f) && !FICHIERS_INTERNES.includes(f))
    .map((fichier) => ({ fichier, nom: nomDeFichier(fichier) }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
}

function existe(fichier: string): boolean {
  return listerCaves().some((c) => c.fichier.toLowerCase() === fichier.toLowerCase())
}

/** Chaque base occupe 2 emplacements du pool (fichier + journal) ; +3 : nouvelle cave, import, référentiel. */
async function prevoirPlace(): Promise<void> {
  if (pool) await pool.reserveMinimumCapacity((listerCaves().length + 3) * 2 + 2)
}

function referentielPresent(): boolean {
  return !!pool && pool.getFileNames().map(decoder).includes(FICHIER_REFERENTIEL)
}

function ouvrirReferentiel(): SqlDb | null {
  if (!referentiel && referentielPresent()) referentiel = connecter(FICHIER_REFERENTIEL)
  return referentiel
}

function fermerReferentiel(): void {
  referentiel?.brute.close()
  referentiel = null
}

function connecter(fichier: string): SqlDb {
  const brute = pool ? new pool.OpfsSAHPoolDb(fichier) : new sqlite3.oo1.DB(':memory:', 'c')
  const s = new SqlDb(brute)
  s.exec('PRAGMA foreign_keys = ON')
  return s
}

function fermer(): void {
  db?.brute.close()
  db = null
  fichierCourant = null
}

function ouvrir(fichier: string): void {
  fermer()
  db = connecter(fichier)
  fichierCourant = fichier
  migrer(db)
}

function info(): InfoStockage {
  return {
    etat: db ? 'prete' : 'absente',
    persistant: pool !== null,
    versionSqlite: sqlite3.version.libVersion,
    cave: fichierCourant ? { fichier: fichierCourant, nom: nomDeFichier(fichierCourant) } : null,
    caves: listerCaves(),
  }
}

/** Une base créée par l'appli desktop peut être en mode WAL : SAHPool ne le
 *  gère pas, on repasse l'en-tête en mode journal classique. */
function sansWal(octets: Uint8Array): Uint8Array {
  const copie = new Uint8Array(octets)
  if (copie[18] === 2) copie[18] = 1
  if (copie[19] === 2) copie[19] = 1
  return copie
}

/** Vérifie qu'un fichier .db est bien une cave, dans un emplacement temporaire. */
async function controler(octets: Uint8Array, verifier: (essai: SqlDb) => void = verifierStructure): Promise<Uint8Array> {
  if (!pool) throw new Error("Le stockage du navigateur n'est pas disponible : import impossible.")
  const propres = sansWal(octets)
  await pool.importDb(chemin(FICHIER_IMPORT), propres)
  try {
    const essai = connecter(FICHIER_IMPORT)
    try {
      verifier(essai)
    } finally {
      essai.brute.close()
    }
  } finally {
    pool.unlink(chemin(FICHIER_IMPORT))
  }
  return propres
}

const api = {
  /** Démarre le moteur et rouvre la dernière cave utilisée (ou la première trouvée). */
  async demarrer(fichierPrefere?: string | null): Promise<InfoStockage> {
    sqlite3 = await sqlite3InitModule()
    try {
      pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'cave-a-vin', initialCapacity: 8 })
      if (pool.getFileNames().map(decoder).includes(FICHIER_IMPORT)) pool.unlink(chemin(FICHIER_IMPORT))
    } catch (e) {
      console.warn('OPFS indisponible, cave en mémoire seulement :', e)
      pool = null
    }
    const caves = listerCaves()
    const choix = caves.find((c) => c.fichier === fichierPrefere) ?? caves[0]
    if (choix) ouvrir(choix.fichier)
    return info()
  },

  info,

  async creerCave(nom: string): Promise<InfoStockage> {
    const fichier = fichierDeNom(nom)
    if (existe(fichier)) throw new Error(`Une cave « ${nom.trim()} » existe déjà.`)
    await prevoirPlace()
    fermer()
    db = connecter(fichier)
    fichierCourant = fichier
    creerStructure(db)
    return info()
  },

  ouvrirCave(fichier: string): InfoStockage {
    if (!existe(fichier)) throw new Error('Cette cave est introuvable.')
    ouvrir(fichier)
    return info()
  },

  /** Ajoute une cave à partir d'un fichier .db (sans toucher aux autres) et l'ouvre. */
  async importerCave(octets: Uint8Array, nom: string): Promise<InfoStockage> {
    let fichier = fichierDeNom(nom)
    for (let i = 2; existe(fichier); i++) fichier = fichierDeNom(`${nom} (${i})`)
    await prevoirPlace()
    const propres = await controler(octets)
    fermer()
    await pool!.importDb(chemin(fichier), propres)
    ouvrir(fichier)
    return info()
  },

  /** Remplace le contenu de la cave ouverte (version plus récente trouvée dans le dossier local). */
  async remplacerCave(octets: Uint8Array): Promise<InfoStockage> {
    const fichier = fichierCourant
    if (!fichier) throw new Error("Aucune cave n'est ouverte.")
    const propres = await controler(octets)
    fermer()
    pool!.unlink(chemin(fichier))
    await pool!.importDb(chemin(fichier), propres)
    ouvrir(fichier)
    return info()
  },

  exporterCave(): Uint8Array {
    return sqlite3.capi.sqlite3_js_db_export(base().brute.pointer!)
  },

  /** Supprime la cave ouverte, puis rouvre une autre cave s'il en reste. */
  supprimerCave(): InfoStockage {
    const fichier = fichierCourant
    fermer()
    if (fichier) pool?.unlink(chemin(fichier))
    const reste = listerCaves()[0]
    if (reste) ouvrir(reste.fichier)
    return info()
  },

  // --- Référentiel et étiquettes
  infoReferentiel: (): InfoReferentiel | null => {
    const ref = ouvrirReferentiel()
    return ref ? infoReferentiel(ref) : null
  },

  /** Remplace le référentiel par ce fichier (même structure qu'une cave). */
  async importerReferentiel(octets: Uint8Array): Promise<InfoReferentiel> {
    await prevoirPlace()
    const propres = await controler(octets, (essai) => {
      verifierStructure(essai)
      if (!Number(essai.valeur('SELECT count(*) FROM vins'))) throw new Error('Ce référentiel ne contient aucun vin.')
    })
    fermerReferentiel()
    if (referentielPresent()) pool!.unlink(chemin(FICHIER_REFERENTIEL))
    await pool!.importDb(chemin(FICHIER_REFERENTIEL), propres)
    return infoReferentiel(ouvrirReferentiel()!)
  },

  supprimerReferentiel(): void {
    fermerReferentiel()
    if (referentielPresent()) pool!.unlink(chemin(FICHIER_REFERENTIEL))
  },

  /** Cherche le vin d'une étiquette (texte lu par l'OCR) dans la cave puis le référentiel. */
  reconnaitreEtiquette(texte: string): ResultatEtiquette {
    const ref = ouvrirReferentiel()
    const candidats = [...candidatsCave(base()), ...(ref ? candidatsReferentiel(ref, base()) : [])]
    return rapprocher(texte, candidats)
  },

  // --- Lecture
  cave: () => listerCave(base()),
  stats: () => statistiques(base()),
  vignerons: () => listerVignerons(base()),
  vigneron: (id: number) => lireVigneron(base(), id) ?? null,
  tousLesVignerons: () => tousLesVignerons(base()),
  liensVigneron: (id: number) => compterLiensVigneron(base(), id),
  catalogue: (id: number) => catalogueVigneron(base(), id),
  cepages: () => lireCepages(base()),
  categories: () => listerCategories(base()),
  detailVin: (idVin: number): FicheVin => ({
    ...lireDetailVin(base(), idVin),
    profil: profilDuVin(base(), idVin),
    degustations: degustationsDuVin(base(), idVin),
  }),
  historique: () => historique(base()),
  tableauDeBord: () => tableauDeBord(base()),

  // --- Écriture (chaque appel est enregistré immédiatement)
  ajouterVin(d: AjoutVin) {
    const id = insererVin(base(), d)
    return lireVinCave(base(), id)!
  },
  modifierVin(idVin: number, idVigneron: number | null, champs: ChampsVin, note: number | null, categorie: string | null) {
    const b = base()
    b.tx(() => {
      majVin(b, idVin, idVigneron, champs)
      definirAvis(b, idVin, note, categorie)
    })
    return lireVinCave(b, idVin)!
  },
  reglerStock(idVin: number, cible: number) {
    reglerStock(base(), idVin, cible, aujourdhui())
    return lireVinCave(base(), idVin)!
  },
  supprimerVin: (idVin: number) => effacerVin(base(), idVin),
  ajouterDegustation(d: Degustation, retirerBouteille: boolean) {
    insererDegustation(base(), d, retirerBouteille)
    return lireVinCave(base(), d.id_vin)!
  },
  supprimerDegustation: (id: number) => supprimerDegustation(base(), id),
  ajouterVigneron: (v: NouveauVigneron) => insererVigneron(base(), v),
  modifierVigneron: (id: number, v: NouveauVigneron) => majVigneron(base(), id, v),
  importerVignerons: (liste: NouveauVigneron[]) => importerVignerons(base(), liste),
  supprimerVigneron: (id: number) => effacerVigneron(base(), id),
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
