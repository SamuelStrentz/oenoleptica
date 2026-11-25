<script setup lang="ts">
/** Modification du nombre de bouteilles d'un vin (crée un mouvement tracé). */
import { computed, ref, watch } from 'vue'
import BottomSheet from './BottomSheet.vue'
import Icone from './Icone.vue'
import type { VinStock } from '@/domain/types'
import { useCaveStore } from '@/stores/cave'
import { useUiStore, vibrer } from '@/stores/ui'
import { couleurPastille, joindre, pluriel } from '@/utils/affichage'

const props = defineProps<{ vin: VinStock | null }>()
const emit = defineEmits<{ fermer: []; modifie: [] }>()

const store = useCaveStore()
const ui = useUiStore()
const cible = ref(0)
const enCours = ref(false)

watch(
  () => props.vin,
  (v) => {
    if (v) cible.value = v.quantite
  },
  { immediate: true },
)

const ecart = computed(() => cible.value - (props.vin?.quantite ?? 0))
const resume = computed(() => {
  if (ecart.value === 0) return 'Aucun changement'
  return ecart.value > 0
    ? `Entrée de ${pluriel(ecart.value, 'bouteille')}`
    : `Sortie de ${pluriel(-ecart.value, 'bouteille')}`
})

function changer(delta: number) {
  cible.value = Math.max(0, cible.value + delta)
  vibrer(6)
}

function saisie(e: Event) {
  const n = Number.parseInt((e.target as HTMLInputElement).value, 10)
  cible.value = Number.isFinite(n) && n >= 0 ? n : 0
}

async function enregistrer() {
  if (!props.vin || ecart.value === 0) return emit('fermer')
  enCours.value = true
  try {
    await store.reglerStock(props.vin.id_vin, cible.value)
    ui.toast(`${resume.value} enregistrée`)
    emit('modifie')
    emit('fermer')
  } catch (e) {
    ui.erreur(e)
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <BottomSheet :ouvert="!!vin" titre="Stock" @fermer="emit('fermer')">
    <template v-if="vin">
      <div class="entete">
        <span class="point-couleur" :style="{ background: couleurPastille(vin.couleur) }" />
        <div>
          <h2>{{ vin.domaine }}</h2>
          <p>{{ joindre(vin.millesime, vin.appellation, vin.cuvee, vin.cru) }}</p>
        </div>
      </div>

      <div class="compteur">
        <button class="pas" aria-label="Une bouteille de moins" :disabled="cible === 0" @click="changer(-1)">
          <Icone nom="moins" :taille="28" />
        </button>
        <input
          class="valeur"
          :class="{ vide: cible === 0 }"
          type="number"
          inputmode="numeric"
          min="0"
          :value="cible"
          aria-label="Nombre de bouteilles"
          @input="saisie"
          @focus="($event.target as HTMLInputElement).select()"
        />
        <button class="pas" aria-label="Une bouteille de plus" @click="changer(1)">
          <Icone nom="plus" :taille="28" />
        </button>
      </div>

      <div class="raccourcis">
        <button @click="changer(6)">+6</button>
        <button @click="changer(12)">+12</button>
        <button @click="cible = 0">Vider</button>
      </div>

      <p class="resume" :class="{ entree: ecart > 0, sortie: ecart < 0 }">{{ resume }}</p>

      <button class="btn btn-vert btn-large" :disabled="enCours" @click="enregistrer">
        {{ ecart === 0 ? 'Fermer' : 'Enregistrer' }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.entete {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.entete .point-couleur {
  margin-top: 7px;
  width: 14px;
  height: 14px;
}
.entete h2 {
  font-size: 1.2rem;
}
.entete p {
  margin: 2px 0 0;
  color: var(--discret);
  font-size: 0.9rem;
}
.compteur {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin: 26px 0 14px;
}
.pas {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--carte);
  box-shadow: var(--ombre);
  display: grid;
  place-items: center;
  color: var(--accent);
}
.pas:active {
  transform: scale(0.92);
}
.pas:disabled {
  opacity: 0.35;
}
.valeur {
  width: 110px;
  text-align: center;
  font-family: var(--serif);
  font-size: 3rem;
  font-weight: 700;
  color: var(--vert);
  border: 0;
  background: transparent;
  outline: none;
  -moz-appearance: textfield;
}
.valeur::-webkit-inner-spin-button {
  -webkit-appearance: none;
}
.valeur.vide {
  color: var(--rouge);
}
.raccourcis {
  display: flex;
  justify-content: center;
  gap: 8px;
}
.raccourcis button {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid var(--bord);
  background: var(--carte);
  font-weight: 600;
  font-size: 0.9rem;
}
.resume {
  text-align: center;
  color: var(--discret);
  margin: 18px 0;
  font-size: 0.92rem;
}
.resume.entree {
  color: var(--vert-fonce);
  font-weight: 600;
}
.resume.sortie {
  color: var(--rouge);
  font-weight: 600;
}
</style>
