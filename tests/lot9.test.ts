import { describe, expect, it } from 'vitest'
import { nouvelleBase, vin } from './aide'
import { distance, extraireIndices, motsCles, normaliser, rapprocher, type CandidatEtiquette } from '@/domain/etiquette'
import { candidatsCave, candidatsReferentiel, infoReferentiel } from '@/repositories/referentiel'
import { insererVigneron } from '@/repositories/vignerons'
import { insererVin } from '@/repositories/vins'
import { nombre } from '@/domain/parsers'

const candidat = (m: Partial<CandidatEtiquette>): CandidatEtiquette => ({
  origine: 'referentiel', domaine: 'Domaine X', cuvee: null, appellation: 'Jurançon', couleur: 'Blanc', cepage: null,
  style: 'Moelleux', volume_alcool: null, format: '75 cl', prix: null, id_vigneron: null, vigneron: null, ...m,
})

describe('lecture des indices', () => {
  it('trouve millésime, degré, contenance et couleur', () => {
    const i = extraireIndices('DOMAINE CAUHAPÉ\nJurançon sec\n2021\n13,5% vol\n75cl\nVin blanc')
    expect(i).toEqual({ millesime: 2021, volume_alcool: 13.5, format: '75 cl', couleur: 'Blanc', sec: true })
  })

  it('convertit les ml et les litres', () => {
    expect(extraireIndices('750 ml').format).toBe('75 cl')
    expect(extraireIndices('Magnum 1,5 L').format).toBe('1,5 L')
    expect(extraireIndices('37,5 cl').format).toBe('37,5 cl')
  })

  it("ignore les années futures et les pourcentages absurdes", () => {
    const i = extraireIndices('Fondé en 1890 — 2099 — 100 % petit manseng')
    expect(i.millesime).toBeNull()
    expect(i.volume_alcool).toBeNull()
  })
})

describe('outils de texte', () => {
  it('normalise accents et ponctuation', () => {
    expect(normaliser("Bru-Baché, l'Œil")).toBe('bru bache l oeil')
  })
  it('écarte les mots vides', () => {
    expect(motsCles('Domaine de la Clos Thou')).toEqual(['thou'])
  })
  it('mesure la distance', () => {
    expect(distance('cauhape', 'cauhape')).toBe(0)
    expect(distance('cauhape', 'cauhpe')).toBe(1)
    expect(distance('cauhape', 'xyz', 2)).toBe(3)
  })
})

describe('rapprochement', () => {
  const liste = [
    candidat({ domaine: 'Domaine Cauhapé', cuvee: 'Chant des vignes', appellation: 'Jurançon sec', style: 'Sec' }),
    candidat({ domaine: 'Domaine Cauhapé', cuvee: 'Noblesse du Temps', appellation: 'Jurançon' }),
    candidat({ domaine: 'Domaine Cauhapé', cuvee: 'C de Cauhapé', appellation: 'Jurançon sec', style: 'Sec' }),
    candidat({ domaine: 'Domaine Bru-Baché', cuvee: 'Les Casterasses', appellation: 'Jurançon sec', style: 'Sec' }),
    candidat({ domaine: 'Clos Marie Louise & Château Lapuyade', cuvee: 'Cuvée Dentelle', appellation: 'Jurançon sec', style: 'Sec' }),
  ]

  it('classe la bonne cuvée en tête malgré une faute de lecture', () => {
    const r = rapprocher('DOMAINE CAUHAPF\nCHANT DES VIGNES\nJURANÇON SEC 2022', liste)
    expect(r.propositions[0].cuvee).toBe('Chant des vignes')
    expect(r.propositions[0].score).toBeGreaterThan(0.9)
    expect(r.propositions[1].score).toBeLessThan(0.9)
    expect(r.propositions.every((p) => p.domaine.includes('Cauhap'))).toBe(true)
  })

  it('reconnaît un domaine à nom composé par une partie seulement', () => {
    const r = rapprocher('Château Lapuyade\nDentelle\nJurançon sec', liste)
    expect(r.propositions[0].cuvee).toBe('Cuvée Dentelle')
  })

  it('ne propose rien sans mot du domaine', () => {
    expect(rapprocher('Les Casterasses 2019', liste).propositions).toEqual([])
  })

  it('préfère le vin de la cave à son double du référentiel', () => {
    const doubles = [candidat({ domaine: 'Clos Thou', cuvee: 'Guilhouret' }), candidat({ domaine: 'Clos Thou', cuvee: 'Guilhouret', origine: 'cave', id_vigneron: 3 })]
    const r = rapprocher('CLOS THOU Guilhouret', doubles)
    expect(r.propositions).toHaveLength(1)
    expect(r.propositions[0].origine).toBe('cave')
  })
})

describe('candidats depuis les bases', () => {
  it('rattache un vigneron du référentiel déjà présent dans la cave, et fournit les autres', () => {
    const cave = nouvelleBase()
    const idCave = insererVigneron(cave, { domaine: 'Clos Thou', prenom: 'Henri', nom: 'LAPLOUBE-LAPLACE' } as never)
    insererVin(cave, vin({ domaine: 'Domaine Gramenon' }))

    const ref = nouvelleBase()
    const idThou = insererVigneron(ref, { domaine: 'Clos Thou', prenom: 'Henri', nom: 'LAPLOUBE-LAPLACE', ville: 'Jurançon' } as never)
    const idNaba = insererVigneron(ref, { domaine: 'Domaine Naba', prenom: 'Mathieu', nom: 'LACANETTE-NABA', ville: 'Estialescq' } as never)
    insererVin(ref, vin({ domaine: 'Clos Thou', cuvee: 'Guilhouret', millesime: null, vigneron_id: idThou }))
    insererVin(ref, vin({ domaine: 'Domaine Naba', cuvee: 'Marlère', millesime: null, vigneron_id: idNaba }))

    expect(infoReferentiel(ref)).toEqual({ vignerons: 2, vins: 2 })
    expect(candidatsCave(cave)).toHaveLength(1)
    const c = candidatsReferentiel(ref, cave)
    const thou = c.find((x) => x.domaine === 'Clos Thou')!
    const naba = c.find((x) => x.domaine === 'Domaine Naba')!
    expect(thou.id_vigneron).toBe(idCave)
    expect(thou.vigneron).toBeNull()
    expect(naba.id_vigneron).toBeNull()
    expect(naba.vigneron).toMatchObject({ domaine: 'Domaine Naba', prenom: 'Mathieu', nom: 'LACANETTE-NABA', ville: 'Estialescq' })
  })
})

describe('messages', () => {
  it('accorde au féminin', () => {
    expect(() => nombre('120', 'La note', { max: 100 })).toThrow('La note doit être inférieure ou égale à 100.')
    expect(() => nombre('3000', 'Le millésime', { max: 2100 })).toThrow('Le millésime doit être inférieur ou égal à 2100.')
  })
})
