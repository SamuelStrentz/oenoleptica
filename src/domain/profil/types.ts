/** Types du profil organoleptique calculé et des dégustations. */
import type { Critere, FamilleCouleur } from './echelles'
import type { Effets, Style } from './connaissances/terroir'
import type { ProfilOrganoleptique } from '@/domain/types'
import type { TypeCepage } from '@/domain/cepages'

/** Ce qu'une couche a apporté à une valeur (pour l'explication « pourquoi ? »). */
export interface Contribution {
  couche: string
  delta: number
}

export interface ValeurCalculee {
  valeur: number
  contributions: Contribution[]
}

export type EtatFenetre = 'attendre' | 'pret' | 'apogee' | 'boire-vite' | 'passe' | 'inconnu'

export interface Fenetre {
  etat: EtatFenetre
  libelle: string
  debut: number | null // année
  fin: number | null // année
  age: number | null
}

export interface ProfilCalcule {
  famille: FamilleCouleur
  teinte: ValeurCalculee
  criteres: Record<Critere, ValeurCalculee>
  aromes: Record<string, number>
  style: { cle: Style | null; libelle: string }
  appellation: string | null
  region: string | null
  millesime: { annee: number | null; caractere: string | null }
  fenetre: Fenetre
  confiance: { niveau: 'élevée' | 'moyenne' | 'faible'; manques: string[] }
  /** Couches utilisées, dans l'ordre (ex. « Cépage Chenin », « Appellation Bonnezeaux »). */
  couches: string[]
  alertes: string[]
}

/** Correction apprise de tes dégustations (palais, appellation, vigneron). */
export interface Correction {
  couche: string
  effets: Effets
  /** Nombre de dégustations sur lesquelles elle repose. */
  n: number
}

export interface EntreeProfil {
  couleur: string | null
  appellation: string | null
  cuvee: string | null
  cru: string | null
  millesime: number | null
  regionVigneron: string | null
  cepages: { nom: string; type: TypeCepage; profil: ProfilOrganoleptique | null }[]
  /** Appellations des autres vins du même domaine (pour deviner une appellation manquante). */
  appellationsDuDomaine?: (string | null)[]
  /** Année de référence pour l'âge du vin. */
  annee: number
  corrections?: Correction[]
}

/** Une fiche de dégustation (table degustations). */
export interface Degustation {
  id_degustation?: number
  id_vin: number
  date_degustation: string
  teinte: number | null
  intensite_robe: number | null
  intensite_nez: number | null
  aromes: Record<string, number>
  sucre: number | null
  acidite: number | null
  amertume: number | null
  salinite: number | null
  alcool: number | null
  tanins: number | null
  corps: number | null
  effervescence: number | null
  longueur: number | null
  note: number | null
  conclusion: string | null
  commentaire: string | null
}
