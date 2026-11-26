/**
 * Assemble les données de la base pour le moteur de profil : vin, cépages et
 * leurs profils, appellations du domaine, corrections apprises.
 */
import type { SqlDb } from '@/db/sql'
import { calculerProfil } from '@/domain/profil/moteur'
import { corrections, type Observation } from '@/domain/profil/apprentissage'
import { CRITERES, type Critere } from '@/domain/profil/echelles'
import type { EntreeProfil, ProfilCalcule } from '@/domain/profil/types'
import type { VinCave } from '@/domain/types'
import { cepagesDuVin } from './cepages'
import { dernieresDegustations } from './degustations'
import { lireVinCave, listerCave } from './vins'

function entree(db: SqlDb, vin: VinCave, tous: VinCave[], annee: number): EntreeProfil {
  return {
    couleur: vin.couleur,
    appellation: vin.appellation,
    cuvee: vin.cuvee,
    style: vin.style,
    cru: vin.cru,
    millesime: vin.millesime,
    regionVigneron: vin.region,
    cepages: cepagesDuVin(db, vin.cepage),
    appellationsDuDomaine: tous.filter((v) => v.domaine === vin.domaine && v.id_vin !== vin.id_vin).map((v) => v.appellation),
    annee,
  }
}

/** Profil calculé d'un vin, avec les corrections apprises de tes dégustations. */
export function profilDuVin(db: SqlDb, idVin: number, annee = new Date().getFullYear()): ProfilCalcule {
  const vin = lireVinCave(db, idVin)
  if (!vin) throw new Error('Vin introuvable.')
  const tous = listerCave(db)
  const base = entree(db, vin, tous, annee)
  const sansCorrection = calculerProfil(base)

  // observations : chaque vin dégusté, comparé à son profil calculé sans correction
  const observations: Observation[] = []
  for (const d of dernieresDegustations(db)) {
    const v = tous.find((x) => x.id_vin === d.id_vin)
    if (!v) continue
    const p = calculerProfil(entree(db, v, tous, Number(d.date_degustation.slice(0, 4)) || annee))
    observations.push({
      idVin: v.id_vin,
      idVigneron: v.id_vigneron,
      appellation: p.appellation,
      prediction: Object.fromEntries(CRITERES.map((c) => [c.cle, p.criteres[c.cle].valeur])) as Record<Critere, number>,
      degustation: Object.fromEntries(CRITERES.map((c) => [c.cle, d[c.cle]])),
    })
  }
  if (!observations.length) return sansCorrection
  return calculerProfil({ ...base, corrections: corrections(observations, vin.id_vigneron, sansCorrection.appellation) })
}
