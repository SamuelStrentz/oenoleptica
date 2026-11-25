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

## Profil organoleptique et dégustations

- **Échelle commune** (`src/domain/profil/echelles.ts`) : notes de 0 à 5 par demi-points, un mot par cran
  (acidité : plate · molle · souple · fraîche · vive · nerveuse…), longueur en caudalies, teintes par couleur.
- **Roue des arômes** (`aromes.ts`) : 13 familles, 50 descripteurs (primaires / secondaires / tertiaires).
- **Moteur** (`moteur.ts`) : profil calculé par couches, chacune tracée pour l'explication « Pourquoi ces valeurs ? » :
  cépage(s) → style (mentions Sec, Doux, VT, Brut…) → appellation → mentions (grand cru, fût…) → climat → sols
  → millésime → vieillissement (courbes selon la garde, fenêtre de dégustation) → corrections apprises.
- **Connaissances** (`connaissances/`) : ~65 appellations, climats, sols, caractère des millésimes 2005-2025.
  Repères généraux, livrés avec l'appli (mis à jour avec elle).
- **Apprentissage** (`apprentissage.ts`) : l'écart entre tes dégustations et le calcul est moyenné (ton palais,
  l'appellation, le vigneron) et freiné tant qu'il y a peu de dégustations.
- **Table `degustations`** : une ligne par dégustation (mêmes critères, arômes en JSON, note, conclusion, commentaire).

## Données

- **Dossier local** : au premier lancement (ou dans **Profil › Dossier local**), on choisit un dossier, par ex.
  `Documents/Œnoleptica`. Chaque cave y est copiée automatiquement en `.db` dans le sous-dossier `db/`, quelques
  secondes après chaque modification. Si le fichier du dossier est modifié ailleurs (PC, Drive…), l'appli propose
  de charger cette version. Les caves du dossier apparaissent dans **Mes caves** et s'ouvrent d'un tap.
  Nécessite Chrome Android 132 ou plus récent (API File System Access).
- Chaque cave est un fichier SQLite de travail rangé dans le stockage interne du navigateur (OPFS) ; chaque action est enregistrée immédiatement.
  Plusieurs caves possibles (**Profil › Mes caves**).
- La table `profils_cepages` (liée à `cepages`) contient le profil organoleptique type de chaque cépage
  (robe, arômes, attaque, milieu de bouche, finale, texture, longueur, acidité / tanins / sucrosité / corps, garde).
  Elle est ajoutée automatiquement aux anciennes bases ; l'appli Python l'ignore sans problème.
- La saisie de la ville d'un vigneron utilise l'API publique `geo.api.gouv.fr` (connexion nécessaire ;
  hors ligne, la saisie reste manuelle). Les régions sont les **anciennes régions** (avant 2016).
- **Profil › Exporter** produit un `.db` qui s'ouvre dans l'appli desktop ou DB Browser for SQLite.
  **Profil › Ouvrir une cave (.db)** (ou « J'ai déjà une base » au premier lancement) ajoute un `.db` existant comme nouvelle cave.
- ⚠️ Ne mets jamais ta base `.db` dans le dépôt : il est public sur GitHub Pages.
