<script setup lang="ts">
/** Fiche d'un vigneron : coordonnées + accès à la modification et au catalogue. */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BottomSheet from './BottomSheet.vue'
import Icone from './Icone.vue'
import type { Vigneron, VigneronListe } from '@/domain/types'
import { useCaveStore } from '@/stores/cave'
import { useUiStore } from '@/stores/ui'
import { joindre, pluriel } from '@/utils/affichage'
import { nomComplet } from '@/utils/vigneron'
import { apresPanneau } from '@/utils/panneaux'

const props = defineProps<{ resume: VigneronListe | null }>()
const emit = defineEmits<{ fermer: [] }>()

const router = useRouter()
const store = useCaveStore()
const ui = useUiStore()
const vigneron = ref<Vigneron | null>(null)

watch(
  () => props.resume,
  async (r) => {
    vigneron.value = null
    if (!r) return
    try {
      vigneron.value = await store.vigneron(r.id_vigneron)
    } catch (e) {
      ui.erreur(e)
    }
  },
  { immediate: true },
)

const adresse = computed(() => {
  const v = vigneron.value
  if (!v) return ''
  return joindre(v.adresse, joindre(v.cp, v.ville).replace(' · ', ' '))
})

async function aller(chemin: string) {
  emit('fermer')
  await apresPanneau()
  router.push(chemin)
}
</script>

<template>
  <BottomSheet :ouvert="resume !== null" titre="Vigneron" @fermer="emit('fermer')">
    <template v-if="resume">
      <header class="entete">
        <h2>{{ vigneron ? nomComplet(vigneron) : resume.libelle }}</h2>
        <p v-if="resume.domaines">{{ resume.domaines }}</p>
      </header>

      <dl v-if="vigneron" class="infos">
        <template v-if="adresse"><dt>Adresse</dt><dd>{{ adresse }}</dd></template>
        <template v-if="vigneron.departement"><dt>Département</dt><dd>{{ vigneron.departement }}</dd></template>
        <template v-if="vigneron.region"><dt>Région</dt><dd>{{ vigneron.region }}</dd></template>
        <template v-if="vigneron.pays"><dt>Pays</dt><dd>{{ vigneron.pays }}</dd></template>
        <template v-if="vigneron.mail">
          <dt>Mail</dt><dd><a :href="`mailto:${vigneron.mail}`">{{ vigneron.mail }}</a></dd>
        </template>
        <dt>En cave</dt>
        <dd>{{ pluriel(resume.nb_vins, 'vin') }} · {{ pluriel(resume.bouteilles, 'bouteille') }}</dd>
      </dl>

      <div class="actions">
        <button class="btn btn-principal btn-large" @click="aller(`/vignerons/${resume.id_vigneron}/catalogue`)">
          <Icone nom="catalogue" :taille="20" /> Voir le catalogue
        </button>
        <button class="btn btn-large" @click="aller(`/vignerons/${resume.id_vigneron}/modifier`)">
          <Icone nom="crayon" :taille="20" /> Modifier le vigneron
        </button>
      </div>
    </template>
  </BottomSheet>
</template>

<style scoped>
.entete h2 {
  font-size: 1.35rem;
}
.entete p {
  margin: 4px 0 0;
  color: var(--discret);
}
.infos {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 14px;
  margin: 16px 0 0;
  font-size: 0.92rem;
}
.infos dt {
  color: var(--discret);
}
.infos dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.infos a {
  color: var(--accent);
}
.actions {
  display: grid;
  gap: 10px;
  margin-top: 22px;
}
</style>
