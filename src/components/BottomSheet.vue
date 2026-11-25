<script setup lang="ts">
/**
 * Panneau qui monte du bas de l'écran. Fermeture : glisser vers le bas
 * (languette ou contenu déjà en haut), toucher le voile, ou bouton retour
 * d'Android. Les panneaux peuvent s'empiler (fiche du vin > stock).
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { retourHistorique } from '@/utils/panneaux'
import { useGlisserPourFermer } from '@/composables/useGlisserPourFermer'

const props = defineProps<{ ouvert: boolean; titre?: string }>()
const emit = defineEmits<{ fermer: [] }>()

const panneau = ref<HTMLElement>()
const { decalage } = useGlisserPourFermer(panneau, () => emit('fermer'))
const opaciteVoile = computed(() =>
  panneau.value ? Math.max(0, 1 - decalage.value / panneau.value.offsetHeight) : 1,
)

// Chaque panneau ouvert ajoute une entrée d'historique numérotée (niveau) :
// le bouton retour ferme seulement le panneau du dessus.
let niveau = 0
const niveauCourant = () => (history.state?.panneau as number | undefined) ?? 0

function surRetour() {
  if (niveauCourant() < niveau) emit('fermer')
}

watch(
  () => props.ouvert,
  (o) => {
    if (o) {
      niveau = niveauCourant() + 1
      history.pushState({ ...history.state, panneau: niveau }, '')
      window.addEventListener('popstate', surRetour)
    } else {
      window.removeEventListener('popstate', surRetour)
      if (niveauCourant() === niveau) retourHistorique()
    }
  },
)
onBeforeUnmount(() => window.removeEventListener('popstate', surRetour))
</script>

<template>
  <Teleport to="body">
    <Transition name="panneau">
      <div
        v-if="ouvert"
        class="fond"
        :style="{ backgroundColor: `rgb(43 35 38 / ${45 * opaciteVoile}%)` }"
        @click.self="emit('fermer')"
      >
        <section ref="panneau" class="panneau" role="dialog" aria-modal="true" :aria-label="titre">
          <div class="languette" data-languette aria-hidden="true"><div class="poignee" /></div>
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
  padding: 0 20px calc(var(--bas-sur) + 20px);
  overscroll-behavior: contain;
  box-shadow: var(--ombre-forte);
  max-height: 90dvh;
  overflow-y: auto;
}
.languette {
  /* zone de prise, toujours visible en haut du panneau */
  position: sticky;
  top: 0;
  z-index: 2;
  margin: 0 -20px 4px;
  padding: 10px 0 10px;
  background: var(--fond);
  border-radius: 24px 24px 0 0;
  touch-action: none;
}
.poignee {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--bord);
  margin: 0 auto;
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
  background: transparent !important;
}
.panneau-enter-from .panneau,
.panneau-leave-to .panneau {
  transform: translateY(100%);
}
</style>
