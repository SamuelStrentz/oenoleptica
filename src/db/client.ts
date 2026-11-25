/**
 * Côté interface : appelle les méthodes du worker comme des fonctions async.
 *   const vins = await cave.cave()
 */
import type { ApiCave, Reponse, Requete } from './worker'

type Asynchrone<F> = F extends (...args: infer A) => infer R ? (...args: A) => Promise<Awaited<R>> : never
export type ClientCave = { [K in keyof ApiCave]: Asynchrone<ApiCave[K]> }

const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
const enAttente = new Map<number, { ok: (v: unknown) => void; ko: (e: Error) => void }>()
let compteur = 0

worker.onmessage = (ev: MessageEvent<Reponse>) => {
  const r = ev.data
  const attente = enAttente.get(r.id)
  if (!attente) return
  enAttente.delete(r.id)
  if (r.ok) attente.ok(r.resultat)
  else attente.ko(new Error(r.erreur))
}

function appeler(methode: keyof ApiCave, args: unknown[]): Promise<unknown> {
  const id = ++compteur
  return new Promise((ok, ko) => {
    enAttente.set(id, { ok, ko })
    worker.postMessage({ id, methode, args } satisfies Requete)
  })
}

export const cave = new Proxy({} as ClientCave, {
  get: (_cible, methode: string) => (...args: unknown[]) => appeler(methode as keyof ApiCave, args),
})
