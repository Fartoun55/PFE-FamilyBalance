import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { API_BASE_URL } from '../../../core/config/api.config';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';
import { IllustrationComponent } from '../../../shared/components/illustration/illustration.component';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, BrandLogoComponent, IllustrationComponent],
  template: `
    <section class="auth-center">
      <div class="auth-card">
        <div class="auth-card-logo"><app-brand-logo [size]="34"></app-brand-logo></div>

        <header class="auth-card-head">
          <app-illustration class="auth-illus" name="auth-key" fallbackIcon="password" [eager]="true"></app-illustration>
          <h1>Nouveau mot de passe</h1>
          <p>Choisissez un mot de passe robuste d'au moins 10 caractères pour protéger votre compte.</p>
        </header>

        <div class="fb-alert fb-alert--warning" role="alert" *ngIf="!token">
          <mat-icon>warning_amber</mat-icon>
          <span>
            Ce lien de réinitialisation est incomplet.
            <a routerLink="/auth/forgot-password">Demandez un nouveau lien</a>.
          </span>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form" novalidate>
          <div class="auth-field">
            <label class="auth-label" for="newPassword">Nouveau mot de passe</label>
            <div class="auth-control">
              <mat-icon>lock_outline</mat-icon>
              <input
                [type]="showNew ? 'text' : 'password'"
                id="newPassword"
                formControlName="newPassword"
                placeholder="Au moins 10 caractères"
                autocomplete="new-password"
              />
              <button
                type="button"
                class="auth-toggle"
                (click)="showNew = !showNew"
                [attr.aria-label]="showNew ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              >
                <mat-icon>{{ showNew ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </div>
            <div class="auth-strength">
              <div class="auth-strength-track">
                <div class="auth-strength-fill" [style.width.%]="strengthPercent()" [attr.data-level]="strengthLevel()"></div>
              </div>
              <span class="auth-strength-label" [attr.data-level]="strengthLevel()">{{ strengthLabel() }}</span>
            </div>
          </div>

          <div class="auth-field">
            <label class="auth-label" for="confirmPassword">Confirmer le mot de passe</label>
            <div class="auth-control" [class.invalid]="passwordMismatch()">
              <mat-icon>lock_outline</mat-icon>
              <input
                [type]="showConfirm ? 'text' : 'password'"
                id="confirmPassword"
                formControlName="confirmPassword"
                placeholder="Répétez le mot de passe"
                autocomplete="new-password"
              />
              <button
                type="button"
                class="auth-toggle"
                (click)="showConfirm = !showConfirm"
                [attr.aria-label]="showConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              >
                <mat-icon>{{ showConfirm ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </div>
            <span class="auth-error" *ngIf="passwordMismatch()">Les mots de passe ne correspondent pas.</span>
            <span class="auth-ok" *ngIf="passwordMatch()">Les mots de passe correspondent.</span>
          </div>

          <div class="fb-alert fb-alert--success" role="status" *ngIf="successMessage()">
            <mat-icon>check_circle</mat-icon><span>{{ successMessage() }} Redirection vers la connexion…</span>
          </div>
          <div class="fb-alert fb-alert--error" role="alert" *ngIf="errorMessage()">
            <mat-icon>error_outline</mat-icon><span>{{ errorMessage() }}</span>
          </div>

          <button
            type="submit"
            class="fb-btn fb-btn--block auth-submit"
            [disabled]="form.invalid || passwordMismatch() || loading() || !token"
          >
            <span class="fb-spinner" *ngIf="loading()" aria-hidden="true"></span>
            {{ loading() ? 'Réinitialisation…' : 'Réinitialiser le mot de passe' }}
          </button>
        </form>

        <footer class="auth-card-foot">
          <a routerLink="/auth/login"><mat-icon>arrow_back</mat-icon>Retour à la connexion</a>
        </footer>
      </div>
    </section>
  `,
  styles: [`
    .auth-card-head + .fb-alert { margin-bottom: 18px; }
  `],
})
export class ResetPasswordPage {
  readonly loading = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly token = this.route.snapshot.queryParamMap.get('token') || '';

  showNew = false;
  showConfirm = false;

  readonly form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(10)]],
    confirmPassword: ['', [Validators.required]],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  // ── Force du mot de passe ──────────────────────────────────────
  private get passwordValue(): string {
    return this.form.get('newPassword')?.value || '';
  }

  private get score(): number {
    const v = this.passwordValue;
    let sc = 0;
    if (v.length >= 10)          sc++;
    if (/[A-Z]/.test(v))         sc++;
    if (/[0-9]/.test(v))         sc++;
    if (/[^A-Za-z0-9]/.test(v)) sc++;
    return sc;
  }

  strengthPercent(): number {
    return this.passwordValue.length ? Math.max(this.score, 1) * 25 : 0;
  }

  strengthLevel(): 'weak' | 'medium' | 'strong' {
    return this.score <= 1 ? 'weak' : this.score <= 2 ? 'medium' : 'strong';
  }

  strengthLabel(): string {
    if (!this.passwordValue.length) return '';
    return ['Faible', 'Faible', 'Moyen', 'Fort', 'Très fort'][this.score];
  }

  // ── Correspondance ─────────────────────────────────────────────
  passwordMismatch(): boolean {
    const confirm = this.form.get('confirmPassword')?.value || '';
    return !!confirm && this.passwordValue !== confirm;
  }

  passwordMatch(): boolean {
    const confirm = this.form.get('confirmPassword')?.value || '';
    return !!confirm && this.passwordValue === confirm && this.passwordValue.length >= 10;
  }

  // ── Soumission ─────────────────────────────────────────────────
  submit(): void {
    if (this.form.invalid || this.passwordMismatch() || !this.token) return;

    this.loading.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.http
      .post<{ message: string }>(`${API_BASE_URL}/auth/reset-password`, {
        token: this.token,
        newPassword: this.form.get('newPassword')?.value,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.successMessage.set(res.message);
          setTimeout(() => this.router.navigateByUrl('/auth/login'), 1200);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err?.error?.message || 'Réinitialisation impossible.');
        },
      });
  }
}
