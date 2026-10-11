import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';
import { IllustrationComponent } from '../../../shared/components/illustration/illustration.component';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, BrandLogoComponent, IllustrationComponent],
  template: `
    <section class="auth-center">
      <div class="auth-card">
        <div class="auth-card-logo"><app-brand-logo [size]="34"></app-brand-logo></div>

        <!-- ── État : chargement ── -->
        <div class="auth-card-head" *ngIf="loading()" aria-live="polite">
          <div class="auth-icon"><span class="fb-spinner"></span></div>
          <h1>Vérification en cours…</h1>
          <p>Activation de votre compte, veuillez patienter quelques secondes.</p>
        </div>

        <!-- ── État : erreur ── -->
        <ng-container *ngIf="!loading() && errorMessage()">
          <header class="auth-card-head">
            <div class="auth-icon auth-icon--danger"><mat-icon>link_off</mat-icon></div>
            <span class="fb-badge fb-badge--danger">Confirmation impossible</span>
            <h1>Lien invalide ou expiré</h1>
            <p>Ce lien de confirmation n'est plus valide. Il a peut-être déjà été utilisé ou a expiré (validité 24 h).</p>
          </header>
          <div class="fb-alert fb-alert--error" role="alert">
            <mat-icon>error_outline</mat-icon><span>{{ errorMessage() }}</span>
          </div>
          <a class="fb-btn fb-btn--block auth-submit" routerLink="/auth/register">
            <mat-icon>arrow_back</mat-icon>
            Revenir à l'inscription
          </a>
        </ng-container>

        <!-- ── État : succès ── -->
        <ng-container *ngIf="!loading() && !errorMessage()">
          <div class="auth-progress" aria-hidden="true">
            <span class="done"></span>
            <span class="done"></span>
            <span class="active"></span>
          </div>

          <header class="auth-card-head">
            <app-illustration class="auth-illus" name="auth-email" fallbackIcon="task_alt" [eager]="true"></app-illustration>
            <span class="fb-badge fb-badge--success" *ngIf="nextRoute() !== '/auth/mfa'">Compte activé avec succès</span>
            <span class="fb-badge" *ngIf="nextRoute() === '/auth/mfa'">Vérification en deux étapes requise</span>
            <h1>E-mail confirmé !</h1>
            <p *ngIf="nextRoute() !== '/auth/mfa'">
              Votre adresse e-mail est validée. Complétez votre espace personnel pour accéder à toutes les fonctionnalités.
            </p>
            <p *ngIf="nextRoute() === '/auth/mfa'">
              Votre adresse e-mail est validée. Une vérification en deux étapes est nécessaire avant d'accéder à votre espace.
            </p>
          </header>

          <dl class="auth-summary">
            <div><dt>Statut du compte</dt><dd class="ok">Sécurisé et activé</dd></div>
            <div>
              <dt>Prochaine étape</dt>
              <dd>{{ nextRoute() === '/auth/mfa' ? 'Saisir votre code de vérification' : 'Compléter votre espace' }}</dd>
            </div>
            <div *ngIf="nextRoute() === '/auth/mfa' && maskedEmail()"><dt>Code envoyé à</dt><dd>{{ maskedEmail() }}</dd></div>
            <div *ngIf="nextRoute() !== '/auth/mfa'"><dt>Date d'activation</dt><dd>{{ activationDate }}</dd></div>
          </dl>

          <button class="fb-btn fb-btn--block auth-submit" type="button" (click)="goNext()">
            {{ nextRoute() === '/auth/mfa' ? 'Continuer vers la vérification' : 'Continuer vers mon espace' }}
            <mat-icon>arrow_forward</mat-icon>
          </button>
        </ng-container>

        <footer class="auth-card-foot">
          <a routerLink="/auth/login"><mat-icon>arrow_back</mat-icon>Retour à la connexion</a>
        </footer>
      </div>
    </section>
  `,
  styles: [`
    .auth-card-head .fb-badge { margin-bottom: 12px; }
    .fb-alert { margin-bottom: 18px; }
    .auth-summary .ok { color: var(--fb-success); }
  `],
})
export class VerifyEmailPage implements OnInit {
  readonly loading      = signal(true);
  readonly successMessage = signal('');
  readonly errorMessage   = signal('');
  readonly nextRoute      = signal('/auth/profile');
  readonly mfaToken       = signal('');
  readonly maskedEmail    = signal('');

  readonly activationDate = new Date().toLocaleString('fr-FR');

  constructor(
    private readonly route:       ActivatedRoute,
    private readonly authService: AuthService,
    private readonly router:      Router,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.loading.set(false);
      this.errorMessage.set('Lien de confirmation invalide : token manquant.');
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.successMessage.set('Compte activé avec succès.');

        if (response.requiresMfa && response.mfaToken) {
          this.nextRoute.set('/auth/mfa');
          this.mfaToken.set(response.mfaToken);
          this.maskedEmail.set(response.maskedEmail || '');
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          error?.error?.message ?? 'Impossible de confirmer votre e-mail.',
        );
      },
    });
  }

  goNext(): void {
    if (this.nextRoute() === '/auth/mfa') {
      this.router.navigate(['/auth/mfa'], {
        queryParams: { token: this.mfaToken() },
        state: {
          maskedEmail: this.maskedEmail(),
        },
      });
      return;
    }
    this.router.navigateByUrl('/auth/profile');
  }
}
