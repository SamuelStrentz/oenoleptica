<script setup lang="ts">
/** Catalogue d'un vigneron : récapitulatif de ses vins enregistrés, par domaine. */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icone from '@/components/Icone.vue'
import VinDetailSheet from '@/components/VinDetailSheet.vue'
import StockSheet from '@/components/StockSheet.vue'
import { useCaveStore } from '@/stores/cave'
import { useUiStore } from '@/stores/ui'
import type { LigneCatalogue, Vigneron } from '@/domain/types'
import { aujourdhui, formaterPrix } from '@/domain/parsers'
import { couleurPastille, joindre, pluriel } from '@/utils/affichage'
import { csvExcel, nomFichier, partagerOuTelecharger } from '@/utils/fichiers'
import { nomComplet } from '@/utils/vigneron'

const props = defineProps<{ id: string }>()
const router = useRouter()
const store = useCaveStore()
const ui = useUiStore()

const vigneron = ref<Vigneron | null>(null)
const lignes = ref<LigneCatalogue[]>([])
const vinOuvert = ref<number | null>(null)
const vinStock = ref<LigneCatalogue | null>(null)

async function charger() {
  try {
    const id = Number(props.id)
    ;[vigneron.value, lignes.value] = await Promise.all([store.vigneron(id), store.catalogue(id)])
    if (!vigneron.value) throw new Error('Vigneron introuvable.')
  } catch (e) {
    ui.erreur(e)
    router.replace('/vignerons')
  }
}
onMounted(charger)

const parDomaine = computed(() => {
  const groupes = new Map<string, LigneCatalogue[]>()
  for (const l of lignes.value) groupes.set(l.domaine, [...(groupes.get(l.domaine) ?? []), l])
  return [...groupes].map(([domaine, vins]) => ({ domaine, vins }))
})

const totaux = computed(() => ({
  bouteilles: lignes.value.reduce((n, l) => n + l.quantite, 0),
  valeur: lignes.value.reduce((n, l) => n + (l.prix ?? 0) * l.quantite, 0),
}))

async function exporter() {
  const blob = csvExcel(
    ['Domaine', 'Cépage', 'Millésime', 'Appellation', 'Cuvée', 'Cru', 'Couleur', 'Prix', 'Stock'],
    lignes.value.map((l) => [l.domaine, l.cepage, l.millesime, l.appellation, l.cuvee, l.cru, l.couleur, l.prix, l.quantite]),
  )
  const nom = vigneron.value ? nomComplet(vigneron.value) : 'vigneron'
  await partagerOuTelecharger(blob, `catalogue_${nomFichier(nom)}_${aujourdhui()}.csv`, `Catalogue — ${nom}`)
}

async function fermerFiche() {
  vinOuvert.value = null
  await charger() // le vin a pu être modifié
}
</script>

<template>
  <main class="page">
    <header class="barre">
      <button class="bouton-icone" aria-label="Retour" @click="router.back()"><Icone nom="retour" /></button>
      <h1>Catalogue</h1>
    </header>

    <template v-if="vigneron">
      <section class="presentation">
        <h2>{{ nomComplet(vigneron) }}</h2>
        <p>{{ joindre(vigneron.ville, vigneron.region) }}</p>
        <a v-if="vigneron.mail" class="mail" :href="`mailto:${vigneron.mail}`">
          <Icone nom="mail" :taille="16" /> {{ vigneron.mail }}
        </a>
        <p class="totaux">
          {{ pluriel(lignes.length, 'vin') }} · {{ pluriel(totaux.bouteilles, 'bouteille') }} en cave
          <template v-if="totaux.valeur"> · {{ formaterPrix(totaux.valeur) }}</template>
        </p>
      </section>

      <section v-for="g in parDomaine" :key="g.domaine" class="carte domaine">
        <h3>{{ g.domaine }}</h3>
        <table class="tableau">
          <thead>
            <tr><th>Vin</th><th>Cépage</th><th class="nombre">Prix</th><th class="nombre">Stock</th></tr>
          </thead>
          <tbody>
            <tr v-for="l in g.vins" :key="l.id_vin" @click="vinOuvert = l.id_vin">
              <td>
                <span class="vin">
                  <span class="point-couleur" :style="{ background: couleurPastille(l.couleur) }" />
                  <strong>{{ l.millesime ?? 'NM' }}</strong>
                </span>
                <small>{{ joindre(l.appellation, l.cuvee, l.cru) || l.couleur }}</small>
              </td>
              <td class="cepage">{{ l.cepage }}</td>
              <td class="nombre">{{ formaterPrix(l.prix) }}</td>
              <td class="nombre">
                <button
                  class="badge"
                  :class="{ vide: l.quantite === 0 }"
                  :aria-label="`${l.quantite} en stock — modifier`"
                  @click.stop="vinStock = l"
                >
                  {{ l.quantite }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <p v-if="!lignes.length" class="vide">Aucun vin enregistré pour ce vigneron.</p>

      <button v-if="lignes.length" class="btn btn-large exporter" @click="exporter">
        <Icone nom="partager" :taille="20" /> Exporter en CSV (Excel)
      </button>
    </template>

    <VinDetailSheet :id-vin="vinOuvert" @fermer="fermerFiche" />
    <StockSheet :vin="vinStock" @fermer="vinStock = null" @modifie="charger" />
  </main>
</template>

<style scoped>
.presentation {
  padding: 4px 4px 8px;
}
.presentation h2 {
  font-size: 1.6rem;
  color: var(--bordeaux);
}
.presentation p {
  margin: 4px 0 0;
  color: var(--discret);
}
.mail {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  color: var(--accent);
  font-weight: 600;
  text-decoration: none;
}
.presentation .totaux {
  margin-top: 10px;
  color: var(--texte);
  font-weight: 600;
}
.domaine {
  margin-top: 12px;
  padding: 12px 10px 4px;
}
.domaine h3 {
  font-size: 1.05rem;
  color: var(--accent);
  margin: 0 6px 4px;
}
.vin {
  display: flex;
  align-items: center;
  gap: 6px;
}
.vin .point-couleur {
  width: 9px;
  height: 9px;
}
small {
  display: block;
  color: var(--discret);
  margin-top: 2px;
}
.cepage {
  font-size: 0.82rem;
  color: var(--discret);
}
button.badge {
  min-height: 28px;
  padding: 3px 10px;
}
.exporter {
  margin-top: 20px;
}
</style>
