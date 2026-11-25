<script setup lang="ts">
/** Roue des arômes : un pétale par arôme, coloré par famille, long selon l'intensité. */
import { computed } from 'vue'
import { DESCRIPTEURS, FAMILLES, PAR_DESCRIPTEUR, PAR_FAMILLE } from '@/domain/profil/aromes'

const props = defineProps<{ aromes: Record<string, number> }>()

const C = 150
const R_INT = 34
const R_EXT = 112
const ordreFamille = Object.fromEntries(FAMILLES.map((f, i) => [f.cle, i]))
const ordreDesc = Object.fromEntries(DESCRIPTEURS.map((d, i) => [d.cle, i]))

const petales = computed(() => {
  const liste = Object.entries(props.aromes)
    .filter(([k, v]) => v >= 0.15 && PAR_DESCRIPTEUR[k])
    .sort((a, b) => ordreFamille[PAR_DESCRIPTEUR[a[0]].famille] - ordreFamille[PAR_DESCRIPTEUR[b[0]].famille]
      || ordreDesc[a[0]] - ordreDesc[b[0]])
  const n = Math.max(liste.length, 1)
  const pas = (2 * Math.PI) / n
  return liste.map(([cle, intensite], i) => {
    const a0 = -Math.PI / 2 + i * pas + 0.03
    const a1 = -Math.PI / 2 + (i + 1) * pas - 0.03
    const r = R_INT + (R_EXT - R_INT) * Math.min(1, intensite)
    const p = (a: number, rr: number) => `${C + Math.cos(a) * rr},${C + Math.sin(a) * rr}`
    const grand = a1 - a0 > Math.PI ? 1 : 0
    const chemin = `M${p(a0, R_INT)} L${p(a0, r)} A${r},${r} 0 ${grand} 1 ${p(a1, r)} L${p(a1, R_INT)} A${R_INT},${R_INT} 0 ${grand} 0 ${p(a0, R_INT)} Z`
    const milieu = (a0 + a1) / 2
    const d = PAR_DESCRIPTEUR[cle]
    return {
      cle, chemin, intensite,
      couleur: PAR_FAMILLE[d.famille].couleur,
      libelle: d.libelle.split(/[,(]/)[0].trim(),
      x: C + Math.cos(milieu) * (R_EXT + 14),
      y: C + Math.sin(milieu) * (R_EXT + 14),
      ancre: Math.cos(milieu) > 0.25 ? 'start' : Math.cos(milieu) < -0.25 ? 'end' : 'middle',
    }
  })
})

const familles = computed(() => [...new Set(petales.value.map((p) => PAR_DESCRIPTEUR[p.cle].famille))].map((f) => PAR_FAMILLE[f]))
</script>

<template>
  <figure class="roue">
    <svg v-if="petales.length" viewBox="-40 0 380 300" role="img" aria-label="Roue des arômes">
      <circle :cx="C" :cy="C" :r="R_EXT" class="repere" />
      <circle :cx="C" :cy="C" :r="(R_EXT + R_INT) / 2" class="repere" />
      <path v-for="p in petales" :key="p.cle" :d="p.chemin" :fill="p.couleur" :opacity="0.45 + 0.55 * p.intensite" />
      <circle :cx="C" :cy="C" :r="R_INT - 4" class="centre" />
      <text :x="C" :y="C" text-anchor="middle" dominant-baseline="middle" class="nombre">{{ petales.length }}</text>
      <text
        v-for="p in petales"
        :key="'t' + p.cle"
        :x="p.x"
        :y="p.y"
        :text-anchor="p.ancre"
        dominant-baseline="middle"
        class="etiquette"
        :class="{ forte: p.intensite >= 0.6 }"
      >
        {{ p.libelle }}
      </text>
    </svg>
    <p v-else class="vide">Aucun arôme renseigné.</p>
    <figcaption v-if="familles.length">
      <span v-for="f in familles" :key="f.cle"><i :style="{ background: f.couleur }" />{{ f.libelle }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.roue {
  margin: 0;
}
svg {
  width: 100%;
  max-width: 360px;
  display: block;
  margin: 0 auto;
}
.repere {
  fill: none;
  stroke: var(--bord);
  stroke-dasharray: 3 4;
}
.centre {
  fill: var(--carte);
}
.nombre {
  font-family: var(--serif);
  font-weight: 700;
  font-size: 18px;
  fill: var(--accent);
}
.etiquette {
  font-size: 11px;
  fill: var(--discret);
  font-family: var(--sans);
}
.etiquette.forte {
  fill: var(--texte);
  font-weight: 700;
}
figcaption {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 12px;
  font-size: 0.78rem;
  color: var(--discret);
  margin-top: 6px;
}
figcaption span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
figcaption i {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.vide {
  text-align: center;
  color: var(--discret);
  font-size: 0.9rem;
}
</style>
