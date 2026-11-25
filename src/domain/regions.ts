/**
 * Anciennes régions françaises (découpage d'avant 2016) : on ne garde que
 * celles-ci, à la demande. Clé = code du département.
 */
const REGIONS: Record<string, readonly string[]> = {
  Alsace: ['67', '68'],
  Aquitaine: ['24', '33', '40', '47', '64'],
  Auvergne: ['03', '15', '43', '63'],
  'Basse-Normandie': ['14', '50', '61'],
  Bourgogne: ['21', '58', '71', '89'],
  Bretagne: ['22', '29', '35', '56'],
  Centre: ['18', '28', '36', '37', '41', '45'],
  'Champagne-Ardenne': ['08', '10', '51', '52'],
  Corse: ['2A', '2B'],
  'Franche-Comté': ['25', '39', '70', '90'],
  'Haute-Normandie': ['27', '76'],
  'Île-de-France': ['75', '77', '78', '91', '92', '93', '94', '95'],
  'Languedoc-Roussillon': ['11', '30', '34', '48', '66'],
  Limousin: ['19', '23', '87'],
  Lorraine: ['54', '55', '57', '88'],
  'Midi-Pyrénées': ['09', '12', '31', '32', '46', '65', '81', '82'],
  'Nord-Pas-de-Calais': ['59', '62'],
  'Pays de la Loire': ['44', '49', '53', '72', '85'],
  Picardie: ['02', '60', '80'],
  'Poitou-Charentes': ['16', '17', '79', '86'],
  "Provence-Alpes-Côte d'Azur": ['04', '05', '06', '13', '83', '84'],
  'Rhône-Alpes': ['01', '07', '26', '38', '42', '69', '73', '74'],
  Guadeloupe: ['971'],
  Martinique: ['972'],
  Guyane: ['973'],
  'La Réunion': ['974'],
  Mayotte: ['976'],
}

const PAR_DEPARTEMENT: Record<string, string> = Object.fromEntries(
  Object.entries(REGIONS).flatMap(([region, deps]) => deps.map((d) => [d, region])),
)

export const ANCIENNES_REGIONS: readonly string[] = Object.keys(REGIONS)

/** '07' -> 'Rhône-Alpes' ; inconnu -> null. */
export function ancienneRegion(codeDepartement: string | null | undefined): string | null {
  if (!codeDepartement) return null
  return PAR_DEPARTEMENT[codeDepartement.toUpperCase()] ?? null
}
