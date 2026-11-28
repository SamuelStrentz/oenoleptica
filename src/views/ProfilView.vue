<script setup lang="ts">
/** Profil : mes caves (créer / ouvrir), chiffres, sauvegarde, installation. */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icone from '@/components/Icone.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import { useCaveStore } from '@/stores/cave'
import { useUiStore } from '@/stores/ui'
import { useDossierStore } from '@/stores/dossier'
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
const dossier = useDossierStore()
const fichier = ref<HTMLInputElement>()
const fichierReferentiel = ref<HTMLInputElement>()
const referentiel = ref<{ vignerons: number; vins: number } | null>(null)
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
  referentiel.value = await store.infoReferentiel().catch(() => null)
})
onBeforeUnmount(() => window.removeEventListener('beforeinstallprompt', surInstallable))

async function installer() {
  await installation.value?.prompt()
  installation.value = null
}

// ------------------------------------------------------- dossier local
/** Caves présentes dans le dossier mais pas encore sur le téléphone. */
const cavesDuDossier = computed(() => {
  const internes = new Set((store.stockage?.caves ?? []).map((c) => c.nom))
  return dossier.fichiers.filter((f) => !internes.has(f.nom))
})

const derniereCopie = computed(() =>
  dossier.derniereCopie
    ? dossier.derniereCopie.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null,
)

async function agir(fn: () => Promise<unknown>, ok?: string) {
  try {
    await fn()
    if (ok) ui.toast(ok)
  } catch (e) {
    if ((e as Error).name !== 'AbortError') ui.erreur(e)
  }
}

async function ouvrirDuDossier(nom: string) {
  await agir(() => dossier.ouvrirDepuisDossier(nom), `Cave « ${nom} » ouverte`)
  if (store.nomCave === nom) router.push('/')
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

// ---------------------------------------------------------- référentiel
async function importerReferentiel(e: Event) {
  const entree = e.target as HTMLInputElement
  const f = entree.files?.[0]
  entree.value = ''
  if (!f) return
  try {
    referentiel.value = await store.importerReferentiel(new Uint8Array(await f.arrayBuffer()))
    ui.toast(`Référentiel chargé : ${pluriel(referentiel.value.vins, 'vin')}`)
  } catch (err) {
    ui.erreur(err)
  }
}

async function supprimerReferentiel() {
  if (!confirm('Retirer le référentiel du téléphone ?\n\nTes caves ne sont pas touchées.')) return
  await agir(() => store.supprimerReferentiel(), 'Référentiel retiré')
  referentiel.value = null
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
  const aussiDossier = dossier.etat === 'pret' ? `\n\nSon fichier « ${nom}.db » sera aussi supprimé du dossier « ${dossier.nom} ».` : ''
  if (!confirm(`Supprimer définitivement la cave « ${nom} » ?${aussiDossier}\n\nCette action est irréversible.`)) return
  if (!confirm(`Dernière confirmation : ${pluriel(store.vins.length, 'vin')} vont être effacés.`)) return
  try {
    await store.supprimer()
    await dossier.supprimerFichier(nom)
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
        <li v-for="f in cavesDuDossier" :key="'dossier-' + f.nom">
          <button @click="ouvrirDuDossier(f.nom)">
            <Icone nom="dossier" :taille="20" />
            <span>{{ f.nom }}</span>
            <small>dans le dossier</small>
          </button>
        </li>
      </ul>
      <div class="actions">
        <button class="btn btn-large" @click="demanderNom">
          <Icone nom="plus" :taille="20" /> Créer une nouvelle cave
        </button>
        <button class="btn btn-large" @click="fichier?.click()">
          <Icone nom="importer" :taille="20" /> Ouvrir un .db d'un autre emplacement
        </button>
      </div>
      <input ref="fichier" type="file" accept=".db,.sqlite,.sqlite3,application/octet-stream,application/vnd.sqlite3,application/x-sqlite3" hidden @change="importer" />
    </section>

    <h2 class="section-titre">Référentiel des étiquettes</h2>
    <section class="carte actions">
      <p class="aide">
        Une base de vins de référence (même format qu'une cave) qui aide à reconnaître une étiquette photographiée
        dans « Ajouter une bouteille ». Elle reste sur le téléphone, à part de tes caves.
      </p>
      <dl v-if="referentiel" class="infos">
        <dt>Contenu</dt>
        <dd>{{ pluriel(referentiel.vins, 'vin') }} · {{ pluriel(referentiel.vignerons, 'vigneron') }}</dd>
      </dl>
      <button class="btn btn-large" @click="fichierReferentiel?.click()">
        <Icone nom="importer" :taille="20" /> {{ referentiel ? 'Remplacer le référentiel (.db)' : 'Importer un référentiel (.db)' }}
      </button>
      <button v-if="referentiel" class="btn btn-large" @click="supprimerReferentiel">
        <Icone nom="corbeille" :taille="20" /> Retirer le référentiel
      </button>
      <input ref="fichierReferentiel" type="file" accept=".db,.sqlite,.sqlite3,application/octet-stream,application/vnd.sqlite3,application/x-sqlite3" hidden @change="importerReferentiel" />
    </section>

    <h2 class="section-titre">Dossier local</h2>
    <section class="carte actions">
      <template v-if="dossier.etat === 'non-supporte'">
        <p class="aide">Ce navigateur ne permet pas de lier un dossier. Utilise Chrome à jour sur Android.</p>
      </template>
      <template v-else-if="dossier.etat === 'aucun'">
        <p class="aide">
          Choisis un dossier (par ex. <em>Documents/Œnoleptica</em>) : chaque cave y sera copiée automatiquement en
          <code>.db</code>, dans le sous-dossier « db ».
        </p>
        <button class="btn btn-principal btn-large" @click="agir(dossier.choisir, 'Dossier lié')">
          <Icone nom="dossier" :taille="20" /> Choisir le dossier
        </button>
      </template>
      <template v-else>
        <dl class="infos">
          <dt>Dossier</dt>
          <dd class="chemin">{{ dossier.nom }}/db</dd>
          <dt>État</dt>
          <dd>{{ dossier.etat === 'pret' ? 'Copie automatique active' : 'Autorisation à renouveler' }}</dd>
          <template v-if="derniereCopie"><dt>Dernière copie</dt><dd>{{ derniereCopie }}</dd></template>
          <template v-if="dossier.erreur"><dt>Erreur</dt><dd class="erreur">{{ dossier.erreur }}</dd></template>
        </dl>
        <button v-if="dossier.etat === 'a-autoriser'" class="btn btn-principal btn-large" @click="agir(dossier.autoriser)">
          Autoriser l'accès
        </button>
        <button v-else class="btn btn-large" @click="agir(dossier.copier, 'Cave copiée dans le dossier')">
          <Icone nom="synchro" :taille="20" /> Copier maintenant
        </button>
        <button class="btn btn-large" @click="agir(dossier.choisir, 'Dossier changé')">
          <Icone nom="dossier" :taille="20" /> Changer de dossier
        </button>
      </template>
    </section>

    <h2 class="section-titre">Sauvegarde</h2>
    <section class="carte actions">
      <p class="aide">
        Pour envoyer une copie ailleurs (Drive, mail…). Le fichier <code>.db</code> s'ouvre aussi dans
        l'appli Python sur PC.
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
.chemin {
  font-family: monospace;
}
.erreur {
  color: var(--danger);
}
.creation h2 {
  font-size: 1.3rem;
}
.creation .aide {
  margin: 6px 0 16px;
}
</style>
