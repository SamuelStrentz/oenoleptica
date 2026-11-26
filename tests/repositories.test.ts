import { describe, expect, it } from 'vitest'
import { nouvelleBase, vin } from './aide'
import { ORDRES_CREATE } from '@/db/schema'
import { migrer, verifierStructure } from '@/repositories/structure'
import { effacerVin, insererVin, listerCave, statistiques } from '@/repositories/vins'
import { enregistrerMouvement, reglerStock, stockDe } from '@/repositories/stock'
import { insererVigneron, listerVignerons } from '@/repositories/vignerons'
import { lireCepages } from '@/repositories/cepages'
import { insererAvis } from '@/repositories/avis'
import { cleCepage, decouperCepages } from '@/domain/cepages'
import { nombre, prix } from '@/domain/parsers'

const vigneron = (nom: string, prenom: string | null = null) => ({
  domaine: null, prenom, nom, mail: null, adresse: null, cp: null, ville: null,
  departement: null, region: 'Rhône', pays: 'France',
})

describe('structure', () => {
  it('crée les 6 tables et les 2 triggers de master.db', () => {
    const db = nouvelleBase()
    const objets = db.all<{ type: string; name: string }>(
      "SELECT type, name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name")
    expect(objets.map((o) => `${o.type}:${o.name}`)).toEqual([
      'table:avis', 'table:cepages', 'table:degustations', 'table:mouvements_stock', 'table:profils_cepages', 'table:stock',
      'table:vignerons', 'table:vins',
      'trigger:trg_mouv_maj_stock', 'trigger:trg_vin_init_stock',
    ])
    expect(ORDRES_CREATE).toHaveLength(8)
    expect(Object.keys(lireCepages(db)).length).toBeGreaterThan(80)
    expect(() => verifierStructure(db)).not.toThrow()
  })

  it('refuse un fichier qui n’est pas une cave', () => {
    const db = nouvelleBase(false)
    db.exec('CREATE TABLE autre (x)')
    expect(() => verifierStructure(db)).toThrow(/vins/)
  })

  it('ajoute les colonnes manquantes d’une ancienne base', () => {
    const db = nouvelleBase(false)
    db.exec(`CREATE TABLE vignerons (id_vigneron INTEGER PRIMARY KEY, prenom TEXT, nom TEXT NOT NULL)`)
    db.exec(`CREATE TABLE vins (id_vin INTEGER PRIMARY KEY, id_vigneron INTEGER, domaine TEXT NOT NULL)`)
    expect(migrer(db)).toEqual(['vins.cuvee', 'vins.cru', 'vins.prix', 'vignerons.ville', 'vignerons.mail', 'vignerons.domaine', 'cepages', 'profils_cepages', 'degustations'])
    expect(migrer(db)).toEqual([])
  })
})

describe('vins', () => {
  it('ajout complet : vigneron, stock, mouvement, avis, cépage inconnu', () => {
    const db = nouvelleBase()
    const id = insererVin(db, vin({
      quantite: 6, note: 16.5, categorie: 'Coup de cœur',
      cepage: 'Grenache, Counoise noire',
      vigneron_nouveau: vigneron('Aubert', 'Michèle'),
    }), '2026-11-25')
    expect(stockDe(db, id)).toBe(6)
    expect(db.all('SELECT type_mouvement, quantite_mouvement, date_mouvement FROM mouvements_stock'))
      .toEqual([{ type_mouvement: 'entrée', quantite_mouvement: 6, date_mouvement: '2026-11-25' }])
    const [ligne] = listerCave(db)
    expect(ligne).toMatchObject({ id_vin: id, quantite: 6, note: 16.5, categories: 'Coup de cœur', region: 'Rhône' })
    expect(lireCepages(db)['Counoise noire']).toBe('rouge')
    expect(db.valeur('SELECT COUNT(*) FROM stock')).toBe(1)
  })

  it('ajout sans quantité : stock à 0, avis vide, aucun mouvement', () => {
    const db = nouvelleBase()
    const id = insererVin(db, vin())
    expect(stockDe(db, id)).toBe(0)
    expect(db.valeur('SELECT COUNT(*) FROM mouvements_stock')).toBe(0)
    expect(db.get('SELECT note, categorie FROM avis WHERE id_vin = ?', [id])).toEqual({ note: null, categorie: null })
  })

  it('tout ou rien : une erreur annule aussi le nouveau vigneron', () => {
    const db = nouvelleBase()
    expect(() => insererVin(db, vin({ vigneron_nouveau: vigneron('X'), vigneron_id: null, domaine: '  ' })))
      .toThrow(/domaine/)
    expect(() => insererVin(db, vin({ vigneron_nouveau: vigneron(''), domaine: 'D' }))).toThrow(/nom/)
    expect(db.valeur('SELECT COUNT(*) FROM vignerons')).toBe(0)
    expect(db.valeur('SELECT COUNT(*) FROM vins')).toBe(0)
  })

  it('fonctionne sans les triggers (base ancienne)', () => {
    const db = nouvelleBase()
    db.exec('DROP TRIGGER trg_vin_init_stock; DROP TRIGGER trg_mouv_maj_stock')
    const id = insererVin(db, vin({ quantite: 3 }))
    expect(stockDe(db, id)).toBe(3)
    expect(reglerStock(db, id, 1, '2026-11-25')).toBe(1)
  })

  it('suppression en cascade', () => {
    const db = nouvelleBase()
    const id = insererVin(db, vin({ quantite: 2, note: 15 }))
    effacerVin(db, id)
    for (const t of ['vins', 'stock', 'avis', 'mouvements_stock']) {
      expect(db.valeur(`SELECT COUNT(*) FROM ${t}`)).toBe(0)
    }
  })
})

