<script setup lang="ts">
/** Panneau qui monte du bas de l'écran (fermeture : voile ou bouton retour). */
import { onBeforeUnmount, watch } from 'vue'

const props = defineProps<{ ouvert: boolean; titre?: string }>()
const emit = defineEmits<{ fermer: [] }>()

// Le bouton « retour » d'Android ferme le panneau au lieu de quitter l'écran
function surRetour() {
  emit('fermer')
}
watch(
  () => props.ouvert,
  (o) => {
    if (o) {
      history.pushState({ panneau: true }, '')
      window.addEventListener('popstate', surRetour, { once: true })
    } else {
      window.removeEventListener('popstate', surRetour)
      if (history.state?.panneau) history.back()
    }
  },
)
onBeforeUnmount(() => window.removeEventListener('popstate', surRetour))
</script>

<template>
  <Teleport to="body">
    <Transition name="panneau">
      <div v-if="ouvert" class="fond" @click.self="emit('fermer')">
        <section class="panneau" role="dialog" aria-modal="true" :aria-label="titre">
          <div class="poignee" />
          <slot />
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fond {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgb(43 35 38 / 45%);
  display: flex;
  align-items: flex-end;
}
.panneau {
  width: 100%;
  background: var(--fond);
  border-radius: 24px 24px 0 0;
  padding: 10px 20px calc(var(--bas-sur) + 20px);
  box-shadow: var(--ombre-forte);
  max-height: 90dvh;
  overflow-y: auto;
}
.poignee {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--bord);
  margin: 0 auto 14px;
}
.panneau-enter-active,
.panneau-leave-active {
  transition: background 0.2s;
}
.panneau-enter-active .panneau,
.panneau-leave-active .panneau {
  transition: transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1);
}
.panneau-enter-from,
.panneau-leave-to {
  background: transparent;
}
.panneau-enter-from .panneau,
.panneau-leave-to .panneau {
  transform: translateY(100%);
}
</style>
