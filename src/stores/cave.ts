/** État de la cave côté interface (Pinia). Toute écriture passe par le worker. */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { cave as api } from '@/db/client'
import type {
  AjoutVin, Cepages, ChampsVin, InfoStockage, NouveauVigneron, Statistiques, VigneronListe, VinCave,
} from '@/domain/types'

export type Filtre = 'tous' | 'en-stock' | 'epuises'

const CLE_CAVE = 'oenoleptica.cave'

export const useCaveStore = defineStore('cave', () => {
  const chargement = ref(true)
  const erreur = ref<string | null>(null)
  const stockage = ref<InfoStockage | null>(null)
  const vins = ref<VinCave[]>([])
  const vignerons = ref<VigneronListe[]>([])
  const cepages = ref<Cepages>({})
  const categories = ref<string[]>([])
  const stats = ref<Statistiques | null>(null)
  const filtre = ref<Filtre>('tous')
  const recherche = ref('')
  /** id du dernier vin ajouté / modifié (mis en avant sur l'accueil). */
  const dernierVin = ref<number | null>(null)

  const prete = computed(() => stockage.value?.etat === 'prete')
  const nomCave = computed(() => stockage.value?.cave?.nom ?? 'Ma cave')
  const totalBouteilles = computed(() => vins.value.reduce((n, v) => n + v.quantite, 0))

  const vinsAffiches = computed(() => {
    const q = normaliser(recherche.value)
    return vins.value.filter((v) => {
      if (filtre.value === 'en-stock' && v.quantite < 1) return false
      if (filtre.value === 'epuises' && v.quantite > 0) return false
      if (!q) return true
      return normaliser(
        [v.domaine, v.appellation, v.cuvee, v.cru, v.millesime, v.cepage, v.region, v.couleur].join(' '),
      ).includes(q)
    })
  })

  // ------------------------------------------------------------- caves
  async function demarrer() {
    chargement.value = true
    try {
      appliquer(await api.demarrer(lireCaveMemorisee()))
      if (prete.value) await recharger()
    } catch (e) {
      erreur.value = (e as Error).message
    } finally {
      chargement.value = false
    }
  }

  /** Met à jour l'état après un changement de cave et retient la cave ouverte. */
  function appliquer(info: InfoStockage) {
    stockage.value = info
    try {
      if (info.cave) localStorage.setItem(CLE_CAVE, info.cave.fichier)
    } catch {
      /* stockage local indisponible : sans importance */
    }
  }

  async function changerDeCave(info: InfoStockage) {
    appliquer(info)
    recherche.value = ''
    filtre.value = 'tous'
    dernierVin.value = null
    if (prete.value) {
      await demanderPersistance()
      await recharger()
    } else {
      vins.value = []
      vignerons.value = []
      stats.value = null
    }
  }

  async function recharger() {
    const [v, g, c, cat, s] = await Promise.all([
      api.cave(), api.vignerons(), api.cepages(), api.categories(), api.stats(),
    ])
    vins.value = v
    vignerons.value = g
    cepages.value = c
    categories.value = cat
    stats.value = s
  }

  const creer = async (nom: string) => changerDeCave(await api.creerCave(nom))
  const ouvrir = async (fichier: string) => changerDeCave(await api.ouvrirCave(fichier))
  const supprimer = async () => changerDeCave(await api.supprimerCave())

  async function importer(fichier: File) {
    const octets = new Uint8Array(await fichier.arrayBuffer())
    const nom = fichier.name.replace(/\.(db|sqlite3?)$/i, '') || 'Cave importée'
    await changerDeCave(await api.importerCave(octets, nom))
  }

  async function exporter(): Promise<Blob> {
    const octets = await api.exporterCave()
    return new Blob([octets as BlobPart], { type: 'application/vnd.sqlite3' })
  }

  // --------------------------------------------------------------- vins
  async function ajouterVin(d: AjoutVin) {
    const vin = await api.ajouterVin(d)
    dernierVin.value = vin.id_vin
    await recharger()
    return vin
  }

  async function modifierVin(
    idVin: number, idVigneron: number | null, champs: ChampsVin, note: number | null, categorie: string | null,
  ) {
    const vin = await api.modifierVin(idVin, idVigneron, champs, note, categorie)
    dernierVin.value = vin.id_vin
    await recharger()
    return vin
  }

  async function supprimerVin(idVin: number) {
    await api.supprimerVin(idVin)
    await recharger()
  }

  async function reglerStock(idVin: number, cible: number) {
    const vin = await api.reglerStock(idVin, cible)
    const i = vins.value.findIndex((v) => v.id_vin === idVin)
    if (i >= 0) vins.value[i] = vin
    stats.value = await api.stats()
    return vin
  }

  // ---------------------------------------------------------- vignerons
  async function ajouterVigneron(v: NouveauVigneron) {
    const id = await api.ajouterVigneron(v)
    await recharger()
    return id
  }

  async function modifierVigneron(id: number, v: NouveauVigneron) {
    await api.modifierVigneron(id, v)
    await recharger()
  }

  async function supprimerVigneron(id: number) {
    await api.supprimerVigneron(id)
    await recharger()
  }

  return {
    chargement, erreur, stockage, vins, vignerons, cepages, categories, stats, filtre, recherche,
    dernierVin, prete, nomCave, totalBouteilles, vinsAffiches,
    demarrer, recharger, creer, ouvrir, importer, exporter, supprimer,
    ajouterVin, modifierVin, supprimerVin, reglerStock,
    ajouterVigneron, modifierVigneron, supprimerVigneron,
    // lectures ponctuelles (pas d'état partagé)
    detailVin: api.detailVin, historique: api.historique, catalogue: api.catalogue,
    vigneron: api.vigneron, liensVigneron: api.liensVigneron,
  }
})

function lireCaveMemorisee(): string | null {
  try {
    return localStorage.getItem(CLE_CAVE)
  } catch {
    return null
  }
}

function normaliser(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Demande au navigateur de ne jamais effacer les caves (Android : accordé
 *  automatiquement aux PWA installées). */
async function demanderPersistance() {
  try {
    await navigator.storage?.persist?.()
  } catch {
    /* sans importance */
  }
}
