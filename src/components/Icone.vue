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
  dossier: 'M3 6a1 1 0 011-1h5l2 2h9a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1z',
  synchro: 'M4 12a8 8 0 0114-5.3L20 9M20 4v5h-5M20 12a8 8 0 01-14 5.3L4 15M4 20v-5h5',
  crayon: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
  catalogue: 'M4 5h16M4 10h16M4 15h10M4 20h7',
  historique: 'M3 12a9 9 0 103-6.7M3 4v4h4M12 7v5l3 2',
  cave: 'M4 21V10l8-6 8 6v11M9 21v-6h6v6',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  partager: 'M12 3v13M7 8l5-5 5 5M5 14v6h14v-6',
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
