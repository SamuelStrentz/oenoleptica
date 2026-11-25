<script setup lang="ts">
/** Icônes au trait (SVG inline, aucune dépendance). */
defineProps<{ nom: keyof typeof CHEMINS; taille?: number }>()
</script>

<script lang="ts">
export const CHEMINS = {
  plus: 'M12 5v14M5 12h14',
  moins: 'M5 12h14',
  retour: 'M15 18l-6-6 6-6',
  fermer: 'M6 6l12 12M18 6L6 18',
  maison: 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10',
  vigneron: 'M12 3c-2 3-2 5 0 7 2-2 2-4 0-7zM8 12a2 2 0 104 0 2 2 0 00-4 0zm4 0a2 2 0 104 0 2 2 0 00-4 0zm-2 3.5a2 2 0 104 0 2 2 0 00-4 0zm-3 2.5a2 2 0 104 0 2 2 0 00-4 0zm6 0a2 2 0 104 0 2 2 0 00-4 0z',
  bouteille: 'M10 2h4v4c0 1 3 2 3 6v9a1 1 0 01-1 1H8a1 1 0 01-1-1v-9c0-4 3-5 3-6zM7 13h10',
  profil: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  recherche: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  telecharger: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  importer: 'M12 15V4M7 9l5-5 5 5M5 20h14',
  corbeille: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  installer: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  coche: 'M5 12l5 5 9-10',
} as const
</script>

<template>
  <svg
    :width="taille ?? 24"
    :height="taille ?? 24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="CHEMINS[nom]" />
  </svg>
</template>
