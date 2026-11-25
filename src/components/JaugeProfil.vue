<script setup lang="ts">
/** Jauge 0 à 5 (acidité, tanins…) en 5 segments. */
import { computed } from 'vue'
const props = defineProps<{ libelle: string; valeur: number | null }>()
const remplissage = computed(() => (props.valeur === null ? 0 : Math.max(0, Math.min(5, props.valeur))))
</script>

<template>
  <div class="jauge" :aria-label="`${libelle} : ${valeur === null ? 'inconnu' : valeur.toFixed(1)} sur 5`">
    <span class="libelle">{{ libelle }}</span>
    <span class="segments">
      <span v-for="i in 5" :key="i" class="segment">
        <span class="plein" :style="{ width: `${Math.max(0, Math.min(1, remplissage - (i - 1))) * 100}%` }" />
      </span>
    </span>
  </div>
</template>

<style scoped>
.jauge {
  display: grid;
  grid-template-columns: 84px 1fr;
  align-items: center;
  gap: 10px;
  font-size: 0.88rem;
}
.libelle {
  color: var(--discret);
}
.segments {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}
.segment {
  height: 8px;
  border-radius: 4px;
  background: var(--accent-clair);
  overflow: hidden;
}
.plein {
  display: block;
  height: 100%;
  background: var(--accent);
}
</style>
