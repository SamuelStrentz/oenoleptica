/** État de la cave côté interface (Pinia). Toute écriture passe par le worker. */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { cave as api } from '@/db/client'
import type { AjoutVin, Cepages, InfoStockage, Statistiques, VigneronListe, VinCave } from '@/domain/types'

export type Filtre = 'tous' | 'en-stock' | 'epuises'

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

  async function demarrer() {
    chargement.value = true
    try {
      stockage.value = await api.demarrer()
      if (prete.value) await recharger()
    } catch (e) {
      erreur.value = (e as Error).message
    } finally {
      chargement.value = false
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

  async function creer() {
    stockage.value = await api.creerCave()
    await demanderPersistance()
    await recharger()
  }

  async function importer(fichier: File) {
    const octets = new Uint8Array(await fichier.arrayBuffer())
    stockage.value = await api.importerCave(octets)
    await demanderPersistance()
    await recharger()
  }

  async function exporter(): Promise<Blob> {
    const octets = await api.exporterCave()
    return new Blob([octets as BlobPart], { type: 'application/vnd.sqlite3' })
  }

  async function supprimer() {
    stockage.value = await api.supprimerCave()
    vins.value = []
    vignerons.value = []
    stats.value = null
  }

  async function ajouterVin(d: AjoutVin) {
    const vin = await api.ajouterVin(d)
    dernierVin.value = vin.id_vin
    await recharger()
    return vin
  }

  async function reglerStock(idVin: number, cible: number) {
    const vin = await api.reglerStock(idVin, cible)
    const i = vins.value.findIndex((v) => v.id_vin === idVin)
    if (i >= 0) vins.value[i] = vin
    stats.value = await api.stats()
    return vin
  }

  return {
    chargement, erreur, stockage, vins, vignerons, cepages, categories, stats, filtre, recherche,
    dernierVin, prete, totalBouteilles, vinsAffiches,
    demarrer, recharger, creer, importer, exporter, supprimer, ajouterVin, reglerStock,
  }
})

function normaliser(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Demande au navigateur de ne jamais effacer la cave (Android : accordé
 *  automatiquement aux PWA installées). */
async function demanderPersistance() {
  try {
    await navigator.storage?.persist?.()
  } catch {
    /* sans importance */
  }
}
