<script setup lang="ts">
/** Accueil : la cave (vignettes), ou l'écran de création s'il n'y a pas encore de cave. */
import { nextTick, onMounted, ref } from 'vue'
import { useCaveStore, type Filtre } from '@/stores/cave'
import { useUiStore } from '@/stores/ui'
import VinCard from '@/components/VinCard.vue'
import StockSheet from '@/components/StockSheet.vue'
import Icone from '@/components/Icone.vue'
import type { VinCave } from '@/domain/types'
import { pluriel } from '@/utils/affichage'

const store = useCaveStore()
const ui = useUiStore()
const vinStock = ref<VinCave | null>(null)
const creation = ref(false)
const fichier = ref<HTMLInputElement>()
const logo = `${import.meta.env.BASE_URL}icons/icon.svg`

const FILTRES: { val: Filtre; libelle: string }[] = [
  { val: 'tous', libelle: 'Tous' },
  { val: 'en-stock', libelle: 'En cave' },
  { val: 'epuises', libelle: 'Épuisés' },
]

async function creer() {
  creation.value = true
  try {
    await store.creer()
    ui.toast('Ta cave est prête 🍷')
  } catch (e) {
    ui.erreur(e)
  } finally {
    creation.value = false
  }
}

async function importer(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  creation.value = true
  try {
    await store.importer(f)
    ui.toast(`${pluriel(store.vins.length, 'vin')} importé${store.vins.length > 1 ? 's' : ''}`)
  } catch (err) {
    ui.erreur(err)
  } finally {
    creation.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

// Après un ajout : on fait défiler jusqu'au nouveau vin
onMounted(async () => {
  if (!store.dernierVin) return
  await nextTick()
  document.getElementById(`vin-${store.dernierVin}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  setTimeout(() => (store.dernierVin = null), 1800)
})
</script>

<template>
  <!-- Pas encore de cave -->
  <main v-if="!store.prete" class="accueil-vide">
    <div class="intro">
      <img :src="logo" alt="" width="96" height="96" />
      <h1>Cave à vin</h1>
      <p>Aucune cave pour l'instant. Touche le bouton du bas pour créer la tienne : elle est rangée sur ton téléphone.</p>
      <button class="lien" :disabled="creation" @click="fichier?.click()">
        <Icone nom="importer" :taille="18" /> J'ai déjà une base (.db)
      </button>
      <input ref="fichier" type="file" accept=".db,.sqlite,.sqlite3,application/octet-stream,application/vnd.sqlite3,application/x-sqlite3" hidden @change="importer" />
    </div>
    <button class="creer" :disabled="creation" @click="creer">
      <Icone nom="plus" :taille="26" />
      {{ creation ? 'Création…' : 'Créer ma cave' }}
    </button>
  </main>

  <!-- La cave -->
  <main v-else class="page cave">
    <header class="entete">
      <h1>Ma cave</h1>
      <p>
        {{ pluriel(store.totalBouteilles, 'bouteille') }} · {{ pluriel(store.vins.length, 'vin') }}
      </p>
    </header>

    <template v-if="store.vins.length">
      <div class="outils">
        <label class="recherche">
          <Icone nom="recherche" :taille="20" />
          <input v-model="store.recherche" type="search" placeholder="Domaine, appellation, cépage…" enterkeyhint="search" />
        </label>
        <div class="filtres" role="tablist">
          <button
            v-for="f in FILTRES"
            :key="f.val"
            role="tab"
            :aria-selected="store.filtre === f.val"
            @click="store.filtre = f.val"
          >
            {{ f.libelle }}
          </button>
        </div>
      </div>

      <TransitionGroup v-if="store.vinsAffiches.length" tag="section" name="liste" class="grille">
        <VinCard
          v-for="vin in store.vinsAffiches"
          :id="`vin-${vin.id_vin}`"
          :key="vin.id_vin"
          :vin="vin"
          :recent="vin.id_vin === store.dernierVin"
          @stock="vinStock = vin"
        />
      </TransitionGroup>
      <p v-else class="vide">Aucun vin ne correspond.</p>
    </template>

    <div v-else class="premier">
      <p>Ta cave est vide.<br />Touche le <strong>+</strong> pour ajouter ta première bouteille.</p>
      <p class="astuce">Astuce : reste appuyé sur le + et glisse pour les autres actions.</p>
      <span class="fleche" aria-hidden="true">↓</span>
    </div>

    <StockSheet :vin="vinStock" @fermer="vinStock = null" />
  </main>
</template>

<style scoped>
/* --- Écran de création */
.accueil-vide {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px 28px calc(var(--bas-sur) + 120px);
  background:
    radial-gradient(120% 60% at 50% 0%, #fff 0%, transparent 70%),
    var(--fond);
}
.intro {
  text-align: center;
  display: grid;
  justify-items: center;
  gap: 12px;
  max-width: 340px;
}
.intro img {
  border-radius: 24px;
  box-shadow: var(--ombre-forte);
  margin-bottom: 8px;
}
.intro h1 {
  font-size: 2rem;
  color: var(--bordeaux);
}
.intro p {
  margin: 0;
  color: var(--discret);
  line-height: 1.5;
}
.lien {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  color: var(--accent);
  font-weight: 600;
  padding: 10px 14px;
  border-radius: 999px;
}
.lien:active {
  background: var(--accent-clair);
}
.creer {
  position: fixed;
  left: 50%;
  bottom: calc(var(--bas-sur) + 20px);
  transform: translateX(-50%);
  height: 64px;
  padding: 0 28px 0 22px;
  border-radius: 999px;
  background: var(--vert);
  color: #fff;
  font-weight: 700;
  font-size: 1.05rem;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
  box-shadow: 0 6px 18px rgb(46 158 91 / 45%);
  animation: appel 2.4s ease-in-out infinite;
}
.creer:disabled {
  animation: none;
  opacity: 0.7;
}
@keyframes appel {
  0%,
  100% {
    box-shadow: 0 6px 18px rgb(46 158 91 / 45%), 0 0 0 0 rgb(46 158 91 / 35%);
  }
  50% {
    box-shadow: 0 6px 18px rgb(46 158 91 / 45%), 0 0 0 14px rgb(46 158 91 / 0%);
  }
}

/* --- La cave */
.entete {
  padding: 18px 4px 14px;
}
.entete h1 {
  font-size: 1.9rem;
  color: var(--bordeaux);
}
.entete p {
  margin: 4px 0 0;
  color: var(--discret);
}
.outils {
  position: sticky;
  top: 0;
  z-index: 5;
  margin: 0 -16px 12px;
  padding: calc(var(--haut-sur) + 6px) 16px 10px;
  background: linear-gradient(var(--fond) 80%, transparent);
}
.recherche {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--carte);
  border: 1px solid var(--bord);
  border-radius: 999px;
  padding: 0 16px;
  color: var(--discret);
}
.recherche input {
  flex: 1;
  min-height: 46px;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--texte);
}
.filtres {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.filtres button {
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--discret);
  border: 1px solid var(--bord);
  background: var(--carte);
}
.filtres button[aria-selected='true'] {
  background: var(--bordeaux);
  border-color: var(--bordeaux);
  color: #fff;
}
.grille {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(156px, 1fr));
  gap: 12px;
}
.liste-enter-from {
  opacity: 0;
  transform: scale(0.95);
}
.liste-enter-active {
  transition: all 0.25s ease;
}
.premier {
  text-align: center;
  margin-top: 18vh;
  color: var(--texte);
  line-height: 1.55;
}
.premier .astuce {
  color: var(--discret);
  font-size: 0.88rem;
}
.fleche {
  display: block;
  font-size: 2rem;
  color: var(--vert);
  margin-top: 16px;
  animation: rebond 1.4s ease-in-out infinite;
}
@keyframes rebond {
  50% {
    transform: translateY(8px);
  }
}
</style>
