/**
 * Profils organoleptiques « types » des cépages (table profils_cepages).
 *
 * Ce sont des repères généraux : le profil réel d'un vin dépend aussi du
 * terroir, du millésime et de la vinification. Les valeurs sont modifiables
 * dans la base (DB Browser, ou plus tard depuis l'appli).
 *
 * Format d'une ligne (séparateur « | ») :
 *   nom | couleur de robe | densité de robe | arômes (nez) | arômes rétro-olfactifs
 *   | attaque | milieu de bouche | finale | texture | longueur
 *   | acidité 1-5 | tanins 0-5 | sucrosité 1-5 | corps 1-5 | garde
 */

export interface ProfilCepage {
  robe_couleur: string
  robe_intensite: string
  aromes_nez: string
  aromes_bouche: string
  attaque: string
  milieu_bouche: string
  finale: string
  texture: string
  longueur: string
  acidite: number
  tanins: number
  sucrosite: number
  corps: number
  garde: string
}

export const ORDRE_CREATE_PROFILS = `CREATE TABLE profils_cepages (
    id_profil       INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cepage       INTEGER NOT NULL UNIQUE REFERENCES cepages(id_cepage) ON DELETE CASCADE,
    robe_couleur    TEXT,
    robe_intensite  TEXT,
    aromes_nez      TEXT,
    aromes_bouche   TEXT,
    attaque         TEXT,
    milieu_bouche   TEXT,
    finale          TEXT,
    texture         TEXT,
    longueur        TEXT,
    acidite         INTEGER CHECK (acidite BETWEEN 1 AND 5),
    tanins          INTEGER CHECK (tanins BETWEEN 0 AND 5),
    sucrosite       INTEGER CHECK (sucrosite BETWEEN 1 AND 5),
    corps           INTEGER CHECK (corps BETWEEN 1 AND 5),
    garde           TEXT
)`

