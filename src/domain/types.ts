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

/** Le minimum pour afficher / modifier le stock d'un vin. */
export type VinStock = Pick<VinCave, 'id_vin' | 'domaine' | 'millesime' | 'appellation' | 'cuvee' | 'cru' | 'couleur' | 'quantite'>

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

/** Une cave = un fichier .db rangé sur le téléphone. */
export interface Cave {
  fichier: string
  nom: string
}

export interface InfoStockage {
  etat: EtatCave
  /** false = stockage OPFS indisponible : la cave ne survivra pas à la fermeture. */
  persistant: boolean
  versionSqlite: string
  /** Cave ouverte (null si aucune). */
  cave: Cave | null
  /** Toutes les caves présentes sur le téléphone. */
  caves: Cave[]
}

export interface Mouvement {
  id_mouv: number
  id_vin: number
  type_mouvement: TypeMouvement
  quantite_mouvement: number
  date_mouvement: string
}

/** Mouvement + vin concerné (historique). */
export interface MouvementHistorique extends Mouvement {
  domaine: string | null
  millesime: number | null
  appellation: string | null
  cuvee: string | null
  couleur: string | null
  prix: number | null
}

export interface ProfilOrganoleptique {
  robe_couleur: string | null
  robe_intensite: string | null
  aromes_nez: string | null
  aromes_bouche: string | null
  attaque: string | null
  milieu_bouche: string | null
  finale: string | null
  texture: string | null
  longueur: string | null
  acidite: number | null
  tanins: number | null
  sucrosite: number | null
  corps: number | null
  garde: string | null
}

/** Un cépage du vin, avec son profil type s'il est connu. */
export interface CepageDuVin {
  nom: string
  type: TypeCepage
  profil: ProfilOrganoleptique | null
}

/** Tout ce que la base sait d'un vin (fiche détaillée). */
export interface VinDetail {
  vin: VinCave
  vigneron: Vigneron | null
  avis: { note: number | null; categorie: string | null }[]
  mouvements: Mouvement[]
  cepages: CepageDuVin[]
}

/** Ligne du catalogue d'un vigneron. */
export interface LigneCatalogue {
  id_vin: number
  domaine: string
  cepage: string | null
  millesime: number | null
  appellation: string | null
  cuvee: string | null
  cru: string | null
  couleur: string | null
  prix: number | null
  quantite: number
}

export interface LiensVigneron {
  vins: number
  stock: number
  avis: number
  mouvements: number
}
