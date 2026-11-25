# Œnoleptica

*Œnologie + organoleptique.* Ta cave à vin sur Android : une application web installable qui marche hors ligne.
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

1. Crée un dépôt GitHub et pousse ce dossier sur la branche `main`.
   ⚠️ Par l'interface web, le dossier `.github/` (caché) n'est pas envoyé : crée `.github/workflows/deploy.yml` à la main.
2. Sur GitHub : **Settings › Pages › Build and deployment › Source : GitHub Actions**.
3. Chaque push sur `main` lance les tests, le build et le déploiement
   (`https://<ton-pseudo>.github.io/<nom-du-depot>/`).
4. Sur le téléphone, ouvre l'adresse dans Chrome, puis **Profil › Installer** (ou menu ⋮ › *Installer l'application*).

## Données

- Chaque cave est un fichier SQLite rangé sur le téléphone (OPFS) ; chaque action est enregistrée immédiatement.
  Plusieurs caves possibles (**Profil › Mes caves**).
- La table `profils_cepages` (liée à `cepages`) contient le profil organoleptique type de chaque cépage
  (robe, arômes, attaque, milieu de bouche, finale, texture, longueur, acidité / tanins / sucrosité / corps, garde).
  Elle est ajoutée automatiquement aux anciennes bases ; l'appli Python l'ignore sans problème.
- La saisie de la ville d'un vigneron utilise l'API publique `geo.api.gouv.fr` (connexion nécessaire ;
  hors ligne, la saisie reste manuelle). Les régions sont les **anciennes régions** (avant 2016).
- **Profil › Exporter** produit un `.db` qui s'ouvre dans l'appli desktop ou DB Browser for SQLite.
  **Profil › Ouvrir une cave (.db)** (ou « J'ai déjà une base » au premier lancement) ajoute un `.db` existant comme nouvelle cave.
- ⚠️ Ne mets jamais ta base `.db` dans le dépôt : il est public sur GitHub Pages.
