<script setup lang="ts">
/** Bandeau d'alerte du dossier local : autorisation à renouveler, autre version, erreur de copie. */
import { computed } from 'vue'
import { useDossierStore } from '@/stores/dossier'
import { useCaveStore } from '@/stores/cave'
import { useUiStore } from '@/stores/ui'

const dossier = useDossierStore()
const cave = useCaveStore()
const ui = useUiStore()

const message = computed(() => {
  if (dossier.etat === 'a-autoriser') return `Œnoleptica doit réaccéder au dossier « ${dossier.nom} ».`
  if (dossier.conflit === 'plus-recente') return `Le dossier contient une version plus récente de « ${cave.nomCave} ».`
  if (dossier.conflit === 'inconnue') return `Le dossier contient déjà un fichier « ${cave.nomCave}.db ». Lequel garder ?`
  if (dossier.erreur) return `Copie dans le dossier impossible : ${dossier.erreur}`
  return null
})

async function agir(fn: () => Promise<unknown>, ok?: string) {
  try {
    await fn()
    if (ok) ui.toast(ok)
  } catch (e) {
    ui.erreur(e)
  }
}
</script>

<template>
  <Transition name="bandeau">
    <aside v-if="message && cave.prete" class="bandeau" role="status">
      <p>{{ message }}</p>
      <div class="actions">
        <button v-if="dossier.etat === 'a-autoriser'" class="principal" @click="agir(dossier.autoriser)">Autoriser</button>
        <template v-else-if="dossier.conflit">
          <button class="principal" @click="agir(dossier.chargerVersionDossier, 'Version du dossier chargée')">
            Charger celle du dossier
          </button>
          <button @click="agir(dossier.garderVersionTelephone, 'Version du téléphone conservée')">Garder celle-ci</button>
        </template>
        <button v-else class="principal" @click="agir(dossier.copier)">Réessayer</button>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.bandeau {
  position: sticky;
  top: 0;
  z-index: 40;
  margin: 0;
  padding: calc(var(--haut-sur) + 10px) 16px 12px;
  background: var(--bordeaux);
  color: #fff;
  font-size: 0.9rem;
  box-shadow: var(--ombre-forte);
}
.bandeau p {
  margin: 0 0 8px;
  line-height: 1.4;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.actions button {
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgb(255 255 255 / 50%);
  color: #fff;
  font-weight: 600;
  font-size: 0.85rem;
}
.actions .principal {
  background: #fff;
  color: var(--bordeaux);
  border-color: #fff;
}
.bandeau-enter-active,
.bandeau-leave-active {
  transition: transform 0.2s ease, opacity 0.2s;
}
.bandeau-enter-from,
.bandeau-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
