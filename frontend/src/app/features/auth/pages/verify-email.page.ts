import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="shell">
      <div class="device">

        <!-- Barre navigateur simulée -->
        <div class="device-bar">
          <span class="dot" style="background:var(--fb-danger)"></span>
          <span class="dot" style="background:#EF9F27"></span>
          <span class="dot" style="background:var(--fb-success)"></span>
          <div class="url-bar">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" class="url-lock">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            familybalance.app/verify-email
          </div>
        </div>

        <div class="card">
          <!-- Confetti -->
          <div class="confetti-wrap" *ngIf="!loading() && !errorMessage()">
            <span
              *ngFor="let c of confettiItems"
              class="cf"
              [class.round]="c.rounded"
              [style.left]="c.left"
              [style.background]="c.color"
              [style.animation-delay]="c.delay"
              [style.animation-duration]="c.duration"
            ></span>
          </div>

          <!-- ── État : chargement ── -->
          <ng-container *ngIf="loading()">
            <div class="icon-ring loading">
              <div class="spinner"></div>
            </div>
            <div class="card-title">Vérification en cours…</div>
            <p class="card-sub">
              Activation de votre compte en cours, veuillez patienter quelques secondes.
            </p>
          </ng-container>

          <!-- ── État : erreur ── -->
          <ng-container *ngIf="!loading() && errorMessage()">
            <div class="icon-ring errstate">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                stroke="var(--fb-danger)" stroke-width="2.2" stroke-linecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <div class="status-badge err">
              <span class="badge-dot" style="background:var(--fb-danger)"></span>
              Confirmation impossible
            </div>
            <div class="card-title">Lien invalide ou expiré</div>
            <p class="card-sub">
              Ce lien de confirmation n'est plus valide.
              Il a peut-être déjà été utilisé ou a expiré (validité 24h).
            </p>
            <div class="err-card">
              <p class="err-msg">{{ errorMessage() }}</p>
            </div>
            <button class="btn-primary danger" routerLink="/auth/register">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="white" stroke-width="2">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Revenir à l'inscription
            </button>
          </ng-container>

          <!-- ── État : succès (profil) ── -->
          <ng-container *ngIf="!loading() && !errorMessage() && nextRoute() !== '/auth/mfa'">
            <div class="icon-ring success">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none"
                stroke="var(--fb-primary)" stroke-width="2.4"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div class="status-badge ok">
              <span class="badge-dot" style="background:var(--fb-success)"></span>
              Compte activé avec succès
            </div>
            <div class="card-title">E-mail confirmé !</div>
            <p class="card-sub">
              Votre adresse e-mail est validée.
              Complétez votre espace personnel pour accéder à toutes les fonctionnalités.
            </p>

            <div class="stepper">
              <div class="st-item">
                <div class="st-circle done">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <span class="st-label done">Inscription</span>
              </div>
              <div class="st-line done"></div>
              <div class="st-item">
                <div class="st-circle done">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <span class="st-label done">Confirmation</span>
              </div>
              <div class="st-line idle"></div>
              <div class="st-item">
                <div class="st-circle active">3</div>
                <span class="st-label active">Profil</span>
              </div>
            </div>

            <div class="info-card">
              <div class="info-row">
                <span class="info-label">Statut du compte</span>
                <span class="info-value green">Sécurisé et activé</span>
              </div>
              <div class="info-row">
                <span class="info-label">Prochaine étape</span>
                <span class="info-value blue">Compléter votre espace personnel</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date d'activation</span>
                <span class="info-value">{{ activationDate }}</span>
              </div>
            </div>

            <button class="btn-primary" (click)="goNext()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="white" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
              Continuer vers mon espace
            </button>
          </ng-container>

          <!-- ── État : succès MFA requis ── -->
          <ng-container *ngIf="!loading() && !errorMessage() && nextRoute() === '/auth/mfa'">
            <div class="icon-ring mfa">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                stroke="var(--fb-primary)" stroke-width="2" stroke-linecap="round">
                <rect x="5" y="11" width="14" height="10" rx="2"/>
                <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
              </svg>
            </div>
            <div class="mfa-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Vérification MFA requise
            </div>
            <div class="card-title">E-mail confirmé !</div>
            <p class="card-sub">
              Votre adresse e-mail est validée.
              Une vérification MFA est nécessaire avant l'accès à votre espace.
            </p>

            <div class="stepper">
              <div class="st-item">
                <div class="st-circle done">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <span class="st-label done">Inscription</span>
              </div>
              <div class="st-line done"></div>
              <div class="st-item">
                <div class="st-circle done">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <span class="st-label done">Confirmation</span>
              </div>
              <div class="st-line idle"></div>
              <div class="st-item">
                <div class="st-circle active" style="font-size:9px">MFA</div>
                <span class="st-label active">Sécurité</span>
              </div>
            </div>

            <div class="info-card">
              <div class="info-row">
                <span class="info-label">Statut du compte</span>
                <span class="info-value green">Sécurisé et activé</span>
              </div>
              <div class="info-row">
                <span class="info-label">Prochaine étape</span>
                <span class="info-value blue">Saisir votre code MFA</span>
              </div>
              <div class="info-row" *ngIf="maskedEmail()">
                <span class="info-label">Code envoyé à</span>
                <span class="info-value">{{ maskedEmail() }}</span>
              </div>
            </div>

            <button class="btn-primary purple" (click)="goNext()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="white" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Continuer vers la vérification MFA
            </button>
          </ng-container>
        </div>

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
      font-family: "Segoe UI Variable", "Segoe UI", "Aptos", "Inter", sans-serif;
    }

    /* ── Device frame ── */
    .device {
      width: 100%;
      max-width: 460px;
      background: var(--fb-surface-strong);
      border: 0.5px solid var(--fb-border);
      border-radius: 16px;
      overflow: hidden;
    }

    .device-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 14px;
      background: var(--fb-bg);
      border-bottom: 0.5px solid var(--fb-border);
    }

    .dot { width: 9px; height: 9px; border-radius: 50%; }

    .url-bar {
      margin-left: 8px;
      flex: 1;
      background: var(--fb-surface-strong);
      border: 0.5px solid var(--fb-border-strong);
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 11px;
      color: var(--fb-muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .url-lock { color: var(--fb-muted); }

    /* ── Card ── */
    .card {
      padding: 2rem;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    /* ── Confetti ── */
    .confetti-wrap {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }

    .cf {
      position: absolute;
      top: -10px;
      width: 7px;
      height: 7px;
      border-radius: 2px;
      opacity: 0;
      animation: fall linear forwards;
    }

    .cf.round { border-radius: 50%; }

    @keyframes fall {
      0%   { opacity: 1; transform: translateY(0) rotate(0deg); }
      100% { opacity: 0; transform: translateY(280px) rotate(300deg); }
    }

    /* ── Icône centrale ── */
    .icon-ring {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      margin: 0 auto 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid;
    }

    .icon-ring.success  { background: var(--fb-primary-soft); border-color: var(--fb-primary); animation: popIn .45s ease-out; }
    .icon-ring.loading  { background: var(--fb-bg); border-color: var(--fb-border-strong); animation: pulse 1.2s ease-in-out infinite; }
    .icon-ring.errstate { background: rgba(var(--fb-danger-rgb), 0.08); border-color: var(--fb-danger); animation: popIn .45s ease-out; }
    .icon-ring.mfa      { background: var(--fb-primary-soft); border-color: var(--fb-primary); animation: popIn .45s ease-out; }

    @keyframes popIn {
      0%   { transform: scale(.7); opacity: .2; }
      100% { transform: scale(1);  opacity: 1;  }
    }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0   rgba(var(--fb-primary-rgb),.15); }
      50%       { box-shadow: 0 0 0 10px rgba(var(--fb-primary-rgb),0);  }
    }

    /* ── Spinner ── */
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(var(--fb-primary-rgb),.2);
      border-top-color: var(--fb-primary);
      border-radius: 50%;
      animation: spin .8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Badges ── */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 500;
      margin-bottom: 1rem;
      animation: fadeUp .35s ease;
    }

    .status-badge.ok  { background: rgba(var(--fb-success-rgb), 0.12); color: var(--fb-success); }
    .status-badge.err { background: rgba(var(--fb-danger-rgb), 0.08); color: var(--fb-danger); }

    .badge-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }

    .mfa-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 8px;
      background: var(--fb-primary-soft);
      color: var(--fb-primary-strong);
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 1rem;
      border: 1px solid rgba(var(--fb-primary-rgb),.28);
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0);   }
    }

    /* ── Typographie ── */
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
      margin-bottom: 1.25rem;
      max-width: 340px;
      margin-left: auto;
      margin-right: auto;
    }

    /* ── Stepper ── */
    .stepper {
      display: flex;
      align-items: center;
      margin-bottom: 1.25rem;
    }

    .st-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .st-circle {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 500;
      border: 0.5px solid;
    }

    .st-circle.done   { background: rgba(var(--fb-success-rgb), 0.12); color: var(--fb-success); border-color: rgba(var(--fb-success-rgb), 0.5); }
    .st-circle.active { background: var(--fb-primary); color: white;   border-color: var(--fb-primary); }
    .st-circle.idle   { background: var(--fb-bg); color: var(--fb-muted); border-color: var(--fb-border-strong); }

    .st-label        { font-size: 10px; color: var(--fb-muted); }
    .st-label.done   { color: var(--fb-success); }
    .st-label.active { color: var(--fb-primary); font-weight: 500; }

    .st-line { flex: 1; height: 0.5px; margin: 0 8px; margin-bottom: 12px; }
    .st-line.done { background: var(--fb-success); }
    .st-line.idle { background: var(--fb-border); }

    /* ── Info card ── */
    .info-card {
      background: var(--fb-bg);
      border: 0.5px solid var(--fb-border);
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 1.25rem;
      text-align: left;
    }

    .info-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      padding: 5px 0;
      border-bottom: 0.5px solid var(--fb-border);
    }

    .info-row:last-child { border-bottom: none; }

    .info-label {
      font-size: 11px;
      color: var(--fb-muted);
      white-space: nowrap;
      min-width: 120px;
    }

    .info-value       { font-size: 12px; color: var(--fb-text); font-weight: 500; word-break: break-all; }
    .info-value.green { color: var(--fb-success); }
    .info-value.blue  { color: var(--fb-primary); }

    /* ── Erreur card ── */
    .err-card {
      background: rgba(var(--fb-danger-rgb), 0.08);
      border: 0.5px solid rgba(var(--fb-danger-rgb), 0.4);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.25rem;
      text-align: left;
    }

    .err-msg { font-size: 12px; color: var(--fb-danger); line-height: 1.5; }

    /* ── Boutons ── */
    .btn-primary {
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
      text-decoration: none;
    }

    .btn-primary:hover   { opacity: .88; }
    .btn-primary.purple  { background: var(--fb-primary); }
    .btn-primary.danger  { background: var(--fb-danger); }

    /* ── Pied de carte ── */
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

    .foot-text { font-size: 11px; color: var(--fb-muted); }

    .foot-link {
      font-size: 11px;
      color: var(--fb-primary);
      text-decoration: none;
      font-weight: 500;
    }

    .foot-link:hover { text-decoration: underline; }
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

  readonly confettiItems = Array.from({ length: 30 }, (_, i) => ({
    left:     `${8 + ((i * 19) % 82)}%`,
    delay:    `${(i % 9) * 0.07}s`,
    duration: `${0.75 + (i % 5) * 0.13}s`,
    color:    ['var(--fb-primary)','var(--fb-success)','#EF9F27','var(--fb-danger)','#1D9E75','#D4537E','var(--fb-primary)'][i % 7],
    rounded:  i % 2 === 0,
  }));

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