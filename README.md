# FamilyBalance

FamilyBalance est une application web de prévention et d'accompagnement autour de l'usage des écrans chez les enfants et les adolescents (3 à 18 ans). Les familles évaluent leurs habitudes à l'aide d'un questionnaire adaptatif, obtiennent un score et des recommandations, suivent leur évolution, consultent des ressources éducatives et peuvent échanger avec un spécialiste en téléconsultation.

Projet de fin d'études (PFE) — monorepo composé d'un frontend Angular, d'une API Node.js et de la configuration de déploiement (Docker, Kubernetes, Azure DevOps).

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Stack technique](#stack-technique)
3. [Architecture](#architecture)
4. [Structure du dépôt](#structure-du-dépôt)
5. [Démarrage en local](#démarrage-en-local)
6. [Variables d'environnement](#variables-denvironnement)
7. [Tests](#tests)
8. [Déploiement](#déploiement)
9. [Sécurité](#sécurité)

## Fonctionnalités

| Rôle | Fonctionnalités |
|---|---|
| **Parent** | Inscription et connexion (MFA par e-mail), ajout des comptes de ses adolescents, questionnaire pour soi ou pour un enfant, résultats et historique, tableau de bord famille, export PDF du bilan, téléconsultation, ressources éducatives, parcours e-learning, boîte à outils (contrat numérique, planning), newsletter personnalisée |
| **Adolescent** | Espace personnel, questionnaires adaptés à l'âge, résultats, ressources éducatives, téléconsultation |
| **Spécialiste** | Demandes de téléconsultation, bilan partagé par le patient, tableau de bord clinique (patients, scores, alertes), annulation ou déplacement de rendez-vous, messagerie sécurisée, visioconférence |
| **Administrateur** | Gestion des comptes (création, modification, activation, suppression, exports Excel / Word / PDF), gestion des spécialistes, gestion et publication des ressources éducatives, modération |

Fonctions transverses :

- **Questionnaire adaptatif** : questions selon l'âge et le domaine, règles de branchement selon les réponses, reprise d'une session en cours.
- **Scoring** : score global sur 100, sous-scores (comportemental, émotionnel, social, parental), niveau de risque (vert, orange, rouge), alertes et recommandations.
- **Notifications en temps réel** (Socket.IO) : rendez-vous, nouveaux messages, résultats disponibles, alertes de risque, rappels de réévaluation, ressources publiées.
- **Téléconsultation** : annuaire et créneaux disponibles, réservation sans double réservation, messagerie chiffrée (AES-256-GCM), visioconférence Jitsi.

## Stack technique

| Couche | Technologies |
|---|---|
| Frontend | Angular 17 (composants autonomes, signals), TypeScript, Angular Material, Chart.js, client Socket.IO |
| Backend | Node.js, Express 4, Mongoose 8, Socket.IO 4, JWT (accès + rafraîchissement en cookie httpOnly), bcrypt, helmet, express-rate-limit, multer, nodemailer, pdfkit / docx / xlsx |
| Base de données | MongoDB 7 |
| Tests | Jest + Supertest (API) |
| Conteneurs | Docker (images backend et frontend), nginx |
| Orchestration | Kubernetes (MicroK8s) : namespace, StatefulSet MongoDB, Deployments, Services, Ingress |
| CI/CD | Azure DevOps Pipelines (agent auto-hébergé), registre MicroK8s, copie sur Docker Hub |

## Architecture

```
Navigateur
   │  HTTP — http://familybalance-app.com
   ▼
Ingress (MicroK8s)
   ▼
Frontend — nginx (2 répliques)
   ├── /              → application Angular (fichiers statiques)
   ├── /api/          ┐
   ├── /socket.io/    ├→ Backend — Node.js / Express / Socket.IO (port 3000)
   └── /uploads/      ┘            │
                                   ▼
                          MongoDB (StatefulSet + volume persistant)
```

Le frontend appelle l'API en chemins relatifs (`/api`, `/socket.io`, `/uploads`) : en production, le nginx du frontend les relaie au backend. Le site et l'API partagent donc la même origine, sans configuration d'URL ni problème CORS. En développement, le proxy d'Angular (`frontend/proxy.conf.json`) joue le même rôle.

## Structure du dépôt

```
PFE_25-26/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/         # services, guards, intercepteurs, layout, notifications
│   │   │   ├── features/     # modules métier : auth, family, survey, scoring,
│   │   │   │                 # education, teleconsultation, dashboard, admin
│   │   │   └── shared/       # composants réutilisables (en-tête, état vide, illustrations…)
│   │   ├── assets/           # illustrations SVG
│   │   └── styles/           # thème et styles partagés
│   ├── scripts/              # génération du thème et des illustrations
│   ├── angular.json
│   ├── proxy.conf.json       # proxy de développement vers l'API
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .dockerignore
├── backend/
│   ├── src/
│   │   ├── config/           # variables d'environnement, MongoDB, CORS
│   │   ├── controllers/
│   │   ├── middleware/       # authentification, rôles, erreurs, upload
│   │   ├── models/           # schémas Mongoose
│   │   ├── realtime/         # Socket.IO
│   │   ├── routes/
│   │   ├── services/         # logique métier
│   │   ├── validators/
│   │   ├── app.js            # application Express
│   │   └── server.js         # point d'entrée : connexion MongoDB puis écoute
│   ├── tests/                # tests Jest
│   ├── .env.example
│   ├── Dockerfile
│   └── .dockerignore
├── k8s/
│   ├── namespace.yaml
│   ├── mongodb.yaml
│   ├── backend.yaml
│   ├── frontend.yaml
│   └── ingress.yaml
└── azure-pipelines.yml
```

## Démarrage en local

### Prérequis

- Node.js 20 ou supérieur et npm
- MongoDB 7 en local (ou une URI MongoDB Atlas)

### 1. Backend

```bash
cd backend
cp .env.example .env      # puis adapter les valeurs (voir ci-dessous)
npm install
npm run dev               # API sur http://localhost:5001 (rechargement automatique)
```

Au démarrage, le serveur se connecte d'abord à MongoDB, puis ouvre le port. Les journaux affichent :

```
MongoDB connecté : 127.0.0.1:27017/familybalance
FamilyBalance API running on 0.0.0.0:5001
```

Sans `MONGODB_URI`, le serveur s'arrête avec le message « MONGODB_URI n'est pas configurée ».

### 2. Frontend

```bash
cd frontend
npm install
npm start                 # http://localhost:4200
```

`npm start` libère au besoin le port 4200 puis lance `ng serve`. Le proxy relaie `/api` et `/socket.io` vers `http://localhost:5001` : le `PORT` du backend doit donc valoir `5001`.

### Scripts utiles

| Commande | Rôle |
|---|---|
| `backend: npm start` | Démarre l'API (production) |
| `backend: npm run dev` | Démarre l'API avec rechargement automatique (nodemon) |
| `backend: npm test` | Lance les tests Jest |
| `backend: npm run check:smtp` | Vérifie la configuration d'envoi des e-mails (`-- adresse@exemple.com` pour envoyer un e-mail de test) |
| `backend: npm run seed:avatars` | Ajoute un avatar aux adolescents qui n'en ont pas |
| `frontend: npm run build` | Build Angular de production (`dist/familybalance-frontend/browser`) |
| `frontend: node scripts/generate-illustrations.js` | Régénère les illustrations SVG de `src/assets/illustrations` |

## Variables d'environnement

Backend (`backend/.env` en local, ConfigMap et Secret Kubernetes en production) :

| Variable | Obligatoire | Rôle |
|---|---|---|
| `MONGODB_URI` | Oui | Chaîne de connexion MongoDB |
| `JWT_ACCESS_SECRET` | Oui en production | Signature des jetons d'accès |
| `JWT_REFRESH_SECRET` | Oui en production | Signature des jetons de rafraîchissement |
| `PORT` | Non (3000) | Port d'écoute — `5001` en développement |
| `HOST` | Non (`0.0.0.0`) | Interface d'écoute |
| `NODE_ENV` | Non | `development`, `production` ou `test` |
| `CLIENT_ORIGIN` | Oui en production | Origine(s) autorisée(s) par CORS et Socket.IO, séparées par des virgules |
| `ADMIN_REGISTRATION_KEY` | Recommandée | Clé demandée pour créer un compte administrateur |
| `TELECONSULTATION_SECRET` | Recommandée | Clé de chiffrement des messages de téléconsultation |
| `COOKIE_SECURE` | Non | Attribut Secure du cookie de session : actif par défaut en production ; `false` pour un site servi en HTTP |
| `TRUST_PROXY` | En production | Nombre de proxys devant l'API (`2` : Ingress puis nginx), pour que le limiteur de débit voie l'IP réelle des visiteurs |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Non | Durées de validité (`15m` / `7d`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Pour l'envoi d'e-mails | Confirmation d'inscription, code MFA, réinitialisation du mot de passe |

Le fichier `.env` n'est jamais versionné ni copié dans les images Docker.

## Tests

```bash
cd backend
npm test
```

17 tests Jest (+ Supertest) vérifient l'API sans base de données : route de santé, en-têtes de sécurité, erreurs 404, refus d'accès sans jeton ou avec un jeton invalide (401), validation des entrées (400), règles CORS et attribut Secure du cookie de session.

Côté frontend, 14 tests unitaires (Karma + Jasmine) couvrent le composant racine et le service du questionnaire (catalogue, cache, sessions, réponses) :

```bash
cd frontend
npm test
```

Le pipeline vérifie en plus que le build de production compile.

## Déploiement

### Pipeline Azure DevOps

Le fichier `azure-pipelines.yml` se déclenche à chaque push sur `main`. Tous les jobs s'exécutent sur un agent auto-hébergé (pool `Default`) installé sur la machine virtuelle qui héberge le cluster MicroK8s.

| Étape | Contenu |
|---|---|
| **CI** | Backend : `npm ci`, vérification syntaxique, tests Jest, audit des dépendances. Frontend (après le backend) : `npm ci` et build de production |
| **Images** | Construction des images backend et frontend, envoi vers le registre MicroK8s `localhost:32000` (tags : numéro de build et `latest`), copie sur Docker Hub (`ibrahimfr/familybalance-backend`, `ibrahimfr/familybalance-frontend`) |
| **Deploy** | Application de `namespace.yaml`, injection du tag d'image dans les manifestes, puis application de MongoDB, backend, frontend et Ingress, et attente de la fin des déploiements |

### Prérequis sur la machine virtuelle (une seule fois)

```bash
microk8s enable dns ingress registry
```

- L'agent Azure DevOps tourne sous un utilisateur membre des groupes `microk8s` et `docker`.
- Dans Azure DevOps : créer l'environnement `familybalance-production` et la variable secrète `DOCKERHUB_TOKEN` (token Docker Hub en lecture et écriture).
- Les images de base viennent de `mirror.gcr.io`, Docker Hub n'étant pas joignable depuis la machine virtuelle.

### Secrets Kubernetes (une seule fois)

Les secrets ne sont jamais versionnés. Le même mot de passe MongoDB est utilisé dans les deux secrets :

```bash
MONGO_PASS="$(openssl rand -hex 24)"

microk8s kubectl -n familybalance create secret generic mongodb-secret \
  --from-literal=MONGO_INITDB_ROOT_USERNAME=familybalance \
  --from-literal=MONGO_INITDB_ROOT_PASSWORD="$MONGO_PASS"

microk8s kubectl -n familybalance create secret generic familybalance-secrets \
  --from-literal=MONGODB_URI="mongodb://familybalance:${MONGO_PASS}@mongodb:27017/familybalance?authSource=admin" \
  --from-literal=JWT_ACCESS_SECRET="$(openssl rand -hex 32)" \
  --from-literal=JWT_REFRESH_SECRET="$(openssl rand -hex 32)" \
  --from-literal=ADMIN_REGISTRATION_KEY="$(openssl rand -hex 16)" \
  --from-literal=TELECONSULTATION_SECRET="$(openssl rand -hex 32)"
```

Ajouter les clés `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` et `SMTP_FROM` au secret `familybalance-secrets` pour activer l'envoi d'e-mails.

### Ressources Kubernetes

| Manifeste | Contenu |
|---|---|
| `namespace.yaml` | Namespace `familybalance` |
| `mongodb.yaml` | MongoDB 7 (StatefulSet, volume de 10 Gi, service `mongodb`) |
| `backend.yaml` | ConfigMap, volume de 5 Gi pour les fichiers téléversés, Deployment (1 réplique, sondes `/health`), service interne |
| `frontend.yaml` | Deployment nginx (2 répliques, sondes `/healthz`), service interne |
| `ingress.yaml` | Accès public en HTTP sur `familybalance-app.com` (classe `public` de MicroK8s), WebSocket, téléversements jusqu'à 16 Mo |

Le backend reste à une réplique : les connexions Socket.IO et les fichiers téléversés ne sont pas partagés entre plusieurs pods.

### Accès à l'application

Le site est servi en HTTP : **http://familybalance-app.com**. Le nom doit pointer vers l'IP de la machine virtuelle, par un enregistrement DNS ou une ligne du fichier hosts du poste client :

```
192.168.x.x   familybalance-app.com
```

Saisir l'adresse avec `http://` : rien n'écoute sur le port HTTPS (443). Le backend reçoit `COOKIE_SECURE=false`, sans quoi le navigateur refuserait le cookie de session en HTTP. Pour passer en HTTPS : ajouter un bloc `tls` et un certificat dans `ingress.yaml`, puis mettre `CLIENT_ORIGIN` en `https://` et `COOKIE_SECURE` à `true` dans `backend.yaml`.

### Vérifier le déploiement

```bash
microk8s kubectl -n familybalance get pods,svc,ingress
microk8s kubectl -n familybalance logs deploy/familybalance-backend   # « MongoDB connecté : mongodb:27017/familybalance »
```

## Sécurité

- Mots de passe hachés avec bcrypt, jeton d'accès de courte durée et jeton de rafraîchissement en cookie httpOnly avec rotation.
- Vérification en deux étapes (code envoyé par e-mail, 5 tentatives maximum).
- Contrôle d'accès par rôle sur chaque route de l'API.
- Messages de téléconsultation chiffrés en AES-256-GCM.
- En-têtes de sécurité (helmet côté API, nginx côté frontend), CORS restreint, limitation du débit.
- Backend et MongoDB exécutés sans privilèges root ; secrets fournis uniquement par Kubernetes, jamais inclus dans les images.
