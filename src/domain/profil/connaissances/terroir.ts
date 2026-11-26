/**
 * Effets génériques : style du vin, climat, sol, millésime, mentions
 * d'étiquette. Valeurs en points sur l'échelle 0-5 (longueur en caudalies).
 * Ce sont des repères généraux, volontairement modérés.
 */
import type { Critere } from '../echelles'

export type Effets = Partial<Record<Critere, number>>
export type EffetsAromes = Record<string, number>

export interface Couche {
  effets?: Effets
  aromes?: EffetsAromes
}

// ------------------------------------------------------------------ styles
export type Style =
  | 'sec' | 'demi-sec' | 'moelleux' | 'vendanges-tardives' | 'liquoreux' | 'sgn'
  | 'brut-nature' | 'brut' | 'effervescent-demi-sec'

export interface DefStyle extends Couche {
  libelle: string
  /** Sucre visé (remplace celui du cépage). */
  sucre: number
  effervescent?: boolean
  /** Multiplie la garde (les liquoreux vieillissent plus longtemps). */
  garde?: number
  /** Crans de teinte en plus (un liquoreux est plus doré qu'un sec). */
  teinte?: number
}

export const STYLES: Record<Style, DefStyle> = {
  sec: { libelle: 'Sec', sucre: 0.25 },
  'demi-sec': { libelle: 'Demi-sec', sucre: 1.5, effets: { corps: 0.25 } },
  moelleux: { libelle: 'Moelleux', sucre: 3, teinte: 0.5, effets: { corps: 0.5 }, aromes: { 'fruits-confits': 0.2, miel: 0.15 }, garde: 1.3 },
  'vendanges-tardives': { libelle: 'Vendanges tardives', sucre: 3.5, teinte: 0.75, effets: { corps: 0.75, longueur: 1 },
    aromes: { 'fruits-confits': 0.35, miel: 0.25 }, garde: 1.6 },
  liquoreux: { libelle: 'Liquoreux', sucre: 4.5, teinte: 1, effets: { corps: 1, longueur: 1.5 },
    aromes: { botrytis: 0.5, 'fruits-confits': 0.45, 'abricot-sec': 0.4, miel: 0.3 }, garde: 2 },
  sgn: { libelle: 'Sélection de grains nobles', sucre: 5, teinte: 1.25, effets: { corps: 1.25, longueur: 2 },
    aromes: { botrytis: 0.6, 'fruits-confits': 0.5, 'abricot-sec': 0.45, miel: 0.4 }, garde: 2.5 },
  'brut-nature': { libelle: 'Effervescent brut nature', sucre: 0, effervescent: true, effets: { corps: -0.5, acidite: 0.25 },
    aromes: { brioche: 0.45, pomme: 0.2 } },
  brut: { libelle: 'Effervescent brut', sucre: 0.5, effervescent: true, effets: { corps: -0.5 }, aromes: { brioche: 0.45, pomme: 0.25 } },
  'effervescent-demi-sec': { libelle: 'Effervescent demi-sec', sucre: 1.75, effervescent: true, effets: { corps: -0.25 },
    aromes: { brioche: 0.35, poire: 0.25 } },
}

const normaliser = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim()

/** « Moelleux », « moelleux », « vendanges-tardives »… -> clé de style ; inconnu -> null. */
export function styleDepuisLibelle(texte: string | null | undefined): Style | null {
  if (!texte?.trim()) return null
  const t = normaliser(texte)
  const trouve = (Object.entries(STYLES) as [Style, DefStyle][]).find(([cle, s]) => normaliser(s.libelle) === t || normaliser(cle) === t)
  return trouve?.[0] ?? null
}

/**
 * Mentions d'étiquette (cuvée, cru) qui révèlent le style : très fréquentes
 * en Alsace (« Sec », « Doux », « Vendanges tardives »…). Les plus précises d'abord.
 */
export const MENTIONS_STYLE: readonly [RegExp, Style][] = [
  [/selection de grains nobles|\bsgn\b/, 'sgn'],
  [/vendanges? tardives?|\bvt\b/, 'vendanges-tardives'],
  [/brut nature|non dose|zero dosage|extra brut/, 'brut-nature'],
  [/\bbrut\b/, 'brut'],
  [/liquoreux/, 'liquoreux'],
  [/moelleux|\bdoux\b/, 'moelleux'],
  [/demi sec/, 'demi-sec'],
  [/\bsec\b/, 'sec'],
]

