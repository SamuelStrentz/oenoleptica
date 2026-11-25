/**
 * Cépages : le cépage d'un vin reste un texte « Gamay, Pinot noir » dans
 * vins.cepage (compatible avec l'appli desktop). La table cepages sert de
 * référence : suggestions de saisie + couleur des pastilles.
 */
export type TypeCepage = 'rouge' | 'blanc' | null

export const CEPAGES_DEFAUT: Record<'rouge' | 'blanc', readonly string[]> = {
  rouge: [
    'Cabernet sauvignon', 'Cabernet franc', 'Merlot', 'Malbec', 'Petit verdot',
    'Carmenère', 'Pinot noir', 'Gamay', 'Syrah', 'Grenache', 'Mourvèdre',
    'Cinsault', 'Carignan', 'Tannat', 'Négrette', 'Fer servadou', 'Mondeuse',
    'Poulsard', 'Trousseau', "Pineau d'Aunis", 'Counoise', 'Nebbiolo',
    'Sangiovese', 'Tempranillo', 'Zinfandel', 'Pinot meunier', 'Persan',
    'Gamaret', 'Garanoir', 'Braucol', 'Duras', 'Abouriou', 'Aglianico',
    'Barbera', 'Primitivo', 'Montepulciano',
  ],
  blanc: [
    'Chardonnay', 'Sauvignon blanc', 'Sauvignon gris', 'Chenin', 'Sémillon',
    'Muscadelle', 'Viognier', 'Marsanne', 'Roussanne', 'Riesling',
    'Gewurztraminer', 'Pinot gris', 'Pinot blanc', 'Muscat',
    'Muscat à petits grains', 'Melon de Bourgogne', 'Aligoté', 'Jacquère',
    'Altesse', 'Roussette', 'Gros manseng', 'Petit manseng', 'Petit courbu',
    'Camaralet', 'Lauzet', 'Courbu', 'Ugni blanc', 'Colombard',
    'Folle blanche', 'Clairette', 'Grenache blanc', 'Bourboulenc',
    'Vermentino', 'Picpoul', 'Savagnin', 'Mauzac', "Len de l'el",
    'Chasselas', 'Sylvaner', 'Auxerrois', 'Grüner Veltliner', 'Veltliner',
    'Verdejo', 'Albariño', 'Trebbiano', 'Cortese', 'Garganega',
  ],
}

/** 'Pinot  Noir' / 'pinot-noir' / 'Négrette' -> clé de comparaison. */
export function cleCepage(nom: string): string {
  return String(nom)
    .normalize('NFKD')
    .replace(/[^\x00-\x7f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** 'Gamay, Pinot noir / gamay' -> ['Gamay', 'Pinot noir'] (sans doublon). */
export function decouperCepages(texte: string | null | undefined): string[] {
  if (!texte) return []
  const vus = new Set<string>()
  const noms: string[] = []
  for (const brut of String(texte).split(/[,;/]+/)) {
    const morceau = brut.trim()
    const cle = cleCepage(morceau)
    if (morceau && !vus.has(cle)) {
      vus.add(cle)
      noms.push(morceau)
    }
  }
  return noms
}

export function majusculeInitiale(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}

/** Type d'un cépage d'après la couleur du vin ('Rouge' -> 'rouge'). */
export function typeDepuisCouleur(couleur: string | null | undefined): TypeCepage {
  const c = (couleur ?? '').toLowerCase()
  return c.startsWith('rouge') ? 'rouge' : c.startsWith('blanc') ? 'blanc' : null
}
