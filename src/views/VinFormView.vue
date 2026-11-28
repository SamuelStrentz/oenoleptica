<script setup lang="ts">
/**
 * Formulaire d'un vin : ajout (route /ajout) ou modification (/vin/:id/modifier).
 * En modification, le stock ne se change pas ici (pastille de la vignette).
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icone from '@/components/Icone.vue'
import CepageChips from '@/components/CepageChips.vue'
import VigneronChamps from '@/components/VigneronChamps.vue'
import ChampListe, { type OptionListe } from '@/components/ChampListe.vue'
import LectureEtiquette from '@/components/LectureEtiquette.vue'
import type { IndicesEtiquette, Proposition } from '@/domain/etiquette'
import { useCaveStore } from '@/stores/cave'
import { useUiStore, vibrer } from '@/stores/ui'
import { CATEGORIES_VIN, COULEURS, FORMATS, NOTE_MAX, type AjoutVin, type ChampsVin } from '@/domain/types'
import { STYLES } from '@/domain/profil/connaissances/terroir'
import { APPELLATIONS } from '@/domain/profil/connaissances/appellations'
import { REGIONS_VITICOLES } from '@/domain/profil/connaissances/millesimes'
import { nombre, nombreCourt, prix, texte } from '@/domain/parsers'
import { couleurPastille, pluriel } from '@/utils/affichage'
import { versBase, versFormulaire, vigneronVide } from '@/utils/vigneron'

const props = defineProps<{ id?: string }>()

const NOUVEAU = -1
const AUCUN = 0

const router = useRouter()
const store = useCaveStore()
const ui = useUiStore()

const idVin = computed(() => (props.id ? Number(props.id) : null))
const modification = computed(() => idVin.value !== null)

const f = reactive({
  domaine: '', millesime: '', appellation: '', cuvee: '', cru: '',
  couleur: '', prix: '', cepage: '', volume_alcool: '', format: '75 cl', style: '',
  quantite: 1, note: '', categorie: '',
  vigneron: AUCUN as number,
})
const nouveauVigneron = ref(vigneronVide())
const stockActuel = ref(0)
const champEnErreur = ref<string | null>(null)
const enCours = ref(false)
const charge = ref(!props.id)
const lecture = ref<InstanceType<typeof LectureEtiquette>>()

/** Domaines déjà en base, avec leur nombre de vins et leur(s) appellation(s). */
const domaines = computed<OptionListe[]>(() => {
  const parDomaine = new Map<string, { n: number; appellations: Set<string> }>()
  for (const v of store.vins) {
    const d = parDomaine.get(v.domaine) ?? { n: 0, appellations: new Set<string>() }
    d.n++
    if (v.appellation) d.appellations.add(v.appellation)
    parDomaine.set(v.domaine, d)
  }
  return [...parDomaine]
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([valeur, d]) => ({
      valeur,
      detail: [pluriel(d.n, 'vin'), [...d.appellations].slice(0, 2).join(', ')].filter(Boolean).join(' · '),
    }))
})
/** Appellations : celles de ta cave d'abord, puis celles que le moteur de profil connaît. */
const appellations = computed<OptionListe[]>(() => {
  const compte = new Map<string, number>()
  for (const v of store.vins) if (v.appellation) compte.set(v.appellation, (compte.get(v.appellation) ?? 0) + 1)
  const deLaCave = [...compte].sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([valeur, n]) => ({ valeur, detail: `${pluriel(n, 'vin')} dans ta cave` }))
  const connues = new Set([...compte.keys()].map((a) => a.toLowerCase()))
  const autres = APPELLATIONS.filter((a) => !connues.has(a.nom.toLowerCase()))
    .map((a) => ({ valeur: a.nom, detail: a.region ? REGIONS_VITICOLES[a.region].libelle : undefined }))
    .sort((a, b) => a.valeur.localeCompare(b.valeur, 'fr'))
  return [...deLaCave, ...autres]
})
/** Profils (styles) du moteur, puis ceux déjà saisis dans ta cave. */
const profils = computed<OptionListe[]>(() => {
  const connus = Object.values(STYLES).map((s) => s.libelle)
  const saisis = uniques(store.vins.map((v) => v.style)).filter((s) => !connus.some((c) => c.toLowerCase() === s.toLowerCase()))
  return [...connus, ...saisis].map((valeur) => ({ valeur }))
})
/** Formats : « 37,5 cl - Fillette »…, puis les formats inhabituels déjà saisis. */
const formats = computed<OptionListe[]>(() => {
  const autres = uniques(store.vins.map((v) => v.format))
    .filter((x) => !FORMATS.some((fo) => fo.valeur.replace(/\s/g, '').toLowerCase() === x.replace(/\s/g, '').toLowerCase()))
  return [...FORMATS.map((fo) => ({ valeur: fo.valeur, libelle: `${fo.valeur} - ${fo.nom}` })), ...autres.map((valeur) => ({ valeur }))]
})

