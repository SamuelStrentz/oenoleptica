import { describe, expect, it } from 'vitest'
import { nouvelleBase, vin } from './aide'
import { CEPAGES_INITIAUX } from '@/db/schema'
import { PROFILS_INITIAUX } from '@/db/profils-cepages'
import { insererVin, lireDetailVin, majVin } from '@/repositories/vins'
import { historique, reglerStock } from '@/repositories/stock'
import {
  catalogueVigneron, compterLiensVigneron, effacerVigneron, insererVigneron, lireVigneron, majVigneron,
} from '@/repositories/vignerons'
import { definirAvis } from '@/repositories/avis'
import { ancienneRegion, ANCIENNES_REGIONS } from '@/domain/regions'

const vigneron = (nom: string) => ({
  domaine: null, prenom: null, nom, mail: null, adresse: null, cp: '07200', ville: 'Aubenas',
  departement: 'Ardèche', region: 'Rhône-Alpes', pays: 'France',
})

describe('profils organoleptiques', () => {
  it('chaque cépage usuel a un profil type', () => {
    const sansProfil = CEPAGES_INITIAUX.map(([n]) => n).filter((n) => !PROFILS_INITIAUX[n])
    expect(sansProfil).toEqual([])
    const db = nouvelleBase()
    expect(db.valeur('SELECT COUNT(*) FROM profils_cepages')).toBe(CEPAGES_INITIAUX.length)
  })

  it('fiche vin : cépages avec type et profil, y compris un cépage inconnu', () => {
    const db = nouvelleBase()
    const id = insererVin(db, vin({ cepage: 'syrah, Grenache, Cépage mystère', quantite: 2, note: 15 }))
    const d = lireDetailVin(db, id)
    expect(d.cepages.map((c) => [c.nom, c.type, c.profil?.tanins ?? null])).toEqual([
      ['syrah', 'rouge', 4], ['Grenache', 'rouge', 2], ['Cépage mystère', 'rouge', null],
    ])
    expect(d.mouvements).toHaveLength(1)
    expect(d.avis).toEqual([{ note: 15, categorie: null }])
  })
})

describe('modification', () => {
  it('majVin + definirAvis', () => {
    const db = nouvelleBase()
    const id = insererVin(db, vin())
    majVin(db, id, null, { ...vin(), domaine: 'Autre domaine', prix: 22 })
    definirAvis(db, id, 17, 'Garde')
    const d = lireDetailVin(db, id)
    expect(d.vin).toMatchObject({ domaine: 'Autre domaine', prix: 22, note: 17, categories: 'Garde' })
  })
})

describe('historique', () => {
  it('entrées et sorties, les plus récentes d’abord, avec le vin', () => {
    const db = nouvelleBase()
    const id = insererVin(db, vin({ quantite: 6 }), '2026-10-01')
    reglerStock(db, id, 4, '2026-11-20')
    const h = historique(db)
    expect(h.map((m) => [m.date_mouvement, m.type_mouvement, m.quantite_mouvement, m.domaine, m.prix])).toEqual([
      ['2026-11-20', 'sortie', 2, 'Domaine Gramenon', 18.5],
      ['2026-10-01', 'entrée', 6, 'Domaine Gramenon', 18.5],
    ])
  })
})

describe('vignerons', () => {
  it('modifier, catalogue, supprimer en cascade', () => {
    const db = nouvelleBase()
    const g = insererVigneron(db, vigneron('Aubert'))
    majVigneron(db, g, { ...vigneron('Aubert'), prenom: 'Michèle', mail: 'm@exemple.fr' })
    expect(lireVigneron(db, g)).toMatchObject({ prenom: 'Michèle', mail: 'm@exemple.fr' })
    const a = insererVin(db, vin({ vigneron_id: g, millesime: 2022, quantite: 3, note: 14 }))
    insererVin(db, vin({ vigneron_id: g, millesime: 2020 }))
    expect(catalogueVigneron(db, g).map((l) => [l.millesime, l.quantite])).toEqual([[2020, 0], [2022, 3]])
    expect(compterLiensVigneron(db, g)).toEqual({ vins: 2, stock: 3, avis: 1, mouvements: 1 })
    effacerVigneron(db, g)
    expect(db.valeur('SELECT COUNT(*) FROM vins')).toBe(0)
    expect(db.valeur('SELECT COUNT(*) FROM stock WHERE id_vin = ?', [a])).toBe(0)
  })
})