const DONNEES = `
Cabernet sauvignon | grenat profond à reflets violacés | profonde | cassis, poivron vert, cèdre, menthe | cassis, graphite, boîte à cigares | franche et structurée | charpenté, fruit noir serré | tannique, légèrement herbacée | ferme, tanins serrés | longue | 4 | 5 | 1 | 4 | 10 à 25 ans
Cabernet franc | rubis à reflets violets | moyenne | framboise, violette, poivron, graphite | fruits rouges, crayon, herbe fraîche | fraîche et fruitée | souple, digeste | fraîche, légèrement végétale | soyeuse | moyenne | 4 | 3 | 1 | 3 | 5 à 15 ans
Merlot | rubis à grenat | soutenue | prune, cerise noire, mûre, truffe | prune mûre, chocolat, épices douces | ronde et charnue | gourmand, fruit mûr | souple, tanins enrobés | veloutée | moyenne à longue | 3 | 3 | 1 | 4 | 5 à 15 ans
Malbec | pourpre très sombre, reflets violets | profonde | mûre, prune, violette, réglisse | fruits noirs, cacao, épices | dense | puissant, fruit noir | tannique, réglissée | ample, tanins mûrs | longue | 3 | 4 | 1 | 4 | 8 à 20 ans
Petit verdot | pourpre noir | profonde | violette, mûre, épices, encre | fruits noirs, poivre, cèdre | vive | dense et structuré | tannique et épicée | ferme | longue | 4 | 5 | 1 | 4 | 10 à 25 ans
Carmenère | grenat sombre | soutenue | poivron rouge, cassis, épices, paprika | fruits noirs, poivre, fumé | souple | charnu | épicée, légèrement végétale | souple | moyenne | 3 | 3 | 1 | 3 | 5 à 10 ans
Pinot noir | rubis clair, translucide | légère | cerise, framboise, sous-bois, rose | griotte, champignon, épices douces | délicate et fraîche | élégant, aérien | fine, saline | soyeuse | longue | 4 | 2 | 1 | 2 | 5 à 20 ans
Gamay | violacé brillant | légère | fraise, framboise, banane, pivoine | fruits rouges croquants, poivre | vive et fruitée | léger, gouleyant | fraîche, peu tannique | fluide | courte à moyenne | 4 | 2 | 1 | 2 | 2 à 8 ans
Syrah | pourpre à reflets violets | profonde | violette, mûre, poivre noir, olive noire | fruits noirs, poivre, fumé, lard | franche | dense, épicé | poivrée, tanins fins | serrée et veloutée | longue | 3 | 4 | 1 | 4 | 8 à 20 ans
Grenache | rubis à grenat, tuile vite | moyenne | fraise cuite, garrigue, réglisse, épices | fruits rouges confits, poivre blanc | ronde, chaleureuse | généreux, alcooleux | chaude, épicée | ample | moyenne | 2 | 2 | 1 | 4 | 5 à 15 ans
Mourvèdre | grenat très sombre | profonde | mûre, cuir, garrigue, gibier | fruits noirs, viande, réglisse | serrée | puissant, animal | tannique, épicée | ferme puis veloutée | longue | 3 | 5 | 1 | 5 | 10 à 25 ans
Cinsault | rubis clair | légère | fraise, cerise, fleurs, amande | fruits rouges frais | légère | souple, fruité | fraîche | fluide | courte | 3 | 2 | 1 | 2 | 2 à 5 ans
Carignan | grenat sombre | soutenue | fruits noirs, garrigue, réglisse, épices | cerise noire, poivre | vive | rustique, charpenté | tannique, acidulée | ferme | moyenne | 4 | 4 | 1 | 3 | 5 à 15 ans
Tannat | noir violacé | profonde | mûre, cassis, réglisse, épices | fruits noirs, cacao, café | puissante | très structuré | très tannique | serrée, astringente jeune | longue | 4 | 5 | 1 | 5 | 10 à 30 ans
Négrette | rubis violacé | moyenne | violette, réglisse, fruits rouges, poivre | fruits rouges, réglisse | souple | fruité, floral | légèrement amère | souple | moyenne | 3 | 2 | 1 | 3 | 2 à 6 ans
Fer servadou | rubis soutenu | soutenue | cassis, framboise, poivron, épices | fruits rouges acidulés, poivre | fraîche | fruité, végétal | tannique, fraîche | ferme | moyenne | 4 | 3 | 1 | 3 | 3 à 10 ans
Mondeuse | pourpre violacé | soutenue | violette, cerise noire, poivre, épices | fruits noirs, poivre | vive | frais, épicé | poivrée, tanins fermes | ferme | moyenne | 4 | 3 | 1 | 3 | 5 à 15 ans
Poulsard | rubis très pâle, presque rosé | légère | groseille, fraise des bois, sous-bois, épices | fruits rouges légers, terre | délicate | léger, aérien | fraîche | fluide | moyenne | 3 | 1 | 1 | 1 | 3 à 10 ans
Trousseau | rubis clair | légère | griotte, fruits rouges, épices, sous-bois | fruits rouges, poivre | vive | frais, digeste | épicée | fine | moyenne | 4 | 2 | 1 | 2 | 5 à 15 ans
Pineau d'Aunis | rubis pâle | légère | poivre blanc, fruits rouges, épices | poivre, framboise | fraîche | léger, épicé | poivrée | fluide | moyenne | 4 | 2 | 1 | 2 | 3 à 8 ans
Counoise | rubis | moyenne | fruits rouges, poivre, épices | fruits rouges, poivre | fraîche | souple | épicée | souple | moyenne | 3 | 2 | 1 | 2 | 3 à 8 ans
Nebbiolo | grenat clair à reflets orangés | légère | rose, goudron, cerise, réglisse | cerise, truffe, épices | austère | tendu, structuré | très tannique, acide | ferme, tanins serrés | très longue | 5 | 5 | 1 | 4 | 15 à 30 ans
Sangiovese | rubis | moyenne | cerise acidulée, tomate, herbes, thé | griotte, herbes séchées | vive | tendu, fruité | tannique et acide | ferme | moyenne à longue | 5 | 4 | 1 | 3 | 5 à 20 ans
Tempranillo | rubis à grenat | soutenue | cerise, prune, tabac, cuir | fruits rouges, vanille, cuir | souple | équilibré | tanins moyens | souple | moyenne à longue | 3 | 3 | 1 | 3 | 5 à 20 ans
Zinfandel | grenat sombre | soutenue | confiture de fruits rouges, épices, poivre | fruits confits, épices | ronde et chaleureuse | riche | épicée | ample | moyenne | 3 | 3 | 1 | 4 | 3 à 10 ans
Pinot meunier | rubis clair | légère | fruits rouges, pomme, pain | fruits rouges frais | souple | fruité | fraîche | souple | courte à moyenne | 3 | 1 | 1 | 2 | 2 à 6 ans
Persan | grenat sombre | soutenue | cassis, violette, épices | fruits noirs, poivre | vive | structuré | tannique, acide | ferme | longue | 4 | 4 | 1 | 3 | 10 à 20 ans
Gamaret | pourpre sombre | profonde | cerise noire, mûre, épices | fruits noirs, poivre | ample | charnu | tanins marqués | ferme | moyenne | 3 | 4 | 1 | 3 | 5 à 10 ans
Garanoir | pourpre | soutenue | cerise, fruits noirs, épices douces | fruits noirs | souple | fruité | peu tannique | souple | courte | 3 | 2 | 1 | 2 | 2 à 5 ans
Duras | rubis soutenu | soutenue | fruits rouges, poivre, épices | poivre, fruits rouges | fraîche | souple, épicé | poivrée | souple | moyenne | 3 | 3 | 1 | 3 | 3 à 8 ans
Abouriou | pourpre sombre | profonde | fruits noirs, épices | fruits noirs | ample | charnu | tanins présents | ferme | moyenne | 3 | 4 | 1 | 3 | 3 à 8 ans
Aglianico | grenat profond | profonde | cerise noire, prune, cuir, fumé | fruits noirs, minéral | puissante | austère, structuré | très tannique, acide | ferme | longue | 5 | 5 | 1 | 4 | 10 à 25 ans
Barbera | rubis violacé | soutenue | cerise, prune, fruits rouges | cerise acidulée | vive | fruité, tendu | acide, peu tannique | souple | moyenne | 5 | 2 | 1 | 3 | 3 à 10 ans
Montepulciano | pourpre sombre | profonde | prune, cerise noire, épices | fruits noirs, réglisse | ronde | charnu | tanins mûrs | souple | moyenne | 3 | 3 | 1 | 4 | 3 à 10 ans
Chardonnay | or pâle à doré | moyenne | pomme, agrumes, beurre, noisette, brioche | fruits blancs, beurre frais, toasté si élevé en fût | ample | gras, rond | minérale à beurrée | grasse | longue | 3 | 0 | 1 | 3 | 3 à 15 ans
Sauvignon blanc | jaune pâle à reflets verts | légère | buis, bourgeon de cassis, agrumes, fruit de la passion | pamplemousse, herbe coupée | vive | tendu, aromatique | fraîche, minérale | fluide | moyenne | 5 | 0 | 1 | 2 | 1 à 5 ans
Sauvignon gris | jaune pâle à reflets gris-rosés | légère | agrumes, fruits exotiques, fleurs | agrumes, poivre blanc | fraîche | plus ample que le sauvignon blanc | fraîche | ronde | moyenne | 4 | 0 | 1 | 2 | 2 à 5 ans
Chenin | jaune paille à or | moyenne | coing, pomme, miel, tilleul, cire | coing, fruits secs, miel | vive | tendu, minéral | acidité saline | ample et tendue | longue | 5 | 0 | 2 | 3 | 5 à 30 ans
Sémillon | or pâle | moyenne | cire, miel, agrumes confits, abricot | fruits confits, cire | ronde | gras | douce | onctueuse | longue | 2 | 0 | 2 | 3 | 5 à 30 ans
Muscadelle | jaune pâle | légère | fleurs, muscat léger, miel | fleurs blanches | souple | aromatique | douce | ronde | courte | 2 | 0 | 2 | 2 | 2 à 5 ans
Viognier | or soutenu | soutenue | abricot, pêche, violette, fleurs blanches | abricot, épices douces | ample | gras, opulent | légèrement amère | onctueuse | moyenne | 2 | 0 | 1 | 4 | 2 à 8 ans
Marsanne | jaune doré | moyenne | amande, poire, miel, acacia | fruits blancs mûrs, amande | ronde | ample, gras | légère amertume | grasse | moyenne | 2 | 0 | 1 | 4 | 3 à 15 ans
Roussanne | or pâle | moyenne | tilleul, abricot, miel, poire | fruits jaunes, miel | fraîche puis ample | élégant | fraîche | ronde | longue | 3 | 0 | 1 | 3 | 3 à 15 ans
Riesling | jaune pâle à reflets verts | légère | citron vert, fleurs blanches, pêche, notes pétrolées avec l'âge | agrumes, minéral, hydrocarbure | tranchante | tendu, cristallin | très minérale | fine | très longue | 5 | 0 | 2 | 2 | 5 à 30 ans
Gewurztraminer | or soutenu | soutenue | rose, litchi, épices, mangue | litchi, gingembre | ample | opulent, exotique | épicée, légèrement amère | grasse, huileuse | longue | 2 | 0 | 3 | 4 | 3 à 15 ans
Pinot gris | or à reflets cuivrés | moyenne | fruits jaunes, fumé, miel, sous-bois | poire, fumé | ample | riche | légèrement fumée | grasse | longue | 3 | 0 | 2 | 4 | 3 à 15 ans
Pinot blanc | jaune pâle | légère | pomme, poire, fleurs blanches | fruits blancs | souple | rond, discret | fraîche | souple | courte à moyenne | 3 | 0 | 1 | 2 | 2 à 5 ans
Muscat | jaune pâle à doré | moyenne | raisin frais, fleurs, agrumes | raisin, rose | aromatique | fruité, expressif | parfois douce | ronde | moyenne | 3 | 0 | 3 | 2 | 1 à 5 ans
Muscat à petits grains | or | moyenne | raisin, fleur d'oranger, rose, miel | raisin muscat, agrumes confits | ample | aromatique intense | sucrée en VDN, sèche sinon | onctueuse | moyenne | 3 | 0 | 4 | 3 | 2 à 10 ans
Melon de Bourgogne | jaune très pâle, reflets verts | légère | iode, citron, pomme verte, fleurs | agrumes, notes salines | vive | léger, tendu | saline, iodée | fluide | courte à moyenne | 4 | 0 | 1 | 1 | 1 à 8 ans
Aligoté | jaune pâle | légère | citron, pomme verte, aubépine | agrumes, minéral | vive | tendu | acidulée | fluide | courte | 5 | 0 | 1 | 2 | 1 à 5 ans
Jacquère | jaune très pâle | légère | agrumes, fleurs blanches, pierre à fusil | citron, minéral | vive | léger | fraîche, perlante | fluide | courte | 4 | 0 | 1 | 1 | 1 à 3 ans
Altesse | jaune pâle à doré | moyenne | bergamote, amande, miel, fruits secs | agrumes, noisette | fraîche | ample, tendu | minérale | ronde | longue | 4 | 0 | 1 | 3 | 5 à 15 ans
Gros manseng | jaune doré | moyenne | fruits exotiques, agrumes, épices | ananas, pamplemousse | vive | aromatique | fraîche | ronde | moyenne | 5 | 0 | 2 | 3 | 2 à 8 ans
Petit manseng | or soutenu | soutenue | ananas, mangue, miel, épices | fruits exotiques confits, agrumes | ample | riche, acidité vive | longue, acidulée | onctueuse | très longue | 5 | 0 | 4 | 4 | 10 à 30 ans
Petit courbu | jaune pâle | légère | agrumes, miel, fleurs | agrumes | souple | ample | douce | ronde | moyenne | 3 | 0 | 1 | 3 | 2 à 8 ans
Camaralet | jaune pâle | légère | épices, cannelle, fleurs | fruits blancs, épices | fraîche | discret | épicée | souple | moyenne | 3 | 0 | 1 | 2 | 2 à 6 ans
Lauzet | jaune pâle | légère | agrumes, fleurs, fruits blancs | agrumes | vive | tendu | fraîche | fluide | moyenne | 4 | 0 | 1 | 2 | 2 à 6 ans
Ugni blanc | jaune très pâle | légère | citron, pomme verte | agrumes | vive | léger, neutre | acidulée | fluide | courte | 5 | 0 | 1 | 1 | 1 à 3 ans
Colombard | jaune pâle | légère | agrumes, fruits exotiques, buis | pamplemousse, fruits exotiques | vive | aromatique | fraîche | fluide | courte | 4 | 0 | 1 | 2 | 1 à 3 ans
Folle blanche | jaune très pâle | légère | citron, fleurs, iode | agrumes | très vive | léger | acide | fluide | courte | 5 | 0 | 1 | 1 | 1 à 3 ans
Clairette | jaune pâle | légère | pomme, fenouil, fleurs blanches | fruits blancs, anis | souple | rond | légère amertume | souple | courte | 2 | 0 | 1 | 2 | 1 à 4 ans
Grenache blanc | jaune doré | moyenne | poire, fruits blancs, anis, fenouil | fruits blancs mûrs | ronde | ample, chaleureux | douce | grasse | moyenne | 2 | 0 | 1 | 4 | 2 à 8 ans
Bourboulenc | jaune pâle | légère | agrumes, fleurs, notes fumées | citron, iode | fraîche | léger | saline | fluide | moyenne | 4 | 0 | 1 | 2 | 2 à 6 ans
Vermentino | jaune pâle, reflets verts | légère | agrumes, herbes, amande, fleurs | citron, amande amère | fraîche | aromatique | amertume fine, saline | souple | moyenne | 4 | 0 | 1 | 2 | 1 à 5 ans
Picpoul | jaune pâle, reflets verts | légère | citron, pomme verte, iode | agrumes, salin | vive | tendu | saline | fluide | courte | 5 | 0 | 1 | 1 | 1 à 3 ans
Savagnin | jaune doré à or | soutenue | noix, curry, pomme, épices (vin jaune) | noix, morille | tranchante | tendu, oxydatif | très saline | ferme | très longue | 5 | 0 | 1 | 3 | 10 à 50 ans
Mauzac | jaune pâle | légère | pomme, poire, fruits secs | pomme | fraîche | fruité | fraîche | souple | courte | 3 | 0 | 2 | 2 | 1 à 5 ans
Len de l'el | jaune doré | moyenne | fruits mûrs, miel, fleurs | fruits jaunes | ronde | ample | douce | ronde | moyenne | 2 | 0 | 2 | 3 | 2 à 8 ans
Chasselas | jaune très pâle | légère | tilleul, fleurs blanches, pierre à fusil | fruits blancs, minéral | souple | léger, délicat | perlante | fluide | courte | 3 | 0 | 1 | 1 | 1 à 5 ans
Sylvaner | jaune pâle, reflets verts | légère | herbe, pomme verte, agrumes | agrumes, végétal | vive | léger | fraîche | fluide | courte | 4 | 0 | 1 | 2 | 1 à 5 ans
Auxerrois | jaune pâle | légère | poire, fruits blancs, miel | fruits blancs | souple | rond | douce | ronde | courte | 2 | 0 | 1 | 2 | 1 à 5 ans
Grüner Veltliner | jaune pâle, reflets verts | légère | poivre blanc, pomme verte, lentille, agrumes | poivre blanc, agrumes | vive | tendu, épicé | poivrée | fine | moyenne | 4 | 0 | 1 | 3 | 2 à 10 ans
Verdejo | jaune pâle à reflets verts | légère | fenouil, herbe, agrumes, amande | agrumes, amande amère | fraîche | aromatique | amertume fine | souple | moyenne | 4 | 0 | 1 | 2 | 1 à 5 ans
Albariño | jaune pâle | légère | pêche, abricot, agrumes, iode | agrumes, salin | vive | aromatique | saline | fluide | moyenne | 4 | 0 | 1 | 2 | 1 à 5 ans
Trebbiano | jaune très pâle | légère | citron, amande, fleurs | agrumes | vive | neutre | légère amertume | fluide | courte | 4 | 0 | 1 | 1 | 1 à 3 ans
Cortese | jaune pâle | légère | pomme verte, citron, amande | agrumes | vive | léger | fraîche | fluide | courte | 4 | 0 | 1 | 2 | 1 à 4 ans
Garganega | jaune paille | légère | amande, pêche blanche, fleurs, citron | amande, fruits blancs | fraîche | délicat | amande amère | souple | moyenne | 3 | 0 | 1 | 2 | 2 à 8 ans
`

