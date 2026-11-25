<script setup lang="ts">
/** Profil : mes caves (créer / ouvrir), chiffres, sauvegarde, installation. */
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icone from '@/components/Icone.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import { useCaveStore } from '@/stores/cave'
import { useUiStore } from '@/stores/ui'
import { aujourdhui, formaterPrix } from '@/domain/parsers'
import { pluriel } from '@/utils/affichage'
import { nomFichier, partagerOuTelecharger } from '@/utils/fichiers'
import { apresPanneau } from '@/utils/panneaux'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
}

const router = useRouter()
const store = useCaveStore()
const ui = useUiStore()
const fichier = ref<HTMLInputElement>()
const persistee = ref<boolean | null>(null)
const installation = ref<InstallEvent | null>(null)
const version = __APP_VERSION__

const creation = ref(false)
const nomNouvelle = ref('')
const champNom = ref<HTMLInputElement>()

function surInstallable(e: Event) {
  e.preventDefault()
  installation.value = e as InstallEvent
}

onMounted(async () => {
  window.addEventListener('beforeinstallprompt', surInstallable)
  persistee.value = (await navigator.storage?.persisted?.()) ?? null
})
onBeforeUnmount(() => window.removeEventListener('beforeinstallprompt', surInstallable))

async function installer() {
  await installation.value?.prompt()
  installation.value = null
}

// --------------------------------------------------------------- caves
async function ouvrirCave(f: string) {
  if (f === store.stockage?.cave?.fichier) return
  try {
    await store.ouvrir(f)
    ui.toast(`Cave « ${store.nomCave} » ouverte`)
    router.push('/')
  } catch (e) {
    ui.erreur(e)
  }
}

async function demanderNom() {
  nomNouvelle.value = ''
  creation.value = true
  await nextTick()
  setTimeout(() => champNom.value?.focus(), 250)
}

async function creer() {
  try {
    await store.creer(nomNouvelle.value)
    creation.value = false
    ui.toast(`Cave « ${store.nomCave} » créée`)
    await apresPanneau()
    router.push('/')
  } catch (e) {
    ui.erreur(e)
  }
}

async function importer(e: Event) {
  const entree = e.target as HTMLInputElement
  const f = entree.files?.[0]
  entree.value = ''
  if (!f) return
  try {
    await store.importer(f)
    ui.toast(`Cave « ${store.nomCave} » ouverte : ${pluriel(store.vins.length, 'vin')}`)
    router.push('/')
  } catch (err) {
    ui.erreur(err)
  }
}

async function exporter() {
  try {
    const blob = await store.exporter()
    await partagerOuTelecharger(blob, `${nomFichier(store.nomCave)}_${aujourdhui()}.db`, 'Sauvegarde de ma cave')
  } catch (e) {
    ui.erreur(e)
  }
}

async function supprimer() {
  const nom = store.nomCave
  if (!confirm(`Supprimer définitivement la cave « ${nom} » de ce téléphone ?\n\nCette action est irréversible.`)) return
  if (!confirm(`Dernière confirmation : ${pluriel(store.vins.length, 'vin')} vont être effacés.`)) return
  try {
    await store.supprimer()
    ui.toast(`Cave « ${nom} » supprimée`)
    router.replace('/')
  } catch (e) {
    ui.erreur(e)
  }
}
</script>

