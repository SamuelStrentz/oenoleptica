import { describe, expect, it } from 'vitest'
import { nouvelleBase, vin } from './aide'
import { migrer } from '@/repositories/structure'
import { insererVin } from '@/repositories/vins'
import { insererVigneron, listerVignerons } from '@/repositories/vignerons'
import { repartir, tableauDeBord } from '@/repositories/statistiques'
import { lireVigneronsSql, vigneronsEnSql } from '@/domain/export-sql'
import { tousLesVignerons } from '@/repositories/vignerons'
import type { VinCave } from '@/domain/types'

const vigneron = (nom: string, domaine: string | null = null) => ({
  domaine, prenom: 'Jean', nom, mail: null, adresse: null, cp: null, ville: null,
  departement: 'Ardèche', region: 'Rhône-Alpes', pays: 'France',
})

/** Base « ancienne » : notes sur 10 / 20, vignerons sans colonne domaine, user_version 0. */
function ancienneBase() {
  const db = nouvelleBase()
  db.exec('PRAGMA user_version = 0')
  db.exec('ALTER TABLE vignerons DROP COLUMN domaine')
  db.exec("INSERT INTO vignerons (prenom, nom) VALUES ('Patrice', 'LIMOUSIN'), ('Anne', 'HENRIQUET')")
  for (const [g, d, n] of [[1, 'Domaine Cabarrouy', 8.1], [1, 'Domaine Cabarrouy', 16], [2, 'Domaine A', 86], [2, 'Domaine B', null]] as const) {
    db.run('INSERT INTO vins (id_vigneron, domaine) VALUES (?, ?)', [g, d])
    db.run('INSERT INTO avis (id_vin, note) VALUES (last_insert_rowid(), ?)', [n])
  }
  return db
}

describe('migration lot 6', () => {
  it('passe les notes sur 100 une seule fois et reprend le domaine des vignerons', () => {
    const db = ancienneBase()
    const faits = migrer(db)
    expect(faits).toContain('vignerons.domaine')
    expect(db.all<{ note: number | null }>('SELECT note FROM avis ORDER BY id_avis').map((r) => r.note)).toEqual([81, 80, 86, null])
    expect(db.valeur('PRAGMA user_version')).toBe(1)
    // un seul domaine → repris ; deux domaines → laissé vide
    expect(db.all('SELECT nom, domaine FROM vignerons ORDER BY id_vigneron'))
      .toEqual([{ nom: 'LIMOUSIN', domaine: 'Domaine Cabarrouy' }, { nom: 'HENRIQUET', domaine: null }])
    migrer(db)
    expect(db.all<{ note: number | null }>('SELECT note FROM avis ORDER BY id_avis').map((r) => r.note)).toEqual([81, 80, 86, null])
  })

  it('une base neuve est déjà sur 100 : rien n’est converti', () => {
    const db = nouvelleBase()
    insererVin(db, vin({ note: 12 }))
    expect(migrer(db)).toEqual([])
    expect(db.valeur('SELECT note FROM avis')).toBe(12)
  })
})

describe('vigneron : domaine', () => {
  it('est enregistré, affiché en premier dans la liste et passe par l’export / import SQL', () => {
    const db = nouvelleBase()
    const id = insererVigneron(db, vigneron('LIMOUSIN', 'Domaine Cabarrouy'))
    insererVin(db, vin({ vigneron_id: id, domaine: 'Clos Uroulat' }))
    expect(listerVignerons(db)[0].domaines).toBe('Domaine Cabarrouy, Clos Uroulat')
    const [lu] = lireVigneronsSql(vigneronsEnSql(tousLesVignerons(db)))
    expect(lu).toMatchObject({ domaine: 'Domaine Cabarrouy', nom: 'LIMOUSIN' })
  })

  it('un ancien export sans colonne domaine reste lisible', () => {
    const ancien = "INSERT INTO vignerons (prenom, nom, pays)\nSELECT 'Anne', 'HENRIQUET', 'France'\nWHERE NOT EXISTS (SELECT 1);"
    expect(lireVigneronsSql(ancien)).toEqual([expect.objectContaining({ domaine: null, prenom: 'Anne', nom: 'HENRIQUET' })])
  })
})

describe('statistiques', () => {
  it('répartit les bouteilles en cave et regroupe le reste dans « Autres »', () => {
    const vins = [3, 2, 1, 1].map((q, i) => ({ quantite: q, appellation: `A${i}` }) as VinCave)
    expect(repartir(vins, (v) => v.appellation, 3).map((p) => [p.libelle, p.bouteilles])).toEqual([['A0', 3], ['A1', 2], ['Autres', 2]])
  })

  it('tableau de bord : couleurs, départements, maturité, prix moyen', () => {
    const db = nouvelleBase()
    const g = insererVigneron(db, vigneron('ENGEL'))
    insererVin(db, vin({ quantite: 3, prix: 10, millesime: 2024, couleur: 'Rouge', appellation: 'Côtes du Rhône', vigneron_id: g }))
    insererVin(db, vin({ quantite: 1, prix: 30, millesime: 2005, couleur: 'Blanc', appellation: 'Sancerre', cepage: 'Sauvignon' }))
    insererVin(db, vin({ quantite: 0, couleur: 'Rosé' }))
    const tb = tableauDeBord(db, 2026)
    expect(tb.bouteilles).toBe(4)
    expect(tb.vins).toBe(2)
    expect(tb.prixMoyen).toBe(15)
    expect(tb.couleurs.map((p) => [p.libelle, p.bouteilles])).toEqual([['Rouge', 3], ['Blanc', 1]])
    expect(tb.departements.map((p) => p.libelle)).toEqual(['Ardèche', 'Non renseigné'])
    expect(tb.maturite.reduce((s, p) => s + p.bouteilles, 0)).toBe(4)
    // un Sancerre de 2005 est passé : il ressort en priorité
    expect(tb.prioritaires[0]).toMatchObject({ appellation: 'Sancerre', maturite: 'passe' })
  })
})
