<script setup lang="ts">
/**
 * Sélection des arômes par familles. Toucher un arôme : léger (½) -> net (1) -> retiré.
 */
import { computed, ref } from 'vue'
import { DESCRIPTEURS, FAMILLES } from '@/domain/profil/aromes'

const aromes = defineModel<Record<string, number>>({ required: true })

const ouverte = ref<string | null>(null)
const parFamille = computed(() =>
  FAMILLES.map((f) => ({
    ...f,
    descripteurs: DESCRIPTEURS.filter((d) => d.famille === f.cle),
    actifs: DESCRIPTEURS.filter((d) => d.famille === f.cle && (aromes.value[d.cle] ?? 0) > 0).length,
  })),
)

function basculer(cle: string) {
  const v = aromes.value[cle] ?? 0
  const suivant = v === 0 ? 0.5 : v < 1 ? 1 : 0
  const copie = { ...aromes.value }
  if (suivant) copie[cle] = suivant
  else delete copie[cle]
  aromes.value = copie
}

function arrondi(v: number | undefined) {
  return !v ? 0 : v >= 0.75 ? 1 : 0.5
}
</script>

<template>
  <div class="familles">
    <section v-for="f in parFamille" :key="f.cle" class="famille" :class="{ ouverte: ouverte === f.cle }">
      <button type="button" class="titre" @click="ouverte = ouverte === f.cle ? null : f.cle">
        <i :style="{ background: f.couleur }" />
        <span>{{ f.libelle }}</span>
        <small v-if="f.actifs">{{ f.actifs }}</small>
        <b>{{ ouverte === f.cle ? '−' : '+' }}</b>
      </button>
      <div v-if="ouverte === f.cle" class="puces">
        <button
          v-for="d in f.descripteurs"
          :key="d.cle"
          type="button"
          :class="['puce', `niveau-${arrondi(aromes[d.cle]) * 2}`]"
          :style="{ '--teinte': f.couleur }"
          @click="basculer(d.cle)"
        >
          {{ d.libelle }}
          <span class="points" aria-hidden="true"><em /><em /></span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.familles {
  display: grid;
  gap: 6px;
}
.titre {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 4px;
  text-align: left;
}
.titre i {
  width: 12px;
  height: 12px;
  border-radius: 4px;
}
.titre span {
  flex: 1;
  font-weight: 600;
}
.titre small {
  background: var(--accent);
  color: #fff;
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 0.75rem;
  font-weight: 700;
}
.titre b {
  color: var(--discret);
  width: 16px;
  text-align: center;
}
.puces {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 2px 0 10px 26px;
}
.puce {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid var(--bord);
  background: var(--carte);
  font-size: 0.86rem;
}
.points {
  display: inline-flex;
  gap: 2px;
}
.points em {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--bord);
}
.niveau-1,
.niveau-2 {
  border-color: var(--teinte);
  font-weight: 600;
}
.niveau-1 .points em:first-child,
.niveau-2 .points em {
  background: var(--teinte);
}
.niveau-2 {
  background: color-mix(in srgb, var(--teinte) 14%, white);
}
</style>