/** Catégories : VCC, VCM, VCS, puis celles déjà saisies dans ta cave. */
const categories = computed<OptionListe[]>(() => [
  ...Object.entries(CATEGORIES_VIN).map(([valeur, d]) => ({ valeur, detail: d.replace('Vin de consommation ', 'Conso. ') })),
  ...uniques(store.categories).filter((c) => !(c.toUpperCase() in CATEGORIES_VIN)).map((valeur) => ({ valeur })),
])

onMounted(async () => {
  if (idVin.value === null) return
  try {
    const { vin, avis } = await store.detailVin(idVin.value)
    const t = (x: string | number | null) => (x === null ? '' : String(x))
    Object.assign(f, {
      domaine: vin.domaine, millesime: t(vin.millesime), appellation: t(vin.appellation),
      cuvee: t(vin.cuvee), cru: t(vin.cru), couleur: t(vin.couleur),
      prix: vin.prix === null ? '' : vin.prix.toFixed(2).replace('.', ','),
      cepage: t(vin.cepage), volume_alcool: vin.volume_alcool === null ? '' : nombreCourt(vin.volume_alcool),
      format: t(vin.format), style: t(vin.style), vigneron: vin.id_vigneron ?? AUCUN,
      note: avis[0]?.note === null || avis[0]?.note === undefined ? '' : nombreCourt(avis[0].note),
      categorie: avis[0]?.categorie ?? '',
    })
    stockActuel.value = vin.quantite
    charge.value = true
  } catch (e) {
    ui.erreur(e)
    router.replace('/')
  }
})

// Choisir un domaine déjà connu pré-sélectionne son vigneron
function surDomaine() {
  if (f.vigneron !== AUCUN) return
  const d = f.domaine.trim().toLowerCase()
  if (!d) return
  const connu = store.vins.find((v) => v.domaine.toLowerCase() === d && v.id_vigneron)
  if (connu?.id_vigneron) f.vigneron = connu.id_vigneron
  else {
    const vigneron = store.vignerons.find((v) => v.domaines?.split(', ').some((x) => x.toLowerCase() === d))
    if (vigneron) f.vigneron = vigneron.id_vigneron
  }
}

/**
 * Applique le vin reconnu sur la photo. Ce qui est écrit sur l'étiquette
 * (millésime, degré, contenance) l'emporte sur les données connues.
 */
function appliquerEtiquette(p: Proposition | null, ind: IndicesEtiquette) {
  const t = (x: string | null) => x ?? ''
  if (p) {
    Object.assign(f, {
      domaine: p.domaine, appellation: t(p.appellation), cuvee: t(p.cuvee), couleur: t(p.couleur),
      cepage: t(p.cepage), style: t(p.style),
    })
    if (p.format) f.format = p.format
    if (p.volume_alcool !== null) f.volume_alcool = nombreCourt(p.volume_alcool)
    if (p.prix !== null && !f.prix) f.prix = p.prix.toFixed(2).replace('.', ',')
    if (p.id_vigneron) f.vigneron = p.id_vigneron
    else if (p.vigneron) {
      f.vigneron = NOUVEAU
      nouveauVigneron.value = versFormulaire({ ...p.vigneron, id_vigneron: 0 })
    } else {
      f.vigneron = AUCUN
      surDomaine()
    }
  }
  if (ind.millesime) f.millesime = String(ind.millesime)
  if (ind.volume_alcool !== null) f.volume_alcool = nombreCourt(ind.volume_alcool)
  if (ind.format) f.format = ind.format
  if (ind.couleur && !f.couleur) f.couleur = ind.couleur
  ui.toast(p ? `${p.domaine} : formulaire pré-rempli` : 'Informations de l\'étiquette reprises')
}

function lireChamps(): ChampsVin {
  const verifier = <T,>(cle: string, fn: () => T): T => {
    try {
      return fn()
    } catch (e) {
      champEnErreur.value = cle
      throw e
    }
  }
  champEnErreur.value = null
  if (!texte(f.domaine)) {
    champEnErreur.value = 'domaine'
    throw new Error('Le domaine est obligatoire.')
  }
  return {
    domaine: f.domaine.trim(),
    millesime: verifier('millesime', () => nombre(f.millesime, 'Le millésime', { entier: true, min: 1800, max: 2100 })),
    appellation: texte(f.appellation),
    cuvee: texte(f.cuvee),
    cru: texte(f.cru),
    couleur: texte(f.couleur),
    prix: verifier('prix', () => prix(f.prix)),
    cepage: texte(f.cepage),
    volume_alcool: verifier('volume_alcool', () => nombre(f.volume_alcool, "Le degré d'alcool", { min: 0, max: 100 })),
    format: texte(f.format),
    style: texte(f.style),
  }
}

