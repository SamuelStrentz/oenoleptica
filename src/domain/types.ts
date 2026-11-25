/** Types partagés entre le worker (base) et l'interface. */
import type { TypeCepage } from './cepages'

export const COULEURS = ['Rouge', 'Blanc', 'Rosé'] as const
export const FORMATS = ['37,5 cl', '75 cl', '150 cl', '300 cl'] as const

export type TypeMouvement = 'entrée' | 'sortie'

/** Une ligne de la vue « cave » (équivalent de la vue Standard du desktop). */
export interface VinCave {
  id_vin: number
  id_vigneron: number | null
  domaine: string
  millesime: number | null
  appellation: string | null
  cuvee: string | null
  cru: string | null
  couleur: string | null
  prix: number | null
  cepage: string | null
  volume_alcool: number | null
  format: string | null
  quantite: number
  region: string | null
  note: number | null
  categories: string | null
}

export interface Vigneron {
  id_vigneron: number
  prenom: string | null
  nom: string
  mail: string | null
  adresse: string | null
  cp: string | null
  ville: string | null
  departement: string | null
  region: string | null
  pays: string | null
}

export type NouveauVigneron = Omit<Vigneron, 'id_vigneron'>

/** Vigneron + infos d'affichage (libellé, domaines, nombre de vins). */
export interface VigneronListe {
  id_vigneron: number
  libelle: string
  ville: string | null
  region: string | null
  domaines: string | null
  nb_vins: number
  bouteilles: number
}

/** Champs saisis pour un vin (communs à l'ajout et à la modification). */
export interface ChampsVin {
  domaine: string
  millesime: number | null
  appellation: string | null
  cuvee: string | null
  cru: string | null
  couleur: string | null
  prix: number | null
  cepage: string | null
  volume_alcool: number | null
  format: string | null
}

/** Données du formulaire « Ajouter un vin » (cf. inserer_vin en Python). */
export interface AjoutVin extends ChampsVin {
  vigneron_id: number | null
  vigneron_nouveau: NouveauVigneron | null
  quantite: number
  note: number | null
  categorie: string | null
}

export type Cepages = Record<string, TypeCepage>

export interface Statistiques {
  vins: number
  vins_en_stock: number
  bouteilles: number
  vignerons: number
  valeur: number
}

export type EtatCave = 'absente' | 'prete'

export interface InfoStockage {
  etat: EtatCave
  /** false = stockage OPFS indisponible : la cave ne survivra pas à la fermeture. */
  persistant: boolean
  versionSqlite: string
}
