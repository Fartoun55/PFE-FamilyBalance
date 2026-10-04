import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AdolescentService } from '../services/adolescent.service';

@Component({
  selector: 'app-add-adolescent',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatCardModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './add-adolescent.page.html',
  styleUrls: ['./add-adolescent.page.css'],
})
export class AddAdolescentPage implements OnInit {
  form: FormGroup;
  loading = false;
  passwordStrength = 0;
  showPassword = false;
  showConfirmPassword = false;
  ageSegment: string | null = null;

  // Champ de classe (et non méthode d'instance appelée depuis le validateur) pour être
  // disponible dès l'initialisation des champs, avant l'exécution du corps du constructeur
  // où `this.form` est construit.
  private readonly ageRangeValidator = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Validators.required s'occupe déjà du cas vide.
    }
    return this.calculateAgeSegment(control.value) ? null : { outOfRange: true };
  };

  constructor(
    private fb: FormBuilder,
    private adolescentService: AdolescentService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(10)]],
      confirmPassword: ['', [Validators.required]],
      // L'avertissement "âge hors plage 3-18 ans" était déjà affiché visuellement, mais
      // sans validateur associé, il ne bloquait pas réellement la soumission : le bouton
      // "Créer le compte" restait cliquable, laissant le backend seul rejeter la requête.
      birthDate: ['', [Validators.required, this.ageRangeValidator]],
      consentGiven: [false, [Validators.requiredTrue]],
    });
  }

  cancel(): void {
    this.router.navigateByUrl('/family/dashboard');
  }

  ngOnInit(): void {
    this.form.get('password')?.valueChanges.subscribe(() => {
      this.calculatePasswordStrength();
    });

    this.form.get('birthDate')?.valueChanges.subscribe((value) => {
      this.ageSegment = this.calculateAgeSegment(value);
    });
  }

  calculateAgeSegment(value: Date | string | null): string | null {
    if (!value) {
      return null;
    }

    const birthDate = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(birthDate.getTime())) {
      return null;
    }

    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

    if (age >= 3 && age <= 6) {
      return '3-6 ans';
    }
    if (age >= 7 && age <= 11) {
      return '7-11 ans';
    }
    if (age >= 12 && age <= 15) {
      return '12-15 ans';
    }
    if (age >= 16 && age <= 18) {
      return '16-18 ans';
    }

    return null;
  }

  calculatePasswordStrength(): void {
    const password = this.form.get('password')?.value || '';
    let strength = 0;

    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*]/.test(password)) strength++;

    this.passwordStrength = strength;
  }

  getPasswordStrengthText(): string {
    const strengths = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent'];
    return strengths[this.passwordStrength - 1] || 'Très faible';
  }

  getPasswordStrengthColor(): string {
    const colors = ['#c0392b', '#c9622f', '#b7791f', '#7a9a3d', '#157f45'];
    return colors[this.passwordStrength - 1] || '#c0392b';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.snackBar.open('Veuillez remplir tous les champs correctement.', 'Fermer', {
        duration: 3000,
      });
      return;
    }

    const password = this.form.get('password')?.value;
    const confirmPassword = this.form.get('confirmPassword')?.value;

    if (password !== confirmPassword) {
      this.snackBar.open('Les mots de passe ne correspondent pas.', 'Fermer', {
        duration: 3000,
      });
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/.test(password)) {
      this.snackBar.open(
        'Le mot de passe doit contenir au moins 10 caractères, une majuscule, une minuscule et un chiffre.',
        'Fermer',
        { duration: 5000 }
      );
      return;
    }

    this.loading = true;

    const birthDate = this.form.get('birthDate')?.value;
    const formattedBirthDate = birthDate
      ? new Date(birthDate).toISOString().split('T')[0]
      : '';

    this.adolescentService.addAdolescent({
      firstName: this.form.get('firstName')?.value,
      lastName: this.form.get('lastName')?.value,
      email: this.form.get('email')?.value,
      password: password,
      birthDate: formattedBirthDate,
      consentGiven: this.form.get('consentGiven')?.value,
      ageSegment: this.ageSegment || undefined,
    }).subscribe({
      next: (response) => {
        this.loading = false;
        this.snackBar.open('Compte adolescent créé avec succès!', 'Fermer', {
          duration: 3000,
        });
        this.form.reset();
        setTimeout(() => {
          this.router.navigate(['/family/dashboard']);
        }, 1000);
      },
      error: (error) => {
        this.loading = false;
        const errorMessage = error.error?.message || 'Une erreur est survenue.';
        this.snackBar.open(errorMessage, 'Fermer', { duration: 5000 });
      },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
