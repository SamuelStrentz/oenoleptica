import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

// Historique « hash » (#/profil) : fonctionne sur GitHub Pages sans réglage serveur
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'accueil', component: HomeView },
    { path: '/ajout', name: 'ajout', component: () => import('@/views/AjoutVinView.vue') },
    { path: '/vignerons', name: 'vignerons', component: () => import('@/views/VigneronsView.vue') },
    { path: '/profil', name: 'profil', component: () => import('@/views/ProfilView.vue') },
  ],
  scrollBehavior: (_to, _from, position) => position ?? { top: 0 },
})