/** Synonymes : même profil que le cépage de référence. */
const SYNONYMES: Record<string, string> = {
  Braucol: 'Fer servadou',
  Primitivo: 'Zinfandel',
  Roussette: 'Altesse',
  Veltliner: 'Grüner Veltliner',
  Courbu: 'Petit courbu',
}

function lire(): Record<string, ProfilCepage> {
  const profils: Record<string, ProfilCepage> = {}
  for (const ligne of DONNEES.trim().split('\n')) {
    const c = ligne.split('|').map((x) => x.trim())
    if (c.length !== 15) throw new Error(`Profil mal formé : ${ligne}`)
    const [nom, robe_couleur, robe_intensite, aromes_nez, aromes_bouche, attaque, milieu_bouche,
      finale, texture, longueur, acidite, tanins, sucrosite, corps, garde] = c
    profils[nom] = {
      robe_couleur, robe_intensite, aromes_nez, aromes_bouche, attaque, milieu_bouche, finale,
      texture, longueur, garde,
      acidite: Number(acidite), tanins: Number(tanins), sucrosite: Number(sucrosite), corps: Number(corps),
    }
  }
  for (const [syn, ref] of Object.entries(SYNONYMES)) profils[syn] = profils[ref]
  return profils
}

export const PROFILS_INITIAUX: Readonly<Record<string, ProfilCepage>> = lire()

export const COLONNES_PROFIL = [
  'robe_couleur', 'robe_intensite', 'aromes_nez', 'aromes_bouche', 'attaque', 'milieu_bouche',
  'finale', 'texture', 'longueur', 'acidite', 'tanins', 'sucrosite', 'corps', 'garde',
] as const satisfies readonly (keyof ProfilCepage)[]
