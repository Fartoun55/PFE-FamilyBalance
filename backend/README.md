# FamilyBalance — Backend

API REST et temps réel de FamilyBalance : Node.js, Express, MongoDB (Mongoose) et Socket.IO. La présentation complète du projet, les variables d'environnement et le déploiement sont décrits dans le [README principal](../README.md).

## Commandes

```bash
cp .env.example .env     # puis adapter les valeurs
npm install
npm run dev              # API sur http://localhost:5001 (rechargement automatique)
npm start                # démarrage sans rechargement
npm test                 # tests Jest + Supertest
npm run check:smtp       # vérifie la configuration d'envoi des e-mails
```

## Organisation

| Dossier | Contenu |
|---|---|
| `src/config` | Variables d'environnement, connexion MongoDB, règles CORS |
| `src/routes` | Routes de l'API (`/api/auth`, `/api/surveys`, `/api/scoring`, `/api/teleconsultation`, `/api/education`, `/api/notifications`, `/api/admin`…) |
| `src/controllers` | Lecture des requêtes et envoi des réponses |
| `src/services` | Logique métier (authentification, questionnaire, scoring, téléconsultation, notifications, e-mails, exports) |
| `src/models` | Schémas Mongoose |
| `src/middleware` | Authentification, contrôle des rôles, gestion des erreurs, téléversement |
| `src/validators` | Validation des données reçues |
| `src/realtime` | Serveur Socket.IO (notifications et messages en temps réel) |
| `src/data` | Questions du questionnaire chargées au premier démarrage |
| `src/scripts` | Scripts ponctuels (`check:smtp`, `seed:avatars`) |
| `tests` | Tests de l'API |

Point d'entrée : `src/server.js` se connecte à MongoDB, puis démarre l'API et Socket.IO sur le même port.
