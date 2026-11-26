<script setup lang="ts">
/**
 * Fiche de dégustation : /degustation (choix du vin) puis /degustation/:id.
 * Pré-remplie avec le profil calculé : on ne corrige que ce qui diffère.
 * Ordre classique : Vue -> Nez -> Bouche -> Conclusion.
 */
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Icone from '@/components/Icone.vue'
import CurseurCritere from '@/components/profil/CurseurCritere.vue'
import ChoixAromes from '@/components/profil/ChoixAromes.vue'
import { useCaveStore } from '@/stores/cave'
import { useUiStore, vibrer } from '@/stores/ui'
import type { FicheVin } from '@/domain/types'
import type { Degustation } from '@/domain/profil/types'
import { TEINTES, arrondir, type Critere } from '@/domain/profil/echelles'
import { aujourdhui, nombre, texte } from '@/domain/parsers'
import { couleurPastille, joindre, pluriel } from '@/utils/affichage'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const store = useCaveStore()
const ui = useUiStore()

// ------------------------------------------------------- choix du vin
const recherche = ref('')
const normaliser = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const vinsProposes = computed(() => {
  const q = normaliser(recherche.value.trim())
  return [...store.vins]
    .filter((v) => !q || normaliser([v.domaine, v.appellation, v.cuvee, v.cru, v.millesime].join(' ')).includes(q))
    .sort((a, b) => Number(b.quantite > 0) - Number(a.quantite > 0) || a.domaine.localeCompare(b.domaine, 'fr'))
})

// ------------------------------------------------------------ la fiche
const fiche = ref<FicheVin | null>(null)
const STRUCTURE_GOUT: Critere[] = ['sucre', 'acidite', 'amertume', 'salinite', 'alcool']
const STRUCTURE_TOUCHER: Critere[] = ['tanins', 'corps', 'effervescence', 'longueur']
const CONCLUSIONS = ['Trop jeune', 'À boire', 'À son apogée', 'À boire vite', 'Passé']

const f = reactive({
  date: aujourdhui(),
  teinte: null as number | null,
  valeurs: {} as Record<Critere, number | null>,
  aromes: {} as Record<string, number>,
  note: '',
  conclusion: null as string | null,
  commentaire: '',
  retirer: false,
})
const enCours = ref(false)

watch(
  () => props.id,
  async (id) => {
    fiche.value = null
    if (!id) return
    try {
      const fi = await store.detailVin(Number(id))
      const p = fi.profil
      f.date = aujourdhui()
      f.teinte = Math.round(p.teinte.valeur)
      for (const [k, v] of Object.entries(p.criteres)) {
        f.valeurs[k as Critere] = k === 'longueur' ? Math.round(v.valeur) : arrondir(v.valeur)
      }
      f.aromes = Object.fromEntries(
        Object.entries(p.aromes).filter(([, v]) => v >= 0.25).map(([k, v]) => [k, v >= 0.6 ? 1 : 0.5]),
      )
      f.note = ''
      f.conclusion = null
      f.commentaire = ''
      f.retirer = fi.vin.quantite > 0
      fiche.value = fi
    } catch (e) {
      ui.erreur(e)
      router.replace('/degustation')
    }
  },
  { immediate: true },
)

const teintes = computed(() => (fiche.value ? TEINTES[fiche.value.profil.famille] : []))
const effervescent = computed(() => (fiche.value?.profil.criteres.effervescence.valeur ?? 0) > 0)

