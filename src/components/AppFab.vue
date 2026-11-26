<script setup lang="ts">
/**
 * Bouton central vert.
 *  - Tap court            : ajouter une bouteille (ou un vigneron, sur la page Vignerons).
 *  - Appui long + glisser : menu en croix —
 *      ← Vignerons   ↑ Déguster (fiche de dégustation)   → Profil   ↓ Accueil
 *    On relâche sur une direction pour y aller, au centre pour annuler.
 *    Glisser franchement sans attendre ouvre aussi le menu.
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icone, { type CHEMINS } from './Icone.vue'
import { vibrer } from '@/stores/ui'

type Direction = 'gauche' | 'haut' | 'droite' | 'bas'

const ACTIONS: Record<Direction, { libelle: string; icone: keyof typeof CHEMINS; route: string }> = {
  gauche: { libelle: 'Vignerons', icone: 'vigneron', route: '/vignerons' },
  haut: { libelle: 'Déguster', icone: 'verre', route: '/degustation' },
  droite: { libelle: 'Profil', icone: 'profil', route: '/profil' },
  bas: { libelle: 'Accueil', icone: 'maison', route: '/' },
}
const ORDRE: Direction[] = ['haut', 'gauche', 'droite', 'bas']

const DELAI_APPUI_LONG = 320 // ms
const SEUIL_GLISSE = 26 // px : au-delà, le menu s'ouvre sans attendre
const SEUIL_CIBLE = 34 // px : distance minimale pour viser une direction

const router = useRouter()
const route = useRoute()
const appuye = ref(false)
const ouvert = ref(false)
const cible = ref<Direction | null>(null)
let depart = { x: 0, y: 0 }
let minuteur: ReturnType<typeof setTimeout> | undefined

const visible = computed(() => !route.meta.formulaire)
/** Tap court : nouveau vigneron sur la page des vignerons, sinon nouvelle bouteille. */
const cibleTap = computed(() => (route.path === '/vignerons' ? '/vignerons/nouveau' : '/ajout'))
const libelleTap = computed(() => (route.path === '/vignerons' ? 'Ajouter un vigneron' : 'Ajouter une bouteille'))

const consigne = computed(() => (cible.value ? ACTIONS[cible.value].libelle : 'Glisse vers une action'))

function ouvrir() {
  if (ouvert.value) return
  ouvert.value = true
  vibrer(18)
}

function surAppui(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  depart = { x: e.clientX, y: e.clientY }
  appuye.value = true
  minuteur = setTimeout(ouvrir, DELAI_APPUI_LONG)
}

function surDeplacement(e: PointerEvent) {
  if (!appuye.value) return
  const dx = e.clientX - depart.x
  const dy = e.clientY - depart.y
  const distance = Math.hypot(dx, dy)
  if (!ouvert.value) {
    if (distance < SEUIL_GLISSE) return
    clearTimeout(minuteur)
    ouvrir()
  }
  const nouvelle: Direction | null =
    distance < SEUIL_CIBLE ? null : Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'gauche' : 'droite') : dy < 0 ? 'haut' : 'bas'
  if (nouvelle !== cible.value) {
    cible.value = nouvelle
    if (nouvelle) vibrer(8)
  }
}

function surRelache() {
  clearTimeout(minuteur)
  const etaitOuvert = ouvert.value
  const choix = cible.value
  reinitialiser()
  if (!etaitOuvert) aller(cibleTap.value)
  else if (choix) aller(ACTIONS[choix].route)
}

function reinitialiser() {
  clearTimeout(minuteur)
  appuye.value = false
  ouvert.value = false
  cible.value = null
}

function aller(chemin: string) {
  if (route.path !== chemin) router.push(chemin)
}

onBeforeUnmount(() => clearTimeout(minuteur))
</script>

