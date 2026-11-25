<script setup lang="ts">
/** Ajouter (/vignerons/nouveau) ou modifier (/vignerons/:id/modifier) un vigneron. */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icone from '@/components/Icone.vue'
import VigneronChamps from '@/components/VigneronChamps.vue'
import { useCaveStore } from '@/stores/cave'
import { useUiStore, vibrer } from '@/stores/ui'
import { pluriel } from '@/utils/affichage'
import { versBase, versFormulaire, vigneronVide } from '@/utils/vigneron'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const store = useCaveStore()
const ui = useUiStore()

const idVigneron = computed(() => (props.id ? Number(props.id) : null))
const champs = ref(vigneronVide())
const erreurNom = ref(false)
const enCours = ref(false)
const charge = ref(!props.id)

onMounted(async () => {
  if (idVigneron.value === null) return
  const v = await store.vigneron(idVigneron.value)
  if (!v) {
    ui.erreur('Vigneron introuvable.')
    router.replace('/vignerons')
    return
  }
  champs.value = versFormulaire(v)
  charge.value = true
})

async function enregistrer() {
  try {
    erreurNom.value = false
    let donnees
    try {
      donnees = versBase(champs.value)
    } catch (e) {
      erreurNom.value = true
      throw e
    }
    enCours.value = true
    if (idVigneron.value === null) await store.ajouterVigneron(donnees)
    else await store.modifierVigneron(idVigneron.value, donnees)
    ui.toast(idVigneron.value === null ? 'Vigneron ajouté' : 'Vigneron modifié')
    vibrer(15)
    router.back()
  } catch (e) {
    ui.erreur(e)
    vibrer(40)
  } finally {
    enCours.value = false
  }
}

async function supprimer() {
  if (idVigneron.value === null) return
  const l = await store.liensVigneron(idVigneron.value)
  const suite = l.vins
    ? `\n\nSeront aussi supprimés : ${pluriel(l.vins, 'vin')}, leur stock (${pluriel(l.stock, 'bouteille')}), `
      + `${l.avis} avis et ${pluriel(l.mouvements, 'mouvement')} de stock.`
    : ''
  if (!confirm(`Supprimer le vigneron « ${champs.value.prenom} ${champs.value.nom} » ?${suite}`)) return
  try {
    await store.supprimerVigneron(idVigneron.value)
    ui.toast('Vigneron supprimé')
    router.replace('/vignerons')
  } catch (e) {
    ui.erreur(e)
  }
}
</script>

<template>
  <main class="page formulaire">
    <header class="barre">
      <button class="bouton-icone" aria-label="Retour" @click="router.back()"><Icone nom="retour" /></button>
      <h1>{{ idVigneron === null ? 'Nouveau vigneron' : 'Modifier le vigneron' }}</h1>
    </header>

    <form v-if="charge" @submit.prevent="enregistrer">
      <section class="carte">
        <VigneronChamps v-model="champs" :erreur-nom="erreurNom" />
      </section>

      <section v-if="idVigneron !== null" class="zone-suppr">
        <button type="button" class="btn btn-danger btn-large" @click="supprimer">
          <Icone nom="corbeille" :taille="20" /> Supprimer ce vigneron
        </button>
      </section>

      <div class="valider">
        <button type="submit" class="btn btn-vert btn-large" :disabled="enCours">
          <Icone nom="coche" /> Enregistrer
        </button>
      </div>
    </form>
  </main>
</template>

<style scoped>
.zone-suppr {
  margin-top: 28px;
}
</style>
