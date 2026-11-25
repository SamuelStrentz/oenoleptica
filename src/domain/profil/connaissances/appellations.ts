/**
 * Appellations : style, région, climat, sols, garde et effets typiques.
 * Repères généraux, modérés, à affiner avec tes dégustations.
 *
 * Format d'une ligne (séparateur « | ») :
 *   nom | alias (;) | style | région | climat (- = celui de la région) | sols (;)
 *   | garde min-max (ans) | effets (critère=valeur;…) | arômes (descripteur=valeur;…)
 * Style « variable » : déduit des mentions de l'étiquette (Sec, Doux, VT…), sec par défaut.
 */
import { cleCepage } from '@/domain/cepages'
import type { Critere } from '../echelles'
import type { Climat, Couche, Sol, Style } from './terroir'
import type { RegionViticole } from './millesimes'

export interface Appellation extends Couche {
  nom: string
  style: Style | 'variable'
  region: RegionViticole | null
  climat: Climat | null
  sols: Sol[]
  garde: [number, number]
}

const DONNEES = `
Alsace | vin d'alsace | variable | alsace | - | marne;calcaire;granit | 2-8 | |
Alsace Grand Cru | | variable | alsace | - | marne;calcaire;granit | 5-15 | longueur=1;corps=0.25 |
Crémant d'Alsace | | brut | alsace | - | calcaire | 1-4 | |
Crémant | | brut | - | - | calcaire | 1-4 | |
Crémant de Loire | | brut | loire | - | calcaire | 1-4 | |
Crémant de Bourgogne | | brut | bourgogne | - | calcaire | 1-4 | |
Champagne | | brut | champagne | - | craie | 2-10 | | brioche=0.2
Savoie | vin de savoie | sec | savoie | - | calcaire;argile | 1-5 | |
Côtes de Gascogne | cote de gascogne | variable | sud-ouest | - | sable;argile | 1-3 | acidite=0.25 | pamplemousse=0.2;passion=0.15
Jurançon | | moelleux | sud-ouest | - | argile;galets | 5-20 | acidite=0.5 | ananas=0.2;mangue=0.15;epices-douces=0.15
Jurançon sec | | sec | sud-ouest | - | argile;galets | 2-8 | acidite=0.5 | ananas=0.15;pamplemousse=0.2
Coteaux du Layon | | moelleux | loire | - | schiste | 8-25 | sucre=0.5;acidite=0.25 | coing=0.2;botrytis=0.25;abricot-sec=0.2
Bonnezeaux | | liquoreux | loire | - | schiste | 10-40 | acidite=0.25 | coing=0.2
Quarts de Chaume | | liquoreux | loire | - | schiste | 10-40 | acidite=0.25;longueur=1 | coing=0.2
Coteaux de l'Aubance | | moelleux | loire | - | schiste | 5-20 | | coing=0.2;botrytis=0.15
Vouvray | | variable | loire | - | calcaire;silex | 3-30 | acidite=0.25 | coing=0.2;tilleul=0.15
Montlouis-sur-Loire | montlouis | variable | loire | - | silex;argile | 3-20 | acidite=0.25 | coing=0.15
Savennières | | sec | loire | - | schiste | 5-25 | acidite=0.25;corps=0.25 | cire=0.15
Saumur-Champigny | | sec | loire | - | calcaire | 3-10 | |
Chinon | | sec | loire | - | calcaire;gres | 3-15 | |
Bourgueil | | sec | loire | - | calcaire | 3-12 | |
Sancerre | | sec | loire | - | calcaire;silex | 2-8 | acidite=0.25 | pierre-a-fusil=0.2
Pouilly-Fumé | | sec | loire | - | silex;calcaire | 2-10 | | pierre-a-fusil=0.3;grille=0.15
Muscadet | muscadet sevre et maine | sec | loire | - | granit;schiste | 1-6 | acidite=0.25;corps=-0.25 | iode=0.2
Chablis | | sec | bourgogne | - | calcaire | 3-12 | acidite=0.5 | pierre-a-fusil=0.25;iode=0.15
Meursault | | sec | bourgogne | - | calcaire;marne | 5-15 | corps=0.5 | beurre=0.2;fruits-secs=0.2
Puligny-Montrachet | | sec | bourgogne | - | calcaire | 5-15 | longueur=0.5 |
Bourgogne | | sec | bourgogne | - | calcaire;marne | 2-8 | |
Hautes-Côtes-de-Beaune | bourgogne hautes cotes de beaune | sec | bourgogne | - | calcaire;marne | 3-8 | acidite=0.25;corps=-0.25 |
Gevrey-Chambertin | | sec | bourgogne | - | calcaire;marne | 8-20 | corps=0.5;tanins=0.5 |
Pommard | | sec | bourgogne | - | argile;calcaire | 8-20 | tanins=0.5;corps=0.5 |
Beaujolais | beaujolais villages | sec | beaujolais | - | granit | 1-3 | |
Morgon | | sec | beaujolais | - | granit;schiste | 3-10 | corps=0.25 |
Fleurie | | sec | beaujolais | - | granit | 2-6 | | violette=0.15
Côtes du Rhône | cotes du rhone villages | sec | rhone-sud | - | galets;argile | 2-6 | |
Châteauneuf-du-Pape | | sec | rhone-sud | - | galets;sable;argile | 8-20 | corps=0.5 | garrigue=0.2
Gigondas | | sec | rhone-sud | - | calcaire;argile | 5-15 | tanins=0.25 |
Crozes-Hermitage | | sec | rhone-nord | - | galets;granit | 3-10 | |
Hermitage | | sec | rhone-nord | - | granit | 10-30 | corps=0.5;tanins=0.5 |
Côte-Rôtie | | sec | rhone-nord | - | schiste | 8-20 | | violette=0.2
Saint-Joseph | | sec | rhone-nord | - | granit | 3-10 | |
Condrieu | | sec | rhone-nord | - | granit | 1-6 | | abricot=0.2
Côtes de Provence | | sec | provence | - | calcaire;schiste | 1-3 | |
Coteaux d'Aix-en-Provence | | sec | provence | - | calcaire;argile | 1-5 | |
Bandol | | sec | provence | - | calcaire;gres | 8-20 | tanins=0.5;corps=0.5 | garrigue=0.2;cuir=0.15
Bordeaux | bordeaux superieur | sec | bordeaux | - | argile;calcaire | 3-10 | |
Médoc | haut medoc | sec | bordeaux | - | galets | 8-20 | tanins=0.5 |
Pauillac | | sec | bordeaux | - | galets | 10-30 | tanins=0.75;corps=0.5 | cassis=0.15;boise=0.15
Margaux | | sec | bordeaux | - | galets | 10-25 | | violette=0.15
Saint-Émilion | saint emilion grand cru | sec | bordeaux | - | calcaire;argile | 8-20 | |
Pomerol | | sec | bordeaux | - | argile;galets | 8-25 | corps=0.5 | sous-bois=0.1
Pessac-Léognan | graves | sec | bordeaux | - | galets | 8-20 | | grille=0.15
Sauternes | barsac | liquoreux | bordeaux | - | galets;argile;calcaire | 10-40 | |
Entre-Deux-Mers | | sec | bordeaux | - | argile;calcaire | 1-3 | |
Cahors | | sec | sud-ouest | - | calcaire;argile | 8-20 | tanins=0.5 |
Madiran | | sec | sud-ouest | - | argile;galets | 8-25 | tanins=0.75 |
Gaillac | | variable | sud-ouest | - | calcaire;argile | 2-8 | |
Monbazillac | | liquoreux | sud-ouest | - | calcaire;argile | 8-25 | |
Languedoc | coteaux du languedoc | sec | languedoc | - | calcaire;schiste | 2-8 | |
Corbières | | sec | languedoc | - | calcaire;schiste | 3-10 | |
Minervois | | sec | languedoc | - | calcaire;gres | 3-10 | |
Pic Saint-Loup | | sec | languedoc | - | calcaire | 4-12 | |
Côtes du Jura | arbois | sec | jura | - | marne | 3-12 | |
Vin jaune | chateau chalon | sec | jura | - | marne | 15-50 | acidite=0.5;salinite=0.5 | fruits-secs=0.5;epices-douces=0.3
`

