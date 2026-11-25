<script setup lang="ts">
/** Profil : chiffres de la cave, sauvegarde (export / import .db), installation. */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icone from '@/components/Icone.vue'
import { useCaveStore } from '@/stores/cave'
import { useUiStore } from '@/stores/ui'
import { aujourdhui, formaterPrix } from '@/domain/parsers'
import { pluriel } from '@/utils/affichage'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const router = useRouter()
const store = useCaveStore()
const ui = useUiStore()
const fichier = ref<HTMLInputElement>()
const persistee = ref<boolean | null>(null)
const installation = ref<InstallEvent | null>(null)
const version = __APP_VERSION__

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

async function exporter() {
  try {
    const blob = await store.exporter()
    const nom = `cave_${aujourdhui()}.db`
    const f = new File([blob], nom, { type: blob.type })
    // Android : menu de partage (Drive, mail…) ; sinon simple téléchargement
    if (navigator.canShare?.({ files: [f] })) {
      try {
        await navigator.share({ files: [f], title: 'Sauvegarde de ma cave' })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: nom })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  } catch (e) {
    ui.erreur(e)
  }
}

async function importer(e: Event) {
  const entree = e.target as HTMLInputElement
  const f = entree.files?.[0]
  entree.value = ''
  if (!f) return
  if (!confirm(`Remplacer ta cave actuelle par « ${f.name} » ?\n\nPense à exporter une sauvegarde avant.`)) return
  try {
    await store.importer(f)
    ui.toast(`Cave importée : ${pluriel(store.vins.length, 'vin')}`)
  } catch (err) {
    ui.erreur(err)
  }
}

async function supprimer() {
  if (!confirm('Supprimer définitivement ta cave de ce téléphone ?\n\nCette action est irréversible.')) return
  if (!confirm(`Dernière confirmation : ${pluriel(store.vins.length, 'vin')} vont être effacés.`)) return
  try {
    await store.supprimer()
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

    <h2 class="section-titre">Sauvegarde</h2>
    <section class="carte actions">
      <p class="aide">
        Ta cave est enregistrée automatiquement sur ce téléphone. Exporte-la régulièrement : le fichier
        <code>.db</code> s'ouvre aussi dans l'appli Cave à vin sur PC.
      </p>
      <button class="btn btn-principal btn-large" @click="exporter">
        <Icone nom="telecharger" :taille="20" /> Exporter ma cave (.db)
      </button>
      <button class="btn btn-large" @click="fichier?.click()">
        <Icone nom="importer" :taille="20" /> Importer une cave (.db)
      </button>
      <input ref="fichier" type="file" accept=".db,.sqlite,.sqlite3,application/octet-stream,application/vnd.sqlite3,application/x-sqlite3" hidden @change="importer" />
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
        <dd>{{ version }}</dd>
      </dl>
    </section>

    <h2 class="section-titre">Zone sensible</h2>
    <section class="carte actions">
      <button class="btn btn-danger btn-large" @click="supprimer">
        <Icone nom="corbeille" :taille="20" /> Supprimer la cave
      </button>
    </section>
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
</style>
