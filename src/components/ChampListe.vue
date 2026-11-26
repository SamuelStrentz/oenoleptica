<script setup lang="ts">
/**
 * Champ texte avec une flèche à droite qui déroule une liste de choix
 * (ex. les domaines déjà en base). Taper filtre la liste ; on peut aussi
 * saisir une valeur nouvelle.
 */
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import Icone from './Icone.vue'

export interface OptionListe {
  valeur: string
  /** Texte affiché dans la liste, si différent de la valeur enregistrée. */
  libelle?: string
  detail?: string
}

const modele = defineModel<string>({ required: true })
const props = defineProps<{ options: OptionListe[]; name?: string; placeholder?: string; titreListe?: string }>()
const emit = defineEmits<{ choisi: [valeur: string] }>()

const racine = ref<HTMLElement>()
const ouverte = ref(false)
/** Liste dépliée au-dessus du champ quand il n'y a pas la place en dessous. */
const versHaut = ref(false)
const hauteurMax = ref(290)

/** Place disponible sous le champ, hors barre « Enregistrer » collée en bas. */
const RESERVE_BAS = 110
function placer() {
  const r = racine.value?.getBoundingClientRect()
  if (!r) return
  const titre = 34
  const besoin = Math.min(290, visibles.value.length * 56 + 8) + titre
  const dessous = window.innerHeight - r.bottom - RESERVE_BAS
  const dessus = r.top - 16
  versHaut.value = dessous < besoin && dessus > dessous
  hauteurMax.value = Math.max(120, Math.min(290, (versHaut.value ? dessus : dessous) - titre - 12))
}
/** Liste ouverte par la flèche : tout afficher ; par la saisie : filtrer. */
const filtrer = ref(false)

const normaliser = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const visibles = computed(() => {
  const q = normaliser(modele.value)
  if (!filtrer.value || !q) return props.options
  return props.options.filter((o) => normaliser(o.libelle ?? o.valeur).includes(q))
})

function basculer() {
  filtrer.value = false
  ouverte.value = !ouverte.value
  if (ouverte.value) {
    placer()
    nextTick(() => racine.value?.querySelector('.options-liste')?.scrollTo({ top: 0 }))
  }
}

function surSaisie() {
  filtrer.value = true
  if (!ouverte.value) placer()
  ouverte.value = visibles.value.length > 0
}

function choisir(o: OptionListe) {
  modele.value = o.valeur
  ouverte.value = false
  emit('choisi', o.valeur)
}

function surDehors(e: PointerEvent) {
  if (ouverte.value && !racine.value?.contains(e.target as Node)) ouverte.value = false
}
document.addEventListener('pointerdown', surDehors)
onBeforeUnmount(() => document.removeEventListener('pointerdown', surDehors))
</script>

<template>
  <div ref="racine" class="champ-liste" :class="{ ouverte }">
    <input
      v-model="modele"
      :name="name"
      :placeholder="placeholder"
      autocapitalize="sentences"
      autocomplete="off"
      role="combobox"
      :aria-expanded="ouverte"
      @input="surSaisie"
      @keydown.escape="ouverte = false"
    />
    <button
      v-if="options.length"
      type="button"
      class="fleche"
      :aria-label="ouverte ? 'Fermer la liste' : 'Afficher la liste'"
      @click="basculer"
    >
      <Icone nom="chevron" :taille="20" />
    </button>
    <Transition name="liste">
      <div v-if="ouverte && visibles.length" class="panneau-liste" :class="{ 'vers-haut': versHaut }">
        <p v-if="titreListe && !filtrer" class="titre-liste">{{ titreListe }}</p>
        <ul class="options-liste" role="listbox" :style="{ maxHeight: `${hauteurMax}px` }">
          <li v-for="o in visibles" :key="o.valeur">
            <button type="button" role="option" :aria-selected="o.valeur === modele" @pointerdown.prevent @click="choisir(o)">
              <span v-if="/\p{L}/u.test(o.valeur.charAt(0))" class="initiale">{{ o.valeur.charAt(0).toUpperCase() }}</span>
              <span class="textes">
                <strong>{{ o.libelle ?? o.valeur }}</strong>
                <small v-if="o.detail">{{ o.detail }}</small>
              </span>
              <Icone v-if="o.valeur === modele" nom="coche" :taille="18" />
            </button>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.champ-liste {
  position: relative;
}
.champ-liste input {
  padding-right: 48px !important;
}
.fleche {
  position: absolute;
  right: 4px;
  top: 4px;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: var(--accent);
  transition: transform 0.2s ease, background 0.15s;
}
.fleche:active {
  background: var(--accent-clair);
}
.ouverte .fleche {
  transform: rotate(180deg);
}
.panneau-liste {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  z-index: 20;
  background: var(--carte);
  border: 1px solid var(--bord);
  border-radius: 16px;
  box-shadow: var(--ombre-forte);
  overflow: hidden;
}
.panneau-liste.vers-haut {
  top: auto;
  bottom: calc(100% + 6px);
}
.titre-liste {
  margin: 0;
  padding: 10px 14px 6px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}
.options-liste {
  list-style: none;
  margin: 0;
  padding: 4px;
  max-height: 290px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.options-liste button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 10px;
  border-radius: 12px;
  text-align: left;
  color: var(--texte);
}
.options-liste button[aria-selected='true'] {
  background: var(--accent-clair);
  color: var(--accent);
}
.initiale {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--accent-clair);
  color: var(--accent);
  font-family: var(--serif);
  font-weight: 700;
}
.textes {
  flex: 1;
  min-width: 0;
  display: grid;
}
.textes strong {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.textes small {
  color: var(--discret);
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.liste-enter-active,
.liste-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.liste-enter-from,
.liste-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.vers-haut.liste-enter-from,
.vers-haut.liste-leave-to {
  transform: translateY(6px);
}
</style>
