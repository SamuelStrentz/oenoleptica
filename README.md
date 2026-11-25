# Cave à vin — PWA

Ta cave à vin sur Android : une application web installable qui marche hors ligne.
Elle utilise la **même base SQLite** (mêmes tables, mêmes triggers) que l'appli desktop Python.

## Stack

| Couche | Choix |
|---|---|
| Interface | Vue 3 (Composition API) + TypeScript |
| Build / PWA | Vite + vite-plugin-pwa (Workbox) |
| Base | SQLite WASM officiel (`@sqlite.org/sqlite-wasm`) dans un Web Worker, stockage OPFS « SAHPool » |
| État | Pinia |
| Tests | Vitest (couche base de données) |
| Hébergement | GitHub Pages via GitHub Actions |

## Arborescence

```
src/
├── db/            moteur : schema.ts (CREATE de master.db), sql.ts (surcouche), worker.ts, client.ts (RPC)
├── repositories/  accès aux données (portage des fonctions Python) : vins, stock, vignerons, avis, cepages, structure
├── domain/        types, cépages, validation des saisies
├── stores/        Pinia : cave (données), ui (toasts)
├── components/    AppFab (bouton central), VinCard, StockSheet, CepageChips, BottomSheet…
├── views/         Accueil, AjoutVin, Vignerons, Profil
└── utils/         aides d'affichage
tests/             tests Vitest sur une base en mémoire
```

## Développement

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests de la couche base
npm run build      # vérification des types + build dans dist/
```

## Mise en ligne sur GitHub Pages

1. Crée un dépôt GitHub (ex. `cave-a-vin-pwa`) et pousse ce dossier sur la branche `main`.
2. Sur GitHub : **Settings › Pages › Build and deployment › Source : GitHub Actions**.
3. Chaque push sur `main` lance les tests, le build et le déploiement
   (`https://<ton-pseudo>.github.io/<nom-du-depot>/`).
4. Sur le téléphone, ouvre l'adresse dans Chrome, puis **Profil › Installer** (ou menu ⋮ › *Installer l'application*).

## Données

- La cave est rangée sur le téléphone (OPFS) et chaque action est enregistrée immédiatement.
- **Profil › Exporter** produit un `.db` qui s'ouvre dans l'appli desktop ou DB Browser for SQLite.
  **Profil › Importer** (ou « J'ai déjà une base » au premier lancement) charge un `.db` existant.
- ⚠️ Ne mets jamais ta base `.db` dans le dépôt : il est public sur GitHub Pages.