<template>
  <Transition name="voile">
    <div v-if="ouvert" class="voile" aria-hidden="true">
      <div class="radial">
        <div class="moyeu" :class="{ actif: cible }">{{ consigne }}</div>
        <div
          v-for="d in ORDRE"
          :key="d"
          class="satellite"
          :class="[d, { actif: cible === d }]"
        >
          <span class="rond"><Icone :nom="ACTIONS[d].icone" :taille="26" /></span>
          <span class="etiquette">{{ ACTIONS[d].libelle }}</span>
        </div>
      </div>
    </div>
  </Transition>

  <button
    v-show="visible"
    class="fab"
    :class="{ appuye, ouvert }"
    :aria-label="`${libelleTap} (appui long : autres actions)`"
    @pointerdown="surAppui"
    @pointermove="surDeplacement"
    @pointerup="surRelache"
    @pointercancel="reinitialiser"
    @contextmenu.prevent
    @keydown.enter.prevent="aller(cibleTap)"
    @keydown.space.prevent="aller(cibleTap)"
  >
    <Icone nom="plus" :taille="32" />
  </button>
</template>

<style scoped>
.fab {
  position: fixed;
  left: 50%;
  bottom: calc(var(--bas-sur) + 20px);
  width: 68px;
  height: 68px;
  margin-left: -34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--vert);
  color: #fff;
  box-shadow: 0 6px 18px rgb(46 158 91 / 45%), 0 2px 4px rgb(0 0 0 / 12%);
  z-index: 60;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  transition: transform 0.18s cubic-bezier(0.3, 1.4, 0.5, 1), background 0.15s;
}
.fab.appuye {
  transform: scale(0.9);
  background: var(--vert-fonce);
}
.fab.ouvert {
  transform: scale(0.82) rotate(45deg);
}

/* Voile + menu en croix, au-dessus du bouton */
.voile {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgb(43 35 38 / 50%);
  backdrop-filter: blur(3px);
  pointer-events: none;
}
.radial {
  --rayon-croix: 92px;
  position: absolute;
  left: 50%;
  bottom: calc(var(--bas-sur) + 20px + 34px + 196px);
  width: 0;
  height: 0;
}
.moyeu {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -50%);
  width: 104px;
  height: 104px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 12px;
  font-size: 0.8rem;
  line-height: 1.2;
  color: #fff;
  border: 2px dashed rgb(255 255 255 / 45%);
  transition: all 0.15s;
}
.moyeu.actif {
  border-style: solid;
  border-color: rgb(255 255 255 / 85%);
  font-weight: 700;
}
.satellite {
  position: absolute;
  left: 0;
  top: 0;
  display: grid;
  justify-items: center;
  gap: 6px;
  animation: sortir 0.22s cubic-bezier(0.3, 1.4, 0.5, 1) both;
}
.satellite.haut {
  --x: 0px;
  --y: calc(-1 * var(--rayon-croix) - 28px);
}
.satellite.bas {
  --x: 0px;
  --y: calc(var(--rayon-croix) + 28px);
}
.satellite.gauche {
  --x: calc(-1 * var(--rayon-croix) - 26px);
  --y: 0px;
}
.satellite.droite {
  --x: calc(var(--rayon-croix) + 26px);
  --y: 0px;
}
.satellite {
  transform: translate(calc(-50% + var(--x)), calc(-30px + var(--y)));
}
.rond {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--carte);
  color: var(--bordeaux);
  display: grid;
  place-items: center;
  box-shadow: var(--ombre-forte);
  transition: transform 0.15s, background 0.15s, color 0.15s;
}
.etiquette {
  color: #fff;
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgb(0 0 0 / 40%);
}
.satellite.bas .etiquette {
  /* sous le cercle il y a le bouton : l'étiquette passe à droite */
  position: absolute;
  left: calc(100% + 10px);
  top: 20px;
}
.satellite.actif .rond {
  background: var(--vert);
  color: #fff;
  transform: scale(1.18);
}
@keyframes sortir {
  from {
    opacity: 0;
    transform: translate(-50%, -30px) scale(0.4);
  }
}
.voile-enter-active,
.voile-leave-active {
  transition: opacity 0.15s;
}
.voile-enter-from,
.voile-leave-to {
  opacity: 0;
}
</style>
