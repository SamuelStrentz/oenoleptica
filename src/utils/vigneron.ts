/** Conversion formulaire <-> base pour un vigneron. */
import type { ChampsVigneron } from '@/components/VigneronChamps.vue'
import type { NouveauVigneron, Vigneron } from '@/domain/types'
import { texte } from '@/domain/parsers'

export function vigneronVide(): ChampsVigneron {
  return { domaine: '', prenom: '', nom: '', mail: '', adresse: '', cp: '', ville: '', departement: '', region: '', pays: 'France' }
}

export function versFormulaire(v: Vigneron): ChampsVigneron {
  const t = (x: string | null) => x ?? ''
  return {
    domaine: t(v.domaine), prenom: t(v.prenom), nom: v.nom, mail: t(v.mail), adresse: t(v.adresse), cp: t(v.cp),
    ville: t(v.ville), departement: t(v.departement), region: t(v.region), pays: t(v.pays),
  }
}

/** Lève une erreur si le nom manque. */
export function versBase(f: ChampsVigneron): NouveauVigneron {
  if (!texte(f.nom)) throw new Error('Le nom du vigneron est obligatoire.')
  return {
    domaine: texte(f.domaine), prenom: texte(f.prenom), nom: f.nom.trim(), mail: texte(f.mail), adresse: texte(f.adresse),
    cp: texte(f.cp), ville: texte(f.ville), departement: texte(f.departement),
    region: texte(f.region), pays: texte(f.pays),
  }
}

export function nomComplet(v: { prenom: string | null; nom: string }): string {
  return [v.prenom, v.nom].filter(Boolean).join(' ')
}
