import { describe, expect, it } from 'vitest'
import { calculerProfil } from '@/domain/profil/moteur'
import { corrections, type Observation } from '@/domain/profil/apprentissage'
import { aromesDepuisTexte } from '@/domain/profil/aromes'
import { trouverAppellation } from '@/domain/profil/connaissances/appellations'
import { CRITERES, motPour, type Critere } from '@/domain/profil/echelles'
import { PROFILS_INITIAUX } from '@/db/profils-cepages'
import type { EntreeProfil } from '@/domain/profil/types'

const cep = (nom: string, type: 'rouge' | 'blanc' = 'blanc') => ({ nom, type, profil: { ...PROFILS_INITIAUX[nom] } })
const entree = (e: Partial<EntreeProfil>): EntreeProfil => ({
  couleur: 'Blanc', appellation: null, cuvee: null, cru: null, millesime: 2020, regionVigneron: null,
  cepages: [], annee: 2026, ...e,
})
const v = (p: ReturnType<typeof calculerProfil>, k: Critere) => p.criteres[k].valeur

describe('moteur de profil', () => {
  it('Bonnezeaux et Coteaux du Layon : même cépage, profils différents', () => {
    const bonnezeaux = calculerProfil(entree({ appellation: 'Bonnezeaux', millesime: 2015, cepages: [cep('Chenin')] }))
    const layon = calculerProfil(entree({ appellation: 'Coteaux du Layon', millesime: 2015, cepages: [cep('Chenin')] }))
    expect(v(bonnezeaux, 'sucre')).toBeGreaterThan(v(layon, 'sucre'))
    expect(v(layon, 'sucre')).toBeGreaterThan(2.5)
    expect(bonnezeaux.style.libelle).toBe('Liquoreux')
    expect(bonnezeaux.aromes.botrytis).toBeGreaterThan(0)
    expect(bonnezeaux.couches).toContain('Appellation Bonnezeaux')
    // l'explication retombe exactement sur la valeur affichée
    const somme = bonnezeaux.criteres.sucre.contributions.reduce((s, c) => s + c.delta, 0)
    expect(Math.abs(somme - v(bonnezeaux, 'sucre'))).toBeLessThan(0.06)
  })

  it('les mentions de l’étiquette donnent le style (Alsace)', () => {
    const sec = calculerProfil(entree({ appellation: 'Alsace', cuvee: 'Héritage - Sec', cepages: [cep('Gewurztraminer')] }))
    const vt = calculerProfil(entree({ appellation: 'Alsace', cuvee: 'Vendanges Tardives - Doux', cepages: [cep('Gewurztraminer')] }))
    const brutNature = calculerProfil(entree({ appellation: "Crémant d'Alsace", cuvee: 'Trilogie - Brut Nature' }))
    expect(motPour('sucre', v(sec, 'sucre'))).toMatch(/sec/)
    expect(v(vt, 'sucre')).toBeGreaterThanOrEqual(3)
    expect(v(brutNature, 'sucre')).toBe(0)
    expect(v(brutNature, 'effervescence')).toBeGreaterThanOrEqual(4)
    expect(brutNature.couches.some((c) => c.includes('Vin nature'))).toBe(false)
  })

  it('le vieillissement assouplit les tanins, fait évoluer robe et arômes', () => {
    const jeune = calculerProfil(entree({ couleur: 'Rouge', millesime: 2024, cepages: [cep('Syrah', 'rouge')] }))
    const vieux = calculerProfil(entree({ couleur: 'Rouge', millesime: 2006, cepages: [cep('Syrah', 'rouge')] }))
    expect(v(vieux, 'tanins')).toBeLessThan(v(jeune, 'tanins'))
    expect(vieux.teinte.valeur).toBeGreaterThan(jeune.teinte.valeur)
    expect(vieux.aromes['sous-bois'] ?? 0).toBeGreaterThan(jeune.aromes['sous-bois'] ?? 0)
    expect(vieux.aromes.violette ?? 0).toBeLessThan(jeune.aromes.violette ?? 0)
    expect(jeune.fenetre.etat).toBe('attendre')
    expect(['boire-vite', 'apogee']).toContain(vieux.fenetre.etat)
  })

  it('millésime chaud vs frais, climat méditerranéen', () => {
    const chaud = calculerProfil(entree({ appellation: 'Alsace', millesime: 2022, cepages: [cep('Riesling')] }))
    const frais = calculerProfil(entree({ appellation: 'Alsace', millesime: 2021, cepages: [cep('Riesling')] }))
    expect(v(chaud, 'alcool')).toBeGreaterThan(v(frais, 'alcool'))
    expect(v(chaud, 'acidite')).toBeLessThan(v(frais, 'acidite'))
    const bandol = calculerProfil(entree({ couleur: 'Rouge', appellation: 'Bandol', cepages: [cep('Mourvèdre', 'rouge')] }))
    expect(bandol.couches).toContain('Climat méditerranéen')
  })

  it('appellation saisie qui est un cépage : alerte et appellation du domaine', () => {
    const p = calculerProfil(entree({ appellation: 'Gewurtzraminer', cepages: [cep('Gewurztraminer')],
      appellationsDuDomaine: ['Alsace', "Crémant d'Alsace", 'Alsace'] }))
    expect(p.appellation).toBe('Alsace')
    expect(p.alertes[0]).toMatch(/cépage/)
  })

  it('sans aucune info : valeurs types et confiance faible', () => {
    const p = calculerProfil(entree({ couleur: 'Rouge', millesime: null }))
    expect(p.confiance.niveau).toBe('faible')
    expect(p.fenetre.etat).toBe('inconnu')
    for (const c of CRITERES) expect(Number.isFinite(p.criteres[c.cle].valeur)).toBe(true)
  })

  it('tous les cépages et toutes les appellations se calculent', () => {
    for (const nom of Object.keys(PROFILS_INITIAUX)) {
      const p = calculerProfil(entree({ cepages: [cep(nom)], appellation: 'Bordeaux' }))
      expect(Object.keys(p.aromes).length).toBeGreaterThan(0)
    }
    expect(trouverAppellation('Saint-Émilion Grand Cru')?.nom).toBe('Saint-Émilion')
    expect(trouverAppellation('Côte de Gascogne')?.nom).toBe('Côtes de Gascogne')
    expect(trouverAppellation('Jurançon sec')?.nom).toBe('Jurançon sec')
    expect(trouverAppellation('Alsace Grand Cru')?.nom).toBe('Alsace Grand Cru')
  })
})

