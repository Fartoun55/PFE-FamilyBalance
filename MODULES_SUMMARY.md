# Résumé complet des modules FamilyBalance

## Backend - Modules développés

### 1. **Module Authentification (authController)**
- `register` - Création de compte utilisateur
- `verifyEmail` - Vérification du jeton d'email
- `login` - Connexion utilisateur
- `refresh` - Rafraîchissement du jeton JWT
- `verifyMfa` - Vérification du code MFA
- `logout` - Déconnexion
- `me` - Récupération du profil courant
- `myAdolescents` - Liste des enfants liés
- `changeMyPassword` - Changement de mot de passe
- `updateMyProfile` - Mise à jour du profil
- `forgotPassword` - Demande de réinitialisation
- `resetPasswordWithToken` - Réinitialisation du mot de passe

### 2. **Module Survey (surveyController)**
- `catalog` - Récupération des questions adaptées à l'âge
- `start` - Démarrage d'une session survey
- `saveAnswer` - Enregistrement d'une réponse
- `complete` - Finalisation du survey et calcul du score

### 3. **Module Scoring (scoringController)**
- `calculateFromSession` - Calcul du score à partir d'une session
- `latest` - Récupération du dernier score
- `history` - Historique complet des scores
- `latestCompletedSession` - Dernière session terminée
- `exportLatestReportPdf` - Export du rapport en PDF

### 4. **Module Education (educationController)**
- `resources` - Récupération des ressources éducatives filtrées
- `learningPaths` - Parcours d'apprentissage personnalisés
- `completeStep` - Marquer une étape comme complétée
- `toolbox` - Boîte à outils pour les parents
- `createContract` - Créer un contrat numérique
- `createSchedule` - Créer un planning d'activités
- `newsletterPreview` - Aperçu de la newsletter

### 5. **Module Tableau de bord Famille (familyDashboardController)**
- `overview` - Vue d'ensemble du tableau de bord famille
- `childDetails` - Détails du profil d'un enfant
- `exportChildPdf` - Export du profil enfant en PDF

### 6. **Module Téléconsultation (teleconsultationController)**
- `directory` - Annuaire des spécialistes
- `slots` - Créneaux disponibles pour un spécialiste
- `bookAppointment` - Réservation d'un rendez-vous
- `myAppointments` - Liste des rendez-vous de l'utilisateur
- `myDashboard` - Tableau de bord patient
- `specialistDashboard` - Tableau de bord spécialiste
- `appointmentRoom` - Détails de la salle de consultation
- `shareBilan` - Partage d'un bilan
- `sharedBilan` - Consultation d'un bilan partagé
- `messages` - Récupération des messages
- `sendMessage` - Envoi d'un message

### 7. **Module Admin (adminController)**
- `listAccounts` - Liste des comptes utilisateurs
- `getAccountById` - Détails d'un compte
- `createAccount` - Création d'un compte
- `updateAccount` - Mise à jour d'un compte
- `deleteAccount` - Suppression d'un compte
- `updateAccountStatus` - Changement du statut (actif/inactif)
- `getModerationQueue` - File d'attente de modération
- `exportAnonymizedUsers` - Export anonymisé des utilisateurs
- `exportAccountsToExcel` - Export Excel des comptes
- `exportAccountsToWord` - Export Word des comptes
- `exportAccountsToPDF` - Export PDF des comptes

---

## Backend - Services et couches métier

### Services disponibles :
- `authService` - Logique d'authentification
- `surveyService` - Gestion des surveys
- `scoringService` - Calcul et stockage des scores
- `educationService` - Ressources éducatives et parcours
- `familyDashboardService` - Synthèses famille
- `teleconsultationService` - Gestion des consultations
- `exportService` - Export Excel/Word/PDF
- `mailService` - Envoi d'emails

### Modèles Mongoose :
- `User` - Utilisateurs (parents, spécialistes, admins)
- `SurveySession` - Sessions de survey
- `SurveyQuestion` - Questions paramétrables
- `ScoreRecord` - Résultats de scoring
- `TeleconsultationAppointment` - Rendez-vous
- `TeleconsultationMessage` - Messages
- `TeleconsultationSpecialistProfile` - Profils spécialistes
- `EducationalResource` - Ressources pédagogiques
- `ParentToolkitItem` - Outils pour les parents
- `LearningProgress` - Progression d'apprentissage
- `RefreshToken` - Tokens de rafraîchissement
- `PasswordResetToken` - Tokens de réinitialisation
- `EmailVerificationToken` - Tokens de vérification email
- `MfaChallenge` - Défis MFA
- `NewsletterDigest` - Digests newsletters
- `RiskAlert` - Alertes de risque

---

## Frontend - Modules développés

### 1. **Feature Auth**
- Page de connexion / inscription
- Gestion de la session utilisateur
- Vérification d'email
- Vérification MFA
- Réinitialisation de mot de passe

### 2. **Feature Dashboard**
- Tableau de bord principal
- Vue d'ensemble des données utilisateur
- Synthèses et statistiques

### 3. **Feature Family**
- Gestion des profils familiaux
- Gestion des adolescents
- Vue des enfants et de leurs données

### 4. **Feature Home**
- Page d'accueil
- Navigation principale

### 5. **Feature Education**
- Ressources pédagogiques
- Parcours d'apprentissage
- Contenu éducatif adapté à l'âge
- Suivi des progrès

### 6. **Feature Survey**
- Questionnaire interactif
- Enregistrement des réponses
- Progression du survey
- Validation et soumission

### 7. **Feature Scoring**
- Affichage des scores
- Historique des résultats
- Graphiques et statistiques
- Recommandations

### 8. **Feature Specialist**
- Annuaire des spécialistes
- Filtrage et recherche

### 9. **Feature Teleconsultation**
- Réservation de rendez-vous
- Gestion des consultations
- Messagerie
- Salle de consultation (WebRTC)

---

## Frontend - Services et infrastructure

### Services clés :
- `AuthService` - Gestion de l'authentification
- `ApiService` - Intégration backend
- `SurveyService` - Gestion des surveys
- `ScoringService` - Récupération des scores
- `EducationService` - Contenu éducatif
- `TeleconsultationService` - Consultations

### Guards de route :
- Authentification
- Autorisation par rôle

### Interceptors HTTP :
- Injection du jeton JWT
- Gestion des erreurs
- Refresh automatique du jeton

### Composants partagés :
- Layout principal
- Navigation
- Formulaires
- Modales et dialogs
- Cartes et tuiles

---

## Caractéristiques transversales

### Backend :
- Validation des entrées complète
- Gestion d'erreurs centralisée
- Middleware de sécurité (Helmet, CORS)
- Rate limiting
- Logging
- Support de l'authentification multi-facteur (MFA)
- Historisation des actions
- Export de données (PDF, Excel, Word)
- Alertes automatiques de risque

### Frontend :
- Architecture modulaire par fonctionnalité
- Separation of concerns (components, services)
- Routing sécurisé
- Gestion d'état
- Responsive design (Angular Material)
- Formulaires réactifs
- Gestion de session

---

## Flux principaux d'utilisation

1. **Inscription/Connexion** → Authentification → Vérification email → MFA optionnel
2. **Répondre à un survey** → Session → Enregistrement réponses → Calcul score
3. **Consulter les résultats** → Affichage score → Historique → Export PDF
4. **Prendre rendez-vous** → Recherche spécialiste → Réservation → Consultation
5. **Accéder aux ressources** → Bibliothèque → Parcours → Suivi progrès
