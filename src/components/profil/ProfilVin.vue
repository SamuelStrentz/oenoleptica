<script setup lang="ts">
/**
 * Profil organoleptique d'un vin, sens par sens : robe, roue des arômes,
 * radar de la structure (calcul et dernière dégustation), explication des valeurs.
 */
import { computed, ref } from 'vue'
import RadarProfil from './RadarProfil.vue'
import RoueAromes from './RoueAromes.vue'
import type { FicheVin } from '@/domain/types'
import { CRITERES, motPour, teinte, type Critere } from '@/domain/profil/echelles'
import { nombreCourt } from '@/domain/parsers'
import { dateCourte } from '@/utils/affichage'

const props = defineProps<{ fiche: FicheVin }>()

const p = computed(() => props.fiche.profil)
const derniere = computed(() => props.fiche.degustations[0] ?? null)
const source = ref<'calcul' | 'degustation'>(derniere.value ? 'degustation' : 'calcul')

const valeursCalcul = computed(() =>
  Object.fromEntries(CRITERES.map((c) => [c.cle, p.value.criteres[c.cle].valeur])) as Record<Critere, number>)
const valeursDegustation = computed(() =>
  derniere.value ? Object.fromEntries(CRITERES.map((c) => [c.cle, derniere.value![c.cle]])) as Record<Critere, number | null> : null)

const robeCalcul = computed(() => teinte(p.value.famille, p.value.teinte.valeur))
const robeDegustee = computed(() =>
  derniere.value?.teinte != null ? teinte(p.value.famille, derniere.value.teinte) : null)

const aromesAffiches = computed(() =>
  source.value === 'degustation' && derniere.value && Object.keys(derniere.value.aromes).length
    ? derniere.value.aromes
    : p.value.aromes)

const titreSource = computed(() =>
  source.value === 'degustation' && derniere.value ? `Ta dégustation du ${dateCourte(derniere.value.date_degustation)}` : 'Profil calculé')

/** Critères affichés dans « Pourquoi ces valeurs ? » (on masque les bulles d'un vin tranquille). */
const criteresAffiches = computed(() =>
  CRITERES.filter((c) => c.cle !== 'effervescence' || p.value.criteres.effervescence.valeur > 0))

const fmt = (x: number) => (x > 0 ? '+' : '−') + nombreCourt(Math.abs(Math.round(x * 10) / 10))

const ETATS: Record<string, string> = {
  attendre: 'attendre', pret: 'pret', apogee: 'apogee', 'boire-vite': 'vite', passe: 'passe', inconnu: 'inconnu',
}
</script>

<template>
  <section class="profil">
    <div class="bandeau-profil">
      <span class="fenetre" :class="ETATS[p.fenetre.etat]">{{ p.fenetre.libelle }}</span>
      <span v-if="p.fenetre.debut" class="periode">{{ p.fenetre.debut }} – {{ p.fenetre.fin }}</span>
    </div>
    <p class="resume">
      {{ p.style.libelle }}<template v-if="p.appellation"> · {{ p.appellation }}</template>
      <template v-if="p.millesime.caractere"> · {{ p.millesime.annee }}, {{ p.millesime.caractere }}</template>
    </p>
    <ul v-if="p.alertes.length" class="alertes">
      <li v-for="a in p.alertes" :key="a">{{ a }}</li>
    </ul>

    <div v-if="derniere" class="source" role="tablist">
      <button role="tab" :aria-selected="source === 'degustation'" @click="source = 'degustation'">Ma dégustation</button>
      <button role="tab" :aria-selected="source === 'calcul'" @click="source = 'calcul'">Calcul</button>
    </div>

    <!-- Vue -->
    <h4>👁 Vue</h4>
    <div class="robe carte">
      <span class="pastille-robe" :style="{ background: (source === 'degustation' && robeDegustee ? robeDegustee : robeCalcul).couleur }" />
      <div>
        <strong>{{ (source === 'degustation' && robeDegustee ? robeDegustee : robeCalcul).libelle }}</strong>
        <span>
          robe {{ motPour('intensite_robe', source === 'degustation' && derniere?.intensite_robe != null
            ? derniere.intensite_robe : p.criteres.intensite_robe.valeur) }}
        </span>
      </div>
    </div>

    <!-- Nez -->
    <h4>👃 Nez <small>{{ titreSource }}</small></h4>
    <div class="carte"><RoueAromes :aromes="aromesAffiches" /></div>

    <!-- Bouche -->
    <h4>👅 Goût & ✋ toucher</h4>
    <div class="carte"><RadarProfil :calcul="valeursCalcul" :degustation="valeursDegustation" /></div>

    <details class="carte pourquoi">
      <summary>Pourquoi ces valeurs ?</summary>
      <p class="nuance">
        Chaque valeur part du cépage, puis chaque couche (style, appellation, terroir, millésime, âge, tes
        dégustations) l'ajuste. Confiance : <strong>{{ p.confiance.niveau }}</strong>
        <template v-if="p.confiance.manques.length"> (manque : {{ p.confiance.manques.join(', ') }})</template>.
      </p>
      <dl>
        <template v-for="c in criteresAffiches" :key="c.cle">
          <dt>
            {{ c.libelle }}
            <strong>{{ nombreCourt(p.criteres[c.cle].valeur) }}{{ c.unite ? ` ${c.unite}` : '' }}</strong>
            <em>{{ motPour(c.cle, p.criteres[c.cle].valeur) }}</em>
          </dt>
          <dd>
            <span v-for="(x, i) in p.criteres[c.cle].contributions.filter((x, i) => i === 0 || Math.abs(x.delta) >= 0.05)" :key="i">
              {{ x.couche }} <b :class="{ moins: i > 0 && x.delta < 0 }">{{ i === 0 ? nombreCourt(Math.round(x.delta * 10) / 10) : fmt(x.delta) }}</b>
            </span>
          </dd>
        </template>
      </dl>
      <p class="couches">Couches utilisées : {{ p.couches.join(' → ') }}</p>
    </details>
  </section>