/** Autres mentions qui modifient le profil. */
export const MENTIONS: readonly { motif: RegExp; libelle: string; couche: Couche; garde?: number }[] = [
  { motif: /grand cru/, libelle: 'Grand cru', couche: { effets: { longueur: 1.5, corps: 0.25, intensite_nez: 0.25 } }, garde: 5 },
  { motif: /1er cru|premier cru/, libelle: 'Premier cru', couche: { effets: { longueur: 0.75, corps: 0.25 } }, garde: 3 },
  { motif: /vieilles vignes/, libelle: 'Vieilles vignes', couche: { effets: { corps: 0.25, longueur: 0.5, intensite_nez: 0.25 } }, garde: 2 },
  { motif: /fut|barrique|chene|eleve en bois/, libelle: 'Élevage en fût',
    couche: { effets: { tanins: 0.5, corps: 0.25 }, aromes: { vanille: 0.45, boise: 0.4, grille: 0.25 } }, garde: 2 },
  { motif: /(?<!brut )\bnature\b|sans sulfites/, libelle: 'Vin nature', couche: { effets: { acidite: 0.25 }, aromes: { pomme: 0.15 } } },
]

// ----------------------------------------------------------------- climats
export type Climat = 'septentrional' | 'semi-continental' | 'continental' | 'oceanique' | 'mediterraneen' | 'montagnard'

export const CLIMATS: Record<Climat, { libelle: string } & Couche> = {
  septentrional: { libelle: 'septentrional', effets: { acidite: 0.5, alcool: -0.5, corps: -0.25 }, aromes: { pomme: 0.1, citron: 0.1 } },
  'semi-continental': { libelle: 'semi-continental', effets: { acidite: 0.25, alcool: -0.25 } },
  continental: { libelle: 'continental', effets: { acidite: 0.25, alcool: -0.25 } },
  oceanique: { libelle: 'océanique', effets: { acidite: 0.25 } },
  mediterraneen: { libelle: 'méditerranéen', effets: { alcool: 0.75, acidite: -0.5, corps: 0.5, intensite_robe: 0.25 },
    aromes: { garrigue: 0.3, 'fruits-confits': 0.1 } },
  montagnard: { libelle: 'montagnard', effets: { acidite: 0.5, alcool: -0.5, corps: -0.25 }, aromes: { 'pierre-a-fusil': 0.15 } },
}

// -------------------------------------------------------------------- sols
export type Sol = 'calcaire' | 'craie' | 'marne' | 'argile' | 'schiste' | 'granit' | 'gres' | 'volcanique' | 'galets' | 'sable' | 'silex'

export const SOLS: Record<Sol, { libelle: string } & Couche> = {
  calcaire: { libelle: 'calcaire', effets: { acidite: 0.25, salinite: 0.5 }, aromes: { 'pierre-a-fusil': 0.15 } },
  craie: { libelle: 'craie', effets: { acidite: 0.5, salinite: 0.5, corps: -0.25 }, aromes: { 'pierre-a-fusil': 0.2 } },
  marne: { libelle: 'marne', effets: { corps: 0.25, salinite: 0.25 } },
  argile: { libelle: 'argile', effets: { corps: 0.5, tanins: 0.25 } },
  schiste: { libelle: 'schiste', effets: { salinite: 0.5, acidite: 0.25 }, aromes: { 'pierre-a-fusil': 0.2, grille: 0.1 } },
  granit: { libelle: 'granit', effets: { acidite: 0.25, salinite: 0.25, corps: -0.25 }, aromes: { 'pierre-a-fusil': 0.2 } },
  gres: { libelle: 'grès', effets: { tanins: 0.25, acidite: 0.25 }, aromes: { 'epices-douces': 0.1 } },
  volcanique: { libelle: 'volcanique', effets: { salinite: 0.75, acidite: 0.25 }, aromes: { grille: 0.2, 'pierre-a-fusil': 0.2 } },
  galets: { libelle: 'galets roulés', effets: { alcool: 0.25, corps: 0.25 }, aromes: { 'fruits-confits': 0.1 } },
  sable: { libelle: 'sable', effets: { tanins: -0.25, corps: -0.25 }, aromes: { framboise: 0.1 } },
  silex: { libelle: 'silex', effets: { acidite: 0.25, salinite: 0.25 }, aromes: { 'pierre-a-fusil': 0.35, grille: 0.15 } },
}

// --------------------------------------------------------------- millésimes
export type Caractere = 'equilibre' | 'chaud' | 'caniculaire' | 'frais' | 'pluvieux'

export const CARACTERES: Record<Caractere, { libelle: string } & Couche> = {
  equilibre: { libelle: 'année équilibrée' },
  chaud: { libelle: 'année chaude', effets: { alcool: 0.5, acidite: -0.25, corps: 0.25, intensite_robe: 0.25 },
    aromes: { 'fruits-confits': 0.15 } },
  caniculaire: { libelle: 'année caniculaire', effets: { alcool: 0.75, acidite: -0.5, corps: 0.5, intensite_robe: 0.5 },
    aromes: { 'fruits-confits': 0.3 } },
  frais: { libelle: 'année fraîche', effets: { acidite: 0.5, alcool: -0.5, corps: -0.25 }, aromes: { citron: 0.1, herbe: 0.1 } },
  pluvieux: { libelle: 'année pluvieuse', effets: { corps: -0.5, intensite_nez: -0.25, longueur: -0.5, acidite: 0.25 } },
}
