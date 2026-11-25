<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCaveStore } from '@/stores/cave'
import AppFab from '@/components/AppFab.vue'
import ToastHost from '@/components/ToastHost.vue'
import BandeauDossier from '@/components/BandeauDossier.vue'
import { useDossierStore } from '@/stores/dossier'

const icone = `${import.meta.env.BASE_URL}icons/icon.svg`
const store = useCaveStore()
const dossier = useDossierStore()
const router = useRouter()
const route = useRoute()

onMounted(async () => {
  await store.demarrer()
  await dossier.initialiser()
  // Pas de cave : seul l'accueil (écran de création) est accessible
  if (!store.prete && route.name !== 'accueil') router.replace('/')
})
</script>

<template>
  <div v-if="store.chargement" class="demarrage" aria-busy="true">
    <img :src="icone" alt="" width="72" height="72" />
  </div>
  <div v-else-if="store.erreur" class="demarrage erreur">
    <h2>La cave n'a pas pu s'ouvrir</h2>
    <p>{{ store.erreur }}</p>
  </div>
  <template v-else>
    <BandeauDossier />
    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
    <AppFab v-if="store.prete" />
  </template>
  <ToastHost />
</template>

<style scoped>
.demarrage {
  min-height: 100dvh;
  display: grid;
  place-content: center;
  gap: 8px;
  text-align: center;
  padding: 24px;
}
.demarrage img {
  border-radius: 18px;
  animation: pulse 1.2s ease-in-out infinite;
}
.erreur p {
  color: var(--discret);
}
@keyframes pulse {
  50% {
    transform: scale(0.92);
    opacity: 0.7;
  }
}
.page-enter-active,
.page-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
}
</style>