</template>

<style scoped>
.bandeau-profil {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.fenetre {
  padding: 5px 12px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.85rem;
  background: #e4e0ee;
  color: #4b3f6b;
}
.fenetre.attendre {
  background: #e3ecf7;
  color: #2d5b8c;
}
.fenetre.pret,
.fenetre.apogee {
  background: #dcf1e4;
  color: var(--vert-fonce);
}
.fenetre.vite {
  background: #fbe9cf;
  color: #8a5a12;
}
.fenetre.passe {
  background: #f6d9d7;
  color: var(--danger);
}
.periode {
  font-size: 0.85rem;
  color: var(--discret);
}
.resume {
  margin: 8px 0 0;
  font-size: 0.9rem;
}
.alertes {
  margin: 12px 0 0;
  padding: 10px 14px 10px 30px;
  border-radius: 12px;
  background: #fff4dc;
  color: #6e4b07;
  font-size: 0.85rem;
  line-height: 1.4;
}
.source {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  margin-top: 14px;
  border-radius: 999px;
  background: #ebe3de;
}
.source button {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--discret);
}
.source button[aria-selected='true'] {
  background: var(--carte);
  color: var(--bordeaux);
  box-shadow: var(--ombre);
}
h4 {
  font-family: var(--sans);
  font-size: 0.9rem;
  margin: 18px 0 8px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
h4 small {
  font-weight: 400;
  color: var(--discret);
  font-size: 0.78rem;
}
.carte {
  padding: 12px;
}
.robe {
  display: flex;
  align-items: center;
  gap: 14px;
}
.pastille-robe {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 12%), inset 0 -6px 10px rgb(0 0 0 / 12%);
}
.robe div {
  display: grid;
}
.robe strong {
  text-transform: capitalize;
}
.robe span {
  font-size: 0.85rem;
  color: var(--discret);
}
.pourquoi {
  margin-top: 12px;
}
.pourquoi summary {
  font-weight: 700;
  color: var(--accent);
  cursor: pointer;
}
.nuance {
  font-size: 0.82rem;
  color: var(--discret);
  line-height: 1.45;
}
.pourquoi dl {
  margin: 0;
}
.pourquoi dt {
  margin-top: 10px;
  font-size: 0.9rem;
}
.pourquoi dt strong {
  margin-left: 6px;
}
.pourquoi dt em {
  color: var(--discret);
  font-size: 0.82rem;
  margin-left: 4px;
}
.pourquoi dd {
  margin: 3px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 0.78rem;
  color: var(--discret);
}
.pourquoi dd b {
  color: var(--vert-fonce);
}
.pourquoi dd b.moins {
  color: var(--rouge);
}
.couches {
  font-size: 0.78rem;
  color: var(--discret);
  margin: 12px 0 0;
}
</style>
