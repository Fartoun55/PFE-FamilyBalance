import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';
import { IllustrationComponent } from '../../../shared/components/illustration/illustration.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, BrandLogoComponent, IllustrationComponent],
  template: `
    <div class="auth-split">
      <aside class="auth-aside">
        <app-brand-logo tone="light" [size]="40"></app-brand-logo>

        <div class="auth-aside-body">
          <app-illustration class="auth-aside-illus" name="family-hero" fallbackIcon="family_restroom" [eager]="true"></app-illustration>
          <span class="fb-eyebrow">Équilibre numérique</span>
          <h2>Grandir ensemble, avec des écrans à leur juste place.</h2>
          <p class="auth-aside-lead">
            Évaluez, prévenez et agissez face aux usages excessifs des écrans chez vos enfants et adolescents.
          </p>
          <ul class="auth-points">
            <li>
              <mat-icon>fact_check</mat-icon>
              <span><strong>Évaluation validée</strong>Un questionnaire adapté de 3 à 18 ans.</span>
            </li>
            <li>
              <mat-icon>insights</mat-icon>
              <span><strong>Résultats bienveillants</strong>Un scoring personnalisé et non anxiogène.</span>
            </li>
            <li>
              <mat-icon>video_call</mat-icon>
              <span><strong>Spécialistes à l'écoute</strong>Téléconsultation et ressources par âge.</span>
            </li>
          </ul>
        </div>

        <p class="auth-trust"><mat-icon>verified_user</mat-icon>Conforme RGPD · Données chiffrées</p>
      </aside>

      <main class="auth-main">
        <div class="auth-panel">
          <app-brand-logo class="auth-mobile-brand" [size]="36"></app-brand-logo>

          <header class="auth-head">
            <h1>Bon retour parmi nous</h1>
            <p>Connectez-vous pour retrouver l'espace de votre famille.</p>
          </header>

          <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form" novalidate>
            <div class="auth-field">
              <label class="auth-label" for="email">Adresse e-mail</label>
              <div class="auth-control" [class.invalid]="form.get('email')?.invalid && form.get('email')?.touched">
                <mat-icon>mail_outline</mat-icon>
                <input id="email" type="email" formControlName="email" placeholder="vous@exemple.com" autocomplete="email" />
              </div>
              <span class="auth-error" *ngIf="form.get('email')?.hasError('email') && form.get('email')?.touched">
                Format d'adresse invalide.
              </span>
            </div>

            <div class="auth-field">
              <label class="auth-label" for="password">
                Mot de passe
                <a routerLink="/auth/forgot-password">Mot de passe oublié ?</a>
              </label>
              <div class="auth-control" [class.invalid]="form.get('password')?.invalid && form.get('password')?.touched">
                <mat-icon>lock_outline</mat-icon>
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  placeholder="Votre mot de passe"
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  class="auth-toggle"
                  (click)="showPassword.set(!showPassword())"
                  [attr.aria-label]="showPassword() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                >
                  <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </div>
            </div>

            <div class="fb-alert fb-alert--error" role="alert" *ngIf="errorMessage()">
              <mat-icon>error_outline</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>

            <button type="submit" class="fb-btn fb-btn--block auth-submit" [disabled]="form.invalid || loading()">
              <ng-container *ngIf="!loading(); else busy">
                Se connecter
                <mat-icon>arrow_forward</mat-icon>
              </ng-container>
              <ng-template #busy>
                <span class="fb-spinner" aria-hidden="true"></span>
                Connexion en cours…
              </ng-template>
            </button>
          </form>

          <p class="auth-alt">
            Pas encore de compte ?
            <a routerLink="/auth/register">Créer un compte gratuitement</a>
          </p>
        </div>
      </main>
    </div>
  `,
})
export class LoginPage {
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly showPassword = signal(false);

  readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService
      .login(this.form.getRawValue() as { email: string; password: string })
      .subscribe({
        next: (response) => {
          this.loading.set(false);

          if (response.requiresMfa && response.mfaToken) {
            this.router.navigate(['/auth/mfa'], {
              queryParams: { token: response.mfaToken },
              state: {
                maskedEmail: response.maskedEmail,
                mfaCodeSent: response.mfaCodeSent,
                challengeExpiresAt: response.challengeExpiresAt,
              },
            });
            return;
          }

          this.router.navigateByUrl('/auth/profile');
        },
        error: (error) => {
          this.loading.set(false);
          if (error?.status === 0) {
            this.errorMessage.set('Impossible de joindre le serveur. Vérifiez que le backend est démarré.');
            return;
          }
          this.errorMessage.set(error?.error?.message || 'Connexion impossible.');
        },
      });
  }
}