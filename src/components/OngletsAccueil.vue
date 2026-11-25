<script setup lang="ts">
/** Onglets de l'accueil : la cave / l'historique des entrées et sorties. */
</script>

<template>
  <nav class="onglets" aria-label="Sections">
    <RouterLink to="/" replace>Ma cave</RouterLink>
    <RouterLink to="/historique" replace>Historique</RouterLink>
  </nav>
</template>

<style scoped>
.onglets {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: #ebe3de;
}
.onglets a {
  padding: 7px 16px;
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--discret);
  text-decoration: none;
}
.onglets a.router-link-exact-active {
  background: var(--carte);
  color: var(--bordeaux);
  box-shadow: var(--ombre);
}
</style>
