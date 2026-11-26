<script setup lang="ts">
/** Statistiques de la cave : répartitions des bouteilles en cave et maturité. */
import { computed, onMounted, ref } from 'vue'
import OngletsAccueil from '@/components/OngletsAccueil.vue'
import VinDetailSheet from '@/components/VinDetailSheet.vue'
import { useCaveStore } from '@/stores/cave'
import { useUiStore } from '@/stores/ui'
import type { Maturite, Part, TableauDeBord } from '@/repositories/statistiques'
import { formaterPrix, nombreCourt } from '@/domain/parsers'
import { couleurPastille, joindre, pluriel } from '@/utils/affichage'

const store = useCaveStore()
const ui = useUiStore()
const tb = ref<TableauDeBord | null>(null)
const vinOuvert = ref<number | null>(null)

onMounted(async () => {
  try {
    tb.value = await store.tableauDeBord()
  } catch (e) {
    ui.erreur(e)
  }
})

const COULEUR_MATURITE: Record<Maturite, string> = {
  jeune: '#7a9cc6',
  attendre: '#9bb7a0',
  deguster: 'var(--vert)',
  vite: '#e0a03c',
  passe: 'var(--rouge)',
  inconnu: 'var(--vin-autre)',
}

const pct = (p: Part) => (tb.value?.bouteilles ? (100 * p.bouteilles) / tb.value.bouteilles : 0)
const pctTexte = (p: Part) => `${Math.round(pct(p))} %`

/** Bandeau « camembert linéaire » des couleurs. */
const segmentsCouleur = computed(() => tb.value?.couleurs.map((p) => ({ ...p, largeur: pct(p) })) ?? [])

const sections = computed(() =>
  tb.value
    ? [
        { titre: 'Par appellation', parts: tb.value.appellations },
        { titre: 'Par département', parts: tb.value.departements },
      ]
    : [],
)
</script>

<template>
  <main class="page">
    <header class="entete">
      <OngletsAccueil />
      <h1>Statistiques</h1>
      <p>Sur les bouteilles en cave</p>
    </header>

    <p v-if="!tb" class="vide">Calcul…</p>
    <p v-else-if="!tb.bouteilles" class="vide">Aucune bouteille en cave pour l'instant.</p>

    <template v-else>
      <section class="chiffres">
        <div class="carte"><strong>{{ tb.bouteilles }}</strong><span>{{ tb.bouteilles > 1 ? 'bouteilles' : 'bouteille' }}</span></div>
        <div class="carte"><strong>{{ tb.vins }}</strong><span>{{ tb.vins > 1 ? 'références' : 'référence' }}</span></div>
        <div class="carte">
          <strong>{{ tb.prixMoyen === null ? '—' : formaterPrix(tb.prixMoyen) }}</strong><span>prix moyen</span>
        </div>
        <div class="carte">
          <strong>{{ tb.ageMoyen === null ? '—' : `${nombreCourt(Math.round(tb.ageMoyen * 10) / 10)} ans` }}</strong><span>âge moyen</span>
        </div>
        <div class="carte">
          <strong>{{ formaterPrix(tb.valeur) || '0 €' }}</strong><span>valeur estimée</span>
        </div>
        <div class="carte">
          <strong>{{ tb.noteMoyenne === null ? '—' : `${Math.round(tb.noteMoyenne)}/100` }}</strong><span>note moyenne</span>
        </div>
      </section>

      <h2 class="section-titre">Par couleur</h2>
      <section class="carte">
        <div class="ruban" role="img" :aria-label="tb.couleurs.map((p) => `${p.libelle} ${pctTexte(p)}`).join(', ')">
          <span
            v-for="s in segmentsCouleur"
            :key="s.libelle"
            :style="{ width: `${s.largeur}%`, background: s.libelle === 'Effervescent' ? '#d8c58a' : couleurPastille(s.libelle) }"
          />
        </div>
        <ul class="legende">
          <li v-for="p in tb.couleurs" :key="p.libelle">
            <span class="point-couleur" :style="{ background: p.libelle === 'Effervescent' ? '#d8c58a' : couleurPastille(p.libelle) }" />
            <strong>{{ p.libelle }}</strong>
            <span class="valeur">{{ pctTexte(p) }}</span>
            <small>{{ pluriel(p.bouteilles, 'bt', 'bt') }}</small>
          </li>
        </ul>
      </section>

      <h2 class="section-titre">Maturité</h2>
      <section class="carte">
        <ul class="barres">
          <li v-for="p in tb.maturite" :key="p.cle">
            <div class="ligne">
              <strong>{{ p.libelle }}</strong>
              <span class="valeur">{{ pluriel(p.bouteilles, 'bt', 'bt') }} · {{ pctTexte(p) }}</span>
            </div>
            <div class="jauge"><span :style="{ width: `${pct(p)}%`, background: COULEUR_MATURITE[p.cle] }" /></div>
          </li>
        </ul>
        <p class="note">D'après la fenêtre de garde estimée par le profil de chaque vin (cépage, appellation, millésime).</p>
      </section>

      <template v-if="tb.prioritaires.length">
        <h2 class="section-titre">À ouvrir en priorité</h2>
        <section class="carte">
          <ul class="prioritaires">
            <li v-for="v in tb.prioritaires" :key="v.id_vin" role="button" tabindex="0" @click="vinOuvert = v.id_vin" @keydown.enter="vinOuvert = v.id_vin">
              <span class="point-couleur" :style="{ background: couleurPastille(v.couleur) }" />
              <span class="vin">
                <strong>{{ v.domaine }}</strong>
                <small>{{ joindre(v.millesime, v.appellation) }}</small>
              </span>
              <span class="etat" :style="{ color: COULEUR_MATURITE[v.maturite] }">{{ v.fenetre }}</span>
            </li>
          </ul>
        </section>
      </template>

      <template v-for="s in sections" :key="s.titre">
        <h2 class="section-titre">{{ s.titre }}</h2>
        <section class="carte">
          <ul class="barres">
            <li v-for="p in s.parts" :key="p.libelle">
              <div class="ligne">
                <strong :class="{ discret: p.libelle === 'Non renseigné' || p.libelle === 'Autres' }">{{ p.libelle }}</strong>
                <span class="valeur">{{ pluriel(p.bouteilles, 'bt', 'bt') }} · {{ pctTexte(p) }}</span>
              </div>
              <div class="jauge"><span :style="{ width: `${pct(p)}%` }" /></div>
            </li>
          </ul>
        </section>
      </template>
    </template>

    <VinDetailSheet :id-vin="vinOuvert" @fermer="vinOuvert = null" />
  </main>