function lireAvis() {
  try {
    return { note: nombre(f.note, 'La note', { min: 0, max: NOTE_MAX }), categorie: texte(f.categorie) }
  } catch (e) {
    champEnErreur.value = 'note'
    throw e
  }
}

async function enregistrer() {
  try {
    const champs = lireChamps()
    const { note, categorie } = lireAvis()
    let vigneron_nouveau = null
    if (f.vigneron === NOUVEAU) {
      try {
        // sans domaine saisi, le nouveau vigneron prend celui du vin
        vigneron_nouveau = versBase({ ...nouveauVigneron.value, domaine: nouveauVigneron.value.domaine || f.domaine })
      } catch (e) {
        champEnErreur.value = 'v_nom'
        throw e
      }
    }
    enCours.value = true
    if (modification.value) {
      let idVigneron: number | null = f.vigneron > 0 ? f.vigneron : null
      if (vigneron_nouveau) idVigneron = await store.ajouterVigneron(vigneron_nouveau)
      await store.modifierVin(idVin.value!, idVigneron, champs, note, categorie)
      ui.toast('Vin modifié')
    } else {
      const d: AjoutVin = {
        ...champs, quantite: f.quantite, note, categorie,
        vigneron_id: f.vigneron > 0 ? f.vigneron : null, vigneron_nouveau,
      }
      await store.ajouterVin(d)
      ui.toast(d.quantite ? `${pluriel(d.quantite, 'bouteille')} ajoutée${d.quantite > 1 ? 's' : ''}` : 'Vin ajouté')
    }
    vibrer(15)
    router.replace('/')
  } catch (e) {
    ui.erreur(e)
    vibrer(40)
    document.querySelector<HTMLInputElement>(`[name="${champEnErreur.value}"]`)?.focus()
  } finally {
    enCours.value = false
  }
}

async function supprimer() {
  if (idVin.value === null) return
  const { mouvements } = await store.detailVin(idVin.value)
  const msg = `Supprimer « ${f.domaine} ${f.millesime} » ?\n\nSeront aussi supprimés : le stock (${pluriel(stockActuel.value, 'bouteille')}), `
    + `l'avis et ${pluriel(mouvements.length, 'mouvement')} de stock.`
  if (!confirm(msg)) return
  try {
    await store.supprimerVin(idVin.value)
    ui.toast('Vin supprimé')
    router.replace('/')
  } catch (e) {
    ui.erreur(e)
  }
}

function uniques(liste: (string | null)[]): string[] {
  return [...new Set(liste.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, 'fr'))
}

const erreur = (cle: string) => ({ invalide: champEnErreur.value === cle })
</script>

