/**
 * Moteur de profil organoleptique : un modèle par couches, déterministe et
 * explicable.
 *
 *   profil = cépage(s) -> style -> appellation -> mentions -> climat -> sols
 *            -> millésime -> vieillissement -> corrections apprises
 *
 * Chaque couche ajoute (ou fixe) des valeurs ; chaque apport est tracé pour
 * pouvoir expliquer le résultat. Fonction pure : aucun accès base / réseau.
 */
import { cleCepage, CEPAGES_DEFAUT } from '@/domain/cepages'
import { CRITERES, PAR_CLE, familleCouleur, type Critere, type FamilleCouleur } from './echelles'
import { PAR_DESCRIPTEUR, aromesDepuisTexte } from './aromes'
import { trouverAppellation, type Appellation } from './connaissances/appellations'
import {
  CARACTERES, CLIMATS, MENTIONS, MENTIONS_STYLE, SOLS, STYLES, type Couche, type Style,
} from './connaissances/terroir'
import { REGIONS_VITICOLES, caractereMillesime, regionDepuisAdministrative } from './connaissances/millesimes'
import type { Contribution, EntreeProfil, Fenetre, ProfilCalcule, ValeurCalculee } from './types'

// ---------------------------------------------------------------- outils
class Accumulateur {
  readonly v = {} as Record<Critere | 'teinte', number>
  readonly c = {} as Record<Critere | 'teinte', Contribution[]>

  base(k: Critere | 'teinte', valeur: number, couche: string) {
    this.v[k] = valeur
    this.c[k] = [{ couche, delta: valeur }]
  }

  ajouter(k: Critere | 'teinte', delta: number | undefined, couche: string) {
    if (!delta || Math.abs(delta) < 0.01) return
    this.v[k] += delta
    this.c[k].push({ couche, delta })
  }

  fixer(k: Critere | 'teinte', valeur: number, couche: string) {
    this.ajouter(k, valeur - this.v[k], couche)
  }

  resultat(k: Critere | 'teinte', max: number): ValeurCalculee {
    const brut = this.v[k]
    const valeur = Math.max(0, Math.min(max, brut))
    const contributions = [...this.c[k]]
    if (Math.abs(valeur - brut) >= 0.01) contributions.push({ couche: "Limite de l'échelle", delta: valeur - brut })
    return { valeur: Math.round(valeur * 10) / 10, contributions }
  }
}

function appliquerCouche(acc: Accumulateur, aromes: Record<string, number>, couche: Couche, libelle: string, facteur = 1) {
  for (const [k, d] of Object.entries(couche.effets ?? {})) acc.ajouter(k as Critere, (d ?? 0) * facteur, libelle)
  for (const [k, d] of Object.entries(couche.aromes ?? {})) aromes[k] = (aromes[k] ?? 0) + d * facteur
}

const contient = (texte: string, ...mots: string[]) => mots.some((m) => texte.includes(m))

const ROBE_INTENSITE: [string, number][] = [['legere', 1.5], ['moyenne', 2.5], ['soutenue', 3.5], ['profonde', 4.5]]
const LONGUEUR: [string, number][] = [
  ['tres longue', 9], ['moyenne a longue', 6], ['courte a moyenne', 4], ['longue', 7], ['moyenne', 5], ['courte', 3],
]
const TEINTES_MOTS: Record<FamilleCouleur, [RegExp, number][]> = {
  rouge: [[/violac/, 0.5], [/pourpre/, 1], [/rubis/, 2], [/grenat/, 3], [/tuil/, 4], [/brique/, 5]],
  blanc: [[/vert/, 0.5], [/jaune pale|tres pale/, 1], [/paille/, 2], [/dore/, 3], [/\bor\b/, 3.5], [/ambr/, 5]],
  rose: [[/gris/, 0], [/pale/, 1], [/peche/, 2], [/saumon/, 3], [/framboise/, 4]],
}

