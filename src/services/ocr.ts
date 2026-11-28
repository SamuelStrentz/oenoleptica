/**
 * Lecture du texte d'une étiquette, entièrement sur le téléphone.
 *
 * Moteur : Tesseract (tesseract.js), langue française. Ses fichiers (≈ 5 Mo)
 * sont servis par l'appli elle-même dans /ocr/ et téléchargés au premier
 * usage seulement, puis gardés en cache : aucune photo ne quitte le téléphone.
 */

export type Progression = (etape: string, avancement: number | null) => void

/** Côté le plus long de l'image envoyée à l'OCR (au-delà : lent sans gain). */
const COTE_MAX = 1600

const ETAPES: Record<string, string> = {
  'loading tesseract core': 'Chargement du moteur de lecture',
  'initializing tesseract': 'Démarrage du moteur',
  'loading language traineddata': 'Chargement du français',
  'loading language traineddata (from cache)': 'Chargement du français',
  'initializing api': 'Démarrage du moteur',
  'recognizing text': "Lecture de l'étiquette",
}

/** Photo -> image réduite en niveaux de gris, contraste étiré. */
async function preparer(photo: Blob): Promise<HTMLCanvasElement> {
  const image = await createImageBitmap(photo, { imageOrientation: 'from-image' })
  const echelle = Math.min(1, COTE_MAX / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * echelle)
  canvas.height = Math.round(image.height * echelle)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  image.close()

  const px = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = px.data
  let mini = 255
  let maxi = 0
  for (let i = 0; i < d.length; i += 4) {
    const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
    d[i] = g
    if (g < mini) mini = g
    if (g > maxi) maxi = g
  }
  const etendue = Math.max(1, maxi - mini)
  for (let i = 0; i < d.length; i += 4) {
    const g = Math.round(((d[i] - mini) * 255) / etendue)
    d[i] = d[i + 1] = d[i + 2] = g
  }
  ctx.putImageData(px, 0, 0)
  return canvas
}

/** Texte brut lu sur la photo. */
export async function lireEtiquette(photo: Blob, progression?: Progression): Promise<string> {
  progression?.('Préparation de la photo', null)
  const image = await preparer(photo)
  const { createWorker, OEM, PSM } = await import('tesseract.js')
  const dossier = `${import.meta.env.BASE_URL}ocr/`
  const worker = await createWorker('fra', OEM.LSTM_ONLY, {
    workerPath: `${dossier}worker.min.js`,
    corePath: dossier,
    langPath: dossier,
    workerBlobURL: false,
    logger: (m: { status: string; progress: number }) =>
      progression?.(ETAPES[m.status] ?? 'Lecture en cours', m.status === 'recognizing text' ? m.progress : null),
  })
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT })
    const { data } = await worker.recognize(image)
    return data.text
  } finally {
    await worker.terminate()
  }
}
