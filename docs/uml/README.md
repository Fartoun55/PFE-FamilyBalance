# Diagrammes UML — FamilyBalance

Diagrammes établis à partir du code source réel de l'application (backend Node.js / Express / MongoDB,
frontend Angular 17) : modèles Mongoose, routes de l'API et règles d'autorisation, services métier et
composants frontend. Chaque diagramme est fourni sous trois formes :

| Format | Usage |
|---|---|
| `.puml` | Code source PlantUML (modifiable, versionnable) |
| `.png` | Image prête à insérer dans le rapport (Word) |
| `.svg` | Image vectorielle, nette à toute échelle (impression, LaTeX) |

La charte graphique commune (couleurs de l'application, polices) est définie dans `_style.iuml`.

## Sommaire

1. [Diagrammes de classes](#1-diagrammes-de-classes)
2. [Diagrammes de cas d'utilisation](#2-diagrammes-de-cas-dutilisation)
3. [Diagrammes de séquence](#3-diagrammes-de-séquence)
4. [Choix de modélisation et hypothèses](#4-choix-de-modélisation-et-hypothèses)
5. [Cohérence avec le code](#5-cohérence-avec-le-code)
6. [Régénérer les images](#6-régénérer-les-images)
7. [Version StarUML (.mdj)](#7-version-staruml--starumlfamilybalance-umlmdj)

---

## 1. Diagrammes de classes

### 1.1 Vue d'ensemble du modèle de domaine — `01-classes/vue-ensemble`
Les 17 entités persistées dans MongoDB, regroupées par module (comptes et sécurité, évaluation,
téléconsultation, éducation, notifications), avec toutes leurs relations et multiplicités, sans les
attributs. `User` est l'entité centrale : chaque document métier référence un utilisateur.

### 1.2 Comptes, familles et évaluation — `01-classes/comptes-evaluation`
- `User` et ses deux sous-documents optionnels : `SpecialistInfo` (spécialité, licence, tarif, langues)
  et `AdolescentInfo` (date de naissance, consentement), qui porte le lien vers le **parent**
  (association réflexive : un parent a 0..* adolescents).
- Le questionnaire adaptatif : `SurveyQuestion` (options et règles de branchement), `SurveySession`
  (réponses `SurveyAnswer`), puis `ScoreRecord` (sous-scores et pondérations) et `RiskAlert`.
- Contraintes métier : une seule session « en cours » par (utilisateur, domaine, tranche d'âge), un seul
  score par session, au plus une alerte ouverte par utilisateur.

### 1.3 Téléconsultation, messagerie et notifications — `01-classes/teleconsultation-notifications`
- `TeleconsultationSpecialistProfile` : fiche d'annuaire du spécialiste (0..1 par compte), avec ses
  règles de disponibilité.
- `TeleconsultationAppointment` : rendez-vous entre un patient (parent ou adolescent) et un
  spécialiste ; instantané du bilan partagé ; règle anti-double-réservation.
- `TeleconsultationMessage` : messages chiffrés (AES-256-GCM) rattachés à un rendez-vous (agrégation).
- `Notification` : notifications par utilisateur (déduplication, regroupement, purge à 180 jours).

### 1.4 Éducation et accompagnement — `01-classes/education`
Ressources éducatives (tranche d'âge, type de contenu, statut de publication), progression dans les
parcours e-learning, boîte à outils parentale (contrats et plannings) et newsletters.

### 1.5 Énumérations et sécurité — `01-classes/enumerations-securite`
Les 16 énumérations définies dans les schémas (rôles, statuts, niveaux de risque, types de
notification…) et les entités d'authentification : jetons de rafraîchissement (rotation), défis MFA
(5 tentatives max.), jetons de vérification d'e-mail et de réinitialisation de mot de passe.

### 1.6 Couche service et opérations — `01-classes/services-operations`
Les opérations métier importantes : les modèles Mongoose portent peu de méthodes (`comparePassword`,
`toSafeJSON`, le virtuel `contentUrl`) ; la logique est dans les services, représentés ici avec leurs
opérations réelles et leurs dépendances (ex. tout service métier délègue les notifications à
`NotificationService`, qui pousse les événements en temps réel via `RealtimeGateway` / Socket.IO).

---

## 2. Diagrammes de cas d'utilisation

Les acteurs et leurs droits reproduisent exactement les contrôles d'accès de l'API
(`protect` et `authorizeRoles(...)`).

| Acteur | Correspondance dans le code |
|---|---|
| Visiteur | Routes publiques : `/api/auth/register`, `/login`, `/verify-email`, `/forgot-password` |
| Utilisateur authentifié (abstrait) | Routes protégées par `protect` seul : profil, notifications, ressources |
| Membre de la famille (abstrait) | `authorizeRoles('parent', 'adolescent')` : questionnaires, scores, réservation |
| Parent, Adolescent | `authorizeRoles('parent')`, `authorizeRoles('adolescent')` |
| Spécialiste | `authorizeRoles('specialist')` : tableau de bord clinique |
| Administrateur | `authorizeRoles('admin')` : tout `/api/admin`, gestion des ressources |
| Service e-mail (acteur secondaire) | Confirmation d'inscription, code MFA, réinitialisation |

| Diagramme | Contenu |
|---|---|
| `02-cas-utilisation/cu-vue-globale` | Tous les acteurs, la hiérarchie de généralisation et les grands cas par module |
| `02-cas-utilisation/cu-authentification-compte` | Inscription (`include` confirmation d'e-mail, `extend` clé admin), connexion (`extend` MFA), profil, notifications |
| `02-cas-utilisation/cu-famille` | Questionnaire (`include` choix du domaine et calcul du score, `extend` reprise de session et questionnaire pour un enfant), résultats, suivi familial, téléconsultation, éducation |
| `02-cas-utilisation/cu-specialiste` | Demandes de téléconsultation, bilan partagé, tableau de bord clinique, messagerie, visioconférence |
| `02-cas-utilisation/cu-administrateur` | Comptes, spécialistes (`include` vérification des rendez-vous à venir avant suppression, `extend` désactivation), ressources et modération |

---

## 3. Diagrammes de séquence

Chaque diagramme montre l'acteur, les composants frontend (pages et services Angular), le backend
(middleware, contrôleur, service), MongoDB, ainsi que les cas alternatifs et les erreurs réellement
renvoyées par l'API (codes HTTP inclus).

| N° | Diagramme | Scénario et points clés |
|---|---|---|
| 1 | `03-sequences/seq-authentification` | Connexion : contrôle du compte, vérification bcrypt, défi MFA par e-mail (expiration, 5 essais), émission des jetons (JWT d'accès + jeton de rafraîchissement en cookie httpOnly) |
| 2 | `03-sequences/seq-gestion-specialistes` | Ajout / modification / suppression par l'administrateur : validation par champ, unicité e-mail et licence (409), synchronisation de la fiche d'annuaire, suppression refusée s'il reste des rendez-vous à venir |
| 3 | `03-sequences/seq-traitement-demande` | Réception d'une demande par le spécialiste (notification temps réel), consultation, annulation ou déplacement avec contrôle d'accès et notification du patient |
| 4 | `03-sequences/seq-prise-rendez-vous` | Annuaire, calcul des créneaux libres, réservation, protection contre la double réservation (409), notifications des deux parties |
| 5 | `03-sequences/seq-messagerie` | Envoi d'un message chiffré, contrôle d'accès au rendez-vous, notification regroupée, affichage instantané chez le destinataire via Socket.IO |
| 6 | `03-sequences/seq-notifications` | Connexion temps réel authentifiée, création depuis un événement métier (déduplication / regroupement), réception, lecture et navigation |
| 7 | `03-sequences/seq-questionnaire` | Catalogue, démarrage ou reprise de session, réponses adaptatives (règles de branchement, concurrence optimiste), clôture et calcul automatique du score, alertes et notifications |

---

## 4. Choix de modélisation et hypothèses

- **Classes issues de schémas Mongoose.** MongoDB n'a pas de clés étrangères : une référence `ObjectId`
  (`ref: 'User'`…) est modélisée par une **association** ; un sous-document imbriqué (sous-schéma ou objet
  imbriqué comme `sharedScoreSnapshot`) par une **composition** ; le lien entre une réponse et sa question,
  fait par code et non par identifiant, par une **dépendance**.
- **Pas d'héritage entre classes.** Le rôle est un attribut énuméré de `User`, pas une hiérarchie de
  classes : aucune généralisation n'a été inventée dans les diagrammes de classes. La généralisation
  n'apparaît qu'entre **acteurs**, où elle reflète les autorisations partagées.
- **Statut des rendez-vous.** L'énumération prévoit `pending`, mais la réservation confirme directement le
  rendez-vous (`confirmed`) ; il n'existe pas de refus par le spécialiste, qui peut en revanche annuler ou
  déplacer. Les diagrammes représentent ce comportement réel.
- **Inscription.** Un adolescent ne s'inscrit pas lui-même : son compte est créé par son parent
  (`POST /api/auth/me/adolescents`). L'inscription d'un administrateur exige une clé.
- **Boîte à outils parentale.** Les routes `/api/education/toolbox` sont seulement authentifiées côté API ;
  l'interface ne la propose qu'aux parents : elle est rattachée au Parent dans les cas d'utilisation.
- **Note moyenne des spécialistes** (`averageRating`) : valeur par défaut (4,8), aucune fonctionnalité de
  notation n'existant dans l'application.
- **Simplifications des séquences.** Le middleware d'authentification (`protect` / `authorizeRoles`) est
  détaillé dans le diagramme n° 2 et seulement mentionné ailleurs ; les intercepteurs HTTP Angular
  (ajout du jeton, rafraîchissement automatique) sont décrits en note dans le diagramme n° 1.

## 5. Cohérence avec le code

Contrôles réalisés lors de la rédaction :

- Attributs, énumérations, valeurs par défaut et index uniques recopiés depuis `backend/src/models/*.js`.
- Opérations du diagramme des services vérifiées une à une dans `backend/src/services/*.js`.
- Droits des acteurs vérifiés dans `backend/src/routes/*.js` (`authorizeRoles`) et le menu par rôle du
  frontend (`shell-layout.component.ts`).
- Codes d'erreur des séquences vérifiés dans les services (`AppError(message, code)`).
- Mêmes noms d'entités, de services et de messages dans les trois familles de diagrammes.

## 6. Régénérer les images

Prérequis : Java 11+ et `plantuml.jar` (https://plantuml.com/download). Graphviz n'est pas nécessaire
(moteur de mise en page intégré `smetana`, activé dans `_style.iuml`).

```bash
cd docs/uml
java -jar plantuml.jar -charset UTF-8 -tpng 01-classes/*.puml 02-cas-utilisation/*.puml 03-sequences/*.puml
java -jar plantuml.jar -charset UTF-8 -tsvg 01-classes/*.puml 02-cas-utilisation/*.puml 03-sequences/*.puml
```

Les fichiers `.puml` peuvent aussi être prévisualisés dans VS Code avec l'extension « PlantUML ».

## 7. Version StarUML — `staruml/FamilyBalance-UML.mdj`

Les 18 diagrammes existent aussi sous la forme d'un **modèle StarUML natif** (testé avec StarUML 7.1) :
ouvrir `staruml/FamilyBalance-UML.mdj` via *File > Open*. Le projet contient trois modèles :

| Modèle | Contenu |
|---|---|
| Modèle de classes | Paquetages *Comptes et sécurité*, *Évaluation*, *Téléconsultation*, *Éducation*, *Notifications*, *Énumérations*, *Couche service* ; diagrammes **CL1 à CL6** |
| Modèle des cas d'utilisation | Acteurs (avec généralisations), sujets, paquetages de cas, `include` / `extend` ; diagrammes **CU1 à CU5** |
| Modèle des interactions | Une collaboration et une interaction par scénario (lignes de vie, messages, fragments `alt` / `loop` / `opt`) ; diagrammes **SEQ1 à SEQ7** |

Ce n'est pas un simple dessin : chaque élément est **unique dans le modèle** et réutilisé d'un diagramme
à l'autre (ex. `User`, les associations ou les cas d'utilisation communs). Les attributs typés par une
énumération référencent cette énumération, les lignes de vie des services backend sont typées par les
classes du diagramme CL6, et les contraintes de classe (`{…}`) sont stockées comme `UMLConstraint` et
dans la documentation de la classe.

Notes : les contraintes de classe ne sont pas affichées dans les boîtes, contrairement à PlantUML.
Les séparateurs `== … ==` des séquences sont des textes. La disposition reprend celle de PlantUML,
mais elle peut être retouchée librement dans StarUML. *Format > Layout* peut aussi la réorganiser.
L'export en image passe par *File > Export Diagram As*.
