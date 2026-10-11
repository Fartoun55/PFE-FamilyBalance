import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { API_BASE_URL } from '../../../core/config/api.config';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';
import { IllustrationComponent } from '../../../shared/components/illustration/illustration.component';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, BrandLogoComponent, IllustrationComponent],
  template: `
    <section class="auth-center">
      <div class="auth-card">
        <div class="auth-card-logo"><app-brand-logo [size]="34"></app-brand-logo></div>

        <div class="auth-progress" aria-hidden="true">
          <span class="done"></span>
          <span [class.active]="!sent()" [class.done]="sent()"></span>
          <span [class.active]="sent()"></span>
        </div>

        <!-- ── État : formulaire ── -->
        <ng-container *ngIf="!sent()">
          <header class="auth-card-head">
            <app-illustration class="auth-illus" name="auth-key" fallbackIcon="lock_reset" [eager]="true"></app-illustration>
            <h1>Mot de passe oublié ?</h1>
            <p>Saisissez votre adresse e-mail : nous vous enverrons un lien sécurisé pour choisir un nouveau mot de passe.</p>
          </header>

          <div class="fb-alert fb-alert--error" role="alert" *ngIf="errorMessage()">
            <mat-icon>error_outline</mat-icon><span>{{ errorMessage() }}</span>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form" novalidate>
            <div class="auth-field">
              <label class="auth-label" for="email">Adresse e-mail</label>
              <div class="auth-control" [class.invalid]="form.get('email')?.invalid && form.get('email')?.touched">
                <mat-icon>mail_outline</mat-icon>
                <input id="email" type="email" formControlName="email" placeholder="marie@exemple.fr" autocomplete="email" />
              </div>
              <span class="auth-error" *ngIf="form.get('email')?.invalid && form.get('email')?.touched; else emailHint">
                {{ form.get('email')?.errors?.['required'] ? 'Ce champ est obligatoire.' : 'Format d\\'e-mail invalide.' }}
              </span>
              <ng-template #emailHint>
                <span class="auth-hint">L'adresse associée à votre compte FamilyBalance.</span>
              </ng-template>
            </div>

            <button type="submit" class="fb-btn fb-btn--block auth-submit" [disabled]="form.invalid || loading()">
              <span class="fb-spinner" *ngIf="loading()" aria-hidden="true"></span>
              <mat-icon *ngIf="!loading()">send</mat-icon>
              {{ loading() ? 'Envoi en cours…' : 'Envoyer le lien de réinitialisation' }}
            </button>
          </form>

          <p class="dev-link" *ngIf="resetUrl()">
            <mat-icon>link</mat-icon>
            Lien de test : <a [href]="resetUrl()" target="_blank" rel="noopener">ouvrir la réinitialisation</a>
          </p>
        </ng-container>

        <!-- ── État : e-mail envoyé ── -->
        <ng-container *ngIf="sent()">
          <header class="auth-card-head">
            <app-illustration class="auth-illus" name="auth-email" fallbackIcon="mark_email_read" [eager]="true"></app-illustration>
            <h1>{{ emailSent() ? 'Lien envoyé !' : 'Lien généré !' }}</h1>
            <p *ngIf="emailSent(); else localResetNotice">
              Consultez votre boîte de réception à l'adresse
              <strong>{{ form.get('email')?.value }}</strong>. Le lien est valable <strong>30 minutes</strong>.
            </p>
            <ng-template #localResetNotice>
              <p>Aucun e-mail n'a pu être envoyé. Un lien de réinitialisation a été généré localement.</p>
            </ng-template>
          </header>

          <div class="fb-alert fb-alert--warning">
            <mat-icon>info</mat-icon>
            <span><strong>Vous ne le trouvez pas ?</strong> Vérifiez vos courriers indésirables ou l'onglet Promotions.</span>
          </div>

          <p class="dev-link" *ngIf="resetUrl()">
            <mat-icon>link</mat-icon>
            Lien de réinitialisation : <a [href]="resetUrl()" target="_blank" rel="noopener">ouvrir</a>
          </p>

          <button type="button" class="fb-btn fb-btn--ghost fb-btn--block auth-submit" (click)="backToForm()">
            <mat-icon>refresh</mat-icon>
            Renvoyer le lien
          </button>
        </ng-container>

        <footer class="auth-card-foot">
          <a routerLink="/auth/login"><mat-icon>arrow_back</mat-icon>Retour à la connexion</a>
        </footer>
      </div>
    </section>
  `,
  styles: [`
    .fb-alert { margin-bottom: 18px; }

    .dev-link {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 16px 0 0;
      padding: 10px 14px;
      border: 1px dashed var(--fb-border-strong);
      border-radius: var(--fb-radius-sm);
      font-size: 13px;
      color: var(--fb-text-mid);
    }

    .dev-link mat-icon { width: 18px; height: 18px; font-size: 18px; color: var(--fb-muted); }
  `],
})
export class ForgotPasswordPage {
  readonly loading = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly resetUrl = signal('');
  readonly sent = signal(false);
  readonly emailSent = signal(false);

  readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly http: HttpClient,
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.resetUrl.set('');
    this.emailSent.set(false);

    this.http
      .post<{ message: string; resetUrl?: string; sent?: boolean }>(
        `${API_BASE_URL}/auth/forgot-password`,
        this.form.getRawValue(),
        { withCredentials: true },
      )
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.successMessage.set(response.message);
          this.resetUrl.set(response.resetUrl || '');
          this.emailSent.set(!!response.sent);
          this.sent.set(true);
        },
        error: (error) => {
          this.loading.set(false);
          const rawMessage = String(error?.error?.message || '');
          const looksLikeSmtpFailure =
            error?.status === 500 ||
            /smtp|gmail|535-5\.7\.8|badcredentials|username and password not accepted/i.test(
              rawMessage,
            );

          this.errorMessage.set(
            looksLikeSmtpFailure
              ? "Impossible d'envoyer le lien pour le moment. Réessayez dans quelques minutes."
              : error?.error?.message ?? "Impossible d'envoyer l'e-mail.",
          );
        },
      });
  }

  backToForm(): void {
    this.sent.set(false);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.resetUrl.set('');
    this.form.reset();
  }
}
