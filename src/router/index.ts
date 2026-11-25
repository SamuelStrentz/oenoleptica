import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Écran de saisie : le bouton central est masqué (bouton « Enregistrer » en bas). */
    formulaire?: boolean
  }
}

// Historique « hash » (#/profil) : fonctionne sur GitHub Pages sans réglage serveur
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'accueil', component: HomeView },
    { path: '/historique', name: 'historique', component: () => import('@/views/HistoriqueView.vue') },
    { path: '/ajout', name: 'ajout', component: () => import('@/views/VinFormView.vue'), meta: { formulaire: true } },
    {
      path: '/vin/:id/modifier', name: 'modifier-vin', props: true,
      component: () => import('@/views/VinFormView.vue'), meta: { formulaire: true },
    },
    { path: '/degustation', name: 'choix-degustation', component: () => import('@/views/DegustationView.vue') },
    {
      path: '/degustation/:id', name: 'degustation', props: true,
      component: () => import('@/views/DegustationView.vue'), meta: { formulaire: true },
    },
    { path: '/vignerons', name: 'vignerons', component: () => import('@/views/VigneronsView.vue') },
    {
      path: '/vignerons/nouveau', name: 'nouveau-vigneron',
      component: () => import('@/views/VigneronFormView.vue'), meta: { formulaire: true },
    },
    {
      path: '/vignerons/:id/modifier', name: 'modifier-vigneron', props: true,
      component: () => import('@/views/VigneronFormView.vue'), meta: { formulaire: true },
    },
    {
      path: '/vignerons/:id/catalogue', name: 'catalogue', props: true,
      component: () => import('@/views/CatalogueView.vue'),
    },
    { path: '/profil', name: 'profil', component: () => import('@/views/ProfilView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: (_to, _from, position) => position ?? { top: 0 },
})