describe('arômes', () => {
  it('« bourgeon de cassis » est végétal, pas du cassis', () => {
    const a = aromesDepuisTexte('buis, bourgeon de cassis, agrumes')
    expect(a.cassis).toBeUndefined()
    expect(a.buis).toBeGreaterThan(0.8)
    expect(a.citron).toBeGreaterThan(0)
  })
})

describe('apprentissage', () => {
  const pred = Object.fromEntries(CRITERES.map((c) => [c.cle, 2])) as Record<Critere, number>
  const obs = (idVin: number, idVigneron: number, sucre: number): Observation =>
    ({ idVin, idVigneron, appellation: 'Alsace', prediction: pred, degustation: { sucre } })

  it('une seule dégustation pèse peu, plusieurs pèsent plus', () => {
    const une = corrections([obs(1, 7, 4)], 7, 'Alsace')
    const total1 = une.reduce((s, c) => s + (c.effets.sucre ?? 0), 0)
    const quatre = corrections([obs(1, 7, 4), obs(2, 7, 4), obs(3, 7, 4), obs(4, 7, 4)], 7, 'Alsace')
    const total4 = quatre.reduce((s, c) => s + (c.effets.sucre ?? 0), 0)
    expect(total1).toBeGreaterThan(0)
    expect(total1).toBeLessThan(1)
    expect(total4).toBeGreaterThan(total1)
    expect(total4).toBeLessThanOrEqual(2)
  })

  it('un autre vigneron ne reçoit que la correction de palais et d’appellation', () => {
    const c = corrections([obs(1, 7, 4), obs(2, 7, 4)], 99, 'Alsace')
    expect(c.map((x) => x.couche)).toEqual(['Ton palais', 'Tes dégustations de Alsace'])
  })
})
