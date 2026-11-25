<script setup lang="ts">
/** Radar de la structure du vin : profil calculé (pointillés) et ta dégustation (plein). */
import { computed } from 'vue'
import type { Critere } from '@/domain/profil/echelles'

type Valeurs = Partial<Record<Critere, number | null>>
const props = defineProps<{ calcul: Valeurs; degustation?: Valeurs | null }>()

const AXES: { cle: Critere; court: string }[] = [
  { cle: 'acidite', court: 'Acidité' },
  { cle: 'sucre', court: 'Sucre' },
  { cle: 'tanins', court: 'Tanins' },
  { cle: 'corps', court: 'Corps' },
  { cle: 'alcool', court: 'Alcool' },
  { cle: 'amertume', court: 'Amertume' },
  { cle: 'salinite', court: 'Salinité' },
  { cle: 'longueur', court: 'Longueur' },
  { cle: 'intensite_nez', court: 'Nez' },
  { cle: 'effervescence', court: 'Bulles' },
]

const C = 150
const R = 92
const axes = computed(() =>
  AXES.filter((a) => a.cle !== 'effervescence' || (props.calcul.effervescence ?? 0) > 0 || (props.degustation?.effervescence ?? 0) > 0),
)

/** Ramène chaque critère sur 0-5 (la longueur est en caudalies, sur 12). */
const norme = (cle: Critere, v: number | null | undefined) => (v === null || v === undefined ? null : cle === 'longueur' ? (v / 12) * 5 : v)

function point(i: number, valeur: number, rayon = R) {
  const angle = -Math.PI / 2 + (2 * Math.PI * i) / axes.value.length
  return [C + Math.cos(angle) * (rayon * valeur) / 5, C + Math.sin(angle) * (rayon * valeur) / 5]
}

function polygone(valeurs: Valeurs) {
  return axes.value.map((a, i) => point(i, norme(a.cle, valeurs[a.cle]) ?? 0).join(',')).join(' ')
}

const anneaux = [1, 2, 3, 4, 5]
const avecDegustation = computed(() => !!props.degustation && axes.value.some((a) => props.degustation![a.cle] != null))
</script>

<template>
  <figure class="radar">
    <svg viewBox="0 0 300 300" role="img" aria-label="Radar de la structure du vin">
      <polygon
        v-for="n in anneaux"
        :key="n"
        :points="axes.map((_, i) => point(i, n).join(',')).join(' ')"
        class="anneau"
      />
      <line v-for="(a, i) in axes" :key="a.cle" :x1="C" :y1="C" :x2="point(i, 5)[0]" :y2="point(i, 5)[1]" class="axe" />
      <polygon :points="polygone(calcul)" class="calcul" />
      <polygon v-if="avecDegustation" :points="polygone(degustation!)" class="degustation" />
      <text
        v-for="(a, i) in axes"
        :key="'t' + a.cle"
        :x="point(i, 6.3)[0]"
        :y="point(i, 6.3)[1]"
        text-anchor="middle"
        dominant-baseline="middle"
        class="etiquette"
      >
        {{ a.court }}
      </text>
    </svg>
    <figcaption>
      <span><i class="pointilles" /> Profil calculé</span>
      <span v-if="avecDegustation"><i class="plein" /> Ta dégustation</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.radar {
  margin: 0;
}
svg {
  width: 100%;
  max-width: 340px;
  display: block;
  margin: 0 auto;
}
.anneau {
  fill: none;
  stroke: var(--bord);
  stroke-width: 1;
}
.axe {
  stroke: var(--bord);
  stroke-width: 1;
}
.calcul {
  fill: rgb(140 33 66 / 10%);
  stroke: var(--accent);
  stroke-width: 2;
  stroke-dasharray: 5 4;
}
.degustation {
  fill: rgb(46 158 91 / 22%);
  stroke: var(--vert-fonce);
  stroke-width: 2.5;
}
.etiquette {
  font-size: 11.5px;
  fill: var(--discret);
  font-family: var(--sans);
}
figcaption {
  display: flex;
  justify-content: center;
  gap: 16px;
  font-size: 0.8rem;
  color: var(--discret);
}
figcaption span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
figcaption i {
  display: inline-block;
  width: 18px;
  height: 0;
}
.pointilles {
  border-top: 2px dashed var(--accent);
}
.plein {
  border-top: 3px solid var(--vert-fonce);
}
</style>
