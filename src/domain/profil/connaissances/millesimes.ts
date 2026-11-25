/**
 * Régions viticoles et caractère des millésimes.
 *
 * Le caractère est relatif à la normale de la région (une « année chaude » en
 * Alsace n'est pas une année chaude en Provence). Base : tendance nationale,
 * avec quelques exceptions régionales. Repères généraux à affiner : 2025 est
 * décrit comme très précoce et chaud par les premiers bilans de vendanges.
 */
import { cleCepage } from '@/domain/cepages'
import type { Caractere, Climat } from './terroir'

export type RegionViticole =
  | 'alsace' | 'loire' | 'bourgogne' | 'beaujolais' | 'champagne' | 'bordeaux' | 'sud-ouest'
  | 'rhone-nord' | 'rhone-sud' | 'provence' | 'languedoc' | 'savoie' | 'jura'

export const REGIONS_VITICOLES: Record<RegionViticole, { libelle: string; climat: Climat }> = {
  alsace: { libelle: 'Alsace', climat: 'semi-continental' },
  loire: { libelle: 'Val de Loire', climat: 'oceanique' },
  bourgogne: { libelle: 'Bourgogne', climat: 'continental' },
  beaujolais: { libelle: 'Beaujolais', climat: 'continental' },
  champagne: { libelle: 'Champagne', climat: 'septentrional' },
  bordeaux: { libelle: 'Bordeaux', climat: 'oceanique' },
  'sud-ouest': { libelle: 'Sud-Ouest', climat: 'oceanique' },
  'rhone-nord': { libelle: 'Rhône septentrional', climat: 'continental' },
  'rhone-sud': { libelle: 'Rhône méridional', climat: 'mediterraneen' },
  provence: { libelle: 'Provence', climat: 'mediterraneen' },
  languedoc: { libelle: 'Languedoc-Roussillon', climat: 'mediterraneen' },
  savoie: { libelle: 'Savoie', climat: 'montagnard' },
  jura: { libelle: 'Jura', climat: 'continental' },
}

/** Tendance nationale par année. */
const NATIONAL: Record<number, Caractere> = {
  2005: 'chaud', 2006: 'equilibre', 2007: 'frais', 2008: 'frais', 2009: 'chaud', 2010: 'frais',
  2011: 'equilibre', 2012: 'pluvieux', 2013: 'frais', 2014: 'equilibre', 2015: 'chaud', 2016: 'equilibre',
  2017: 'equilibre', 2018: 'chaud', 2019: 'chaud', 2020: 'chaud', 2021: 'frais', 2022: 'caniculaire',
  2023: 'chaud', 2024: 'pluvieux', 2025: 'chaud',
}

/** Exceptions régionales connues. */
const EXCEPTIONS: Partial<Record<RegionViticole, Record<number, Caractere>>> = {
  bordeaux: { 2010: 'equilibre', 2013: 'pluvieux' },
  loire: { 2013: 'pluvieux' },
  alsace: { 2013: 'pluvieux' },
  'rhone-sud': { 2010: 'equilibre', 2013: 'equilibre' },
  provence: { 2021: 'equilibre' },
  languedoc: { 2021: 'equilibre' },
}

export function caractereMillesime(annee: number, region: RegionViticole | null): Caractere | null {
  return (region && EXCEPTIONS[region]?.[annee]) || NATIONAL[annee] || null
}

/**
 * Région viticole devinée depuis la région administrative du vigneron
 * (anciennes ou nouvelles régions). null si ambigu (ex. Occitanie).
 */
export function regionDepuisAdministrative(region: string | null | undefined): RegionViticole | null {
  const r = cleCepage(region ?? '')
  if (!r) return null
  if (r.includes('alsace')) return 'alsace'
  if (r.includes('loire') || r.includes('centre')) return 'loire'
  if (r.includes('bourgogne')) return 'bourgogne'
  if (r.includes('champagne')) return 'champagne'
  if (r.includes('provence')) return 'provence'
  if (r.includes('languedoc')) return 'languedoc'
  if (r.includes('aquitaine') || r.includes('midi pyrenees')) return 'sud-ouest'
  if (r.includes('franche comte')) return 'jura'
  return null
}
