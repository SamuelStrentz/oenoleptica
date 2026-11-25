/**
 * Export de vignerons en script SQL, à exécuter dans une autre cave
 * (Œnoleptica, appli Python, DB Browser…). Le script n'ajoute que les
 * vignerons absents : on peut le rejouer sans créer de doublon.
 */
import type { NouveauVigneron, Vigneron } from './types'
import { COLS_VIGNERON } from '@/repositories/vignerons'

/** Valeur SQL littérale : NULL, ou texte entre apostrophes (apostrophes doublées). */
export function litteral(valeur: string | null | undefined): string {
  return valeur === null || valeur === undefined || valeur === '' ? 'NULL' : `'${String(valeur).replace(/'/g, "''")}'`
}

function insertion(v: Vigneron): string {
  const valeurs = COLS_VIGNERON.map((c) => litteral(v[c])).join(', ')
  return [
    `INSERT INTO vignerons (${COLS_VIGNERON.join(', ')})`,
    `SELECT ${valeurs}`,
    `WHERE NOT EXISTS (SELECT 1 FROM vignerons WHERE nom = ${litteral(v.nom)} COLLATE NOCASE`,
    `                  AND COALESCE(prenom, '') = ${v.prenom ? litteral(v.prenom) : "''"} COLLATE NOCASE);`,
  ].join('\n')
}

export function vigneronsEnSql(vignerons: Vigneron[], date = new Date()): string {
  const jour = date.toLocaleDateString('fr-FR')
  return [
    `-- Œnoleptica : export de ${vignerons.length} vigneron${vignerons.length > 1 ? 's' : ''} (${jour})`,
    '-- À exécuter dans une cave Œnoleptica (ou la base de l\'appli Python).',
    '-- Les vignerons déjà présents (même nom et prénom) ne sont pas dupliqués.',
    'BEGIN TRANSACTION;',
    '',
    ...vignerons.map(insertion).flatMap((s) => [s, '']),
    'COMMIT;',
    '',
  ].join('\n')
}

/**
 * Relit un fichier produit par vigneronsEnSql(). Le SQL du fichier n'est
 * jamais exécuté tel quel : on n'en extrait que les valeurs des INSERT de
 * vignerons, qui sont ensuite insérées par l'appli. Un fichier piégé
 * (DROP TABLE…) ne peut donc rien faire.
 */
export function lireVigneronsSql(texte: string): NouveauVigneron[] {
  const vignerons: NouveauVigneron[] = []
  const motif = /INSERT\s+INTO\s+vignerons\s*\(([^)]*)\)\s*SELECT\s+([\s\S]*?)\s+WHERE\s+NOT\s+EXISTS/gi
  for (const [, colonnes, valeurs] of texte.matchAll(motif)) {
    const cles = colonnes.split(',').map((c) => c.trim().toLowerCase())
    const litteraux = lireLitteraux(valeurs)
    if (!litteraux || litteraux.length !== cles.length) continue
    const v = Object.fromEntries(COLS_VIGNERON.map((c) => [c, null])) as unknown as NouveauVigneron
    cles.forEach((cle, i) => {
      if ((COLS_VIGNERON as readonly string[]).includes(cle)) (v as unknown as Record<string, string | null>)[cle] = litteraux[i]
    })
    if (v.nom?.trim()) vignerons.push(v)
  }
  return vignerons
}

/** "'a', NULL, 'l''x'" -> ['a', null, "l'x"] ; null si la liste est mal formée. */
function lireLitteraux(texte: string): (string | null)[] | null {
  const valeurs: (string | null)[] = []
  let i = 0
  const espaces = () => { while (i < texte.length && /\s/.test(texte[i])) i++ }
  while (i < texte.length) {
    espaces()
    if (texte.startsWith('NULL', i)) {
      valeurs.push(null)
      i += 4
    } else if (texte[i] === "'") {
      let v = ''
      i++
      for (;;) {
        if (i >= texte.length) return null
        if (texte[i] === "'") {
          if (texte[i + 1] === "'") { v += "'"; i += 2; continue }
          i++
          break
        }
        v += texte[i++]
      }
      valeurs.push(v)
    } else return null
    espaces()
    if (i < texte.length) {
      if (texte[i] !== ',') return null
      i++
    }
  }
  return valeurs
}
