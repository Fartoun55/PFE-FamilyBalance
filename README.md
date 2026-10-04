# FamilyBalance

FamilyBalance est une web-app de prévention et d'accompagnement autour de l'usage des écrans chez les enfants et adolescents.

## Objectif du repository

Ce workspace pose la base du projet PFE avec une architecture monorepo simple:
- `frontend` pour l'application Angular
- `backend` pour l'API Node.js / Express
- `docs` pour le cadrage fonctionnel et technique

## MVP cible

1. Authentification et rôles
2. Gestion des profils famille et enfants
3. Survey dynamique
4. Scoring et historique des résultats
5. Tableau de bord famille

## Modules prévus

- Authentification
- Famille et profils enfants
- Survey adaptatif
- Scoring
- Tableau de bord
- Espace éducatif
- Téléconsultation
- Dashboard spécialiste

## Stack retenue

- Frontend: Angular 17 + TypeScript
- UI: Angular Material
- Backend: Node.js + Express.js
- Base de données: MongoDB + Mongoose
- Auth: JWT + OAuth2 / OpenID Connect
- Temps réel / visio: WebRTC
- CI/CD: Docker + GitHub Actions

## Description complète

### Backend

Le backend est une API REST développée avec Node.js et Express. Il expose les services nécessaires à l'application FamilyBalance et gère :

- l'authentification et la gestion des utilisateurs
- les rôles (`parent`, `specialist`, `admin`)
- la création et l'administration des profils familiaux
- les enquêtes (`surveys`) dynamiques et les sessions de réponse
- le calcul et le stockage des scores
- l'accès aux ressources pédagogiques et au suivi des progrès
- la téléconsultation : rendez-vous, messagerie, profils spécialistes
- les exports de rapports (PDF, Word, Excel)
- la sécurité via JWT, validation d'entrées, helmet, CORS et gestion des erreurs

Le backend est structuré en modules clairs : routes, contrôleurs, services, modèles Mongoose, validateurs et utilitaires.

### Frontend

Le frontend est une application Angular 17 qui consomme l'API backend pour offrir une expérience utilisateur complète. Il gère :

- l'interface d'authentification et la session utilisateur
- le parcours familial et la gestion des profils d'adolescents
- les questionnaires interactifs et le suivi des scores
- la présentation des ressources éducatives et du contenu d'apprentissage
- le tableau de bord personnalisé pour les parents
- la téléconsultation avec prise de rendez-vous et échanges de messages

L'architecture frontend est organisée en fonctionnalités :

- `src/app/features` pour les modules métier
- `src/app/core` pour les services, guards et interceptors
- `src/app/shared` pour les composants et utilitaires réutilisables

Cette organisation facilite l'évolution du projet et la séparation des responsabilités entre la couche de présentation et l'API backend.
