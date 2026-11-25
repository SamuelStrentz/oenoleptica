/**
 * Dossier local : copie automatique de la cave ouverte dans <dossier>/db,
 * détection d'une version plus récente (modifiée ailleurs, ex. sur PC),
 * ouverture des caves présentes dans le dossier.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { cave as api } from '@/db/client'
import { useCaveStore } from './cave'
import * as dossier from '@/services/dossier-local'
import type { EtatDossier, FichierDossier } from '@/services/dossier-local'

const DELAI_COPIE = 1200 // ms après la dernière modification
const MARGE = 2000 // ms : tolérance sur les dates de fichier
const cleSynchro = (nomCave: string) => `oenoleptica.synchro.${nomCave}`

export const useDossierStore = defineStore('dossier', () => {
  const etat = ref<EtatDossier>('non-supporte')
  const nom = ref<string | null>(null)
  const fichiers = ref<FichierDossier[]>([])
  const derniereCopie = ref<Date | null>(null)
  const erreur = ref<string | null>(null)
  /** Le dossier contient une autre version de la cave ouverte. */
  const conflit = ref<'plus-recente' | 'inconnue' | null>(null)

  let minuteur: ReturnType<typeof setTimeout> | undefined
  let copieEnAttente = false

  async function rafraichirEtat() {
    etat.value = await dossier.etat()
    nom.value = dossier.nomDossier()
  }

  async function initialiser() {
    etat.value = await dossier.chargerDossier()
    nom.value = dossier.nomDossier()
    if (etat.value === 'pret') {
      await lister()
      await verifierCaveCourante()
    }
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'hidden') {
        // Android peut fermer l'appli en arrière-plan : on copie tout de suite
        if (copieEnAttente) await copier()
      } else if (etat.value === 'pret') {
        await verifierCaveCourante() // le fichier a pu être modifié ailleurs entre-temps
      }
    })
  }

  async function choisir() {
    etat.value = await dossier.choisirDossier()
    nom.value = dossier.nomDossier()
    await lister()
    await verifierCaveCourante()
  }

  async function autoriser() {
    etat.value = await dossier.autoriser()
    if (etat.value === 'pret') {
      await lister()
      await verifierCaveCourante()
    }
  }

  async function lister() {
    try {
      fichiers.value = etat.value === 'pret' ? await dossier.listerFichiers() : []
    } catch (e) {
      erreur.value = (e as Error).message
      await rafraichirEtat()
    }
  }

  /** À appeler après chaque modification de la cave : copie différée de quelques instants. */
  function planifier() {
    if (etat.value !== 'pret') return
    copieEnAttente = true
    clearTimeout(minuteur)
    minuteur = setTimeout(copier, DELAI_COPIE)
  }

  /** Écrit la cave ouverte dans <dossier>/db/<nom>.db. */
  async function copier() {
    clearTimeout(minuteur)
    copieEnAttente = false
    const cave = useCaveStore()
    if (etat.value !== 'pret' || !cave.prete) return
    try {
      const octets = await api.exporterCave()
      const modifie = await dossier.ecrireFichier(cave.nomCave, octets)
      memoriser(cave.nomCave, modifie)
      derniereCopie.value = new Date()
      erreur.value = null
      conflit.value = null
      await lister()
    } catch (e) {
      erreur.value = (e as Error).message
      await rafraichirEtat()
    }
  }

  /**
   * Compare la cave ouverte avec son fichier dans le dossier :
   * - pas de fichier : on le crée ;
   * - fichier plus récent que notre dernière copie : on le signale (bandeau).
   */
  async function verifierCaveCourante() {
    const cave = useCaveStore()
    if (etat.value !== 'pret' || !cave.prete) return
    const info = await dossier.infoFichier(cave.nomCave)
    if (!info) return copier()
    const connu = lireMemoire(cave.nomCave)
    if (connu === null) conflit.value = 'inconnue'
    else conflit.value = info.modifie > connu + MARGE ? 'plus-recente' : null
  }

  /** Remplace la cave ouverte par la version du dossier. */
  async function chargerVersionDossier() {
    const cave = useCaveStore()
    const octets = await dossier.lireFichier(cave.nomCave)
    const info = await dossier.infoFichier(cave.nomCave)
    await cave.remplacer(octets)
    if (info) memoriser(cave.nomCave, info.modifie)
    conflit.value = null
  }

  /** Garde la version du téléphone et écrase celle du dossier. */
  async function garderVersionTelephone() {
    conflit.value = null
    await copier()
  }

  /** Ouvre une cave du dossier (l'ajoute au téléphone si elle n'y est pas encore). */
  async function ouvrirDepuisDossier(nomCave: string) {
    const cave = useCaveStore()
    const interne = cave.stockage?.caves.find((c) => c.nom === nomCave)
    if (interne) {
      await cave.ouvrir(interne.fichier)
      return
    }
    const octets = await dossier.lireFichier(nomCave)
    const info = await dossier.infoFichier(nomCave)
    if (info) memoriser(nomCave, info.modifie)
    await cave.importerOctets(octets, nomCave)
  }

  async function supprimerFichier(nomCave: string) {
    if (etat.value !== 'pret') return
    await dossier.supprimerFichier(nomCave)
    try {
      localStorage.removeItem(cleSynchro(nomCave))
    } catch {
      /* sans importance */
    }
    await lister()
  }

  return {
    etat, nom, fichiers, derniereCopie, erreur, conflit,
    initialiser, choisir, autoriser, lister, planifier, copier, verifierCaveCourante,
    chargerVersionDossier, garderVersionTelephone, ouvrirDepuisDossier, supprimerFichier,
  }
})

function memoriser(nomCave: string, modifie: number) {
  try {
    localStorage.setItem(cleSynchro(nomCave), String(modifie))
  } catch {
    /* stockage local indisponible */
  }
}

function lireMemoire(nomCave: string): number | null {
  try {
    const v = localStorage.getItem(cleSynchro(nomCave))
    return v === null ? null : Number(v)
  } catch {
    return null
  }
}
