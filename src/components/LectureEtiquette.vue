<script setup lang="ts">
/**
 * Photo d'étiquette -> texte (OCR sur le téléphone) -> vins proposés
 * (cave puis référentiel). Le formulaire applique le choix via « appliquer ».
 * Ouvrir avec la méthode exposée prendrePhoto().
 */
import { computed, ref } from 'vue'
import BottomSheet from './BottomSheet.vue'
import Icone from './Icone.vue'
import { useCaveStore } from '@/stores/cave'
import { useUiStore, vibrer } from '@/stores/ui'
import { lireEtiquette } from '@/services/ocr'
import { nombreCourt } from '@/domain/parsers'
import { nomComplet } from '@/utils/vigneron'
import type { IndicesEtiquette, Proposition, ResultatEtiquette } from '@/domain/etiquette'

const emit = defineEmits<{ appliquer: [proposition: Proposition | null, indices: IndicesEtiquette] }>()

const store = useCaveStore()
const ui = useUiStore()
const entree = ref<HTMLInputElement>()
const etape = ref<string | null>(null)
const avancement = ref<number | null>(null)
const resultat = ref<ResultatEtiquette | null>(null)
const avecReferentiel = ref(false)

function prendrePhoto() {
  entree.value?.click()
}
defineExpose({ prendrePhoto })

async function surPhoto(e: Event) {
  const champ = e.target as HTMLInputElement
  const photo = champ.files?.[0]
  champ.value = ''
  if (!photo) return
  try {
    const texte = await lireEtiquette(photo, (nom, pc) => {
      etape.value = nom
      avancement.value = pc
    })
    etape.value = 'Recherche du vin'
    avancement.value = null
    if (!texte.trim()) throw new Error("Aucun texte lu sur la photo. Rapproche-toi de l'étiquette, bien à plat et éclairée.")
    const [r, info] = await Promise.all([store.reconnaitreEtiquette(texte), store.infoReferentiel()])
    avecReferentiel.value = !!info
    resultat.value = r
    vibrer(15)
  } catch (err) {
    ui.erreur(err)
  } finally {
    etape.value = null
  }
}

const indicesLus = computed(() => {
  const i = resultat.value?.indices
  if (!i) return ''
  return [
    i.millesime,
    i.volume_alcool !== null ? `${nombreCourt(i.volume_alcool)} % vol` : null,
    i.format,
    i.couleur,
  ].filter(Boolean).join(' · ')
})

function choisir(p: Proposition | null) {
  if (resultat.value) emit('appliquer', p, resultat.value.indices)
  resultat.value = null
}

const pourcent = (x: number) => `${Math.round(x * 100)} %`
</script>

<template>
  <input ref="entree" type="file" accept="image/*" capture="environment" hidden @change="surPhoto" />

  <div v-if="etape" class="voile-lecture" role="status" aria-live="polite">
    <div class="carte lecture">
      <span class="roue" aria-hidden="true" />
      <strong>{{ etape }}…</strong>
      <span v-if="avancement !== null" class="pc">{{ pourcent(avancement) }}</span>
      <small>Tout se passe sur le téléphone. La première fois, le moteur de lecture se télécharge (≈ 5 Mo).</small>
    </div>
  </div>

  <BottomSheet :ouvert="!!resultat" titre="Étiquette lue" @fermer="resultat = null">
    <div v-if="resultat" class="resultat">
      <h2>Étiquette lue</h2>

      <template v-if="resultat.propositions.length">
        <p class="aide">Touche le vin qui correspond : le formulaire se remplit, tu pourras tout corriger.</p>
        <ul class="propositions">
          <li v-for="(p, i) in resultat.propositions" :key="i">
            <button type="button" :class="{ premier: i === 0 }" @click="choisir(p)">
              <span class="titre">
                <strong>{{ p.domaine }}</strong>
                <em>{{ pourcent(p.score) }}</em>
              </span>
              <span class="detail">{{ [p.cuvee, p.appellation, p.style].filter(Boolean).join(' · ') || 'Sans précision' }}</span>
              <span class="badges">
                <small :class="p.origine">{{ p.origine === 'cave' ? 'Dans ta cave' : 'Référentiel' }}</small>
                <small v-if="p.vigneron" class="nouveau">Nouveau vigneron : {{ nomComplet(p.vigneron) }}</small>
              </span>
            </button>
          </li>
        </ul>
      </template>
      <p v-else class="aide">
        Aucun vin reconnu{{ avecReferentiel ? '' : ' dans ta cave' }}.
        <template v-if="!avecReferentiel">
          Importe un référentiel depuis l'écran Profil pour en reconnaître davantage.
        </template>
      </p>

      <button type="button" class="btn btn-large" :disabled="!indicesLus" @click="choisir(null)">
        <Icone nom="crayon" :taille="20" />
        {{ indicesLus ? `Garder seulement ce qui est écrit : ${indicesLus}` : 'Rien d\'exploitable sur la photo' }}
      </button>

      <details class="texte-lu">
        <summary>Texte lu</summary>
        <pre>{{ resultat.texte.trim() }}</pre>
      </details>
    </div>
  </BottomSheet>
</template>

<style scoped>
.voile-lecture {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(0 0 0 / 45%);
}
.lecture {
  display: grid;
  justify-items: center;
  gap: 10px;
  max-width: 320px;
  padding: 24px;
  text-align: center;
}
.lecture small {
  color: var(--discret);
  line-height: 1.4;
}
.pc {
  font-family: var(--serif);
  font-size: 1.4rem;
  color: var(--accent);
}
.roue {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid var(--accent-clair);
  border-top-color: var(--accent);
  animation: tourner 0.9s linear infinite;
}
@keyframes tourner {
  to {
    transform: rotate(360deg);
  }
}
.resultat {
  display: grid;
  gap: 12px;
}
.resultat h2 {
  font-size: 1.3rem;
  margin: 0;
}
.aide {
  margin: 0;
  color: var(--discret);
  font-size: 0.9rem;
  line-height: 1.5;
}
.propositions {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.propositions button {
  width: 100%;
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--bord);
  text-align: left;
}
.propositions button.premier {
  border-color: var(--accent);
  background: var(--accent-clair);
}
.titre {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.titre em {
  font-style: normal;
  color: var(--discret);
  font-size: 0.85rem;
}
.detail {
  color: var(--discret);
  font-size: 0.9rem;
}
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.badges small {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--carte);
  border: 1px solid var(--bord);
}
.badges .cave {
  color: var(--vert);
}
.badges .referentiel,
.badges .nouveau {
  color: var(--accent);
}
.texte-lu summary {
  color: var(--discret);
  font-size: 0.85rem;
}
.texte-lu pre {
  white-space: pre-wrap;
  font-size: 0.8rem;
  max-height: 180px;
  overflow: auto;
}
</style>
