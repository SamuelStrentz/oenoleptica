<script setup lang="ts">
/** Fiche détaillée d'un vin (tout ce que la base en sait) + accès à la modification. */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BottomSheet from './BottomSheet.vue'
import Icone from './Icone.vue'
import JaugeProfil from './JaugeProfil.vue'
import StockSheet from './StockSheet.vue'
import type { ProfilOrganoleptique, VinDetail } from '@/domain/types'
import { useCaveStore } from '@/stores/cave'
import { useUiStore } from '@/stores/ui'
import { formaterPrix, nombreCourt } from '@/domain/parsers'
import { couleurPastille, dateCourte, joindre, pluriel } from '@/utils/affichage'
import { nomComplet } from '@/utils/vigneron'
import { apresPanneau } from '@/utils/panneaux'

const props = defineProps<{ idVin: number | null }>()
const emit = defineEmits<{ fermer: [] }>()

const router = useRouter()
const store = useCaveStore()
const ui = useUiStore()
const detail = ref<VinDetail | null>(null)
const stockOuvert = ref(false)

async function charger(id: number | null) {
  if (id === null) return
  try {
    detail.value = await store.detailVin(id)
  } catch (e) {
    ui.erreur(e)
    emit('fermer')
  }
}

watch(
  () => props.idVin,
  (id) => {
    detail.value = null
    stockOuvert.value = false
    charger(id)
  },
  { immediate: true },
)

const vin = computed(() => detail.value?.vin)

const infos = computed(() => {
  const v = vin.value
  if (!v) return []
  const lignes: [string, string][] = [
    ['Couleur', v.couleur ?? ''],
    ['Format', v.format ?? ''],
    ['Alcool', v.volume_alcool === null ? '' : `${nombreCourt(v.volume_alcool)} % vol`],
    ['Prix', formaterPrix(v.prix)],
    ['Région', v.region ?? ''],
  ]
  return lignes.filter(([, val]) => val)
})

const avecProfil = computed(() => (detail.value?.cepages ?? []).filter((c) => c.profil))

