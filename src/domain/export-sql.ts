/**
 * Export de vignerons en script SQL, à exécuter dans une autre cave
 * (Œnoleptica, appli Python, DB Browser…). Le script n'ajoute que les
 * vignerons absents : on peut le rejouer sans créer de doublon.
 */
import type { Vigneron } from './types'
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