function lireCouples(texte: string): Record<string, number> {
  return Object.fromEntries(
    texte.split(';').map((x) => x.trim()).filter(Boolean).map((x) => {
      const [k, v] = x.split('=')
      return [k.trim(), Number(v)]
    }),
  )
}

function lire(): Appellation[] {
  return DONNEES.trim().split('\n').map((ligne) => {
    const c = ligne.split('|').map((x) => x.trim())
    if (c.length !== 9) throw new Error(`Appellation mal formée : ${ligne}`)
    const [nom, , style, region, climat, sols, garde, effets, aromes] = c
    const [gMin, gMax] = garde.split('-').map(Number)
    return {
      nom,
      style: style as Style | 'variable',
      region: region === '-' ? null : (region as RegionViticole),
      climat: climat === '-' ? null : (climat as Climat),
      sols: sols ? (sols.split(';') as Sol[]) : [],
      garde: [gMin, gMax],
      effets: lireCouples(effets) as Partial<Record<Critere, number>>,
      aromes: lireCouples(aromes),
    }
  })
}

export const APPELLATIONS: readonly Appellation[] = lire()

// Index : nom et alias normalisés, du plus long au plus court
const INDEX = DONNEES.trim().split('\n').flatMap((ligne, i) => {
  const [nom, alias] = ligne.split('|').map((x) => x.trim())
  return [nom, ...alias.split(';')].filter(Boolean).map((n) => ({ cle: cleCepage(n), app: APPELLATIONS[i] }))
}).sort((a, b) => b.cle.length - a.cle.length)

/**
 * Retrouve une appellation : nom exact, alias, ou appellation contenue dans
 * le texte (« Saint-Émilion Grand Cru » -> Saint-Émilion).
 */
export function trouverAppellation(texte: string | null | undefined): Appellation | null {
  const t = ` ${cleCepage(texte ?? '')} `
  if (!t.trim()) return null
  return INDEX.find(({ cle }) => t === ` ${cle} `)?.app ?? INDEX.find(({ cle }) => t.includes(` ${cle} `))?.app ?? null
}
