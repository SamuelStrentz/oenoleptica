<script setup lang="ts">
/**
 * Saisie des cépages en pastilles colorées (rouge / blanc / autre).
 * La valeur reste un texte « Gamay, Pinot noir », comme dans la base.
 */
import { computed, ref } from 'vue'
import Icone from './Icone.vue'
import { cleCepage, decouperCepages, majusculeInitiale } from '@/domain/cepages'
import type { Cepages } from '@/domain/types'

const modele = defineModel<string>({ default: '' })
const props = defineProps<{ connus: Cepages }>()

const saisie = ref('')
const index = computed(() => new Map(Object.keys(props.connus).map((n) => [cleCepage(n), n])))
const choisis = computed(() => decouperCepages(modele.value))

const suggestions = computed(() => {
  const q = cleCepage(saisie.value)
  if (!q) return []
  const dejaLa = new Set(choisis.value.map(cleCepage))
  return Object.keys(props.connus)
    .filter((n) => !dejaLa.has(cleCepage(n)) && cleCepage(n).includes(q))
    .sort((a, b) => Number(!cleCepage(a).startsWith(q)) - Number(!cleCepage(b).startsWith(q)) || a.localeCompare(b, 'fr'))
    .slice(0, 6)
})

function type(nom: string) {
  return props.connus[index.value.get(cleCepage(nom)) ?? nom] ?? null
}

function ajouter(texte = saisie.value) {
  const noms = [...choisis.value]
  for (const brut of decouperCepages(texte)) {
    const nom = index.value.get(cleCepage(brut)) ?? majusculeInitiale(brut)
    if (!noms.some((n) => cleCepage(n) === cleCepage(nom))) noms.push(nom)
  }
  modele.value = noms.join(', ')
  saisie.value = ''
}

function retirer(nom: string) {
  modele.value = choisis.value.filter((n) => n !== nom).join(', ')
}

function surSaisie() {
  // une virgule tapée valide le cépage en cours
  if (/[,;]/.test(saisie.value)) ajouter()
}
</script>

<template>
  <div class="cepages">
    <div v-if="choisis.length" class="pastilles">
      <span v-for="nom in choisis" :key="nom" class="pastille" :class="type(nom) ?? 'autre'">
        {{ nom }}
        <button type="button" :aria-label="`Retirer ${nom}`" @click="retirer(nom)">
          <Icone nom="fermer" :taille="14" />
        </button>
      </span>
    </div>
    <input
      v-model="saisie"
      type="text"
      placeholder="Ajouter un cépage…"
      enterkeyhint="done"
      autocapitalize="sentences"
      @input="surSaisie"
      @keydown.enter.prevent="ajouter()"
      @blur="saisie.trim() && ajouter()"
    />
    <div v-if="suggestions.length" class="suggestions">
      <button
        v-for="s in suggestions"
        :key="s"
        type="button"
        class="pastille"
        :class="type(s) ?? 'autre'"
        @pointerdown.prevent
        @click="ajouter(s)"
      >
        + {{ s }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.pastilles,
.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.suggestions {
  margin: 8px 0 0;
}
.pastille {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 5px 6px 5px 12px;
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 600;
}
.suggestions .pastille {
  padding: 6px 12px;
  opacity: 0.85;
}
.pastille button {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: inherit;
}
.rouge {
  background: #f4d6dd;
  color: #7a1f3a;
}
.blanc {
  background: #f7edc6;
  color: #76590e;
}
.autre {
  background: #e4e0ee;
  color: #4b3f6b;
}
</style>