describe('anciennes régions', () => {
  it('96 départements métropolitains + DOM', () => {
    expect(ancienneRegion('07')).toBe('Rhône-Alpes')
    expect(ancienneRegion('64')).toBe('Aquitaine')
    expect(ancienneRegion('2a')).toBe('Corse')
    expect(ancienneRegion('974')).toBe('La Réunion')
    expect(ancienneRegion('99')).toBeNull()
    const metro = Array.from({ length: 95 }, (_, i) => String(i + 1).padStart(2, '0'))
      .filter((d) => d !== '20').concat(['2A', '2B'])
    expect(metro.filter((d) => !ancienneRegion(d))).toEqual([])
    expect(ANCIENNES_REGIONS).toHaveLength(27)
  })
})

describe('dégustations', () => {
  it('enregistre, alimente l’avis, retire une bouteille, se supprime avec le vin', async () => {
    const { insererDegustation, degustationsDuVin } = await import('@/repositories/degustations')
    const { profilDuVin } = await import('@/repositories/profil')
    const { effacerVin } = await import('@/repositories/vins')
    const { stockDe } = await import('@/repositories/stock')
    const db = nouvelleBase()
    const id = insererVin(db, vin({ quantite: 2, cepage: 'Syrah', couleur: 'Rouge', appellation: 'Crozes-Hermitage' }), '2026-01-01')
    const vide = { teinte: null, intensite_robe: null, intensite_nez: null, sucre: null, acidite: null, amertume: null,
      salinite: null, alcool: null, tanins: null, corps: null, effervescence: null, longueur: null, conclusion: null, commentaire: null }
    insererDegustation(db, { ...vide, id_vin: id, date_degustation: '2026-11-20', aromes: { violette: 1, poivre: 0.5 },
      tanins: 4.5, note: 16 }, true)
    expect(stockDe(db, id)).toBe(1)
    const [d] = degustationsDuVin(db, id)
    expect(d.aromes).toEqual({ violette: 1, poivre: 0.5 })
    expect(db.get('SELECT note FROM avis WHERE id_vin = ?', [id])).toEqual({ note: 16 })
    const p = profilDuVin(db, id, 2026)
    expect(p.couches).toContain('Ton palais')
    effacerVin(db, id)
    expect(db.valeur('SELECT COUNT(*) FROM degustations')).toBe(0)
  })
})

describe('export SQL des vignerons', () => {
  it('script rejouable, apostrophes protégées, sans doublon', async () => {
    const { vigneronsEnSql } = await import('@/domain/export-sql')
    const { tousLesVignerons } = await import('@/repositories/vignerons')
    const source = nouvelleBase()
    insererVigneron(source, { ...vigneron("D'Arenberg"), prenom: 'Chester', mail: null })
    insererVigneron(source, { ...vigneron('Aubert'), prenom: null })
    const sql = vigneronsEnSql(tousLesVignerons(source))
    expect(sql).toContain("'D''Arenberg'")
    const cible = nouvelleBase()
    insererVigneron(cible, { ...vigneron('Aubert'), prenom: null }) // déjà présent
    cible.exec(sql)
    cible.exec(sql) // rejoué : rien de plus
    expect(cible.all('SELECT prenom, nom, ville, region FROM vignerons ORDER BY nom')).toEqual([
      { prenom: null, nom: 'Aubert', ville: 'Aubenas', region: 'Rhône-Alpes' },
      { prenom: 'Chester', nom: "D'Arenberg", ville: 'Aubenas', region: 'Rhône-Alpes' },
    ])
  })
})

describe('import SQL des vignerons', () => {
  it('relit l’export, ignore les doublons et n’exécute jamais le SQL du fichier', async () => {
    const { vigneronsEnSql, lireVigneronsSql } = await import('@/domain/export-sql')
    const { tousLesVignerons, importerVignerons } = await import('@/repositories/vignerons')
    const source = nouvelleBase()
    insererVigneron(source, { ...vigneron("D'Arenberg"), prenom: 'Chester' })
    insererVigneron(source, { ...vigneron('Aubert'), prenom: null, mail: 'a@b.fr' })
    const lus = lireVigneronsSql(vigneronsEnSql(tousLesVignerons(source)))
    expect(lus.map((v) => [v.prenom, v.nom, v.mail])).toEqual([[null, 'Aubert', 'a@b.fr'], ['Chester', "D'Arenberg", null]])
    const cible = nouvelleBase()
    insererVigneron(cible, { ...vigneron('Aubert'), prenom: null })
    expect(importerVignerons(cible, lus)).toEqual({ ajoutes: 1, ignores: 1 })
    const piege = "DROP TABLE vins; INSERT INTO vignerons (nom) SELECT 'X'); DROP TABLE stock; -- WHERE NOT EXISTS"
    expect(lireVigneronsSql(piege)).toEqual([])
    expect(lireVigneronsSql('bonjour')).toEqual([])
  })
})
