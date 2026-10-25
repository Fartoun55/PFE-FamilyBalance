# FamilyBalance — Frontend

Application Angular 17 de FamilyBalance (composants autonomes, signals, Angular Material). La présentation complète du projet, l'architecture et le déploiement sont décrits dans le [README principal](../README.md).

## Commandes

```bash
npm install
npm start          # http://localhost:4200 — l'API doit tourner sur http://localhost:5001
npm run build      # build de production dans dist/familybalance-frontend/browser
npm test           # tests unitaires (Karma + Jasmine)
```

En développement, `proxy.conf.json` relaie `/api` et `/socket.io` vers le backend.

## Organisation

| Dossier | Contenu |
|---|---|
| `src/app/core` | Services HTTP, guards, intercepteurs, mise en page et notifications |
| `src/app/features` | Pages par module : `auth`, `family`, `survey`, `scoring`, `education`, `teleconsultation`, `dashboard`, `admin` |
| `src/app/shared` | Composants réutilisables (en-tête de page, état vide, illustration, carte de statistique, logo) |
| `src/assets/illustrations` | Illustrations SVG, générées par `node scripts/generate-illustrations.js` |
| `src/styles` | Thème Angular Material et styles des pages d'authentification |

## Image Docker

`Dockerfile` construit l'application puis la sert avec nginx (`nginx.conf`), qui relaie aussi `/api`, `/socket.io` et `/uploads` vers le backend.
