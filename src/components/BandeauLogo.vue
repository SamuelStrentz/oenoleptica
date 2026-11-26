<script setup lang="ts">
/** Petite bande bordeaux en haut des écrans principaux, avec le logo au centre. */
const logo = `${import.meta.env.BASE_URL}icons/icon.svg`
</script>

<template>
  <div class="bandeau-logo" aria-hidden="true">
    <span class="filet" />
    <img :src="logo" alt="" width="30" height="30" />
    <span class="filet" />
  </div>
</template>

<style scoped>
/* Annule le rembourrage de .page pour occuper toute la largeur, sous la barre d'état */
.bandeau-logo {
  margin: calc(-1 * (var(--haut-sur) + 8px)) -16px 0;
  padding: calc(var(--haut-sur) + 5px) 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--bordeaux);
  border-radius: 0 0 18px 18px;
}
.filet {
  width: 46px;
  height: 1px;
  background: linear-gradient(90deg, transparent, #d9b45e99, transparent);
}
img {
  display: block;
}
</style>
