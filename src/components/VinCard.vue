<script setup lang="ts">
import { computed } from 'vue'
import type { VinCave } from '@/domain/types'
import { couleurPastille, joindre } from '@/utils/affichage'

const props = defineProps<{ vin: VinCave; recent?: boolean }>()
defineEmits<{ stock: [] }>()

const detail = computed(() => joindre(props.vin.cuvee, props.vin.cru))
</script>

<template>
  <article class="vignette" :class="{ recent, epuise: vin.quantite === 0 }">
    <span
      class="pastille-couleur"
      :style="{ background: couleurPastille(vin.couleur) }"
      :title="vin.couleur ?? 'Couleur non renseignée'"
    />
    <button
      class="pastille-stock"
      :class="{ vide: vin.quantite === 0 }"
      :aria-label="`${vin.quantite} bouteille(s) en stock — modifier`"
      @click.stop="$emit('stock')"
    >
      {{ vin.quantite }}
    </button>

    <div class="millesime">{{ vin.millesime ?? 'NM' }}</div>
    <h3 class="domaine">{{ vin.domaine }}</h3>
    <p v-if="vin.appellation" class="appellation">{{ vin.appellation }}</p>
    <p v-if="detail" class="detail">{{ detail }}</p>
  </article>
</template>

<style scoped>
.vignette {
  position: relative;
  background: var(--carte);
  border-radius: var(--rayon);
  box-shadow: var(--ombre);
  padding: 40px 14px 14px;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
}
.vignette::after {
  /* liseré de la couleur du vin en bas de la carte */
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: v-bind('couleurPastille(vin.couleur)');
  opacity: 0.55;
}
.vignette.recent {
  animation: surligner 1.6s ease;
}
.vignette.epuise .domaine,
.vignette.epuise .millesime {
  opacity: 0.6;
}
.pastille-couleur {
  position: absolute;
  top: 14px;
  left: 14px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 12%), 0 0 0 3px var(--fond);
}
.pastille-stock {
  position: absolute;
  top: 8px;
  right: 8px;
  min-width: 36px;
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--vert);
  color: #fff;
  font-weight: 700;
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 2px 6px rgb(46 158 91 / 35%);
  transition: transform 0.12s;
}
.pastille-stock.vide {
  background: var(--rouge);
  box-shadow: 0 2px 6px rgb(214 69 69 / 30%);
}
.pastille-stock:active {
  transform: scale(0.9);
}
.millesime {
  font-family: var(--serif);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--accent);
  line-height: 1;
  margin-bottom: 2px;
}
.domaine {
  font-family: var(--sans);
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.appellation,
.detail {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.appellation {
  color: var(--texte);
}
.detail {
  color: var(--discret);
  font-style: italic;
}
@keyframes surligner {
  0%,
  40% {
    box-shadow: 0 0 0 3px var(--vert), var(--ombre);
  }
}
</style>
