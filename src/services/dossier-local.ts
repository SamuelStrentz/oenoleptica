/**
 * Dossier local de l'appli (API File System Access).
 *
 * L'utilisateur choisit une fois un dossier (ex. Documents/Œnoleptica) ;
 * l'appli y crée un sous-dossier « db » qui contient une copie à jour de
 * chaque cave (« <nom de la cave>.db »). La base de travail reste dans le
 * stockage interne (OPFS), plus rapide et fiable : le dossier en est le miroir.
 *
 * Le « handle » du dossier est gardé dans IndexedDB pour être retrouvé au
 * prochain lancement. Android peut redemander l'autorisation : il faut alors
 * un geste de l'utilisateur (bouton « Autoriser »).
 */

export type EtatDossier = 'non-supporte' | 'aucun' | 'a-autoriser' | 'pret'

export interface FichierDossier {
  nom: string // sans « .db »
  taille: number
  modifie: number // horodatage (ms)
}

const SOUS_DOSSIER = 'db'
const BASE_IDB = 'oenoleptica'
const TABLE_IDB = 'reglages'
const CLE_HANDLE = 'dossier'

export const dossierSupporte = (): boolean => typeof window !== 'undefined' && 'showDirectoryPicker' in window

// ------------------------------------------------- IndexedDB (mini-helper)
function ouvrirIdb(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    const r = indexedDB.open(BASE_IDB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(TABLE_IDB)
    r.onsuccess = () => ok(r.result)
    r.onerror = () => ko(r.error)
  })
}

async function idb<T>(mode: IDBTransactionMode, action: (t: IDBObjectStore) => IDBRequest): Promise<T> {
  const base = await ouvrirIdb()
  try {
    return await new Promise<T>((ok, ko) => {
      const r = action(base.transaction(TABLE_IDB, mode).objectStore(TABLE_IDB))
      r.onsuccess = () => ok(r.result as T)
      r.onerror = () => ko(r.error)
    })
  } finally {
    base.close()
  }
}

// ---------------------------------------------------------------- dossier
let racine: FileSystemDirectoryHandle | null = null

/** Retrouve le dossier choisi lors d'un lancement précédent. */
export async function chargerDossier(): Promise<EtatDossier> {
  if (!dossierSupporte()) return 'non-supporte'
  try {
    racine = (await idb<FileSystemDirectoryHandle | undefined>('readonly', (t) => t.get(CLE_HANDLE))) ?? null
  } catch {
    racine = null
  }
  return etat()
}

export async function etat(): Promise<EtatDossier> {
  if (!dossierSupporte()) return 'non-supporte'
  if (!racine) return 'aucun'
  try {
    return (await racine.queryPermission({ mode: 'readwrite' })) === 'granted' ? 'pret' : 'a-autoriser'
  } catch {
    return 'a-autoriser'
  }
}

export const nomDossier = (): string | null => racine?.name ?? null

/** Ouvre le sélecteur de dossier Android (doit suivre un geste de l'utilisateur). */
export async function choisirDossier(): Promise<EtatDossier> {
  const d = await window.showDirectoryPicker!({ id: 'oenoleptica', mode: 'readwrite', startIn: 'documents' })
  await d.getDirectoryHandle(SOUS_DOSSIER, { create: true }) // vérifie aussi le droit d'écriture
  racine = d
  await idb('readwrite', (t) => t.put(d, CLE_HANDLE))
  return etat()
}

/** Redemande l'autorisation sur le dossier déjà choisi (geste de l'utilisateur requis). */
export async function autoriser(): Promise<EtatDossier> {
  if (!racine) return 'aucun'
  await racine.requestPermission({ mode: 'readwrite' })
  return etat()
}

export async function oublierDossier(): Promise<void> {
  racine = null
  await idb('readwrite', (t) => t.delete(CLE_HANDLE))
}

async function dossierDb(): Promise<FileSystemDirectoryHandle> {
  if (!racine) throw new Error("Aucun dossier local n'est choisi.")
  return racine.getDirectoryHandle(SOUS_DOSSIER, { create: true })
}

const nomFichierCave = (nomCave: string) => `${nomCave.replace(/[\\/:*?"<>|]/g, '').trim() || 'cave'}.db`

/** Les caves (.db) présentes dans <dossier>/db. */
export async function listerFichiers(): Promise<FichierDossier[]> {
  const dossier = await dossierDb()
  const fichiers: FichierDossier[] = []
  for await (const entree of dossier.values()) {
    if (entree.kind !== 'file' || !/\.db$/i.test(entree.name)) continue
    const f = await (entree as FileSystemFileHandle).getFile()
    fichiers.push({ nom: entree.name.replace(/\.db$/i, ''), taille: f.size, modifie: f.lastModified })
  }
  return fichiers.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
}

/** Date de modification du fichier d'une cave (null s'il n'existe pas). */
export async function infoFichier(nomCave: string): Promise<FichierDossier | null> {
  try {
    const f = await (await (await dossierDb()).getFileHandle(nomFichierCave(nomCave))).getFile()
    return { nom: nomCave, taille: f.size, modifie: f.lastModified }
  } catch {
    return null
  }
}

export async function lireFichier(nomCave: string): Promise<Uint8Array> {
  const f = await (await (await dossierDb()).getFileHandle(nomFichierCave(nomCave))).getFile()
  return new Uint8Array(await f.arrayBuffer())
}

/** Écrit (ou remplace) le fichier d'une cave. Retourne sa nouvelle date de modification. */
export async function ecrireFichier(nomCave: string, octets: Uint8Array): Promise<number> {
  const poignee = await (await dossierDb()).getFileHandle(nomFichierCave(nomCave), { create: true })
  const flux = await poignee.createWritable()
  await flux.write(octets as BlobPart)
  await flux.close()
  return (await poignee.getFile()).lastModified
}

export async function supprimerFichier(nomCave: string): Promise<void> {
  try {
    await (await dossierDb()).removeEntry(nomFichierCave(nomCave))
  } catch {
    /* déjà absent */
  }
}
