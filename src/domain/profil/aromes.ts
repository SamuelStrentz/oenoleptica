/**
 * Roue des arômes : vocabulaire fermé (familles > descripteurs), commun au
 * calcul, à la fiche de dégustation et au graphique.
 *
 * type : primaire (raisin), secondaire (fermentation, élevage), tertiaire (vieillissement).
 * motsCles : mots reconnus dans les descriptions texte des cépages.
 */
import { cleCepage } from '@/domain/cepages'

export type TypeArome = 'primaire' | 'secondaire' | 'tertiaire'

export interface Descripteur {
  cle: string
  libelle: string
  famille: string
  type: TypeArome
  motsCles: readonly string[]
}

export interface Famille {
  cle: string
  libelle: string
  couleur: string
}

export const FAMILLES: readonly Famille[] = [
  { cle: 'fruits-rouges', libelle: 'Fruits rouges', couleur: '#D64561' },
  { cle: 'fruits-noirs', libelle: 'Fruits noirs', couleur: '#5B2A55' },
  { cle: 'fruits-blancs', libelle: 'Fruits blancs et jaunes', couleur: '#E3B23C' },
  { cle: 'agrumes', libelle: 'Agrumes', couleur: '#F2C94C' },
  { cle: 'exotiques', libelle: 'Fruits exotiques', couleur: '#F2994A' },
  { cle: 'confits', libelle: 'Fruits confits et secs', couleur: '#B5651D' },
  { cle: 'floral', libelle: 'Floral', couleur: '#C98BD9' },
  { cle: 'vegetal', libelle: 'Végétal', couleur: '#6FA35B' },
  { cle: 'epices', libelle: 'Épices', couleur: '#A0522D' },
  { cle: 'boise', libelle: 'Boisé et grillé', couleur: '#8B6B4A' },
  { cle: 'mineral', libelle: 'Minéral', couleur: '#8A97A6' },
  { cle: 'patissier', libelle: 'Pâtissier', couleur: '#E8C99B' },
  { cle: 'evolution', libelle: 'Évolution', couleur: '#6B5344' },
]

const d = (cle: string, libelle: string, famille: string, type: TypeArome, motsCles: string[]): Descripteur =>
  ({ cle, libelle, famille, type, motsCles })

