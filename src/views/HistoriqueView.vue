<script setup lang="ts">
/** Historique des achats : récapitulatif des entrées et sorties de stock. */
import BandeauLogo from '@/components/BandeauLogo.vue'
import { computed, onMounted, ref } from 'vue'
import OngletsAccueil from '@/components/OngletsAccueil.vue'
import VinDetailSheet from '@/components/VinDetailSheet.vue'
import Icone from '@/components/Icone.vue'
import { useCaveStore } from '@/stores/cave'
import { useUiStore } from '@/stores/ui'
import type { MouvementHistorique } from '@/domain/types'
import { aujourdhui, formaterPrix } from '@/domain/parsers'
import { couleurPastille, dateCourte, joindre, moisAnnee, pluriel } from '@/utils/affichage'
import { csvExcel, nomFichier, partagerOuTelecharger } from '@/utils/fichiers'

type Sens = 'tous' | 'entrée' | 'sortie'

const store = useCaveStore()
const ui = useUiStore()
const mouvements = ref<MouvementHistorique[]>([])
const charge = ref(false)
const sens = ref<Sens>('tous')
const annee = ref('toutes')
const vinOuvert = ref<number | null>(null)

onMounted(async () => {
  try {
    mouvements.value = await store.historique()
  } catch (e) {
    ui.erreur(e)
  } finally {
    charge.value = true
  }
})

const annees = computed(() => [...new Set(mouvements.value.map((m) => m.date_mouvement.slice(0, 4)))].sort().reverse())

const filtres = computed(() =>
  mouvements.value.filter(
    (m) =>
      (sens.value === 'tous' || m.type_mouvement === sens.value) &&
      (annee.value === 'toutes' || m.date_mouvement.startsWith(annee.value)),
  ),
)

const montant = (m: MouvementHistorique) => (m.prix === null ? null : m.prix * m.quantite_mouvement)

const resume = computed(() => {
  let entrees = 0, sorties = 0, depenses = 0, sansPrix = 0
  for (const m of filtres.value) {
    if (m.type_mouvement === 'entrée') {
      entrees += m.quantite_mouvement
      if (m.prix === null) sansPrix += m.quantite_mouvement
      else depenses += m.prix * m.quantite_mouvement
    } else sorties += m.quantite_mouvement
  }
  return { entrees, sorties, depenses, sansPrix }
})

/** Mouvements regroupés par mois (déjà triés du plus récent au plus ancien). */
const parMois = computed(() => {
  const groupes: { mois: string; lignes: MouvementHistorique[] }[] = []
  for (const m of filtres.value) {
    const mois = m.date_mouvement.slice(0, 7)
    const dernier = groupes[groupes.length - 1]
    if (dernier?.mois === mois) dernier.lignes.push(m)
    else groupes.push({ mois, lignes: [m] })
  }
  return groupes
})

async function exporter() {
  const blob = csvExcel(
    ['Date', 'Type', 'Quantité', 'Domaine', 'Millésime', 'Appellation', 'Cuvée', 'Couleur', 'Prix unitaire', 'Montant'],
    filtres.value.map((m) => [
      dateCourte(m.date_mouvement), m.type_mouvement, m.quantite_mouvement, m.domaine, m.millesime,
      m.appellation, m.cuvee, m.couleur, m.prix, montant(m),
    ]),
  )
  await partagerOuTelecharger(blob, `${nomFichier(store.nomCave)}_historique_${aujourdhui()}.csv`, 'Historique de ma cave')
}
</script>

<template>
  <main class="page">
    <BandeauLogo />
    <header class="entete">
      <OngletsAccueil />
      <h1>Historique</h1>
      <p>Entrées et sorties de bouteilles</p>
    </header>

    <template v-if="charge && mouvements.length">
      <section class="resume">
        <div class="carte"><strong class="vert">+{{ resume.entrees }}</strong><span>entrées</span></div>
        <div class="carte"><strong class="rouge">−{{ resume.sorties }}</strong><span>sorties</span></div>
        <div class="carte large">
          <strong>{{ formaterPrix(resume.depenses) || '0,00 €' }}</strong>
          <span>
            d'achats estimés (prix actuels des vins)
            <template v-if="resume.sansPrix"> · {{ pluriel(resume.sansPrix, 'bouteille') }} sans prix</template>
          </span>
        </div>
      </section>

      <div class="filtres">
        <div class="choix">
          <button :aria-pressed="sens === 'tous'" @click="sens = 'tous'">Tout</button>
          <button :aria-pressed="sens === 'entrée'" @click="sens = 'entrée'">Entrées</button>
          <button :aria-pressed="sens === 'sortie'" @click="sens = 'sortie'">Sorties</button>
        </div>
        <select v-model="annee" aria-label="Année">
          <option value="toutes">Toutes les années</option>
          <option v-for="a in annees" :key="a" :value="a">{{ a }}</option>
        </select>
      </div>

      <section v-for="g in parMois" :key="g.mois" class="carte mois">
        <h2>{{ moisAnnee(g.mois + '-01') }}</h2>
        <table class="tableau">
          <thead>
            <tr><th>Date</th><th>Vin</th><th class="nombre">Qté</th><th class="nombre">Montant</th></tr>
          </thead>
          <tbody>
            <tr v-for="m in g.lignes" :key="m.id_mouv" @click="vinOuvert = m.id_vin">
              <td class="date">{{ dateCourte(m.date_mouvement).slice(0, 5) }}</td>
              <td>
                <span class="vin">
                  <span class="point-couleur" :style="{ background: couleurPastille(m.couleur) }" />
                  <strong>{{ m.domaine ?? 'Vin supprimé' }}</strong>
                </span>
                <small>{{ joindre(m.millesime, m.appellation, m.cuvee) }}</small>
              </td>
              <td class="nombre">
                <span class="badge" :class="{ sortie: m.type_mouvement === 'sortie' }">
                  {{ m.type_mouvement === 'entrée' ? '+' : '−' }}{{ m.quantite_mouvement }}
                </span>
              </td>
              <td class="nombre">{{ m.type_mouvement === 'entrée' ? formaterPrix(montant(m)) : '' }}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <p v-if="!filtres.length" class="vide">Aucun mouvement pour ce filtre.</p>

      <button class="btn btn-large exporter" @click="exporter">
        <Icone nom="partager" :taille="20" /> Exporter en CSV (Excel)
      </button>
    </template>
    <p v-else-if="charge" class="vide">Aucune entrée ni sortie pour l'instant.<br />Elles apparaîtront ici dès ton premier ajout de bouteille.</p>

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
.resume {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.resume .carte {
  display: grid;
  gap: 2px;
  padding: 14px 16px;
}
.resume .large {
  grid-column: 1 / -1;
}
.resume strong {
  font-family: var(--serif);
  font-size: 1.6rem;
  color: var(--bordeaux);
}
.resume strong.vert {
  color: var(--vert-fonce);
}
.resume strong.rouge {
  color: var(--rouge);
}
.resume span {
  font-size: 0.84rem;
  color: var(--discret);
}
.filtres {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 18px 0 6px;
}
.filtres .choix {
  margin: 0;
}
.filtres select {
  min-height: 40px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--bord);
  background: var(--carte);
}
.mois {
  margin-top: 12px;
  padding: 12px 10px 4px;
}
.mois h2 {
  font-size: 1.05rem;
  color: var(--accent);
  margin: 0 6px 4px;
}
.date {
  white-space: nowrap;
  color: var(--discret);
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
.exporter {
  margin-top: 20px;
}
</style>
