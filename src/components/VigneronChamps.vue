<script setup lang="ts">
/**
 * Champs d'un vigneron. Saisir une ville (ou un code postal) propose les
 * communes correspondantes ; en choisir une remplit CP, département, région
 * (ancienne région) et pays.
 */
import { computed, ref } from 'vue'
import ChampListe, { type OptionListe } from './ChampListe.vue'
import { useCaveStore } from '@/stores/cave'
import { chercherParCp, chercherParNom, type Commune } from '@/utils/communes'
import { ANCIENNES_REGIONS } from '@/domain/regions'

export interface ChampsVigneron {
  domaine: string
  prenom: string
  nom: string
  mail: string
  adresse: string
  cp: string
  ville: string
  departement: string
  region: string
  pays: string
}

const v = defineModel<ChampsVigneron>({ required: true })
defineProps<{ erreurNom?: boolean }>()

const store = useCaveStore()
/** Domaines déjà connus (vins et vignerons de la cave). */
const domaines = computed<OptionListe[]>(() => {
  const noms = [...store.vins.map((x) => x.domaine), ...store.vignerons.flatMap((x) => x.domaines?.split(', ') ?? [])]
  const vus = new Map<string, string>()
  for (const n of noms) if (n?.trim() && !vus.has(n.toLowerCase())) vus.set(n.toLowerCase(), n)
  return [...vus.values()].sort((a, b) => a.localeCompare(b, 'fr')).map((valeur) => ({ valeur }))
})

const suggestions = ref<Commune[]>([])
const recherche = ref(false)
let minuteur: ReturnType<typeof setTimeout> | undefined
let requete: AbortController | undefined

function chercher(fn: (q: string, s: AbortSignal) => Promise<Commune[]>, q: string) {
  clearTimeout(minuteur)
  requete?.abort()
  minuteur = setTimeout(async () => {
    requete = new AbortController()
    recherche.value = true
    suggestions.value = await fn(q, requete.signal)
    recherche.value = false
  }, 280)
}

function surVille() {
  chercher(chercherParNom, v.value.ville)
}

function surCp() {
  if (/^\d{5}$/.test(v.value.cp.trim())) chercher(chercherParCp, v.value.cp)
  else suggestions.value = []
}

function choisir(c: Commune) {
  v.value = {
    ...v.value,
    ville: c.ville,
    cp: c.cp,
    departement: c.departement,
    region: c.region ?? v.value.region,
    pays: c.pays,
  }
  suggestions.value = []
}

function fermerPlusTard() {
  // laisse le temps au tap sur une suggestion d'être pris en compte
  setTimeout(() => (suggestions.value = []), 200)
}
</script>

<template>
  <div class="vigneron-champs">
    <div class="champ">
      <span>Domaine</span>
      <ChampListe v-model="v.domaine" name="v_domaine" :options="domaines" titre-liste="Domaines de ta cave" placeholder="Domaine de…" />
    </div>
    <div class="ligne-2">
      <label class="champ"><span>Prénom</span><input v-model="v.prenom" autocapitalize="sentences" autocomplete="off" /></label>
      <label class="champ" :class="{ invalide: erreurNom }">
        <span>Nom *</span><input v-model="v.nom" name="v_nom" autocapitalize="sentences" autocomplete="off" />
      </label>
    </div>
    <label class="champ"><span>Mail</span><input v-model="v.mail" type="email" inputmode="email" autocapitalize="off" /></label>
    <label class="champ"><span>Adresse</span><input v-model="v.adresse" autocapitalize="sentences" autocomplete="off" /></label>

    <div class="ville">
      <div class="ligne-2">
        <label class="champ">
          <span>Ville</span>
          <input
            v-model="v.ville"
            autocapitalize="sentences"
            autocomplete="off"
            enterkeyhint="search"
            @input="surVille"
            @blur="fermerPlusTard"
          />
        </label>
        <label class="champ">
          <span>Code postal</span>
          <input v-model="v.cp" inputmode="numeric" maxlength="5" autocomplete="off" @input="surCp" @blur="fermerPlusTard" />
        </label>
      </div>
      <ul v-if="suggestions.length" class="suggestions" role="listbox">
        <li v-for="c in suggestions" :key="c.ville + c.cp">
          <button type="button" @pointerdown.prevent @click="choisir(c)">
            <strong>{{ c.ville }}</strong>
            <span>{{ c.cp }} · {{ c.departement }}{{ c.region ? ` · ${c.region}` : '' }}</span>
          </button>
        </li>
      </ul>
      <p v-else-if="recherche" class="aide">Recherche…</p>
    </div>

    <div class="ligne-2">
      <label class="champ"><span>Département</span><input v-model="v.departement" autocapitalize="sentences" autocomplete="off" /></label>
      <label class="champ">
        <span>Région</span>
        <input v-model="v.region" list="liste-anciennes-regions" autocapitalize="sentences" autocomplete="off" />
      </label>
    </div>
    <label class="champ"><span>Pays</span><input v-model="v.pays" autocapitalize="sentences" autocomplete="off" /></label>
    <datalist id="liste-anciennes-regions"><option v-for="r in ANCIENNES_REGIONS" :key="r" :value="r" /></datalist>
  </div>
</template>

<style scoped>
.ville {
  position: relative;
}
.suggestions {
  list-style: none;
  margin: -6px 0 12px;
  padding: 4px;
  background: var(--carte);
  border: 1px solid var(--accent);
  border-radius: 12px;
  box-shadow: var(--ombre-forte);
}
.suggestions button {
  width: 100%;
  text-align: left;
  display: grid;
  gap: 1px;
  padding: 10px 12px;
  border-radius: 8px;
}
.suggestions button:active {
  background: var(--accent-clair);
}
.suggestions span {
  font-size: 0.82rem;
  color: var(--discret);
}
.aide {
  margin: -6px 0 10px 4px;
  font-size: 0.82rem;
  color: var(--discret);
}
</style>