</template>

<style scoped>
.entete {
  padding: 18px 4px 14px;
}
.entete h1 {
  margin-top: 14px;
  font-size: 1.9rem;
  color: var(--bordeaux);
}
.entete p {
  margin: 4px 0 0;
  color: var(--discret);
}
.vide {
  text-align: center;
  color: var(--discret);
  margin-top: 14vh;
}
.chiffres {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.chiffres .carte {
  padding: 12px 8px;
  display: grid;
  gap: 2px;
  text-align: center;
}
.chiffres strong {
  font-family: var(--serif);
  font-size: 1.15rem;
  color: var(--bordeaux);
  white-space: nowrap;
}
.chiffres span {
  font-size: 0.74rem;
  color: var(--discret);
}
.ruban {
  display: flex;
  height: 18px;
  border-radius: 999px;
  overflow: hidden;
  gap: 2px;
  background: var(--bord);
}
.ruban span {
  min-width: 4px;
}
.legende {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.legende li {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 10px;
}
.legende small {
  color: var(--discret);
  min-width: 44px;
  text-align: right;
}
.valeur {
  font-variant-numeric: tabular-nums;
  color: var(--texte);
  font-size: 0.88rem;
}
.barres {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}
.ligne {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 5px;
}
.ligne strong {
  font-weight: 600;
  font-size: 0.92rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ligne strong.discret {
  color: var(--discret);
  font-style: italic;
}
.ligne .valeur {
  flex: none;
  color: var(--discret);
}
.jauge {
  height: 8px;
  border-radius: 999px;
  background: #f0e9e4;
  overflow: hidden;
}
.jauge span {
  display: block;
  height: 100%;
  min-width: 4px;
  border-radius: 999px;
  background: var(--accent);
  transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.note {
  margin: 14px 0 0;
  font-size: 0.78rem;
  color: var(--discret);
  line-height: 1.4;
}
.prioritaires {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
}
.prioritaires li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 10px 2px;
  border-bottom: 1px solid var(--bord);
  cursor: pointer;
}
.prioritaires li:last-child {
  border-bottom: 0;
}
.vin {
  display: grid;
  min-width: 0;
}
.vin strong {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vin small {
  color: var(--discret);
}
.etat {
  font-size: 0.78rem;
  font-weight: 600;
  text-align: right;
  max-width: 120px;
}
</style>
