import { lireVigneronsSql, vigneronsEnSql } from '@/domain/export-sql'
import { aujourdhui } from '@/domain/parsers'
import { nomFichier, partagerOuTelecharger } from '@/utils/fichiers'
import { useCaveStore } from '@/stores/cave'
import { useUiStore } from '@/stores/ui'
import { pluriel } from '@/utils/affichage'

/** Exporte tous les vignerons de la cave en .sql et ouvre le partage. */
export async function exporterTousLesVignerons() {
  const store = useCaveStore()
  const ui = useUiStore()
  try {
    const tous = await store.tousLesVignerons()
    if (!tous.length) return ui.toast('Aucun vigneron à exporter')
    await partagerOuTelecharger(new Blob([vigneronsEnSql(tous)], { type: 'text/plain' }),
      `vignerons_${nomFichier(store.nomCave)}_${aujourdhui()}.sql`, `${tous.length} vignerons`)
  } catch (e) { ui.erreur(e) }
}

/** Importe un fichier .sql produit par l'export (les vignerons déjà présents sont ignorés). */
export async function importerFichierVignerons(fichier: File) {
  const store = useCaveStore()
  const ui = useUiStore()
  try {
    const liste = lireVigneronsSql(await fichier.text())
    if (!liste.length) return ui.toast("Ce fichier n'est pas un export de vignerons Œnoleptica.")
    const { ajoutes, ignores } = await store.importerVignerons(liste)
    ui.toast(`${pluriel(ajoutes, 'vigneron ajouté', 'vignerons ajoutés')}` +
      (ignores ? `, ${pluriel(ignores, 'déjà présent', 'déjà présents')}` : ''))
  } catch (e) { ui.erreur(e) }
}
