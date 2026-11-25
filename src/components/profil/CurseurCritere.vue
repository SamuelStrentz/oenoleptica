<script setup lang="ts">
/** Curseur d'un critère de dégustation, avec le mot de l'échelle et la valeur calculée en repère. */
import { computed } from 'vue'
import { PAR_CLE, motPour, type Critere } from '@/domain/profil/echelles'
import { nombreCourt } from '@/domain/parsers'

const valeur = defineModel<number | null>({ required: true })
const props = defineProps<{ critere: Critere; calcul?: number }>()

const def = computed(() => PAR_CLE[props.critere])
const pourcentCalcul = computed(() => (props.calcul === undefined ? null : (props.calcul / def.value.max) * 100))

function surSaisie(e: Event) {
  valeur.value = Number((e.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="curseur" :class="{ vide: valeur === null }">
    <div class="tete">
      <span class="libelle">{{ def.libelle }}</span>
      <span class="valeur">
        <template v-if="valeur !== null">
          <strong>{{ motPour(critere, valeur) }}</strong>
          <small>{{ nombreCourt(valeur) }}{{ def.unite ? ` ${def.unite}` : '' }}</small>
        </template>
        <button v-else type="button" class="noter" @click="valeur = calcul ?? 0">Noter</button>
      </span>
    </div>
    <div class="piste">
      <span v-if="pourcentCalcul !== null" class="repere" :style="{ left: `${pourcentCalcul}%` }" title="Valeur calculée" />
      <input
        type="range"
        min="0"
        :max="def.max"
        :step="def.pas"
        :value="valeur ?? calcul ?? 0"
        :aria-label="def.libelle"
        @input="surSaisie"
      />
    </div>
  </div>
</template>

<style scoped>
.curseur {
  padding: 8px 0;
}
.tete {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.libelle {
  font-size: 0.9rem;
}
.valeur strong {
  color: var(--accent);
  font-size: 0.9rem;
}
.valeur small {
  margin-left: 6px;
  color: var(--discret);
}
.noter {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--accent);
}
.vide input {
  opacity: 0.35;
}
.piste {
  position: relative;
}
.repere {
  position: absolute;
  top: 2px;
  width: 2px;
  height: 22px;
  margin-left: -1px;
  background: var(--accent);
  opacity: 0.35;
  pointer-events: none;
}
input[type='range'] {
  width: 100%;
  accent-color: var(--accent);
  height: 26px;
}
</style>
