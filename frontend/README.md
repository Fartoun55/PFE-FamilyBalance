# FamilybalanceFrontend

Application frontend Angular de FamilyBalance, construite avec Angular 17 et TypeScript. Le frontend consomme l'API backend pour l'authentification, la gestion des profils familiaux, les surveys, le scoring, les contenus éducatifs et la téléconsultation.

## Frontend overview

- Base : Angular 17 + TypeScript
- Architecture : modules par fonctionnalité dans `src/app/features`
- Services HTTP et guards dans `src/app/core`
- Layout et composants partagés dans `src/app/shared`
- Authentification : connexion, inscription, gestion de session JWT
- Navigation : routes pour tableau de bord, survey, éducation, famille, spécialiste et téléconsultation
- Intégration API : points de terminaison backend sécurisés via interceptors

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
