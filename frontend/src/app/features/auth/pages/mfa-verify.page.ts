import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';
import { IllustrationComponent } from '../../../shared/components/illustration/illustration.component';

@Component({
  selector: 'app-mfa-verify-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatIconModule, BrandLogoComponent, IllustrationComponent],
  template: `
    <section class="auth-center">
      <div class="auth-card">
        <div class="auth-card-logo"><app-brand-logo [size]="34"></app-brand-logo></div>

        <div class="auth-progress" aria-hidden="true">
          <span class="done"></span>
          <span class="done"></span>
          <span class="active"></span>
        </div>

        <header class="auth-card-head">
          <app-illustration class="auth-illus" name="auth-secure" fallbackIcon="shield" [eager]="true"></app-illustration>
          <span class="fb-eyebrow">Authentification renforcée</span>
          <h1>Vérification en deux étapes</h1>
          <p>Saisissez le code à 6 chiffres envoyé à votre adresse e-mail.</p>
          <span class="email-chip" *ngIf="maskedEmail()"><mat-icon>mail_outline</mat-icon>{{ maskedEmail() }}</span>
        </header>

        <div class="fb-alert fb-alert--success" role="status" *ngIf="successMessage()">
          <mat-icon>check_circle</mat-icon><span>{{ successMessage() }}</span>
        </div>
        <div class="fb-alert fb-alert--error" role="alert" *ngIf="errorMessage()">
          <mat-icon>error_outline</mat-icon><span>{{ errorMessage() }}</span>
        </div>

        <div class="otp-row" [class.shake]="shaking()" role="group" aria-label="Code de vérification à 6 chiffres">
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
            [attr.aria-label]="'Chiffre ' + (i + 1)"
            (input)="onDigit($event, i)"
            (keydown)="onKeydown($event, i)"
            (focus)="onFocus($event)"
            (paste)="onPaste($event, i)"
          />
        </div>

        <div class="timer-row">
          <span class="timer">
            <mat-icon>schedule</mat-icon>
            Expire dans
            <strong class="timer-val" [class.expired]="timerSeconds() === 0">{{ timerLabel() }}</strong>
          </span>
          <button class="resend-btn" type="button" [disabled]="loading()" (click)="resendCode()">
            Recevoir un nouveau code
          </button>
        </div>

        <button
          class="fb-btn fb-btn--block auth-submit"
          type="button"
          [disabled]="!codeComplete() || loading()"
          (click)="submit()"
        >
          <span class="fb-spinner" *ngIf="loading()" aria-hidden="true"></span>
          <mat-icon *ngIf="!loading()">verified_user</mat-icon>
          {{ loading() ? 'Vérification…' : 'Valider le code' }}
        </button>

        <p class="security-note">
          <mat-icon>lock</mat-icon>
          Ce code est à usage unique et valable 5 minutes. Ne le partagez jamais, y compris avec le support FamilyBalance.
        </p>

        <footer class="auth-card-foot">
          <a routerLink="/auth/login"><mat-icon>arrow_back</mat-icon>Retour à la connexion</a>
        </footer>
      </div>
    </section>
  `,
  styles: [`
    .auth-card-head .fb-eyebrow { margin-bottom: 8px; }

    .email-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 14px;
      padding: 6px 12px;
      border-radius: var(--fb-radius-pill);
      background: var(--fb-surface-alt);
      font-size: 13.5px;
      font-weight: 600;
      color: var(--fb-text-mid);
    }

    .email-chip mat-icon { width: 18px; height: 18px; font-size: 18px; }

    .fb-alert { margin-bottom: 18px; }

    .otp-row {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 18px;
    }

    .otp-input {
      width: 50px;
      height: 58px;
      border: 1.5px solid var(--fb-border-strong);
      border-radius: 14px;
      background: var(--fb-surface);
      color: var(--fb-text);
      font-family: var(--fb-font-mono);
      font-size: 22px;
      font-weight: 600;
      text-align: center;
      caret-color: transparent;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
    }

    .otp-input:focus {
      border-color: var(--fb-primary);
      box-shadow: 0 0 0 4px rgba(var(--fb-primary-rgb), 0.12);
    }

    .otp-input.filled {
      border-color: var(--fb-primary);
      background: var(--fb-primary-soft);
      color: var(--fb-primary-strong);
    }

    .otp-input.err {
      border-color: rgba(var(--fb-danger-rgb), 0.5);
      background: rgba(var(--fb-danger-rgb), 0.05);
    }

    .shake { animation: shake 0.4s ease; }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-6px); }
      40% { transform: translateX(6px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }

    .timer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 18px;
      font-size: 13.5px;
    }

    .timer { display: inline-flex; align-items: center; gap: 6px; color: var(--fb-muted); }
    .timer mat-icon { width: 18px; height: 18px; font-size: 18px; }
    .timer-val { color: var(--fb-text); font-variant-numeric: tabular-nums; }
    .timer-val.expired { color: var(--fb-danger); }

    .resend-btn {
      padding: 6px 0;
      border: none;
      background: none;
      color: var(--fb-primary);
      font-weight: 700;
      cursor: pointer;
    }

    .resend-btn:hover:not(:disabled) { text-decoration: underline; }
    .resend-btn:disabled { color: var(--fb-faint); cursor: not-allowed; }

    .security-note {
      display: flex;
      gap: 10px;
      margin: 18px 0 0;
      padding: 12px 14px;
      border-radius: var(--fb-radius-sm);
      background: var(--fb-surface-alt);
      font-size: 13px;
      line-height: 1.5;
      color: var(--fb-text-mid);
    }

    .security-note mat-icon { flex-shrink: 0; width: 18px; height: 18px; font-size: 18px; color: var(--fb-muted); }

    @media (max-width: 480px) {
      .otp-row { gap: 6px; }
      .otp-input { width: 42px; height: 50px; font-size: 19px; }
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

  /**
   * L'API n'expose pas d'envoi d'un nouveau code : c'est la connexion qui crée
   * un nouveau défi MFA et envoie le code. On renvoie donc l'utilisateur vers la
   * connexion plutôt que d'afficher une confirmation d'envoi qui n'a pas eu lieu.
   */
  resendCode(): void {
    this.router.navigateByUrl('/auth/login');
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