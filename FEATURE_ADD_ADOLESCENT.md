# Fonctionnalité: Ajouter un compte adolescent

## Description
Un parent peut maintenant ajouter un nouveau compte pour son fils (adolescent) directement depuis l'application.

## Backend

### Route API
```
POST /api/auth/me/adolescents
```

### Requête
```json
{
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "jean.dupont@example.com",
  "password": "SecurePassword123!",
  "birthDate": "2010-05-15",
  "consentGiven": true
}
```

### Réponse (Succès - 201)
```json
{
  "status": "success",
  "message": "Compte adolescent créé avec succès. Un e-mail de confirmation a été envoyé.",
  "adolescent": {
    "_id": "507f1f77bcf86cd799439011",
    "firstName": "Jean",
    "lastName": "Dupont",
    "email": "jean.dupont@example.com",
    "role": "adolescent",
    "adolescentProfile": {
      "parentId": "507f1f77bcf86cd799439010",
      "birthDate": "2010-05-15T00:00:00.000Z",
      "consentGiven": true,
      "consentAt": "2026-08-02T12:00:00.000Z"
    },
    "createdAt": "2026-08-02T12:00:00.000Z"
  },
  "verificationEmailSent": true,
  "verificationUrl": "http://localhost:4200/auth/verify-email?token=..."
}
```

### Erreurs possibles
- **400** : Validation échouée (données manquantes ou invalides)
- **401** : Non authentifié
- **403** : L'utilisateur n'est pas un parent
- **409** : L'email existe déjà

## Frontend

### Composant: AddAdolescentPage

#### Localisation
`src/app/features/family/pages/add-adolescent.page.ts`

#### Caractéristiques
- Formulaire réactif avec validation
- Vérification de la force du mot de passe en temps réel
- Validation des emails
- Vérification de la correspondance des mots de passe
- Affichage/masquage des mots de passe
- Messages d'erreur intuitifs
- Design responsive

#### Validation du mot de passe
Le mot de passe doit contenir :
- Au moins 10 caractères
- Une lettre majuscule
- Une lettre minuscule
- Un chiffre

#### Routes
```typescript
// Ajouter dans app.routes.ts ou le module de routing
{
  path: 'family',
  children: [
    {
      path: 'add-adolescent',
      component: AddAdolescentPage
    }
  ]
}
```

#### Utilisation
```typescript
import { AddAdolescentPage } from './features/family/pages/add-adolescent.page';
```

### Service: AdolescentService

#### Localisation
`src/app/features/family/services/adolescent.service.ts`

#### Méthodes

##### getMyAdolescents()
Récupère la liste des adolescents d'un parent

```typescript
this.adolescentService.getMyAdolescents().subscribe(response => {
  console.log(response.adolescents);
});
```

##### addAdolescent(data: AddAdolescentRequest)
Crée un nouveau compte adolescent

```typescript
const newAdolescent: AddAdolescentRequest = {
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean@example.com',
  password: 'SecurePassword123!',
  birthDate: '2010-05-15',
  consentGiven: true
};

this.adolescentService.addAdolescent(newAdolescent).subscribe({
  next: (response) => {
    console.log('Compte créé:', response.adolescent);
  },
  error: (error) => {
    console.error('Erreur:', error.error.message);
  }
});
```

## Flux utilisateur

1. Le parent se connecte à l'application
2. Accède à la page "Ajouter un adolescent"
3. Remplit le formulaire avec les informations du fils:
   - Prénom et nom
   - Email
   - Date de naissance
   - Mot de passe sécurisé
   - Confirme le consentement parental
4. Soumet le formulaire
5. Un email de vérification est envoyé à l'adresse du nouvel adolescent
6. L'adolescent confirme son email pour activer le compte
7. L'adolescent peut maintenant se connecter

## Points importants

- ✅ L'adolescent ne peut être créé que par son parent
- ✅ Un email de vérification est automatiquement envoyé
- ✅ Le compte est inactif jusqu'à la vérification de l'email
- ✅ La date de naissance est obligatoire
- ✅ Le consentement parental est requis
- ✅ Les mots de passe sont hachés (bcryptjs)
- ✅ Validation complète côté client et serveur

## Exemple d'intégration dans un composant parent

```typescript
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-family-dashboard',
  template: `
    <button (click)="goToAddAdolescent()">Ajouter un adolescent</button>
  `
})
export class FamilyDashboard {
  constructor(private router: Router) {}

  goToAddAdolescent(): void {
    this.router.navigate(['/family/add-adolescent']);
  }
}
```
