# Architecture cible

## Vue d'ensemble

Le projet est organisé en deux applications principales:

- `frontend`: interface famille, adolescent et spécialiste
- `backend`: API sécurisée, logique métier, persistance et sécurité

## Découpage fonctionnel

### Frontend

- `core`: services transverses, garde d'accès, interceptors, gestion de session
- `shared`: composants réutilisables, pipes, directives, modèles partagés
- `features/auth`: connexion, inscription, récupération de compte
- `features/family`: profils parents et enfants
- `features/survey`: questionnaire dynamique
- `features/scoring`: affichage des scores et évolution
- `features/dashboard`: vue synthétique famille
- `features/education`: ressources et contenus pédagogiques
- `features/teleconsultation`: rendez-vous, messages, visio
- `features/specialist`: espace professionnel

### Backend

- `config`: configuration applicative, base de données, sécurité
- `controllers`: contrôleurs HTTP
- `middleware`: auth, validation, gestion d'erreurs, audit
- `models`: schémas Mongoose
- `routes`: routes Express
- `services`: logique métier
- `validators`: validation des entrées

## Principe MVP

Le MVP doit livrer d'abord les blocs qui prouvent la valeur métier:

- authentification
- création des profils enfants
- survey dynamique
- scoring
- dashboard famille

Les modules téléconsultation et spécialiste viennent ensuite.
