import { CommonModule } from '@angular/common';
import { Component, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="shell">
      <div class="card">

        <div class="brand">
          <div class="brand-icon">
            <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 2L14.5 5.5V12.5L9 16L3.5 12.5V5.5L9 2Z" stroke="#fff" stroke-width="1.2"/>
              <circle cx="9" cy="9" r="2.5" fill="#fff"/>
            </svg>
          </div>
          <span class="brand-name">Sécurité du compte</span>
        </div>
        <div class="divider"></div>

        <h1>Nouveau mot de passe</h1>
        <p class="subtitle">
          Choisissez un mot de passe fort d'au moins 10 caractères pour protéger votre compte.
        </p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="form" novalidate>

          <!-- Nouveau mot de passe -->
          <div class="field">
            <label for="newPassword">Nouveau mot de passe</label>
            <div class="input-wrap">
              <input
                [type]="showNew ? 'text' : 'password'"
                id="newPassword"
                formControlName="newPassword"
                placeholder="Au moins 10 caractères"
                autocomplete="new-password"
              />
              <button type="button" class="eye-btn" (click)="showNew = !showNew" tabindex="-1" aria-label="Afficher/masquer">
                <svg *ngIf="!showNew" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg *ngIf="showNew" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
            <!-- Barre de force -->
            <div class="strength-bar">
              <div class="strength-seg" [class]="getSegClass(1)"></div>
              <div class="strength-seg" [class]="getSegClass(2)"></div>
              <div class="strength-seg" [class]="getSegClass(3)"></div>
              <div class="strength-seg" [class]="getSegClass(4)"></div>
            </div>
            <p class="hint" [style.color]="strengthColor()">{{ strengthLabel() }}</p>
          </div>

          <!-- Confirmation -->
          <div class="field">
            <label for="confirmPassword">Confirmer le mot de passe</label>
            <div class="input-wrap">
              <input
                [type]="showConfirm ? 'text' : 'password'"
                id="confirmPassword"
                formControlName="confirmPassword"
                placeholder="Répétez le mot de passe"
                autocomplete="new-password"
              />
              <button type="button" class="eye-btn" (click)="showConfirm = !showConfirm" tabindex="-1" aria-label="Afficher/masquer">
                <svg *ngIf="!showConfirm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg *ngIf="showConfirm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
            <p *ngIf="passwordMismatch()" class="feedback error-msg">
              <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Les mots de passe ne correspondent pas
            </p>
            <p *ngIf="passwordMatch()" class="feedback success-msg">
              <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg>
              Les mots de passe correspondent
            </p>
          </div>

          <!-- Messages globaux -->
          <p *ngIf="successMessage()" class="alert alert-success">{{ successMessage() }}</p>
          <p *ngIf="errorMessage()" class="alert alert-error">{{ errorMessage() }}</p>

          <button type="submit" class="btn" [disabled]="form.invalid || passwordMismatch() || loading()">
            {{ loading() ? 'Réinitialisation…' : 'Réinitialiser le mot de passe' }}
          </button>
        </form>

        <p class="footer-link">
          <a routerLink="/auth/login">← Retour à la connexion</a>
        </p>
      </div>
    </section>
  `,
  styles: [`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .shell {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      background:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'%3E%3Ccircle cx='680' cy='90' r='140' fill='none' stroke='rgba(13,122,111,0.18)' stroke-width='2'/%3E%3Ccircle cx='90' cy='420' r='90' fill='rgba(201,161,92,0.16)'/%3E%3Ccircle cx='60' cy='70' r='36' fill='rgba(13,122,111,0.13)'/%3E%3Cpath d='M-20,300 C160,240 280,360 440,300 C600,240 720,360 880,300' fill='none' stroke='rgba(13,122,111,0.16)' stroke-width='3'/%3E%3Cpath d='M-20,350 C160,300 280,400 440,350 C600,300 720,400 880,350' fill='none' stroke='rgba(201,161,92,0.16)' stroke-width='3'/%3E%3C/svg%3E") center/cover no-repeat,
        var(--fb-bg);
    }

    .card {
      width: 100%;
      max-width: 440px;
      background: var(--fb-surface-strong);
      border: 1px solid var(--fb-border);
      border-radius: 16px;
      padding: 2.5rem 2.25rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 1.5rem;
    }

    .brand-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, var(--fb-primary), var(--fb-primary-strong));
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-icon svg { width: 18px; height: 18px; }

    .brand-name {
      font-size: 16px;
      font-weight: 700;
      color: var(--fb-text);
      letter-spacing: 0.01em;
    }

    .divider {
      height: 1px;
      background: var(--fb-border);
      margin-bottom: 1.75rem;
    }

    h1 {
      font-size: 22px;
      font-weight: 800;
      color: var(--fb-text);
      margin-bottom: 0.4rem;
    }

    .subtitle {
      font-size: 14px;
      color: var(--fb-muted);
      line-height: 1.6;
      margin-bottom: 1.75rem;
    }

    .form { display: flex; flex-direction: column; gap: 0; }

    .field { margin-bottom: 1.1rem; }

    label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--fb-muted);
      margin-bottom: 6px;
    }

    .input-wrap { position: relative; }

    .input-wrap input {
      width: 100%;
      height: 44px;
      padding: 0 40px 0 14px;
      border: 1px solid var(--fb-border);
      border-radius: 8px;
      background: var(--fb-bg);
      color: var(--fb-text);
      font-size: 14px;
      outline: none;
      font-family: inherit;
      transition: border-color 0.15s, background 0.15s;
    }

    .input-wrap input:focus {
      border-color: var(--fb-primary);
      background: #fff;
    }

    .eye-btn {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      color: var(--fb-muted);
      display: flex;
      align-items: center;
      padding: 2px;
      transition: color 0.15s;
    }

    .eye-btn svg { width: 16px; height: 16px; }
    .eye-btn:hover { color: var(--fb-text); }

    .strength-bar {
      display: flex;
      gap: 3px;
      margin-top: 7px;
    }

    .strength-seg {
      height: 3px;
      flex: 1;
      border-radius: 99px;
      background: rgba(0,0,0,0.08);
      transition: background 0.3s;
    }

    .strength-seg.weak  { background: var(--fb-danger); }
    .strength-seg.mid   { background: var(--fb-warning); }
    .strength-seg.strong{ background: var(--fb-success); }

    .hint {
      font-size: 11px;
      color: var(--fb-muted);
      margin-top: 4px;
      min-height: 16px;
    }

    .feedback {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      margin-top: 5px;
    }

    .feedback svg { width: 11px; height: 11px; flex-shrink: 0; }
    .error-msg  { color: var(--fb-danger); }
    .success-msg{ color: var(--fb-success); }

    .alert {
      font-size: 13px;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 0.75rem;
    }

    .alert-success { background: rgba(21,127,69,.08); color: var(--fb-success); border: 1px solid rgba(21,127,69,.22); }
    .alert-error   { background: rgba(192,57,43,.07); color: var(--fb-danger); border: 1px solid rgba(192,57,43,.22); }

    .btn {
      width: 100%;
      height: 48px;
      margin-top: 0.5rem;
      background: linear-gradient(135deg, var(--fb-primary), var(--fb-primary-strong));
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 700;
      font-family: inherit;
      letter-spacing: 0.02em;
      cursor: pointer;
      transition: opacity 0.15s, transform 0.1s;
    }

    .btn:hover:not(:disabled) { opacity: 0.85; }
    .btn:active:not(:disabled){ transform: scale(0.99); }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .footer-link {
      text-align: center;
      margin-top: 1.5rem;
      font-size: 13px;
    }

    .footer-link a {
      color: var(--fb-muted);
      text-decoration: none;
      transition: color 0.15s;
    }

    .footer-link a:hover { color: var(--fb-primary); }
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

  getSegClass(index: number): string {
    const sc = this.score;
    if (index > sc || !this.passwordValue.length) return '';
    return sc <= 1 ? 'weak' : sc <= 2 ? 'mid' : 'strong';
  }

  strengthLabel(): string {
    if (!this.passwordValue.length) return 'Force du mot de passe';
    return ['', 'Faible', 'Moyen', 'Fort', 'Très fort'][this.score];
  }

  strengthColor(): string {
    if (!this.passwordValue.length) return '#766e62';
    return this.score <= 1 ? '#c0392b' : this.score <= 2 ? '#b7791f' : '#157f45';
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