/** Valeurs par défaut quand aucun cépage n'est connu. */
const DEFAUTS: Record<FamilleCouleur, { v: Partial<Record<Critere | 'teinte', number>>; aromes: Record<string, number>; garde: [number, number] }> = {
  rouge: { v: { acidite: 3, tanins: 3, corps: 3, intensite_robe: 3, teinte: 2, longueur: 5 },
    aromes: { cerise: 0.5, mure: 0.4, 'epices-douces': 0.2 }, garde: [3, 10] },
  blanc: { v: { acidite: 3.5, tanins: 0, corps: 2.5, intensite_robe: 1.5, teinte: 1, longueur: 4.5 },
    aromes: { pomme: 0.5, citron: 0.4, 'fleurs-blanches': 0.3 }, garde: [2, 6] },
  rose: { v: { acidite: 3.5, tanins: 0.5, corps: 2, intensite_robe: 1.5, teinte: 2, longueur: 4 },
    aromes: { fraise: 0.5, framboise: 0.4, pamplemousse: 0.3 }, garde: [1, 2] },
}

function lireGarde(texte: string | null | undefined): [number, number] | null {
  const m = /(\d+)\s*a\s*(\d+)/.exec(cleCepage(texte ?? ''))
  return m ? [Number(m[1]), Number(m[2])] : null
}

