/**
 * Petite surcouche synchrone autour de la base SQLite (API « oo1 » de sqlite-wasm).
 *
 * Elle est utilisée telle quelle dans le Web Worker de l'appli ET dans les tests
 * Node (base en mémoire) : les repositories n'ont donc jamais besoin de savoir
 * où ils tournent.
 */
import type { Database, BindingSpec } from '@sqlite.org/sqlite-wasm'

export type Valeur = string | number | null
export type Params = readonly Valeur[]

export interface Resultat {
  changes: number
  lastId: number
}

export class SqlDb {
  private profondeur = 0

  constructor(readonly brute: Database) {}

  private bind(params: Params): BindingSpec | undefined {
    return params.length ? (params as BindingSpec) : undefined
  }

  /** Toutes les lignes, sous forme d'objets { colonne: valeur }. */
  all<T>(sql: string, params: Params = []): T[] {
    return this.brute.selectObjects(sql, this.bind(params)) as T[]
  }

  /** Première ligne (ou undefined). */
  get<T>(sql: string, params: Params = []): T | undefined {
    return this.brute.selectObject(sql, this.bind(params)) as T | undefined
  }

  /** Première colonne de la première ligne. */
  valeur<T = Valeur>(sql: string, params: Params = []): T | undefined {
    return this.brute.selectValue(sql, this.bind(params)) as T | undefined
  }

  /** INSERT / UPDATE / DELETE : nombre de lignes touchées et dernier id inséré. */
  run(sql: string, params: Params = []): Resultat {
    this.brute.exec({ sql, bind: this.bind(params) })
    return {
      changes: this.brute.changes(),
      lastId: Number(this.brute.selectValue('SELECT last_insert_rowid()')),
    }
  }

  /** Script SQL brut (plusieurs ordres possibles, sans paramètre). */
  exec(sql: string): void {
    this.brute.exec(sql)
  }

  /**
   * Exécute fn dans un SAVEPOINT : tout ou rien. Les appels imbriqués sont
   * gérés (comme les SAVEPOINT du script Python). Hors transaction, le
   * RELEASE final enregistre directement les changements sur le disque.
   */
  tx<T>(fn: () => T): T {
    const nom = `sp_${this.profondeur++}`
    this.brute.exec(`SAVEPOINT ${nom}`)
    try {
      const resultat = fn()
      this.brute.exec(`RELEASE ${nom}`)
      return resultat
    } catch (e) {
      this.brute.exec(`ROLLBACK TO ${nom}`)
      this.brute.exec(`RELEASE ${nom}`)
      throw e
    } finally {
      this.profondeur--
    }
  }

  tableExiste(nom: string): boolean {
    return (
      this.valeur("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", [nom]) === 1
    )
  }

  triggerExiste(nom: string): boolean {
    return (
      this.valeur("SELECT 1 FROM sqlite_master WHERE type = 'trigger' AND name = ?", [nom]) === 1
    )
  }

  colonnes(table: string): string[] {
    return this.all<{ name: string }>(`PRAGMA table_info(${table})`).map((c) => c.name)
  }
}