/** Moyenne des cépages du vin pour les 4 jauges. */
const jauges = computed(() => {
  const profils = avecProfil.value.map((c) => c.profil!)
  if (!profils.length) return []
  const moyenne = (k: keyof ProfilOrganoleptique) => {
    const vals = profils.map((p) => p[k]).filter((x): x is number => typeof x === 'number')
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  return [
    { libelle: 'Acidité', valeur: moyenne('acidite') },
    { libelle: 'Tanins', valeur: moyenne('tanins') },
    { libelle: 'Sucrosité', valeur: moyenne('sucrosite') },
    { libelle: 'Corps', valeur: moyenne('corps') },
  ]
})

const RUBRIQUES: [keyof ProfilOrganoleptique, string][] = [
  ['aromes_nez', 'Nez'],
  ['aromes_bouche', 'Rétro-olfaction'],
  ['attaque', 'Attaque'],
  ['milieu_bouche', 'Milieu de bouche'],
  ['finale', 'Finale'],
  ['texture', 'Texture'],
  ['longueur', 'Longueur'],
  ['garde', 'Garde'],
]

async function modifier() {
  const id = props.idVin
  emit('fermer')
  await apresPanneau()
  router.push(`/vin/${id}/modifier`)
}
</script>

<template>
  <BottomSheet :ouvert="idVin !== null" titre="Fiche du vin" @fermer="emit('fermer')">
    <div v-if="!detail" class="attente">Chargement…</div>
    <template v-else-if="vin">
      <header class="entete">
        <span class="point-couleur" :style="{ background: couleurPastille(vin.couleur) }" />
        <div class="titre">
          <span class="millesime">{{ vin.millesime ?? 'Non millésimé' }}</span>
          <h2>{{ vin.domaine }}</h2>
          <p>{{ joindre(vin.appellation, vin.cuvee, vin.cru) }}</p>
        </div>
        <span class="badge" :class="{ vide: vin.quantite === 0 }">{{ vin.quantite }}</span>
      </header>

      <dl v-if="infos.length" class="infos">
        <template v-for="[cle, val] in infos" :key="cle">
          <dt>{{ cle }}</dt>
          <dd>{{ val }}</dd>
        </template>
        <template v-if="detail.vigneron">
          <dt>Vigneron</dt>
          <dd>{{ nomComplet(detail.vigneron) }}{{ detail.vigneron.ville ? ` · ${detail.vigneron.ville}` : '' }}</dd>
        </template>
        <template v-for="(a, i) in detail.avis" :key="'avis' + i">
          <dt>Avis</dt>
          <dd>{{ joindre(a.note === null ? null : `${nombreCourt(a.note)}/20`, a.categorie) }}</dd>
        </template>
      </dl>

      <template v-if="detail.cepages.length">
        <h3 class="sous-titre">Cépages</h3>
        <div class="cepages">
          <span v-for="c in detail.cepages" :key="c.nom" class="pastille" :class="c.type ?? 'autre'">{{ c.nom }}</span>
        </div>
      </template>

      <template v-if="avecProfil.length">
        <h3 class="sous-titre">Profil organoleptique type</h3>
        <p class="nuance">D'après {{ avecProfil.length > 1 ? 'les cépages' : 'le cépage' }} — un repère, pas une dégustation.</p>
        <div class="jauges carte">
          <JaugeProfil v-for="j in jauges" :key="j.libelle" :libelle="j.libelle" :valeur="j.valeur" />
        </div>
        <details v-for="(c, i) in avecProfil" :key="c.nom" class="cepage-profil carte" :open="i === 0">
          <summary>
            <span class="pastille" :class="c.type ?? 'autre'">{{ c.nom }}</span>
            <span class="robe">{{ joindre(c.profil!.robe_couleur, c.profil!.robe_intensite ? `robe ${c.profil!.robe_intensite}` : null) }}</span>
          </summary>
          <dl class="infos">
            <template v-for="[cle, lib] in RUBRIQUES" :key="cle">
              <template v-if="c.profil![cle]">
                <dt>{{ lib }}</dt>
                <dd>{{ c.profil![cle] }}</dd>
              </template>
            </template>
          </dl>
        </details>
      </template>

      <template v-if="detail.mouvements.length">
        <h3 class="sous-titre">Mouvements</h3>
        <ul class="mouvements">
          <li v-for="m in detail.mouvements.slice(0, 6)" :key="m.id_mouv">
            <span>{{ dateCourte(m.date_mouvement) }}</span>
            <span class="badge" :class="{ sortie: m.type_mouvement === 'sortie' }">
              {{ m.type_mouvement === 'entrée' ? '+' : '−' }}{{ m.quantite_mouvement }}
            </span>
          </li>
        </ul>
        <p v-if="detail.mouvements.length > 6" class="nuance">
          … et {{ pluriel(detail.mouvements.length - 6, 'autre mouvement') }} dans l'historique.
        </p>
      </template>

      <div class="boutons">
        <button class="btn btn-principal" @click="modifier">
          <Icone nom="crayon" :taille="20" /> Modifier le vin
        </button>
        <button class="btn btn-vert" @click="stockOuvert = true">
          <Icone nom="bouteille" :taille="20" /> Stock ({{ vin.quantite }})
        </button>
      </div>
    </template>
  </BottomSheet>
  <StockSheet :vin="stockOuvert ? vin ?? null : null" @fermer="stockOuvert = false" @modifie="charger(idVin)" />
</template>

<style scoped>
.attente {
  text-align: center;
  color: var(--discret);
  padding: 40px 0;
}
.entete {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.entete .point-couleur {
  margin-top: 6px;
  width: 16px;
  height: 16px;
}
.titre {
  flex: 1;
  min-width: 0;
}
.millesime {
  font-family: var(--serif);
  font-weight: 700;
  color: var(--accent);
  font-size: 1.1rem;
}
.titre h2 {
  font-size: 1.35rem;
  line-height: 1.2;
}
.titre p {
  margin: 4px 0 0;
  color: var(--discret);
}
.entete .badge {
  font-size: 1rem;
  padding: 4px 12px;
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
}
.sous-titre {
  font-family: var(--sans);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  margin: 22px 0 8px;
}
.nuance {
  margin: -4px 0 10px;
  font-size: 0.8rem;
  color: var(--discret);
}
.cepages {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pastille {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
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
.jauges {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
}
.cepage-profil {
  margin-top: 10px;
  padding: 12px 14px;
}
.cepage-profil summary {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  list-style: none;
}
.cepage-profil summary::-webkit-details-marker {
  display: none;
}
.cepage-profil summary::after {
  content: '▾';
  margin-left: auto;
  color: var(--discret);
  transition: transform 0.15s;
}
.cepage-profil[open] summary::after {
  transform: rotate(180deg);
}
.robe {
  font-size: 0.82rem;
  color: var(--discret);
}
.cepage-profil .infos {
  margin-top: 12px;
}
.mouvements {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 6px;
}
.mouvements li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}
.boutons {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 10px;
  margin-top: 24px;
}
</style>
