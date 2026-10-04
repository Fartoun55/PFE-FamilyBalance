# Backend FamilyBalance

Le backend de l'application FamilyBalance est une API REST construite avec Node.js, Express.js et MongoDB (Mongoose). Il fournit une couche métier sécurisée pour gérer l'authentification, les profils familiaux, les enquêtes, les scores, les ressources éducatives et la téléconsultation.

## Principales fonctionnalités

- Authentification et gestion des utilisateurs
  - Inscription / connexion
  - JWT pour l'accès sécurisé
  - Refresh tokens
  - Vérification d'email et réinitialisation de mot de passe
  - Contrôle de rôles (`parent`, `specialist`, `admin`)

- Gestion des surveys
  - Questions dynamiques
  - Sessions de réponses
  - Enregistrement des résultats
  - Calcul de score

- Tableau de bord famille
  - Synthèses personnalisées
  - Historiques de score
  - Export PDF/Word/Excel

- Contenu pédagogique
  - Ressources éducatives
  - Suivi des progrès d'apprentissage
  - Articles et outils pour les parents

- Téléconsultation
  - Gestion des rendez-vous
  - Messagerie entre parents et spécialistes
  - Profils de spécialistes

- Administration
  - Gestion des données globales
  - Actions réservées aux administrateurs
  - Export et rapports

## Architecture

- `src/app.js` : configuration principale d'Express, middlewares et routes
- `src/server.js` : initialisation du serveur et connexion MongoDB
- `src/config/` : configuration de la base de données et des variables d'environnement
- `src/routes/` : définition des routes par domaine fonctionnel
- `src/controllers/` : gestion des requêtes entrantes et des réponses
- `src/services/` : règles métier et accès aux modèles de données
- `src/models/` : schémas Mongoose des entités
- `src/utils/` : utilitaires pour les erreurs, les tokens et la logique asynchrone
- `src/validators/` : validation des entrées utilisateur

## Technologies utilisées

- Node.js
- Express.js
- MongoDB / Mongoose
- JWT
- bcryptjs
- dotenv
- helmet
- cors
- nodemailer
- pdfkit / xlsx / docx

## Objectif

La partie backend fournit une API modulaire et sécurisée pour supporter l'application Angular. Elle centralise la gestion des données et des règles métier autour de l'accompagnement familial face aux risques liés aux écrans, en fournissant des services d'évaluation, de suivi et de téléconsultation.