export const DESCRIPTEURS: readonly Descripteur[] = [
  d('fraise', 'Fraise', 'fruits-rouges', 'primaire', ['fraise', 'fraise des bois']),
  d('framboise', 'Framboise', 'fruits-rouges', 'primaire', ['framboise']),
  d('cerise', 'Cerise', 'fruits-rouges', 'primaire', ['cerise', 'griotte']),
  d('groseille', 'Groseille', 'fruits-rouges', 'primaire', ['groseille', 'fruits rouges']),
  d('cassis', 'Cassis', 'fruits-noirs', 'primaire', ['cassis']),
  d('mure', 'Mûre', 'fruits-noirs', 'primaire', ['mure', 'fruits noirs', 'fruit noir']),
  d('myrtille', 'Myrtille', 'fruits-noirs', 'primaire', ['myrtille']),
  d('prune', 'Prune', 'fruits-noirs', 'primaire', ['prune', 'cerise noire']),
  d('pomme', 'Pomme', 'fruits-blancs', 'primaire', ['pomme', 'fruits blancs']),
  d('poire', 'Poire', 'fruits-blancs', 'primaire', ['poire']),
  d('peche', 'Pêche', 'fruits-blancs', 'primaire', ['peche', 'fruits jaunes']),
  d('abricot', 'Abricot', 'fruits-blancs', 'primaire', ['abricot']),
  d('coing', 'Coing', 'fruits-blancs', 'primaire', ['coing']),
  d('citron', 'Citron', 'agrumes', 'primaire', ['citron', 'agrumes']),
  d('pamplemousse', 'Pamplemousse', 'agrumes', 'primaire', ['pamplemousse']),
  d('orange', 'Orange', 'agrumes', 'primaire', ['orange', 'bergamote']),
  d('ananas', 'Ananas', 'exotiques', 'primaire', ['ananas', 'fruits exotiques']),
  d('mangue', 'Mangue', 'exotiques', 'primaire', ['mangue']),
  d('litchi', 'Litchi', 'exotiques', 'primaire', ['litchi']),
  d('passion', 'Fruit de la passion', 'exotiques', 'primaire', ['fruit de la passion']),
  d('fruits-confits', 'Fruits confits', 'confits', 'tertiaire', ['fruits confits', 'confit', 'confiture', 'cuite', 'cuits']),
  d('abricot-sec', 'Abricot sec', 'confits', 'tertiaire', ['abricot sec']),
  d('fruits-secs', 'Fruits secs (noix, amande)', 'confits', 'tertiaire', ['fruits secs', 'noix', 'amande', 'noisette']),
  d('pruneau', 'Pruneau', 'confits', 'tertiaire', ['pruneau']),
  d('fleurs-blanches', 'Fleurs blanches', 'floral', 'primaire', ['fleurs blanches', 'fleur blanche', 'aubepine', 'acacia', 'fleurs']),
  d('rose', 'Rose', 'floral', 'primaire', ['rose', 'pivoine']),
  d('violette', 'Violette', 'floral', 'primaire', ['violette']),
  d('tilleul', 'Tilleul', 'floral', 'primaire', ['tilleul']),
  d('fleur-oranger', "Fleur d'oranger", 'floral', 'primaire', ["fleur d'oranger", 'fleur d oranger']),
  d('herbe', 'Herbe coupée', 'vegetal', 'primaire', ['herbe', 'herbes', 'vegetal', 'fenouil']),
  d('poivron', 'Poivron', 'vegetal', 'primaire', ['poivron']),
  d('buis', 'Buis, bourgeon de cassis', 'vegetal', 'primaire', ['bourgeon de cassis', 'buis']),
  d('garrigue', 'Garrigue', 'vegetal', 'primaire', ['garrigue', 'the', 'menthe']),
  d('poivre', 'Poivre', 'epices', 'primaire', ['poivre', 'poivree', 'poivre blanc', 'poivre noir']),
  d('epices-douces', 'Épices douces', 'epices', 'secondaire', ['epices douces', 'epices', 'epice', 'cannelle', 'paprika', 'curry', 'gingembre']),
  d('reglisse', 'Réglisse', 'epices', 'primaire', ['reglisse', 'anis']),
  d('vanille', 'Vanille', 'boise', 'secondaire', ['vanille']),
  d('boise', 'Boisé', 'boise', 'secondaire', ['cedre', 'boite a cigares', 'boise', 'chene', 'fut']),
  d('grille', 'Grillé, fumé', 'boise', 'secondaire', ['grille', 'fume', 'toaste', 'graphite', 'crayon', 'encre', 'goudron']),
  d('cacao', 'Cacao, café', 'boise', 'tertiaire', ['cacao', 'chocolat', 'cafe']),
  d('pierre-a-fusil', 'Pierre à fusil', 'mineral', 'primaire', ['pierre a fusil', 'silex', 'mineral', 'minerale']),
  d('iode', 'Iode, salin', 'mineral', 'primaire', ['iode', 'salin', 'saline', 'notes salines']),
  d('hydrocarbure', 'Hydrocarbure', 'mineral', 'tertiaire', ['hydrocarbure', 'petrole', 'petrolees']),
  d('beurre', 'Beurre', 'patissier', 'secondaire', ['beurre', 'beurree']),
  d('brioche', 'Brioche, pain', 'patissier', 'secondaire', ['brioche', 'pain', 'levure']),
  d('miel', 'Miel', 'evolution', 'tertiaire', ['miel']),
  d('cire', 'Cire', 'evolution', 'tertiaire', ['cire']),
  d('sous-bois', 'Sous-bois, champignon', 'evolution', 'tertiaire', ['sous-bois', 'sous bois', 'champignon', 'truffe', 'morille', 'terre']),
  d('cuir', 'Cuir, tabac', 'evolution', 'tertiaire', ['cuir', 'tabac', 'gibier', 'animal', 'viande', 'lard']),
  d('botrytis', 'Botrytis (rôti)', 'confits', 'secondaire', ['botrytis', 'roti']),
]

export const PAR_DESCRIPTEUR: Record<string, Descripteur> = Object.fromEntries(DESCRIPTEURS.map((x) => [x.cle, x]))
export const PAR_FAMILLE: Record<string, Famille> = Object.fromEntries(FAMILLES.map((f) => [f.cle, f]))

// Mots-clés triés du plus long au plus court : « bourgeon de cassis » est
// reconnu (végétal) avant « cassis » (fruit).
const INDEX = DESCRIPTEURS.flatMap((x) => x.motsCles.map((m) => ({ mot: ` ${cleCepage(m)} `, cle: x.cle })))
  .sort((a, b) => b.mot.length - a.mot.length)

/**
 * Texte libre -> descripteurs : 'cassis, poivron vert, cèdre' ->
 * { cassis: 0.9, poivron: 0.75, boise: 0.6 }. Les premiers cités pèsent plus.
 */
export function aromesDepuisTexte(texte: string | null | undefined, poids = 1): Record<string, number> {
  const resultat: Record<string, number> = {}
  if (!texte) return resultat
  let rang = 0
  for (const morceau of texte.split(/[,;]/)) {
    let reste = ` ${cleCepage(morceau)} `
    let trouve = false
    for (const { mot, cle } of INDEX) {
      if (!reste.includes(mot)) continue
      reste = reste.replace(mot, ' ')
      const intensite = Math.max(0.35, 0.9 - 0.15 * rang) * poids
      resultat[cle] = Math.max(resultat[cle] ?? 0, intensite)
      trouve = true
    }
    if (trouve) rang++
  }
  return resultat
}

/** Les n arômes les plus intenses, triés. */
export function principaux(aromes: Record<string, number>, n = 6): { cle: string; intensite: number }[] {
  return Object.entries(aromes)
    .filter(([cle, v]) => v >= 0.15 && PAR_DESCRIPTEUR[cle])
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([cle, intensite]) => ({ cle, intensite }))
}
