<script setup lang="ts">
/** Vignerons : liste, fiche, ajout. */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Icone from '@/components/Icone.vue'
import VigneronSheet from '@/components/VigneronSheet.vue'
import type { VigneronListe } from '@/domain/types'
import { useCaveStore } from '@/stores/cave'
import { joindre, pluriel } from '@/utils/affichage'

const router = useRouter()
const store = useCaveStore()
const ouvert = ref<VigneronListe | null>(null)

function initiales(libelle: string) {
  return libelle
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m.charAt(0).toUpperCase())
    .join('')
}
</script>

<template>
  <main class="page">
    <header class="barre">
      <button class="bouton-icone" aria-label="Retour" @click="router.back()"><Icone nom="retour" /></button>
      <h1>Vignerons</h1>
      <button class="bouton-icone" aria-label="Ajouter un vigneron" @click="router.push('/vignerons/nouveau')">
        <Icone nom="plus" />
      </button>
    </header>

    <ul v-if="store.vignerons.length" class="liste">
      <li
        v-for="v in store.vignerons"
        :key="v.id_vigneron"
        class="carte vigneron"
        role="button"
        tabindex="0"
        @click="ouvert = v"
        @keydown.enter="ouvert = v"
      >
        <span class="avatar">{{ initiales(v.libelle) }}</span>
        <div class="infos">
          <strong>{{ v.libelle }}</strong>
          <span v-if="v.domaines" class="domaines">{{ v.domaines }}</span>
          <span class="lieu">{{ joindre(v.ville, v.region) }}</span>
        </div>
        <div class="compte">
          <strong>{{ v.bouteilles }}</strong>
          <span>{{ pluriel(v.nb_vins, 'vin') }}</span>
        </div>
      </li>
    </ul>
    <p v-else class="vide">Aucun vigneron pour l'instant.<br />Touche + en haut à droite pour en ajouter un.</p>
    <VigneronSheet :resume="ouvert" @fermer="ouvert = null" />
  </main>
</template>

<style scoped>
.liste {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}
.vigneron {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
}
.avatar {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--accent-clair);
  color: var(--accent);
  font-weight: 700;
}
.infos {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
}
.infos span {
  font-size: 0.85rem;
  color: var(--discret);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.infos .domaines {
  color: var(--texte);
}
.compte {
  text-align: right;
  display: grid;
}
.compte strong {
  font-family: var(--serif);
  font-size: 1.3rem;
  color: var(--vert);
}
.compte span {
  font-size: 0.78rem;
  color: var(--discret);
}
</style>
