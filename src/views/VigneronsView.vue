<script setup lang="ts">
/** Vignerons : liste, fiche (tap), export SQL (appui long). */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Icone from '@/components/Icone.vue'
import VigneronSheet from '@/components/VigneronSheet.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import { useAppuiLong } from '@/composables/useAppuiLong'
import { useUiStore } from '@/stores/ui'
import { vigneronsEnSql } from '@/domain/export-sql'
import { aujourdhui } from '@/domain/parsers'
import { nomFichier, partagerOuTelecharger } from '@/utils/fichiers'
import { apresPanneau } from '@/utils/panneaux'
import type { VigneronListe } from '@/domain/types'
import { useCaveStore } from '@/stores/cave'
import { joindre, pluriel } from '@/utils/affichage'
import BandeauLogo from '@/components/BandeauLogo.vue'
import { exporterTousLesVignerons, importerFichierVignerons } from '@/utils/vignerons-sql'

const router = useRouter()
const store = useCaveStore()
const ouvert = ref<VigneronListe | null>(null)
const menu = ref<VigneronListe | null>(null)
const ui = useUiStore()
const appui = useAppuiLong()
const fichierSql = ref<HTMLInputElement>()

function surFichierSql(e: Event) {
  const champ = e.target as HTMLInputElement
  const fichier = champ.files?.[0]
  champ.value = ''
  if (fichier) void importerFichierVignerons(fichier)
}

/** Exporte un vigneron (ou tous) en script SQL, puis ouvre le menu de partage. */
async function exporter(seul: VigneronListe | null) {
  menu.value = null
  try {
    const tous = await store.tousLesVignerons()
    const choisis = seul ? tous.filter((v) => v.id_vigneron === seul.id_vigneron) : tous
    const sql = vigneronsEnSql(choisis)
    const nom = seul ? `vigneron_${nomFichier(seul.libelle)}` : `vignerons_${nomFichier(store.nomCave)}`
    await apresPanneau()
    await partagerOuTelecharger(new Blob([sql], { type: 'text/plain' }), `${nom}_${aujourdhui()}.sql`,
      seul ? `Vigneron ${seul.libelle}` : `${choisis.length} vignerons`)
  } catch (e) {
    ui.erreur(e)
  }
}

function initiales(libelle: string) {
  return libelle
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m.charAt(0).toUpperCase())
    .join('')
}
</script>

<template>
  <main class="page">
    <BandeauLogo />
    <header class="barre">
      <button class="bouton-icone" aria-label="Retour" @click="router.back()"><Icone nom="retour" /></button>
      <h1>Vignerons</h1>
    </header>

    <ul v-if="store.vignerons.length" class="liste">
      <li
        v-for="v in store.vignerons"
        :key="v.id_vigneron"
        class="carte vigneron"
        role="button"
        tabindex="0"
        v-on="appui.ecouteurs(() => (menu = v))"
        @click="appui.clicNormal() && (ouvert = v)"
        @keydown.enter="ouvert = v"
      >
        <span class="avatar">{{ initiales(v.libelle) }}</span>
        <div class="infos">
          <strong>{{ v.libelle }}</strong>
          <span v-if="v.domaines" class="domaines">{{ v.domaines }}</span>
          <span class="lieu">{{ joindre(v.ville, v.region) }}</span>
        </div>
        <div class="compte">
          <strong>{{ v.bouteilles }}</strong>
          <span>{{ pluriel(v.nb_vins, 'vin') }}</span>
        </div>
      </li>
    </ul>
    <p v-else class="vide">Aucun vigneron pour l'instant.<br />Touche le + vert pour en ajouter un.</p>
    <p v-if="store.vignerons.length" class="astuce">Appui long sur un vigneron pour l'exporter.</p>
    <VigneronSheet :resume="ouvert" @fermer="ouvert = null" />

    <!-- Import / export : deux boutons discrets de part et d'autre du + -->
    <button class="discret gauche" aria-label="Importer des vignerons (.sql)" @click="fichierSql?.click()">
      <Icone nom="importer" :taille="20" /><span>Importer</span>
    </button>
    <button
      v-if="store.vignerons.length"
      class="discret droite"
      aria-label="Exporter tous les vignerons (.sql)"
      @click="exporterTousLesVignerons()"
    >
      <Icone nom="partager" :taille="20" /><span>Exporter</span>
    </button>
    <input ref="fichierSql" type="file" accept=".sql,text/plain,application/sql" hidden @change="surFichierSql" />

    <BottomSheet :ouvert="menu !== null" titre="Exporter" @fermer="menu = null">
      <div v-if="menu" class="menu-export">
        <h2>{{ menu.libelle }}</h2>
        <p>Export en script SQL : la personne qui le reçoit l'exécute pour créer le(s) vigneron(s) dans sa base.</p>
        <button class="btn btn-principal btn-large" @click="exporter(menu)">
          <Icone nom="partager" :taille="20" /> Exporter ce vigneron
        </button>
        <button class="btn btn-large" @click="exporter(null)">
          <Icone nom="partager" :taille="20" /> Exporter tous les vignerons ({{ store.vignerons.length }})
        </button>
      </div>
    </BottomSheet>
  </main>
</template>

<style scoped>
.discret {
  position: fixed;
  bottom: calc(var(--bas-sur) + 30px);
  z-index: 40;
  width: 64px;
  display: grid;
  justify-items: center;
  gap: 2px;
  padding: 6px 0;
  border-radius: 16px;
  color: rgb(74 19 37 / 60%);
  background: rgb(246 242 238 / 72%);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  transition: color 0.15s, background 0.15s;
}
.discret span {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.discret:active {
  color: var(--bordeaux);
  background: rgb(242 220 227 / 90%);
}
.discret.gauche {
  left: calc(50% - 34px - 22px - 64px);
}
.discret.droite {
  left: calc(50% + 34px + 22px);
}
.liste {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}
.vigneron {
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
}
.avatar {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--accent-clair);
  color: var(--accent);
  font-weight: 700;
}
.infos {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
}
.infos span {
  font-size: 0.85rem;
  color: var(--discret);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.infos .domaines {
  color: var(--texte);
}
.compte {
  text-align: right;
  display: grid;
}
.compte strong {
  font-family: var(--serif);
  font-size: 1.3rem;
  color: var(--vert);
}
.compte span {
  font-size: 0.78rem;
  color: var(--discret);
}
.astuce {
  text-align: center;
  font-size: 0.8rem;
  color: var(--discret);
  margin-top: 14px;
}
.menu-export {
  display: grid;
  gap: 10px;
}
.menu-export h2 {
  font-size: 1.3rem;
}
.menu-export p {
  margin: 0 0 6px;
  color: var(--discret);
  font-size: 0.88rem;
  line-height: 1.45;
}
</style>
