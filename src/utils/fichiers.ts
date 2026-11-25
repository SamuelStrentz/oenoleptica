/** Partage (Android) ou téléchargement d'un fichier généré par l'appli. */
export async function partagerOuTelecharger(blob: Blob, nom: string, titre: string): Promise<void> {
  const fichier = new File([blob], nom, { type: blob.type })
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: titre })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: nom })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** CSV lisible par Excel en français : « ; », virgule décimale, UTF-8 avec BOM. */
export function csvExcel(entetes: string[], lignes: (string | number | null)[][]): Blob {
  const cellule = (v: string | number | null) => {
    if (v === null) return ''
    const t = typeof v === 'number' ? String(v).replace('.', ',') : v
    return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  const texte = [entetes, ...lignes].map((l) => l.map(cellule).join(';')).join('\r\n')
  return new Blob(['﻿' + texte], { type: 'text/csv;charset=utf-8' })
}

/** Nom de fichier sans caractère interdit. */
export function nomFichier(texte: string): string {
  return texte.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_') || 'cave'
}
