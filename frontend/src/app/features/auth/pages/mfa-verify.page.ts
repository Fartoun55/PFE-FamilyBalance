import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-mfa-verify-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <section class="shell">
      <div class="card">

        <!-- ── En-tête ── -->
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
            <div class="step done"></div>
            <div class="step active"></div>
          </div>

          <div class="icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="var(--fb-primary)" stroke-width="2" stroke-linecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div class="eyebrow">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Authentification renforcée
          </div>
          <div class="card-title">Vérification MFA</div>
          <p class="card-sub">Saisissez le code à 6 chiffres envoyé à votre adresse e-mail.</p>
        </div>

        <!-- ── Corps ── -->
        <div class="card-body">

          <!-- Adresse masquée -->
          <div class="email-chip" *ngIf="maskedEmail()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            {{ maskedEmail() }}
          </div>

          <!-- Messages -->
          <div class="msg success" *ngIf="successMessage()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>{{ successMessage() }}</span>
          </div>
          <div class="msg error" *ngIf="errorMessage()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>

          <!-- Saisie OTP — 6 cases individuelles -->
          <div class="otp-row" [class.shake]="shaking()">
            <input
              *ngFor="let ctrl of otpControls; let i = index"
              class="otp-input"
              [class.filled]="ctrl.value"
              [class.err]="hasError()"
              [formControl]="ctrl"
              maxlength="1"
              inputmode="numeric"
              autocomplete="one-time-code"
              [id]="'otp-' + i"
              (input)="onDigit($event, i)"
              (keydown)="onKeydown($event, i)"
              (focus)="onFocus($event)"
              (paste)="onPaste($event, i)"
            />
          </div>

          <!-- Timer + renvoyer -->
          <div class="timer-row">
            <div class="timer">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              Expire dans&nbsp;
              <span class="timer-val" [class.expired]="timerSeconds() === 0">
                {{ timerLabel() }}
              </span>
            </div>
            <button
              class="resend-btn"
              type="button"
              [disabled]="timerSeconds() > 0 || loading()"
              (click)="resendCode()"
            >
              Renvoyer le code
            </button>
          </div>

          <!-- Bouton principal -->
          <button
            class="submit-btn"
            type="button"
            [disabled]="!codeComplete() || loading()"
            (click)="submit()"
          >
            <div class="spinner" *ngIf="loading()"></div>
            <svg *ngIf="!loading()" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="white" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            {{ loading() ? 'Vérification…' : 'Valider le code' }}
          </button>

          <!-- Note sécurité -->
          <div class="security-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <p>
              Ce code est à usage unique et valable 5 minutes.
              Ne le partagez jamais avec quiconque, y compris le support FamilyBalance.
            </p>
          </div>

        </div>

        <!-- ── Pied de carte ── -->
        <div class="card-foot">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" class="back-icon">
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
      font-family: var(--font-sans, system-ui, sans-serif);
    }

    /* ── Card ── */
    .card {
      width: 100%;
      max-width: 420px;
      background: var(--fb-surface-strong);
      border: 0.5px solid var(--fb-border);
      border-radius: 16px;
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

    /* ── Icône & titre ── */
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

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 20px;
      background: var(--fb-primary-soft);
      color: var(--fb-primary-strong);
      font-size: 11px;
      font-weight: 500;
      margin-bottom: .875rem;
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

    .email-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 8px;
      background: var(--fb-bg);
      border: 0.5px solid var(--fb-border);
      font-size: 12px;
      color: var(--fb-text);
      margin-bottom: 1.25rem;
      font-weight: 500;
    }

    /* ── Messages ── */
    .msg {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 12px;
      line-height: 1.4;
      margin-bottom: 1rem;
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

    /* ── OTP ── */
    .otp-row {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin-bottom: 1.25rem;
    }

    .otp-input {
      width: 44px;
      height: 52px;
      border-radius: 8px;
      border: 0.5px solid var(--fb-border-strong);
      background: var(--fb-surface-strong);
      color: var(--fb-text);
      font-size: 20px;
      font-weight: 500;
      text-align: center;
      outline: none;
      font-family: var(--font-mono, monospace);
      transition: border-color .15s, box-shadow .15s;
      caret-color: transparent;
    }

    .otp-input:focus {
      border-color: var(--fb-primary);
      box-shadow: 0 0 0 3px rgba(var(--fb-primary-rgb), .12);
    }

    .otp-input.filled {
      border-color: var(--fb-primary);
      background: var(--fb-primary-soft);
      color: var(--fb-primary-strong);
    }

    .otp-input.err {
      border-color: rgba(var(--fb-danger-rgb), 0.4);
      background: #FCEBEB;
    }

    /* ── Animation shake ── */
    .shake { animation: shake .4s ease; }

    @keyframes shake {
      0%, 100% { transform: translateX(0);  }
      20%       { transform: translateX(-6px); }
      40%       { transform: translateX(6px);  }
      60%       { transform: translateX(-4px); }
      80%       { transform: translateX(4px);  }
    }

    /* ── Timer ── */
    .timer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
    }

    .timer {
      font-size: 12px;
      color: var(--fb-muted);
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .timer-val {
      font-weight: 500;
      color: var(--fb-text);
      font-variant-numeric: tabular-nums;
    }

    .timer-val.expired {
      color: var(--fb-danger);
    }

    .resend-btn {
      font-size: 12px;
      color: var(--fb-primary);
      background: none;
      border: none;
      cursor: pointer;
      font-family: inherit;
      padding: 0;
      font-weight: 500;
      transition: opacity .15s;
    }

    .resend-btn:disabled {
      color: var(--fb-muted);
      cursor: not-allowed;
    }

    /* ── Bouton principal ── */
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

    /* ── Spinner ── */
    .spinner {
      width: 15px;
      height: 15px;
      border: 2px solid rgba(255, 255, 255, .3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin .7s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Note sécurité ── */
    .security-note {
      margin-top: 1rem;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 12px;
      background: var(--fb-bg);
      border-radius: 8px;
      border: 0.5px solid var(--fb-border);
    }

    .security-note p {
      font-size: 11px;
      color: var(--fb-muted);
      line-height: 1.4;
      margin: 0;
    }

    /* ── Pied ── */
    .card-foot {
      padding: .875rem 2rem;
      border-top: 0.5px solid var(--fb-border);
      background: var(--fb-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }

    .back-icon { color: var(--fb-muted); }

    .foot-text {
      font-size: 11px;
      color: var(--fb-muted);
    }

    .foot-link {
      font-size: 11px;
      color: var(--fb-primary);
      text-decoration: none;
      font-weight: 500;
    }

    .foot-link:hover { text-decoration: underline; }

    @media (max-width: 480px) {
      .card-top { padding: 1.5rem 1.25rem 1rem; }
      .otp-row { gap: 6px; }
      .otp-input { width: 38px; height: 46px; font-size: 18px; }
    }
  `],
})
export class MfaVerifyPage implements OnInit, OnDestroy {
  readonly loading        = signal(false);
  readonly errorMessage   = signal('');
  readonly successMessage = signal('');
  readonly mfaToken       = signal('');
  readonly maskedEmail    = signal('');
  readonly shaking        = signal(false);
  readonly timerSeconds   = signal(299);
  readonly hasError       = signal(false);

  readonly otpControls = Array.from({ length: 6 }, () =>
    this.fb.control('', [Validators.required, Validators.pattern('[0-9]')])
  );

  private timerRef: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly route:       ActivatedRoute,
    private readonly router:      Router,
    private readonly fb:          FormBuilder,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    const state  = history.state as { maskedEmail?: string };

    if (!token) {
      this.errorMessage.set('Token MFA manquant. Veuillez recommencer la connexion.');
      return;
    }

    this.mfaToken.set(token);
    this.maskedEmail.set(state?.maskedEmail ?? '');

    this.startTimer();
    setTimeout(() => document.getElementById('otp-0')?.focus(), 100);
  }

  ngOnDestroy(): void {
    if (this.timerRef) clearInterval(this.timerRef);
  }

  /* ── Timer ── */
  timerLabel(): string {
    const s = this.timerSeconds();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  private startTimer(): void {
    this.timerRef = setInterval(() => {
      this.timerSeconds.update(s => Math.max(0, s - 1));
      if (this.timerSeconds() === 0 && this.timerRef) {
        clearInterval(this.timerRef);
        this.timerRef = null;
      }
    }, 1000);
  }

  resendCode(): void {
    this.clearInputs();
    this.errorMessage.set('');
    this.timerSeconds.set(299);
    this.startTimer();
    this.successMessage.set('Un nouveau code a été envoyé à votre adresse e-mail.');
  }

  /* ── Gestion des cases OTP ── */
  codeComplete(): boolean {
    return this.otpControls.every(c => !!c.value);
  }

  getCode(): string {
    return this.otpControls.map(c => c.value ?? '').join('');
  }

  onDigit(event: Event, idx: number): void {
    const input = event.target as HTMLInputElement;
    const val   = input.value.replace(/\D/g, '');
    input.value = val ? val[0] : '';
    this.otpControls[idx].setValue(input.value);
    this.hasError.set(false);

    if (input.value && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  }

  onKeydown(event: KeyboardEvent, idx: number): void {
    if (event.key === 'Backspace' && !this.otpControls[idx].value && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
    if (event.key === 'ArrowLeft'  && idx > 0) { event.preventDefault(); document.getElementById(`otp-${idx - 1}`)?.focus(); }
    if (event.key === 'ArrowRight' && idx < 5) { event.preventDefault(); document.getElementById(`otp-${idx + 1}`)?.focus(); }
  }

  onFocus(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  onPaste(event: ClipboardEvent, startIdx: number): void {
    event.preventDefault();
    const digits = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6 - startIdx);
    digits.split('').forEach((ch, i) => {
      const ctrl = this.otpControls[startIdx + i];
      if (ctrl) ctrl.setValue(ch);
      const el = document.getElementById(`otp-${startIdx + i}`);
      if (el) (el as HTMLInputElement).value = ch;
    });
    const focusIdx = Math.min(startIdx + digits.length, 5);
    document.getElementById(`otp-${focusIdx}`)?.focus();
  }

  private clearInputs(): void {
    this.otpControls.forEach(c => c.setValue(''));
    this.hasError.set(false);
    setTimeout(() => document.getElementById('otp-0')?.focus(), 50);
  }

  private triggerShake(): void {
    this.shaking.set(true);
    this.hasError.set(true);
    setTimeout(() => {
      this.shaking.set(false);
      this.clearInputs();
    }, 450);
  }

  /* ── Soumission ── */
  submit(): void {
    if (!this.codeComplete() || !this.mfaToken() || this.loading()) return;

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService
      .verifyMfa({ token: this.mfaToken(), code: this.getCode() })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.successMessage.set('Code vérifié avec succès !');

          const route = response.user.role === 'admin'
            ? '/admin/dashboard'
            : '/auth/profile';

          setTimeout(() => this.router.navigateByUrl(route), 800);
        },
        error: (error) => {
          this.loading.set(false);
          this.errorMessage.set(
            error?.error?.message ?? 'Impossible de vérifier le code MFA.',
          );
          this.triggerShake();
        },
      });
  }
}