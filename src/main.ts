import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import { router } from './router'
import './styles/main.css'

createApp(App).use(createPinia()).use(router).mount('#app')

// Service worker : appli disponible hors ligne et mise à jour automatique
registerSW({ immediate: true })