// ------------------------------------------------------------ le moteur
export function calculerProfil(e: EntreeProfil): ProfilCalcule {
  const famille = familleCouleur(e.couleur)
  const acc = new Accumulateur()
  const aromes: Record<string, number> = {}
  const couches: string[] = []
  const alertes: string[] = []
  const manques: string[] = []
  const etiquette = cleCepage([e.cuvee, e.cru, e.couleur].filter(Boolean).join(' '))

  // 1. Cépage(s) -------------------------------------------------------
  const connus = e.cepages.filter((c) => c.profil)
  const defaut = DEFAUTS[famille]
  let garde: [number, number] = defaut.garde
  let sucreCepage = 0
  if (connus.length) {
    const libelle = connus.length === 1 ? `Cépage ${connus[0].nom}` : `Cépages ${connus.map((c) => c.nom).join(', ')}`
    couches.push(libelle)
    const moyenne = (f: (p: NonNullable<(typeof connus)[0]['profil']>) => number) =>
      connus.reduce((s, c) => s + f(c.profil!), 0) / connus.length
    const textes = (p: NonNullable<(typeof connus)[0]['profil']>) =>
      cleCepage([p.attaque, p.milieu_bouche, p.finale, p.texture].join(' '))

    acc.base('acidite', moyenne((p) => p.acidite ?? 3), libelle)
    // un rosé ou un blanc tiré de raisins rouges n'a presque pas de tanins
    const facteurTanins = famille === 'rouge' ? 1 : famille === 'rose' ? 0.2 : 0.05
    acc.base('tanins', moyenne((p) => p.tanins ?? 0) * facteurTanins, libelle)
    acc.base('corps', moyenne((p) => p.corps ?? 3), libelle)
    sucreCepage = moyenne((p) => Math.max(0, (p.sucrosite ?? 1) - 1))
    acc.base('sucre', sucreCepage, libelle)
    acc.base('longueur', moyenne((p) => LONGUEUR.find(([m]) => cleCepage(p.longueur ?? '').includes(m))?.[1] ?? 5), libelle)
    acc.base('amertume', moyenne((p) => (contient(textes(p), 'amer') ? 2 : famille === 'rouge' ? 1 : 0.75)), libelle)
    acc.base('salinite', moyenne((p) => (contient(textes(p) + cleCepage(p.aromes_bouche ?? ''), 'salin', 'iod', 'mineral') ? 2 : 1)), libelle)
    acc.base('alcool', moyenne((p) => ({ rouge: 2.75, blanc: 2.25, rose: 2.25 })[famille]
      + (contient(textes(p), 'alcool', 'chaud', 'chaleur') ? 0.5 : 0)), libelle)
    acc.base('intensite_nez', moyenne((p) => 2.5 + (contient(textes(p), 'aromatique', 'expressif', 'opulent', 'exotique') ? 0.75 : 0)), libelle)

    // la robe décrite par le cépage ne vaut que si la couleur du vin correspond
    const memeCouleur = connus.filter((c) => (c.type === 'rouge') === (famille === 'rouge'))
    if (memeCouleur.length) {
      const robes = memeCouleur.map((c) => {
        const t = cleCepage(c.profil!.robe_couleur ?? '')
        const idx = TEINTES_MOTS[famille].filter(([m]) => m.test(t)).map(([, i]) => i)
        const inten = ROBE_INTENSITE.find(([m]) => cleCepage(c.profil!.robe_intensite ?? '').includes(m))?.[1]
        // la teinte la plus jeune citée (« rubis à grenat » -> rubis) : l'âge fait le reste
        return { teinte: idx.length ? Math.min(...idx) : defaut.v.teinte!, inten: inten ?? defaut.v.intensite_robe! }
      })
      acc.base('teinte', robes.reduce((s, r) => s + r.teinte, 0) / robes.length, libelle)
      acc.base('intensite_robe', robes.reduce((s, r) => s + r.inten, 0) / robes.length, libelle)
    } else {
      acc.base('teinte', defaut.v.teinte!, `Robe type ${famille === 'rose' ? 'rosé' : famille}`)
      acc.base('intensite_robe', defaut.v.intensite_robe!, `Robe type ${famille === 'rose' ? 'rosé' : famille}`)
    }

    // arômes : nez (poids 1) et rétro-olfaction (0,6), moyennés sur les cépages
    for (const c of connus) {
      const nez = aromesDepuisTexte(c.profil!.aromes_nez, 1)
      const bouche = aromesDepuisTexte(c.profil!.aromes_bouche, 0.6)
      for (const k of Object.keys({ ...bouche, ...nez })) {
        // les arômes d'évolution cités pour le cépage (miel, pétrole…) ne sont qu'esquissés :
        // c'est la couche « âge » qui les fait monter
        const val = Math.max(nez[k] ?? 0, bouche[k] ?? 0) * (PAR_DESCRIPTEUR[k]?.type === 'tertiaire' ? 0.3 : 1)
        aromes[k] = (aromes[k] ?? 0) + (val * 1.2) / connus.length
      }
    }
    const gardes = connus.map((c) => lireGarde(c.profil!.garde)).filter((g): g is [number, number] => !!g)
    if (gardes.length) garde = [Math.min(...gardes.map((g) => g[0])), Math.max(...gardes.map((g) => g[1]))]
    if (connus.length < e.cepages.length) manques.push('profil de certains cépages')

    // couleur saisie incohérente avec les cépages ?
    if (famille === 'rouge' && connus.every((c) => c.type === 'blanc')) {
      alertes.push(`Couleur « Rouge » avec un cépage blanc (${connus.map((c) => c.nom).join(', ')}) : vérifie la couleur du vin.`)
    }
    if (famille === 'blanc' && connus.every((c) => c.type === 'rouge') && !contient(etiquette, 'effervescent', 'blanc de noirs')) {
      alertes.push(`Couleur « Blanc » avec des cépages rouges (${connus.map((c) => c.nom).join(', ')}) : s'agit-il d'un rosé ?`)
    }
  } else {
    const libelle = `Valeurs types d'un ${famille === 'rose' ? 'rosé' : famille}`
    couches.push(libelle)
    for (const k of CRITERES.map((c) => c.cle)) acc.base(k, 0, libelle)
    acc.base('teinte', 0, libelle)
    for (const [k, v] of Object.entries(defaut.v)) acc.base(k as Critere, v, libelle)
    acc.base('amertume', 1, libelle)
    acc.base('salinite', 1, libelle)
    acc.base('alcool', famille === 'rouge' ? 2.75 : 2.25, libelle)
    acc.base('intensite_nez', 2.5, libelle)
    Object.assign(aromes, defaut.aromes)
    manques.push('cépage')
  }
  acc.base('effervescence', 0, 'Vin tranquille')

  // 2. Appellation (trouvée, ou déduite) ------------------------------
  let app: Appellation | null = trouverAppellation(e.appellation)
  if (!app && e.appellation) {
    const nomCepage = [...CEPAGES_DEFAUT.rouge, ...CEPAGES_DEFAUT.blanc].find((n) => cleCepage(n) === cleCepage(e.appellation!))
      || (/gewur/i.test(cleCepage(e.appellation)) ? 'Gewurztraminer' : null)
    const deduite = (e.appellationsDuDomaine ?? []).map(trouverAppellation).filter((a): a is Appellation => !!a)
      .sort((a, b) => Number(b.nom === 'Alsace') - Number(a.nom === 'Alsace'))[0] ?? null
    if (nomCepage) {
      alertes.push(`« ${e.appellation} » est un cépage, pas une appellation : corrige-la dans « Modifier le vin ».`
        + (deduite ? ` En attendant, l'appellation ${deduite.nom} (celle du domaine) est utilisée.` : ''))
      app = deduite
    }
  }
  if (!app) manques.push('appellation')

  // 3. Style (mentions de l'étiquette > appellation > couleur) ---------
  const texteStyle = cleCepage([e.cuvee, e.cru].filter(Boolean).join(' '))
  let style: Style | null = MENTIONS_STYLE.find(([m]) => m.test(texteStyle))?.[1] ?? null
  if (!style && app && app.style !== 'variable') style = app.style
  if (!style && contient(etiquette, 'effervescent', 'petillant')) style = 'brut'
  if (!style && famille !== 'rouge') style = 'sec'
  if (style && famille === 'rouge' && !STYLES[style].effervescent) style = null // les rouges restent secs
  if (style) {
    const s = STYLES[style]
    const libelle = `Style ${s.libelle.toLowerCase()}`
    couches.push(libelle)
    acc.fixer('sucre', s.sucre + sucreCepage * (s.sucre < 1 ? 0.15 : 0.1), libelle)
    if (s.effervescent) acc.fixer('effervescence', 4, libelle)
    if (s.teinte) acc.ajouter('teinte', s.teinte, libelle)
    appliquerCouche(acc, aromes, s, libelle)
    if (s.garde) garde = [Math.round(garde[0] * s.garde), Math.round(garde[1] * s.garde)]
  }

  if (app) {
    const libelle = `Appellation ${app.nom}`
    couches.push(libelle)
    appliquerCouche(acc, aromes, app, libelle)
    garde = style && STYLES[style].garde ? [Math.max(app.garde[0], garde[0]), Math.max(app.garde[1], garde[1])] : app.garde
  }

  // 4. Mentions (grand cru, vieilles vignes, fût…) ---------------------
  for (const m of MENTIONS) {
    if (!m.motif.test(etiquette)) continue
    if (m.libelle === 'Grand cru' && app?.nom.toLowerCase().includes('grand cru')) continue // déjà compté
    const libelle = `Mention « ${m.libelle} »`
    couches.push(libelle)
    appliquerCouche(acc, aromes, m.couche, libelle)
    if (m.garde) garde = [garde[0] + Math.round(m.garde / 2), garde[1] + m.garde]
  }

  // 5. Terroir : climat et sols ----------------------------------------
  const region = app?.region ?? regionDepuisAdministrative(e.regionVigneron)
  const climat = app?.climat ?? (region ? REGIONS_VITICOLES[region].climat : null)
  if (climat) {
    const libelle = `Climat ${CLIMATS[climat].libelle}`
    couches.push(libelle)
    appliquerCouche(acc, aromes, CLIMATS[climat], libelle)
  }
  for (const sol of app?.sols ?? []) {
    const libelle = `Sol ${SOLS[sol].libelle}`
    couches.push(libelle)
    appliquerCouche(acc, aromes, SOLS[sol], libelle, 1 / app!.sols.length)
  }

  // 6. Millésime -------------------------------------------------------
  const caractere = e.millesime ? caractereMillesime(e.millesime, region) : null
  if (caractere) {
    const libelle = `Millésime ${e.millesime} (${CARACTERES[caractere].libelle})`
    couches.push(libelle)
    appliquerCouche(acc, aromes, CARACTERES[caractere], libelle)
  } else manques.push(e.millesime ? 'caractère du millésime' : 'millésime')

  // 7. Vieillissement --------------------------------------------------
  const age = e.millesime ? Math.max(0, e.annee - e.millesime) : null
  if (age !== null) {
    const p = age / Math.max(garde[1], 1)
    const libelle = `Âge : ${age} an${age > 1 ? 's' : ''}`
    couches.push(libelle)
    const borne = Math.min(p, 1)
    const decroissance = Math.exp(-1.2 * p)
    for (const [k, v] of Object.entries(aromes)) {
      const type = PAR_DESCRIPTEUR[k]?.type
      if (type === 'primaire') aromes[k] = v * decroissance
      else if (type === 'secondaire') aromes[k] = v * Math.exp(-0.6 * p)
    }
    const t = 1 / (1 + Math.exp(-6 * (p - 0.6))) - 1 / (1 + Math.exp(3.6)) // ≈ 0 au départ, 0,5 vers 60 % de la garde
    const tertiaires: Record<FamilleCouleur, Record<string, number>> = {
      rouge: { 'sous-bois': 0.5, cuir: 0.4, pruneau: 0.3, 'epices-douces': 0.25 },
      blanc: { miel: 0.5, cire: 0.4, 'fruits-secs': 0.35 },
      rose: { 'fruits-secs': 0.2 },
    }
    for (const [k, v] of Object.entries(tertiaires[famille])) aromes[k] = (aromes[k] ?? 0) + v * Math.max(0, t)
    if (famille === 'blanc' && e.cepages.some((c) => cleCepage(c.nom) === 'riesling')) {
      aromes.hydrocarbure = (aromes.hydrocarbure ?? 0) + 0.4 * Math.max(0, t)
    }
    acc.ajouter('tanins', -acc.v.tanins * 0.35 * Math.min(p, 1.2), libelle)
    acc.ajouter('teinte', ({ rouge: 2.5, blanc: 2, rose: 1.5 })[famille] * Math.min(p, 1.3) ** 1.5, libelle)
    acc.ajouter('intensite_robe', famille === 'rouge' ? -0.5 * borne : 0.5 * borne, libelle)
    acc.ajouter('sucre', -0.4 * borne * (acc.v.sucre / 5), libelle)
    acc.ajouter('acidite', -0.25 * borne, libelle)
    acc.ajouter('corps', -0.25 * Math.max(0, p - 1), libelle)
    acc.ajouter('longueur', 0.5 * borne - Math.max(0, p - 1.2), libelle)
  }

  // 8. Corrections apprises de tes dégustations ------------------------
  for (const corr of e.corrections ?? []) {
    if (!Object.values(corr.effets).some((x) => x && Math.abs(x) >= 0.05)) continue
    couches.push(corr.couche)
    for (const [k, d] of Object.entries(corr.effets)) acc.ajouter(k as Critere, d, corr.couche)
  }

  // Résultat -----------------------------------------------------------
  const criteres = Object.fromEntries(CRITERES.map((c) => [c.cle, acc.resultat(c.cle, PAR_CLE[c.cle].max)])) as Record<Critere, ValeurCalculee>
  const aromesFinaux = Object.fromEntries(
    Object.entries(aromes).map(([k, v]) => [k, Math.round(Math.min(1, v) * 100) / 100]).filter(([k, v]) => (v as number) >= 0.1 && PAR_DESCRIPTEUR[k as string]),
  )
  return {
    famille,
    teinte: acc.resultat('teinte', 5),
    criteres,
    aromes: aromesFinaux,
    style: { cle: style, libelle: style ? STYLES[style].libelle : famille === 'rouge' ? 'Rouge tranquille' : 'Sec' },
    appellation: app?.nom ?? null,
    region: region ? REGIONS_VITICOLES[region].libelle : null,
    millesime: { annee: e.millesime, caractere: caractere ? CARACTERES[caractere].libelle : null },
    fenetre: fenetre(e.millesime, age, garde),
    confiance: { niveau: manques.length === 0 ? 'élevée' : manques.length === 1 ? 'moyenne' : 'faible', manques },
    couches,
    alertes,
  }
}

function fenetre(millesime: number | null, age: number | null, [gMin, gMax]: [number, number]): Fenetre {
  if (millesime === null || age === null) {
    return { etat: 'inconnu', libelle: 'Non millésimé : à boire dans les 2 à 3 ans', debut: null, fin: null, age: null }
  }
  const base = { debut: millesime + gMin, fin: millesime + gMax, age }
  if (gMax <= 3) {
    return age <= gMax
      ? { etat: 'pret', libelle: 'À boire', ...base }
      : { etat: age <= gMax * 1.5 ? 'boire-vite' : 'passe', libelle: age <= gMax * 1.5 ? 'À boire sans tarder' : 'Probablement passé', ...base }
  }
  if (age < gMin * 0.5) return { etat: 'attendre', libelle: 'À attendre', ...base }
  if (age < gMin) return { etat: 'pret', libelle: 'Prêt, peut encore attendre', ...base }
  if (age <= gMax) return { etat: 'apogee', libelle: 'À son apogée', ...base }
  if (age <= gMax * 1.25) return { etat: 'boire-vite', libelle: 'À boire sans tarder', ...base }
  return { etat: 'passe', libelle: 'Probablement passé', ...base }
}