describe('stock', () => {
  it('reglerStock trace une entrée ou une sortie de l’écart', () => {
    const db = nouvelleBase()
    const id = insererVin(db, vin({ quantite: 2 }))
    expect(reglerStock(db, id, 5, '2026-11-25')).toBe(5)
    expect(reglerStock(db, id, 1, '2026-11-26')).toBe(1)
    expect(reglerStock(db, id, 1, '2026-11-26')).toBe(1) // rien à faire
    expect(db.all('SELECT type_mouvement AS t, quantite_mouvement AS q FROM mouvements_stock ORDER BY id_mouv'))
      .toEqual([{ t: 'entrée', q: 2 }, { t: 'entrée', q: 3 }, { t: 'sortie', q: 4 }])
  })

  it('refuse un stock négatif sans rien écrire', () => {
    const db = nouvelleBase()
    const id = insererVin(db, vin({ quantite: 1 }))
    expect(() => enregistrerMouvement(db, id, 'sortie', 3, '2026-11-25')).toThrow(/insuffisant/)
    expect(() => reglerStock(db, id, -1, '2026-11-25')).toThrow()
    expect(db.valeur('SELECT COUNT(*) FROM mouvements_stock')).toBe(1)
  })

  it('statistiques', () => {
    const db = nouvelleBase()
    insererVin(db, vin({ quantite: 3, prix: 10 }))
    insererVin(db, vin({ quantite: 0, prix: 50 }))
    expect(statistiques(db)).toEqual({ vins: 2, vins_en_stock: 1, bouteilles: 3, vignerons: 0, valeur: 30 })
  })
})

describe('vignerons et avis', () => {
  it('liste avec domaines et homonymes distingués', () => {
    const db = nouvelleBase()
    const a = insererVigneron(db, vigneron('Durand', 'Paul'))
    const b = insererVigneron(db, vigneron('Durand', 'Paul'))
    insererVin(db, vin({ vigneron_id: a, domaine: 'Clos B', quantite: 2 }))
    insererVin(db, vin({ vigneron_id: a, domaine: 'Clos A' }))
    const [va, vb] = listerVignerons(db)
    expect(va).toMatchObject({ id_vigneron: a, libelle: 'Paul Durand', domaines: 'Clos A, Clos B', nb_vins: 2, bouteilles: 2 })
    expect(vb.libelle).toBe(`Paul Durand (n°${b})`)
  })

  it('insererAvis remplit la ligne vide au lieu d’en créer une autre', () => {
    const db = nouvelleBase()
    const id = insererVin(db, vin())
    insererAvis(db, id, 17, 'Garde')
    insererAvis(db, id, 14, null)
    expect(db.all('SELECT note FROM avis WHERE id_vin = ? ORDER BY id_avis', [id])).toEqual([{ note: 17 }, { note: 14 }])
  })
})

describe('saisies', () => {
  it('cépages : découpe, dédoublonnage et clé sans accent', () => {
    expect(decouperCepages('Gamay, Pinot noir / gamay ;')).toEqual(['Gamay', 'Pinot noir'])
    expect(cleCepage('  Négrette-Noire ')).toBe('negrette noire')
  })
  it('nombres et prix à la française', () => {
    expect(nombre('13,5 %', 'Alcool', { max: 100 })).toBe(13.5)
    expect(nombre('', 'X')).toBeNull()
    expect(() => nombre('2020,5', 'Le millésime', { entier: true })).toThrow(/valide/)
    expect(() => nombre('1700', 'Le millésime', { entier: true, min: 1800 })).toThrow(/1800/)
    expect(prix('7,30 €')).toBe(7.3)
  })
})