<template>
  <main class="page">
    <header class="barre">
      <button class="bouton-icone" aria-label="Retour" @click="router.back()"><Icone nom="retour" /></button>
      <h1>Profil</h1>
    </header>

    <section v-if="store.stats" class="chiffres">
      <div class="carte"><strong>{{ store.stats.bouteilles }}</strong><span>bouteille{{ store.stats.bouteilles > 1 ? 's' : '' }}</span></div>
      <div class="carte"><strong>{{ store.stats.vins }}</strong><span>vin{{ store.stats.vins > 1 ? 's' : '' }}</span></div>
      <div class="carte"><strong>{{ store.stats.vignerons }}</strong><span>vigneron{{ store.stats.vignerons > 1 ? 's' : '' }}</span></div>
      <div class="carte"><strong>{{ formaterPrix(store.stats.valeur) || '0 €' }}</strong><span>valeur estimée</span></div>
    </section>

    <h2 class="section-titre">Mes caves</h2>
    <section class="carte caves">
      <ul>
        <li v-for="c in store.stockage?.caves ?? []" :key="c.fichier">
          <button :class="{ courante: c.fichier === store.stockage?.cave?.fichier }" @click="ouvrirCave(c.fichier)">
            <Icone nom="cave" :taille="20" />
            <span>{{ c.nom }}</span>
            <small v-if="c.fichier === store.stockage?.cave?.fichier">ouverte</small>
          </button>
        </li>
      </ul>
      <div class="actions">
        <button class="btn btn-large" @click="demanderNom">
          <Icone nom="plus" :taille="20" /> Créer une nouvelle cave
        </button>
        <button class="btn btn-large" @click="fichier?.click()">
          <Icone nom="importer" :taille="20" /> Ouvrir une cave (.db)
        </button>
      </div>
      <input ref="fichier" type="file" accept=".db,.sqlite,.sqlite3,application/octet-stream,application/vnd.sqlite3,application/x-sqlite3" hidden @change="importer" />
    </section>

    <h2 class="section-titre">Sauvegarde</h2>
    <section class="carte actions">
      <p class="aide">
        Chaque cave est enregistrée automatiquement sur ce téléphone. Exporte-la régulièrement : le fichier
        <code>.db</code> s'ouvre aussi dans l'appli Python sur PC.
      </p>
      <button class="btn btn-principal btn-large" @click="exporter">
        <Icone nom="telecharger" :taille="20" /> Exporter « {{ store.nomCave }} » (.db)
      </button>
    </section>

    <h2 class="section-titre">Application</h2>
    <section class="carte actions">
      <button v-if="installation" class="btn btn-vert btn-large" @click="installer">
        <Icone nom="installer" :taille="20" /> Installer sur l'écran d'accueil
      </button>
      <dl class="infos">
        <dt>Stockage</dt>
        <dd>
          {{ store.stockage?.persistant ? 'Sur le téléphone (OPFS)' : 'Temporaire — navigateur non compatible' }}
          <template v-if="persistee !== null"> · {{ persistee ? 'protégé' : 'non protégé' }}</template>
        </dd>
        <dt>SQLite</dt>
        <dd>{{ store.stockage?.versionSqlite }}</dd>
        <dt>Version</dt>
        <dd>Œnoleptica {{ version }}</dd>
      </dl>
    </section>

    <h2 class="section-titre">Zone sensible</h2>
    <section class="carte actions">
      <button class="btn btn-danger btn-large" @click="supprimer">
        <Icone nom="corbeille" :taille="20" /> Supprimer la cave « {{ store.nomCave }} »
      </button>
    </section>

    <BottomSheet :ouvert="creation" titre="Nouvelle cave" @fermer="creation = false">
      <form class="creation" @submit.prevent="creer">
        <h2>Nouvelle cave</h2>
        <p class="aide">Une cave vide, avec la même structure. Tes autres caves restent intactes.</p>
        <label class="champ">
          <span>Nom de la cave</span>
          <input ref="champNom" v-model="nomNouvelle" autocapitalize="sentences" placeholder="Cave de la maison" maxlength="60" />
        </label>
        <button type="submit" class="btn btn-vert btn-large" :disabled="!nomNouvelle.trim()">
          <Icone nom="coche" /> Créer
        </button>
      </form>
    </BottomSheet>
  </main>
</template>

<style scoped>
.chiffres {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.chiffres .carte {
  display: grid;
  gap: 2px;
  padding: 14px 16px;
}
.chiffres strong {
  font-family: var(--serif);
  font-size: 1.6rem;
  color: var(--bordeaux);
}
.chiffres span {
  font-size: 0.85rem;
  color: var(--discret);
}
.caves ul {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  display: grid;
  gap: 6px;
}
.caves li button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 50px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid var(--bord);
  color: var(--discret);
  text-align: left;
}
.caves li button span {
  flex: 1;
  color: var(--texte);
  font-weight: 600;
}
.caves li button.courante {
  border-color: var(--accent);
  background: var(--accent-clair);
  color: var(--accent);
}
.caves li small {
  font-weight: 700;
}
.actions {
  display: grid;
  gap: 10px;
}
.aide {
  margin: 0 0 4px;
  color: var(--discret);
  font-size: 0.9rem;
  line-height: 1.5;
}
.infos {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 16px;
  margin: 0;
  font-size: 0.9rem;
}
.infos dt {
  color: var(--discret);
}
.infos dd {
  margin: 0;
}
.creation h2 {
  font-size: 1.3rem;
}
.creation .aide {
  margin: 6px 0 16px;
}
</style>
