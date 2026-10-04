import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatButtonModule],
  template: `
    <section class="shell">
      <div class="card">

        <div class="card-top">
          <div class="logo-row">
            <svg class="logo-ic" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#c9a15c" stroke-width="5"/>
              <text x="40" y="90" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="80" fill="#1c3a5e">F</text>
              <text x="82" y="90" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="80" fill="#0d7a6f">B</text>
            </svg>
            <span class="logo-name"><span class="logo-name-family">Family</span><span class="logo-name-balance">Balance</span></span>
          </div>

          <div class="steps">
            <div class="step done"></div>
            <div class="step" [class.active]="!sent()" [class.done]="sent()"></div>
            <div class="step" [class.active]="sent()"></div>
          </div>

          <div class="icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--fb-primary)" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div class="card-title">Mot de passe oublié ?</div>
          <p class="card-sub">
            Saisissez votre adresse e-mail — nous vous enverrons un lien sécurisé
            pour réinitialiser votre mot de passe.
          </p>
        </div>

        <div class="card-body">

          <!-- ── État : formulaire ── -->
          <ng-container *ngIf="!sent()">

            <div class="msg success" *ngIf="successMessage()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>{{ successMessage() }}</span>
            </div>

            <div class="msg error" *ngIf="errorMessage()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{{ errorMessage() }}</span>
            </div>

            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
              <div class="field">
                <label for="email">Adresse e-mail</label>
                <div class="input-wrap">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="input-icon">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input
                    id="email"
                    type="email"
                    formControlName="email"
                    placeholder="marie@exemple.fr"
                    [class.err]="form.get('email')?.invalid && form.get('email')?.touched"
                    autocomplete="email"
                  />
                </div>
                <span class="field-hint">L'adresse associée à votre compte FamilyBalance</span>
                <span class="field-error"
                  *ngIf="form.get('email')?.invalid && form.get('email')?.touched">
                  {{ form.get('email')?.errors?.['required'] ? 'Ce champ est obligatoire.' : 'Format d\'e-mail invalide.' }}
                </span>
              </div>

              <button
                type="submit"
                class="submit-btn"
                [disabled]="form.invalid || loading()"
              >
                <div class="spinner" *ngIf="loading()"></div>
                <svg *ngIf="!loading()" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                {{ loading() ? 'Envoi en cours…' : 'Envoyer le lien de réinitialisation' }}
              </button>
            </form>

            <!-- Lien de test (dev only) -->
            <div class="dev-link" *ngIf="resetUrl()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <span>Lien de test : <a [href]="resetUrl()" target="_blank">ouvrir le reset</a></span>
            </div>

          </ng-container>

          <!-- ── État : e-mail envoyé ── -->
          <ng-container *ngIf="sent()">
            <div class="state-sent">
              <div class="sent-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3B6D11" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div class="sent-title">{{ emailSent() ? 'Lien envoyé !' : 'Lien généré !' }}</div>
              <p class="sent-sub">
                <ng-container *ngIf="emailSent(); else localResetNotice">
                  Vérifiez votre boîte mail à l'adresse
                  <strong class="sent-email">{{ form.get('email')?.value }}</strong>.
                  Le lien est valable <strong>30 minutes</strong>.
                </ng-container>
                <ng-template #localResetNotice>
                  Aucun e-mail n'a pu être envoyé. Un lien de réinitialisation a été généré localement.
                </ng-template>
              </p>
              <div class="spam-note">
                <strong>Vous ne le trouvez pas ?</strong><br/>
                Vérifiez vos spams ou dossier promotions.
              </div>
              <div class="dev-link" *ngIf="resetUrl()">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                <span>Lien de réinitialisation : <a [href]="resetUrl()" target="_blank">ouvrir</a></span>
              </div>
              <button type="button" class="resend-btn" (click)="backToForm()">
                Renvoyer le lien
              </button>
            </div>
          </ng-container>

        </div>

        <div class="card-foot">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="back-icon">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          <span class="foot-text">Retour à</span>
          <a routerLink="/auth/login" class="foot-link">la connexion</a>
        </div>

      </div>
    </section>
  `,
  styles: [`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .shell {
      min-height: 100vh;
      background:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'%3E%3Ccircle cx='680' cy='90' r='140' fill='none' stroke='rgba(13,122,111,0.18)' stroke-width='2'/%3E%3Ccircle cx='90' cy='420' r='90' fill='rgba(201,161,92,0.16)'/%3E%3Ccircle cx='60' cy='70' r='36' fill='rgba(13,122,111,0.13)'/%3E%3Cpath d='M-20,300 C160,240 280,360 440,300 C600,240 720,360 880,300' fill='none' stroke='rgba(13,122,111,0.16)' stroke-width='3'/%3E%3Cpath d='M-20,350 C160,300 280,400 440,350 C600,300 720,400 880,350' fill='none' stroke='rgba(201,161,92,0.16)' stroke-width='3'/%3E%3C/svg%3E") center/cover no-repeat,
        var(--fb-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      font-family: "Segoe UI Variable", "Segoe UI", "Aptos", "Inter", sans-serif;
    }

    .card {
      width: 100%;
      max-width: 420px;
      background: var(--fb-surface-strong);
      border: 0.5px solid var(--fb-border);
      border-radius: 12px;
      overflow: hidden;
    }

    /* ── En-tête ── */
    .card-top {
      padding: 2rem 2rem 1.5rem;
      border-bottom: 0.5px solid var(--fb-border);
    }

    .logo-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 1.75rem;
    }

    .logo-ic {
      width: 34px;
      height: 34px;
      flex-shrink: 0;
    }

    .logo-name {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .logo-name-family { color: #1c3a5e; }
    .logo-name-balance { color: var(--fb-primary); }

    /* ── Stepper ── */
    .steps {
      display: flex;
      gap: 6px;
      margin-bottom: 1.5rem;
    }

    .step {
      flex: 1;
      height: 3px;
      border-radius: 2px;
      background: var(--fb-bg);
      transition: background .3s;
    }

    .step.done   { background: var(--fb-primary); }
    .step.active { background: rgba(var(--fb-primary-rgb), .45); }

    /* ── Titre ── */
    .icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: var(--fb-primary-soft);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .card-title {
      font-size: 20px;
      font-weight: 500;
      color: var(--fb-text);
      margin-bottom: 6px;
    }

    .card-sub {
      font-size: 13px;
      color: var(--fb-text);
      line-height: 1.5;
    }

    /* ── Corps ── */
    .card-body { padding: 1.5rem 2rem; }

    /* Messages */
    .msg {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 12px;
      line-height: 1.4;
      margin-bottom: 1.25rem;
      border: 0.5px solid;
    }

    .msg svg { flex-shrink: 0; margin-top: 1px; }

    .msg.success {
      background: rgba(var(--fb-success-rgb), 0.12);
      color: var(--fb-success);
      border-color: rgba(var(--fb-success-rgb), 0.5);
    }

    .msg.error {
      background: rgba(var(--fb-danger-rgb), 0.08);
      color: var(--fb-danger);
      border-color: rgba(var(--fb-danger-rgb), 0.4);
    }

    /* Champ */
    .field {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-bottom: 1.25rem;
    }

    .field label {
      font-size: 12px;
      font-weight: 500;
      color: var(--fb-text);
    }

    .input-wrap { position: relative; }

    .input-icon {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--fb-muted);
    }

    .field input {
      width: 100%;
      height: 40px;
      padding: 0 12px 0 36px;
      border-radius: 8px;
      border: 0.5px solid var(--fb-border-strong);
      background: var(--fb-surface-strong);
      color: var(--fb-text);
      font-size: 13px;
      outline: none;
      font-family: inherit;
      transition: border-color .15s, box-shadow .15s;
    }

    .field input:focus {
      border-color: var(--fb-primary);
      box-shadow: 0 0 0 3px rgba(var(--fb-primary-rgb), .1);
    }

    .field input.err {
      border-color: rgba(var(--fb-danger-rgb), 0.4);
    }

    .field-hint {
      font-size: 11px;
      color: var(--fb-muted);
    }

    .field-error {
      font-size: 11px;
      color: var(--fb-danger);
    }

    /* Bouton principal */
    .submit-btn {
      width: 100%;
      height: 48px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(135deg, var(--fb-primary) 0%, var(--fb-primary-strong) 100%);
      color: white;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-family: inherit;
      transition: opacity .15s;
    }

    .submit-btn:hover:not(:disabled) { opacity: .88; }
    .submit-btn:disabled { opacity: .5; cursor: not-allowed; }

    /* Spinner */
    .spinner {
      width: 15px;
      height: 15px;
      border: 2px solid rgba(255,255,255,.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin .7s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Lien dev */
    .dev-link {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: .75rem;
      padding: 9px 12px;
      background: var(--fb-bg);
      border-radius: 8px;
      font-size: 12px;
      color: var(--fb-text);
      border: 0.5px solid var(--fb-border);
    }

    .dev-link a {
      color: var(--fb-primary);
      text-decoration: none;
      font-weight: 500;
      word-break: break-all;
    }

    /* État envoyé */
    .state-sent {
      text-align: center;
      padding: .5rem 0 1rem;
    }

    .sent-icon {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #EAF3DE;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem;
    }

    .sent-title {
      font-size: 16px;
      font-weight: 500;
      color: var(--fb-text);
      margin-bottom: 6px;
    }

    .sent-sub {
      font-size: 13px;
      color: var(--fb-text);
      line-height: 1.5;
      margin-bottom: 1rem;
    }

    .sent-email {
      color: var(--fb-text);
      word-break: break-all;
    }

    .spam-note {
      padding: 10px 12px;
      background: var(--fb-bg);
      border-radius: 8px;
      border: 0.5px solid var(--fb-border);
      font-size: 12px;
      color: var(--fb-text);
      text-align: left;
      line-height: 1.5;
      margin-bottom: 1rem;
    }

    .resend-btn {
      padding: 7px 18px;
      border-radius: 8px;
      border: 0.5px solid var(--fb-border-strong);
      background: transparent;
      font-size: 12px;
      color: var(--fb-text);
      cursor: pointer;
      font-family: inherit;
      transition: background .15s;
    }

    .resend-btn:hover {
      background: var(--fb-bg);
    }

    /* Pied de page */
    .card-foot {
      padding: 1rem 2rem;
      border-top: 0.5px solid var(--fb-border);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }

    .back-icon { color: var(--fb-muted); }

    .foot-text {
      font-size: 12px;
      color: var(--fb-muted);
    }

    .foot-link {
      font-size: 12px;
      color: var(--fb-primary);
      text-decoration: none;
      font-weight: 500;
    }

    .foot-link:hover { text-decoration: underline; }
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
              ? "Impossible d'envoyer le lien de réinitialisation. Vérifie la configuration SMTP."
              : error?.error?.message ?? "Impossible d'envoyer le mail.",
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