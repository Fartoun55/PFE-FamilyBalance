import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="auth-root">

      <!-- Left panel — branding -->
      <aside class="brand-panel">
        <div class="brand-content">
          <div class="brand-emblem">
            <svg class="emblem-svg" viewBox="0 0 200 220" aria-hidden="true">
              <circle cx="100" cy="100" r="82" fill="none" stroke="#c9a15c" stroke-width="5"/>
              <text x="75" y="98" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="66" fill="#ffffff">F</text>
              <text x="118" y="98" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="66" fill="#ffffff">B</text>
              <ellipse cx="62" cy="118" rx="16" ry="18" fill="none" stroke="#ffffff" stroke-width="2"/>
              <path d="M40,178 Q40,140 62,138 Q84,140 84,178" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
              <circle cx="100" cy="145" r="11" fill="none" stroke="#c9a15c" stroke-width="2"/>
              <path d="M84,178 Q84,158 100,157 Q116,158 116,178" fill="none" stroke="#c9a15c" stroke-width="2" stroke-linecap="round"/>
              <ellipse cx="138" cy="118" rx="16" ry="18" fill="none" stroke="#8fd0c8" stroke-width="2"/>
              <path d="M116,178 Q116,140 138,138 Q160,140 160,178" fill="none" stroke="#8fd0c8" stroke-width="2" stroke-linecap="round"/>
              <path d="M20,172 Q100,212 180,172 Q100,196 20,172 Z" fill="#ffffff"/>
            </svg>
            <div class="emblem-wordmark"><span class="emblem-family">Family</span> <span class="emblem-balance">Balance</span></div>
            <div class="emblem-tagline"><span></span>Grandir ensemble, équilibre au quotidien<span></span></div>
          </div>

          <div class="brand-body">
            <h2>Équilibre numérique pour votre famille</h2>
            <p>Évaluez, prévenez et agissez face aux usages excessifs des écrans chez vos enfants.</p>

            <div class="feature-list">
              <div class="feature-item">
                <div class="feature-dot"></div>
                <span>Survey cliniquement validé (3–18 ans)</span>
              </div>
              <div class="feature-item">
                <div class="feature-dot"></div>
                <span>Scoring personnalisé non-anxiogène</span>
              </div>
              <div class="feature-item">
                <div class="feature-dot"></div>
                <span>Téléconsultation avec des spécialistes</span>
              </div>
              <div class="feature-item">
                <div class="feature-dot"></div>
                <span>Ressources éducatives adaptées par âge</span>
              </div>
            </div>
          </div>

          <div class="brand-footer">
            <div class="trust-badge">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L8.8 5.2L13 5.5L9.9 8.3L10.9 12.5L7 10.2L3.1 12.5L4.1 8.3L1 5.5L5.2 5.2L7 1Z" fill="currentColor"/>
              </svg>
              Conforme RGPD · Données chiffrées AES-256
            </div>
          </div>
        </div>
      </aside>

      <!-- Right panel — form -->
      <main class="form-panel">
        <div class="form-container">

          <div class="form-header">
            <h1>Connexion</h1>
            <p>Connectez-vous à votre compte</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form" novalidate>

            <div class="field-group">
              <label class="field-label" for="email">Email</label>
              <div class="field-wrapper" [class.field-error]="form.get('email')?.invalid && form.get('email')?.touched">
                <mat-icon class="field-icon">mail_outline</mat-icon>
                <input
                  id="email"
                  class="field-input"
                  type="email"
                  formControlName="email"
                  placeholder="vous@example.com"
                  autocomplete="email"
                />
              </div>
              <span class="field-hint" *ngIf="form.get('email')?.hasError('email') && form.get('email')?.touched">
                Format d'adresse invalide
              </span>
            </div>

            <div class="field-group">
              <label class="field-label" for="password">
                Mot de passe
                <a routerLink="/auth/forgot-password" class="forgot-link">Oublié ?</a>
              </label>
              <div class="field-wrapper" [class.field-error]="form.get('password')?.invalid && form.get('password')?.touched">
                <mat-icon class="field-icon">lock_outline</mat-icon>
                <input
                  id="password"
                  class="field-input"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  placeholder="Votre mot de passe"
                  autocomplete="current-password"
                />
                <button type="button" class="toggle-password" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'">
                  <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </div>
            </div>

            <div class="error-banner" *ngIf="errorMessage()">
              <mat-icon>error_outline</mat-icon>
              {{ errorMessage() }}
            </div>

            <button
              type="submit"
              class="btn-submit"
              [class.loading]="loading()"
              [disabled]="form.invalid || loading()"
            >
              <span class="btn-text" *ngIf="!loading()">
                Se connecter
                <mat-icon>arrow_forward</mat-icon>
              </span>
              <span class="btn-spinner" *ngIf="loading()">
                <mat-spinner diameter="16" strokeWidth="2"></mat-spinner>
                Connexion en cours…
              </span>
            </button>

          </form>

          <div class="role-badges">
            <span class="role-badge parent">Parent</span>
            <span class="role-badge ado">Adolescent</span>
            <span class="role-badge pro">Spécialiste</span>
            <span class="role-badge admin">Admin</span>
          </div>

          <p class="register-cta">
            Pas encore de compte ?
            <a routerLink="/auth/register">Créer un compte gratuitement →</a>
          </p>

        </div>
      </main>

    </div>
  `,
  styles: [`
    /* ── Reset & Root ─────────────────────────────── */
    :host {
      display: block;
      height: 100vh;
    }

    mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      line-height: 16px;
    }

    .auth-root {
      display: flex;
      height: 100vh;
      overflow: hidden;
      position: relative;
    }

    /* ── Brand Panel (Left) ───────────────────────── */
    .brand-panel {
      width: 420px;
      flex-shrink: 0;
      /* L'image est calée sur la boîte du panneau lui-même (420px), pas sur toute la
         largeur de l'écran : avec background-size:cover sur .auth-root, la scène se
         retrouvait mise à l'échelle sur toute la fenêtre et la silhouette famille /
         le halo sortaient hors du cadre visible du panneau (420px) — quasi invisible
         en pratique. Un voile sombre uniforme (au lieu d'un dégradé directionnel qui
         s'annulait avec le motif) garantit un contraste stable pour le texte. */
      background:
        linear-gradient(rgba(6, 38, 35, 0.24), rgba(6, 38, 35, 0.24)),
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 900'%3E%3Cdefs%3E%3Cfilter id='soft' x='-50%25' y='-50%25' width='200%25' height='200%25'%3E%3CfeGaussianBlur stdDeviation='16'/%3E%3C/filter%3E%3C/defs%3E%3Ccircle cx='340' cy='120' r='150' fill='rgba(255,255,255,0.14)' filter='url(%23soft)'/%3E%3Ccircle cx='340' cy='120' r='80' fill='rgba(255,255,255,0.18)' filter='url(%23soft)'/%3E%3Crect x='40' y='90' width='42' height='64' rx='7' fill='none' stroke='rgba(255,255,255,0.22)' stroke-width='3'/%3E%3Cline x1='49' y1='136' x2='73' y2='136' stroke='rgba(255,255,255,0.22)' stroke-width='3'/%3E%3Crect x='300' y='470' width='54' height='38' rx='6' fill='none' stroke='rgba(255,255,255,0.18)' stroke-width='3'/%3E%3Cpath d='M0,700 C90,650 150,730 210,690 C270,650 330,730 420,690 L420,900 L0,900 Z' fill='rgba(255,255,255,0.11)'/%3E%3Cpath d='M0,760 C90,720 150,800 210,760 C270,720 330,800 420,760 L420,900 L0,900 Z' fill='rgba(255,255,255,0.15)'/%3E%3Cg fill='rgba(255,255,255,0.26)'%3E%3Ccircle cx='210' cy='620' r='30'/%3E%3Cpath d='M172,780 C172,700 248,700 248,780 Z'/%3E%3Ccircle cx='142' cy='680' r='19'/%3E%3Cpath d='M120,780 C120,725 164,725 164,780 Z'/%3E%3Ccircle cx='278' cy='680' r='19'/%3E%3Cpath d='M256,780 C256,725 300,725 300,780 Z'/%3E%3Cpath d='M172,735 Q150,724 142,712' stroke='rgba(255,255,255,0.26)' stroke-width='6' fill='none' stroke-linecap='round'/%3E%3Cpath d='M248,735 Q270,724 278,712' stroke='rgba(255,255,255,0.26)' stroke-width='6' fill='none' stroke-linecap='round'/%3E%3C/g%3E%3C/svg%3E") center/cover no-repeat,
        linear-gradient(155deg, var(--fb-primary-strong) 0%, var(--fb-primary) 55%, #8fd0c8 140%);
      position: relative;
      display: flex;
      align-items: stretch;
      overflow: hidden;
    }

    .brand-content {
      position: relative;
      z-index: 1;
      padding: 2.5rem 2.8rem;
      display: flex;
      flex-direction: column;
      width: 100%;
      /* Garantit la lisibilité du texte quelle que soit la zone de l'image derrière. */
      text-shadow: 0 2px 16px rgba(4, 28, 26, 0.4);
    }

    /* Logo */
    .brand-emblem {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 2.25rem;
    }

    .emblem-svg {
      width: 108px;
      height: 118px;
    }

    .emblem-wordmark {
      margin-top: 0.6rem;
      font-family: Georgia, 'Times New Roman', serif;
      font-weight: 700;
      font-size: 1.35rem;
      letter-spacing: -0.01em;
    }

    .emblem-family { color: #ffffff; }
    .emblem-balance { color: #8fd0c8; }

    .emblem-tagline {
      margin-top: 0.4rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.75);
    }

    .emblem-tagline span {
      width: 18px;
      height: 1px;
      background: #c9a15c;
      display: inline-block;
    }

    /* Brand body */
    .brand-body {
      flex: 1;
    }

    .brand-body h2 {
      font-size: 1.65rem;
      font-weight: 700;
      color: #fff;
      line-height: 1.25;
      letter-spacing: -0.03em;
      margin: 0 0 1rem;
    }

    .brand-body p {
      font-size: 0.92rem;
      color: rgba(255,255,255,0.7);
      line-height: 1.6;
      margin: 0 0 2rem;
    }

    /* Features */
    .feature-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.875rem;
      color: rgba(255,255,255,0.85);
    }

    .feature-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #7dd3c8;
      flex-shrink: 0;
    }

    /* Footer */
    .brand-footer {
      margin-top: 2.5rem;
    }

    .trust-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.78rem;
      color: rgba(255,255,255,0.55);
    }

    /* ── Form Panel (Right) ───────────────────────── */
    .form-panel {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      /* Verre dépoli : le formulaire reste net et pleinement lisible quelle que soit
         l'image derrière lui, tout en laissant deviner la scène en transparence. */
      background: rgba(255, 255, 255, 0.93);
      backdrop-filter: blur(22px) saturate(1.1);
      -webkit-backdrop-filter: blur(22px) saturate(1.1);
      box-shadow: -32px 0 70px rgba(6, 38, 35, 0.18);
      position: relative;
      z-index: 1;
      padding: 2rem;
      overflow-y: auto;
    }

    /* Navigateurs sans backdrop-filter : fond quasi opaque pour garantir le contraste. */
    @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
      .form-panel {
        background: rgba(255, 255, 255, 0.98);
      }
    }

    .form-container {
      width: 100%;
      max-width: 420px;
    }

    /* Header */
    .form-header {
      margin-bottom: 2rem;
    }

    .form-header h1 {
      font-size: 1.85rem;
      font-weight: 700;
      color: var(--fb-text);
      letter-spacing: -0.03em;
      margin: 0 0 0.4rem;
      line-height: 1.1;
    }

    .form-header p {
      font-size: 0.9rem;
      color: var(--fb-muted);
      margin: 0;
    }

    /* ── Form ─────────────────────────────────────── */
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Field group */
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .field-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--fb-text);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .forgot-link {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--fb-primary);
      text-decoration: none;
      transition: color 0.15s;
    }
    .forgot-link:hover { color: var(--fb-primary-strong); }

    /* Field wrapper */
    .field-wrapper {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: #fff;
      border: 1.5px solid var(--fb-border);
      border-radius: 10px;
      padding: 0 0.9rem;
      height: 48px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .field-wrapper:focus-within {
      border-color: var(--fb-primary);
      box-shadow: 0 0 0 3px rgba(var(--fb-primary-rgb), 0.1);
    }

    .field-wrapper.field-error {
      border-color: var(--fb-danger);
      box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.08);
    }

    .field-icon {
      color: var(--fb-muted);
      flex-shrink: 0;
    }

    .field-wrapper:focus-within .field-icon {
      color: var(--fb-primary);
    }

    .field-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 0.9rem;
      color: var(--fb-text);
      font-family: inherit;
    }

    .field-input::placeholder {
      color: #b7ae9e;
    }

    .toggle-password {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: var(--fb-muted);
      display: grid;
      place-items: center;
      transition: color 0.15s;
    }
    .toggle-password:hover { color: var(--fb-primary); }

    .field-hint {
      font-size: 0.75rem;
      color: var(--fb-danger);
    }

    /* Error banner */
    .error-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      background: rgba(192, 57, 43, 0.07);
      border: 1px solid rgba(192, 57, 43, 0.22);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      font-size: 0.85rem;
      color: var(--fb-danger);
      line-height: 1.4;
    }

    .error-banner mat-icon {
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* Submit button */
    .btn-submit {
      height: 48px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--fb-primary) 0%, var(--fb-primary-strong) 100%);
      color: #fff;
      font-size: 0.95rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
      box-shadow: 0 4px 14px rgba(var(--fb-primary-rgb), 0.35);
      margin-top: 0.25rem;
    }

    .btn-submit:hover:not(:disabled) {
      opacity: 0.92;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(var(--fb-primary-rgb), 0.45);
    }

    .btn-submit:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }

    .btn-text {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn-spinner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
    }

    .btn-spinner ::ng-deep .mdc-circular-progress__indeterminate-circle-graphic,
    .btn-spinner ::ng-deep circle {
      stroke: #fff !important;
    }

    /* Role badges */
    .role-badges {
      display: flex;
      gap: 0.5rem;
      margin-top: 1.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .role-badge {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      letter-spacing: 0.01em;
    }

    .role-badge.parent {
      background: var(--fb-primary-soft);
      color: var(--fb-primary-strong);
      border: 1px solid rgba(var(--fb-primary-rgb), 0.22);
    }

    .role-badge.ado {
      background: rgba(var(--fb-accent-rgb), 0.12);
      color: var(--fb-accent-strong);
      border: 1px solid rgba(var(--fb-accent-rgb), 0.28);
    }

    .role-badge.pro {
      background: rgba(21, 127, 69, 0.1);
      color: var(--fb-success);
      border: 1px solid rgba(21, 127, 69, 0.25);
    }

    .role-badge.admin {
      background: rgba(28, 58, 94, 0.08);
      color: #1c3a5e;
      border: 1px solid rgba(28, 58, 94, 0.22);
    }

    /* Register CTA */
    .register-cta {
      text-align: center;
      font-size: 0.85rem;
      color: var(--fb-muted);
      margin-top: 1.25rem;
    }

    .register-cta a {
      color: var(--fb-primary);
      font-weight: 600;
      text-decoration: none;
      transition: color 0.15s;
    }
    .register-cta a:hover { color: var(--fb-primary-strong); }

    /* ── Responsive ───────────────────────────────── */
    @media (max-width: 768px) {
      .auth-root {
        flex-direction: column;
        height: auto;
        min-height: 100vh;
      }

      .brand-panel {
        width: 100%;
        padding: 1.5rem;
      }

      .brand-content {
        padding: 1.5rem;
      }

      .brand-body h2 {
        font-size: 1.3rem;
      }

      .feature-list {
        display: none;
      }

      .brand-footer { display: none; }

      .brand-emblem { margin-bottom: 0; }
      .emblem-svg { width: 76px; height: 84px; }
      .emblem-tagline { display: none; }
      .brand-body { display: none; }

      .form-panel {
        padding: 2rem 1.25rem;
        align-items: flex-start;
        /* Ombre portée vers le haut (plutôt que latérale) une fois les panneaux empilés. */
        box-shadow: 0 -20px 40px rgba(6, 38, 35, 0.14);
      }
    }

    @media (max-width: 480px) {
      /* Sur très petit écran, priorité totale à la lisibilité du formulaire :
         la scène illustrée reste visible mais la bande de marque est réduite au minimum. */
      .brand-content {
        padding: 1.1rem 1.25rem;
      }
      .form-panel {
        background: rgba(255, 255, 255, 0.97);
      }
    }
  `],
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