async function enregistrer() {
  if (!fiche.value) return
  let note: number | null
  try {
    note = nombre(f.note, 'La note', { min: 0, max: 100 })
  } catch (e) {
    ui.erreur(e)
    return
  }
  const v = f.valeurs
  const d: Degustation = {
    id_vin: fiche.value.vin.id_vin,
    date_degustation: f.date || aujourdhui(),
    teinte: f.teinte,
    intensite_robe: v.intensite_robe, intensite_nez: v.intensite_nez, aromes: f.aromes,
    sucre: v.sucre, acidite: v.acidite, amertume: v.amertume, salinite: v.salinite, alcool: v.alcool,
    tanins: v.tanins, corps: v.corps, effervescence: effervescent.value ? v.effervescence : 0, longueur: v.longueur,
    note, conclusion: f.conclusion, commentaire: texte(f.commentaire),
  }
  enCours.value = true
  try {
    await store.ajouterDegustation(d, f.retirer)
    vibrer(15)
    ui.toast(f.retirer ? 'Dégustation enregistrée, une bouteille retirée' : 'Dégustation enregistrée')
    router.replace('/')
  } catch (e) {
    ui.erreur(e)
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <!-- 1. Choix du vin -->
  <main v-if="!id" class="page">
    <header class="barre">
      <button class="bouton-icone" aria-label="Retour" @click="router.back()"><Icone nom="retour" /></button>
      <h1>Quel vin dégustes-tu ?</h1>
    </header>
    <label class="recherche">
      <Icone nom="recherche" :taille="20" />
      <input v-model="recherche" type="search" placeholder="Domaine, appellation, millésime…" enterkeyhint="search" />
    </label>
    <ul class="vins">
      <li v-for="v in vinsProposes" :key="v.id_vin">
        <button @click="router.replace(`/degustation/${v.id_vin}`)">
          <span class="point-couleur" :style="{ background: couleurPastille(v.couleur) }" />
          <span class="infos">
            <strong>{{ v.domaine }} {{ v.millesime ?? '' }}</strong>
            <small>{{ joindre(v.appellation, v.cuvee, v.cru) }}</small>
          </span>
          <span class="badge" :class="{ vide: v.quantite === 0 }">{{ v.quantite }}</span>
        </button>
      </li>
    </ul>
    <p v-if="!vinsProposes.length" class="vide">Aucun vin ne correspond.</p>
  </main>

  <!-- 2. La fiche de dégustation -->
  <main v-else class="page formulaire">
    <header class="barre">
      <button class="bouton-icone" aria-label="Retour" @click="router.back()"><Icone nom="retour" /></button>
      <h1>Dégustation</h1>
    </header>

    <form v-if="fiche" @submit.prevent="enregistrer">
      <section class="vin">
        <span class="point-couleur" :style="{ background: couleurPastille(fiche.vin.couleur) }" />
        <div>
          <strong>{{ fiche.vin.domaine }} {{ fiche.vin.millesime ?? '' }}</strong>
          <small>{{ joindre(fiche.vin.appellation, fiche.vin.cuvee, fiche.vin.cru) }}</small>
        </div>
      </section>
      <p class="aide">
        Pré-remplie avec le profil calculé (trait sur chaque curseur) : corrige ce que tu perçois différemment.
      </p>

      <h2 class="section-titre">👁 Vue</h2>
      <section class="carte">
        <span class="libelle">Teinte</span>
        <div class="teintes">
          <button
            v-for="(t, i) in teintes"
            :key="t.libelle"
            type="button"
            :aria-pressed="f.teinte === i"
            @click="f.teinte = i"
          >
            <i :style="{ background: t.couleur }" />{{ t.libelle }}
          </button>
        </div>
        <CurseurCritere v-model="f.valeurs.intensite_robe" critere="intensite_robe" :calcul="fiche.profil.criteres.intensite_robe.valeur" />
      </section>

      <h2 class="section-titre">👃 Nez</h2>
      <section class="carte">
        <CurseurCritere v-model="f.valeurs.intensite_nez" critere="intensite_nez" :calcul="fiche.profil.criteres.intensite_nez.valeur" />
        <span class="libelle">Arômes perçus — touche pour doser (½, puis net, puis retirer)</span>
        <ChoixAromes v-model="f.aromes" />
      </section>

      <h2 class="section-titre">👅 Goût</h2>
      <section class="carte">
        <CurseurCritere
          v-for="c in STRUCTURE_GOUT"
          :key="c"
          v-model="f.valeurs[c]"
          :critere="c"
          :calcul="fiche.profil.criteres[c].valeur"
        />
      </section>

      <h2 class="section-titre">✋ Toucher</h2>
      <section class="carte">
        <template v-for="c in STRUCTURE_TOUCHER" :key="c">
          <CurseurCritere
            v-if="c !== 'effervescence' || effervescent"
            v-model="f.valeurs[c]"
            :critere="c"
            :calcul="fiche.profil.criteres[c].valeur"
          />
        </template>
      </section>

      <h2 class="section-titre">Conclusion</h2>
      <section class="carte">
        <div class="ligne-2">
          <label class="champ">
            <span>Note /100</span>
            <input v-model="f.note" inputmode="decimal" placeholder="88" />
          </label>
          <label class="champ">
            <span>Date</span>
            <input v-model="f.date" type="date" />
          </label>
        </div>
        <span class="libelle">Potentiel</span>
        <div class="choix">
          <button
            v-for="c in CONCLUSIONS"
            :key="c"
            type="button"
            :aria-pressed="f.conclusion === c"
            @click="f.conclusion = f.conclusion === c ? null : c"
          >
            {{ c }}
          </button>
        </div>
        <label class="champ">
          <span>Commentaire</span>
          <textarea v-model="f.commentaire" rows="3" autocapitalize="sentences" placeholder="Accord, contexte, impression…" />
        </label>
        <label v-if="fiche.vin.quantite > 0" class="retirer">
          <input v-model="f.retirer" type="checkbox" />
          Retirer une bouteille du stock ({{ pluriel(fiche.vin.quantite, 'bouteille') }} en cave)
        </label>
      </section>

      <div class="valider">
        <button type="submit" class="btn btn-vert btn-large" :disabled="enCours">
          <Icone nom="coche" /> Enregistrer la dégustation
        </button>
      </div>
    </form>
  </main>
</template>

<style scoped>
.recherche {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--carte);
  border: 1px solid var(--bord);
  border-radius: 999px;
  padding: 0 16px;
  color: var(--discret);
  margin-bottom: 12px;
}
.recherche input {
  flex: 1;
  min-height: 46px;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--texte);
}
.vins {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
}
.vins button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--rayon);
  background: var(--carte);
  box-shadow: var(--ombre);
  text-align: left;
}
.infos {
  flex: 1;
  min-width: 0;
  display: grid;
}
.infos small,
.vin small {
  color: var(--discret);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vin {
  display: flex;
  align-items: center;
  gap: 12px;
}
.vin div {
  display: grid;
  min-width: 0;
}
.aide {
  font-size: 0.84rem;
  color: var(--discret);
  margin: 10px 4px 0;
}
.libelle {
  display: block;
  font-size: 0.82rem;
  color: var(--discret);
  margin: 4px 0 8px;
}
.teintes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 6px;
}
.teintes button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border-radius: 12px;
  border: 1px solid var(--bord);
  font-size: 0.8rem;
  text-transform: capitalize;
}
.teintes button[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent-clair);
  font-weight: 700;
}
.teintes i {
  flex: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 12%);
}
textarea {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--bord);
  outline: none;
  resize: vertical;
}
textarea:focus {
  border-color: var(--accent);
}
.retirer {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
}
.retirer input {
  width: 20px;
  height: 20px;
  accent-color: var(--accent);
}
</style>
