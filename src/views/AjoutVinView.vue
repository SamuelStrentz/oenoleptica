<script setup lang="ts">
/** Ajouter un vin (et ses bouteilles) — équivalent du formulaire « Ajouter un vin » du desktop. */
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icone from '@/components/Icone.vue'
import CepageChips from '@/components/CepageChips.vue'
import { useCaveStore } from '@/stores/cave'
import { useUiStore, vibrer } from '@/stores/ui'
import { COULEURS, FORMATS, type AjoutVin } from '@/domain/types'
import { nombre, prix, texte } from '@/domain/parsers'
import { couleurPastille, pluriel } from '@/utils/affichage'

const NOUVEAU = -1
const AUCUN = 0

const router = useRouter()
const store = useCaveStore()
const ui = useUiStore()

const f = reactive({
  domaine: '', millesime: '', appellation: '', cuvee: '', cru: '',
  couleur: '', prix: '', cepage: '', volume_alcool: '', format: '75 cl',
  quantite: 1, note: '', categorie: '',
  vigneron: AUCUN as number,
  v_prenom: '', v_nom: '', v_mail: '', v_ville: '', v_cp: '',
  v_departement: '', v_region: '', v_pays: 'France',
})
const champEnErreur = ref<string | null>(null)
const enCours = ref(false)

// Suggestions tirées de la cave existante
const domaines = computed(() => uniques(store.vins.map((v) => v.domaine)))
const appellations = computed(() => uniques(store.vins.map((v) => v.appellation)))

// Choisir un domaine déjà connu pré-sélectionne son vigneron
function surDomaine() {
  if (f.vigneron !== AUCUN) return
  const connu = store.vins.find((v) => v.domaine.toLowerCase() === f.domaine.trim().toLowerCase() && v.id_vigneron)
  if (connu?.id_vigneron) f.vigneron = connu.id_vigneron
}

function lire(): AjoutVin {
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
  const nouveau = f.vigneron === NOUVEAU
  if (nouveau && !texte(f.v_nom)) {
    champEnErreur.value = 'v_nom'
    throw new Error('Le nom du nouveau vigneron est obligatoire.')
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
    quantite: f.quantite,
    note: verifier('note', () => nombre(f.note, 'La note', { min: 0 })),
    categorie: texte(f.categorie),
    vigneron_id: f.vigneron > 0 ? f.vigneron : null,
    vigneron_nouveau: nouveau
      ? {
          prenom: texte(f.v_prenom), nom: f.v_nom.trim(), mail: texte(f.v_mail),
          adresse: null, cp: texte(f.v_cp), ville: texte(f.v_ville),
          departement: texte(f.v_departement), region: texte(f.v_region), pays: texte(f.v_pays),
        }
      : null,
  }
}

async function enregistrer() {
  let donnees: AjoutVin
  try {
    donnees = lire()
  } catch (e) {
    ui.erreur(e)
    vibrer(40)
    document.querySelector<HTMLInputElement>(`[name="${champEnErreur.value}"]`)?.focus()
    return
  }
  enCours.value = true
  try {
    await store.ajouterVin(donnees)
    vibrer(15)
    ui.toast(donnees.quantite ? `${pluriel(donnees.quantite, 'bouteille')} ajoutée${donnees.quantite > 1 ? 's' : ''}` : 'Vin ajouté')
    router.replace('/')
  } catch (e) {
    ui.erreur(e)
  } finally {
    enCours.value = false
  }
}

function uniques(liste: (string | null)[]): string[] {
  return [...new Set(liste.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, 'fr'))
}

const erreur = (cle: string) => ({ invalide: champEnErreur.value === cle })
</script>

<template>
  <main class="page ajout">
    <header class="barre">
      <button class="bouton-icone" aria-label="Retour" @click="router.back()">
        <Icone nom="retour" />
      </button>
      <h1>Ajouter une bouteille</h1>
    </header>

    <form @submit.prevent="enregistrer">
      <section class="carte">
        <label class="champ" :class="erreur('domaine')">
          <span>Domaine *</span>
          <input v-model="f.domaine" name="domaine" list="liste-domaines" autocapitalize="words" autocomplete="off" @change="surDomaine" />
        </label>
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
        <label class="champ">
          <span>Appellation</span>
          <input v-model="f.appellation" list="liste-appellations" autocapitalize="words" autocomplete="off" />
        </label>
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
      </section>

      <h2 class="section-titre">Bouteilles</h2>
      <section class="carte">
        <div class="quantite">
          <span>Nombre en cave</span>
          <div class="pas-a-pas">
            <button type="button" aria-label="Moins" :disabled="f.quantite === 0" @click="f.quantite--">
              <Icone nom="moins" />
            </button>
            <strong :class="{ vide: f.quantite === 0 }">{{ f.quantite }}</strong>
            <button type="button" aria-label="Plus" @click="f.quantite++"><Icone nom="plus" /></button>
          </div>
        </div>
        <span class="libelle">Format</span>
        <div class="choix">
          <button
            v-for="fo in FORMATS"
            :key="fo"
            type="button"
            :aria-pressed="f.format === fo"
            @click="f.format = f.format === fo ? '' : fo"
          >
            {{ fo }}
          </button>
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
        <template v-if="f.vigneron === NOUVEAU">
          <div class="ligne-2">
            <label class="champ"><span>Prénom</span><input v-model="f.v_prenom" autocapitalize="words" /></label>
            <label class="champ" :class="erreur('v_nom')">
              <span>Nom *</span><input v-model="f.v_nom" name="v_nom" autocapitalize="words" />
            </label>
          </div>
          <label class="champ"><span>Mail</span><input v-model="f.v_mail" type="email" inputmode="email" /></label>
          <div class="ligne-2">
            <label class="champ"><span>Ville</span><input v-model="f.v_ville" autocapitalize="words" /></label>
            <label class="champ"><span>Code postal</span><input v-model="f.v_cp" inputmode="numeric" /></label>
          </div>
          <div class="ligne-2">
            <label class="champ"><span>Département</span><input v-model="f.v_departement" autocapitalize="words" /></label>
            <label class="champ"><span>Région</span><input v-model="f.v_region" autocapitalize="words" /></label>
          </div>
          <label class="champ"><span>Pays</span><input v-model="f.v_pays" autocapitalize="words" /></label>
        </template>
      </section>

      <h2 class="section-titre">Avis (optionnel)</h2>
      <section class="carte ligne-2">
        <label class="champ" :class="erreur('note')">
          <span>Note</span>
          <input v-model="f.note" name="note" inputmode="decimal" placeholder="16" />
        </label>
        <label class="champ">
          <span>Catégorie</span>
          <input v-model="f.categorie" list="liste-categories" autocapitalize="sentences" />
        </label>
      </section>

      <datalist id="liste-domaines"><option v-for="d in domaines" :key="d" :value="d" /></datalist>
      <datalist id="liste-appellations"><option v-for="a in appellations" :key="a" :value="a" /></datalist>
      <datalist id="liste-categories"><option v-for="c in store.categories" :key="c" :value="c" /></datalist>

      <div class="valider">
        <button type="submit" class="btn btn-vert btn-large" :disabled="enCours">
          <Icone nom="coche" /> Ajouter à ma cave
        </button>
      </div>
    </form>
  </main>
</template>

<style scoped>
.ajout {
  padding-bottom: calc(var(--bas-sur) + 110px);
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
.pas-a-pas strong.vide {
  color: var(--rouge);
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
.valider {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 14px 16px calc(var(--bas-sur) + 14px);
  background: linear-gradient(transparent, var(--fond) 30%);
  z-index: 10;
}
</style>