<template>
  <main class="page formulaire">
    <header class="barre">
      <button class="bouton-icone" aria-label="Retour" @click="router.back()">
        <Icone nom="retour" />
      </button>
      <h1>{{ modification ? 'Modifier le vin' : 'Ajouter une bouteille' }}</h1>
      <button
        v-if="!modification"
        type="button"
        class="bouton-icone photo"
        aria-label="Photographier l'étiquette"
        title="Photographier l'étiquette"
        @click="lecture?.prendrePhoto()"
      >
        <Icone nom="photo" />
      </button>
    </header>
    <LectureEtiquette v-if="!modification" ref="lecture" @appliquer="appliquerEtiquette" />

    <form v-if="charge" @submit.prevent="enregistrer">
      <section class="carte">
        <div class="champ" :class="erreur('domaine')">
          <span>Domaine *</span>
          <ChampListe
            v-model="f.domaine"
            name="domaine"
            :options="domaines"
            titre-liste="Domaines de ta cave"
            @choisi="surDomaine"
            @change="surDomaine"
          />
        </div>
        <div class="ligne-2">
          <label class="champ" :class="erreur('millesime')">
            <span>Millésime</span>
            <input v-model="f.millesime" name="millesime" inputmode="numeric" placeholder="2021" maxlength="4" />
          </label>
          <label class="champ" :class="erreur('prix')">
            <span>Prix (€)</span>
            <input v-model="f.prix" name="prix" inputmode="decimal" placeholder="12,50" />
          </label>
        </div>
        <div class="champ">
          <span>Appellation</span>
          <ChampListe v-model="f.appellation" name="appellation" :options="appellations" titre-liste="Appellations" />
        </div>
        <div class="ligne-2">
          <label class="champ">
            <span>Cuvée</span>
            <input v-model="f.cuvee" autocapitalize="sentences" />
          </label>
          <label class="champ">
            <span>Cru</span>
            <input v-model="f.cru" autocapitalize="sentences" />
          </label>
        </div>

        <span class="libelle">Couleur</span>
        <div class="choix">
          <button
            v-for="c in COULEURS"
            :key="c"
            type="button"
            :aria-pressed="f.couleur === c"
            @click="f.couleur = f.couleur === c ? '' : c"
          >
            <span class="point-couleur" :style="{ background: couleurPastille(c) }" />{{ c }}
          </button>
        </div>

        <span class="libelle">Cépages</span>
        <CepageChips v-model="f.cepage" :connus="store.cepages" />
        <div class="champ profil">
          <span>Profil</span>
          <ChampListe v-model="f.style" name="style" :options="profils" titre-liste="Profils" placeholder="Déduit automatiquement" />
        </div>
      </section>

      <h2 class="section-titre">Bouteilles</h2>
      <section class="carte">
        <div v-if="!modification" class="quantite">
          <span>Nombre en cave</span>
          <div class="pas-a-pas">
            <button type="button" aria-label="Moins" :disabled="f.quantite === 0" @click="f.quantite--">
              <Icone nom="moins" />
            </button>
            <strong :class="{ zero: f.quantite === 0 }">{{ f.quantite }}</strong>
            <button type="button" aria-label="Plus" @click="f.quantite++"><Icone nom="plus" /></button>
          </div>
        </div>
        <p v-else class="aide-stock">
          {{ pluriel(stockActuel, 'bouteille') }} en cave — le stock se modifie depuis la pastille de la vignette.
        </p>
        <div class="champ">
          <span>Format</span>
          <ChampListe v-model="f.format" name="format" :options="formats" titre-liste="Formats" placeholder="75 cl" />
        </div>
        <label class="champ" :class="erreur('volume_alcool')">
          <span>Alcool (% vol)</span>
          <input v-model="f.volume_alcool" name="volume_alcool" inputmode="decimal" placeholder="13,5" />
        </label>
      </section>

      <h2 class="section-titre">Vigneron</h2>
      <section class="carte">
        <label class="champ">
          <span>Vigneron</span>
          <select v-model.number="f.vigneron">
            <option :value="AUCUN">— Aucun pour l'instant —</option>
            <option :value="NOUVEAU">➕ Nouveau vigneron…</option>
            <option v-for="v in store.vignerons" :key="v.id_vigneron" :value="v.id_vigneron">
              {{ v.libelle }}{{ v.domaines ? ` — ${v.domaines}` : '' }}
            </option>
          </select>
        </label>
        <VigneronChamps v-if="f.vigneron === NOUVEAU" v-model="nouveauVigneron" :erreur-nom="champEnErreur === 'v_nom'" />
      </section>

      <h2 class="section-titre">Avis (optionnel)</h2>
      <section class="carte ligne-2">
        <label class="champ" :class="erreur('note')">
          <span>Note /100</span>
          <input v-model="f.note" name="note" inputmode="decimal" placeholder="88" />
        </label>
        <div class="champ">
          <span>Catégorie</span>
          <ChampListe v-model="f.categorie" name="categorie" :options="categories" titre-liste="Catégories" />
        </div>
      </section>

      <section v-if="modification" class="zone-suppr">
        <button type="button" class="btn btn-danger btn-large" @click="supprimer">
          <Icone nom="corbeille" :taille="20" /> Supprimer ce vin
        </button>
      </section>


      <div class="valider">
        <button type="submit" class="btn btn-vert btn-large" :disabled="enCours">
          <Icone nom="coche" /> {{ modification ? 'Enregistrer' : 'Ajouter à ma cave' }}
        </button>
      </div>
    </form>
  </main>
</template>

<style scoped>
.barre .photo {
  margin-left: auto;
  color: var(--accent);
}
.libelle {
  display: block;
  font-size: 0.82rem;
  color: var(--discret);
  margin: 4px 0 6px 4px;
}
.quantite {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.quantite > span {
  font-weight: 600;
}
.aide-stock {
  margin: 0 0 14px;
  font-size: 0.88rem;
  color: var(--discret);
}
.pas-a-pas {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pas-a-pas button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--bord);
  display: grid;
  place-items: center;
  color: var(--accent);
  background: var(--carte);
}
.pas-a-pas button:disabled {
  opacity: 0.35;
}
.pas-a-pas strong {
  min-width: 44px;
  text-align: center;
  font-family: var(--serif);
  font-size: 1.6rem;
  color: var(--vert);
}
.pas-a-pas strong.zero {
  color: var(--rouge);
}
.profil {
  margin-top: 14px;
}
.zone-suppr {
  margin-top: 28px;
}
:deep(.cepages input) {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid var(--bord);
  outline: none;
}
:deep(.cepages input:focus) {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-clair);
}
</style>
