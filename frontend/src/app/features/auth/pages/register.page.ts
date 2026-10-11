import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterPayload } from '../../../core/models/auth.models';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';
import { IllustrationComponent } from '../../../shared/components/illustration/illustration.component';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, BrandLogoComponent, IllustrationComponent],
  template: `
    <div class="auth-split">
      <aside class="auth-aside">
        <app-brand-logo tone="light" [size]="40"></app-brand-logo>

        <div class="auth-aside-body">
          <app-illustration class="auth-aside-illus" name="family-welcome" fallbackIcon="family_restroom" [eager]="true"></app-illustration>
          <span class="fb-eyebrow">Inscription</span>
          <h2>Rejoignez la communauté FamilyBalance.</h2>
          <p class="auth-aside-lead">
            Créez votre espace en quelques minutes et accompagnez votre famille vers un équilibre numérique sain.
          </p>
          <ul class="auth-points">
            <li>
              <mat-icon>family_restroom</mat-icon>
              <span><strong>Parents</strong>Suivez chaque enfant et ajoutez vos adolescents depuis votre tableau de bord.</span>
            </li>
            <li>
              <mat-icon>medical_services</mat-icon>
              <span><strong>Spécialistes</strong>Proposez vos consultations et accompagnez les familles.</span>
            </li>
            <li>
              <mat-icon>mark_email_read</mat-icon>
              <span><strong>Activation sécurisée</strong>Un e-mail de confirmation active votre compte.</span>
            </li>
          </ul>
        </div>

        <p class="auth-trust"><mat-icon>verified_user</mat-icon>RGPD · HDS · Chiffrement des données</p>
      </aside>

      <main class="auth-main">
        <div class="auth-panel auth-panel--wide">
          <app-brand-logo class="auth-mobile-brand" [size]="36"></app-brand-logo>

          <header class="auth-head">
            <span class="step-note">Étape 1 sur 3 · Compte, puis confirmation de l'e-mail et profil</span>
            <h1>Créer un compte</h1>
            <p>Complétez le formulaire pour activer votre espace FamilyBalance.</p>
          </header>

          <div class="fb-alert fb-alert--error" role="alert" *ngIf="errorMessage()">
            <mat-icon>error_outline</mat-icon><span>{{ errorMessage() }}</span>
          </div>
          <div class="fb-alert fb-alert--success" role="status" *ngIf="successMessage()">
            <mat-icon>check_circle</mat-icon><span>{{ successMessage() }}</span>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form" novalidate>
            <fieldset class="reg-section">
              <legend>Type de compte</legend>
              <div class="role-picker" role="radiogroup" aria-label="Type de compte">
                <button
                  *ngFor="let option of roleOptions"
                  type="button"
                  role="radio"
                  class="role-option"
                  [class.active]="currentRole() === option.value"
                  [attr.aria-checked]="currentRole() === option.value"
                  (click)="setRole(option.value)"
                >
                  <mat-icon>{{ option.icon }}</mat-icon>
                  <span><strong>{{ option.label }}</strong><small>{{ option.hint }}</small></span>
                </button>
              </div>
              <p class="auth-hint">
                Vous êtes adolescent ? Un compte ne peut pas être créé ici : demandez à votre parent
                de vous ajouter depuis son tableau de bord (« Ajouter un enfant »).
              </p>
            </fieldset>

            <fieldset class="reg-section">
              <legend>Informations personnelles</legend>
              <div class="auth-row">
                <div class="auth-field">
                  <label class="auth-label" for="firstName">Prénom</label>
                  <div class="auth-control" [class.invalid]="form.get('firstName')?.invalid && form.get('firstName')?.touched">
                    <input id="firstName" formControlName="firstName" placeholder="Votre prénom" autocomplete="given-name" />
                  </div>
                </div>
                <div class="auth-field">
                  <label class="auth-label" for="lastName">Nom</label>
                  <div class="auth-control" [class.invalid]="form.get('lastName')?.invalid && form.get('lastName')?.touched">
                    <input id="lastName" formControlName="lastName" placeholder="Votre nom" autocomplete="family-name" />
                  </div>
                </div>
              </div>

              <div class="auth-row">
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
                <label class="auth-label" for="phone"><span>Téléphone<span class="auth-optional">facultatif</span></span></label>
                <div class="auth-control">
                  <mat-icon>call</mat-icon>
                  <input id="phone" formControlName="phone" placeholder="+33 6 12 34 56 78" autocomplete="tel" />
                </div>
              </div>
              </div>
            </fieldset>

            <fieldset class="reg-section">
              <legend>Sécurité</legend>
              <div class="auth-row">
                <div class="auth-field">
                  <label class="auth-label" for="password">Mot de passe</label>
                  <div class="auth-control" [class.invalid]="form.get('password')?.invalid && form.get('password')?.touched">
                    <input
                      id="password"
                      [type]="showPwd() ? 'text' : 'password'"
                      formControlName="password"
                      placeholder="10 caractères minimum"
                      autocomplete="new-password"
                    />
                    <button
                      type="button"
                      class="auth-toggle"
                      (click)="showPwd.set(!showPwd())"
                      [attr.aria-label]="showPwd() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                    >
                      <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                  </div>
                  <span class="auth-error" *ngIf="form.get('password')?.hasError('minlength') && form.get('password')?.touched">
                    10 caractères minimum.
                  </span>
                  <div class="auth-strength" *ngIf="form.get('password')?.value">
                    <div class="auth-strength-track">
                      <div class="auth-strength-fill" [style.width.%]="pwdStrength()" [attr.data-level]="pwdLevel()"></div>
                    </div>
                    <span class="auth-strength-label" [attr.data-level]="pwdLevel()">{{ pwdLabel() }}</span>
                  </div>
                </div>

                <div class="auth-field">
                  <label class="auth-label" for="confirmPassword">Confirmer le mot de passe</label>
                  <div class="auth-control" [class.invalid]="passwordMismatch() && form.get('confirmPassword')?.touched">
                    <input
                      id="confirmPassword"
                      [type]="showConfirm() ? 'text' : 'password'"
                      formControlName="confirmPassword"
                      placeholder="Répétez le mot de passe"
                      autocomplete="new-password"
                    />
                    <button
                      type="button"
                      class="auth-toggle"
                      (click)="showConfirm.set(!showConfirm())"
                      [attr.aria-label]="showConfirm() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                    >
                      <mat-icon>{{ showConfirm() ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                  </div>
                  <span class="auth-error" *ngIf="passwordMismatch()">Les mots de passe ne correspondent pas.</span>
                </div>
              </div>
            </fieldset>

            <fieldset class="reg-section reg-section--conditional" *ngIf="isSpecialist()">
              <legend>Profil spécialiste</legend>
              <div class="auth-row">
                <div class="auth-field">
                  <label class="auth-label" for="specialization">Spécialisation</label>
                  <div class="auth-control" [class.invalid]="form.get('specialization')?.invalid && form.get('specialization')?.touched">
                    <input id="specialization" formControlName="specialization" placeholder="Ex : psychiatrie infantile" />
                  </div>
                </div>
                <div class="auth-field">
                  <label class="auth-label" for="licenseNumber">N° de licence</label>
                  <div class="auth-control" [class.invalid]="form.get('licenseNumber')?.invalid && form.get('licenseNumber')?.touched">
                    <input id="licenseNumber" formControlName="licenseNumber" placeholder="RPPS / Ordre…" />
                  </div>
                </div>
              </div>
              <div class="auth-row">
                <div class="auth-field">
                  <label class="auth-label" for="city"><span>Ville<span class="auth-optional">facultatif</span></span></label>
                  <div class="auth-control">
                    <input id="city" formControlName="city" placeholder="Paris, Lyon…" />
                  </div>
                </div>
                <div class="auth-field">
                  <label class="auth-label" for="tariff"><span>Tarif (€)<span class="auth-optional">facultatif</span></span></label>
                  <div class="auth-control">
                    <mat-icon>euro</mat-icon>
                    <input id="tariff" type="number" formControlName="tariff" placeholder="60" />
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset class="reg-section reg-section--conditional" *ngIf="isAdmin()">
              <legend>Accès administrateur</legend>
              <div class="auth-field">
                <label class="auth-label" for="adminRegistrationKey">Clé d'inscription administrateur</label>
                <div class="auth-control" [class.invalid]="form.get('adminRegistrationKey')?.invalid && form.get('adminRegistrationKey')?.touched">
                  <mat-icon>key</mat-icon>
                  <input
                    id="adminRegistrationKey"
                    type="password"
                    formControlName="adminRegistrationKey"
                    placeholder="Clé secrète fournie par l'équipe"
                    autocomplete="off"
                  />
                </div>
              </div>
            </fieldset>

            <button
              type="submit"
              class="fb-btn fb-btn--block auth-submit"
              [disabled]="form.invalid || loading() || passwordMismatch()"
            >
              <ng-container *ngIf="!loading(); else busy">
                Créer mon compte
                <mat-icon>arrow_forward</mat-icon>
              </ng-container>
              <ng-template #busy>
                <span class="fb-spinner" aria-hidden="true"></span>
                Inscription en cours…
              </ng-template>
            </button>
          </form>

          <p class="auth-alt">
            Déjà inscrit ?
            <a routerLink="/auth/login">Se connecter</a>
          </p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .step-note {
      display: inline-block;
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--fb-accent-strong);
    }

    .fb-alert { margin-bottom: 14px; }

    .reg-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;
      margin: 0;
      padding: 14px 16px 16px;
      border: none;
      border-radius: var(--fb-radius-md);
      background: var(--fb-surface);
      box-shadow: var(--fb-elev-1);
    }

    .reg-section--conditional {
      background: var(--fb-surface-alt);
      box-shadow: none;
      animation: slideDown 0.25s var(--fb-ease);
    }

    .reg-section legend {
      float: left;
      width: 100%;
      padding: 0;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--fb-muted);
    }

    .role-picker {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .role-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border: 1.5px solid var(--fb-border);
      border-radius: 12px;
      background: var(--fb-surface);
      color: var(--fb-text);
      text-align: left;
      cursor: pointer;
    }

    .role-option:hover { border-color: var(--fb-border-strong); }
    .role-option mat-icon { flex-shrink: 0; color: var(--fb-faint); }
    .role-option strong { display: block; font-size: 13.5px; }
    .role-option small { display: block; font-size: 11.5px; line-height: 1.25; color: var(--fb-muted); }
    .reg-section > .auth-hint { margin: 0; font-size: 12px; line-height: 1.45; }

    .role-option.active {
      border-color: var(--fb-primary);
      background: var(--fb-primary-soft);
      box-shadow: 0 0 0 3px rgba(var(--fb-primary-rgb), 0.1);
    }

    .role-option.active mat-icon { color: var(--fb-primary); }

    @media (max-width: 600px) {
      .role-picker { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
      .role-option { flex-direction: column; justify-content: center; gap: 4px; padding: 10px 6px; text-align: center; }
      .role-option small { display: none; }
      .reg-section { padding: 12px 14px 14px; }
    }
  `],
})
export class RegisterPage {
  readonly loading     = signal(false);
  readonly errorMessage   = signal('');
  readonly successMessage = signal('');
  readonly showPwd     = signal(false);
  readonly showConfirm = signal(false);

  readonly roleOptions = [
    { value: 'parent', label: 'Parent', hint: 'Accompagner mes enfants', icon: 'family_restroom' },
    { value: 'specialist', label: 'Spécialiste', hint: 'Psychiatre, psychologue', icon: 'medical_services' },
    { value: 'admin', label: 'Admin', hint: 'Gérer la plateforme', icon: 'admin_panel_settings' },
  ];

  readonly form = this.fb.group({
    firstName:           ['', [Validators.required]],
    lastName:            ['', [Validators.required]],
    email:               ['', [Validators.required, Validators.email]],
    password:            ['', [Validators.required, Validators.minLength(10)]],
    confirmPassword:     ['', [Validators.required]],
    phone:               [''],
    role:                ['parent', [Validators.required]],
    specialization:      [''],
    licenseNumber:       [''],
    city:                [''],
    tariff:              [''],
    adminRegistrationKey:[''],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
  ) {
    this.form.get('role')?.valueChanges.subscribe(() => this.applyConditionalValidation());
    this.applyConditionalValidation();
  }

  currentRole(): string { return this.form.get('role')?.value || 'parent'; }

  setRole(role: string): void {
    this.form.get('role')?.setValue(role);
  }

  isSpecialist(): boolean { return this.currentRole() === 'specialist'; }
  isAdmin():      boolean { return this.currentRole() === 'admin'; }

  /* ── Password strength ─────────────── */
  pwdStrength(): number {
    const v = this.form.get('password')?.value || '';
    if (!v) return 0;
    let score = 0;
    if (v.length >= 10) score += 30;
    if (v.length >= 14) score += 20;
    if (/[A-Z]/.test(v)) score += 15;
    if (/[0-9]/.test(v)) score += 15;
    if (/[^A-Za-z0-9]/.test(v)) score += 20;
    return Math.min(score, 100);
  }

  pwdLevel(): string {
    const s = this.pwdStrength();
    if (s < 40) return 'weak';
    if (s < 75) return 'medium';
    return 'strong';
  }

  pwdLabel(): string {
    const map: Record<string, string> = { weak: 'Faible', medium: 'Moyen', strong: 'Fort' };
    return map[this.pwdLevel()] || '';
  }

  passwordMismatch(): boolean {
    const p = this.form.get('password')?.value || '';
    const c = this.form.get('confirmPassword')?.value || '';
    return !!c && p !== c;
  }

  submit(): void {
    if (this.form.invalid || this.passwordMismatch()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const payload: RegisterPayload = {
      firstName:       v.firstName       || '',
      lastName:        v.lastName        || '',
      email:           v.email           || '',
      password:        v.password        || '',
      confirmPassword: v.confirmPassword || '',
      phone:           v.phone           || undefined,
      role:            v.role as RegisterPayload['role'],
    };

    if (v.role === 'specialist') payload.specialistProfile = { specialization: v.specialization || '', licenseNumber: v.licenseNumber || '', city: v.city || undefined, tariff: v.tariff ? Number(v.tariff) : undefined };
    if (v.role === 'admin')      payload.adminRegistrationKey = v.adminRegistrationKey || '';

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.register(payload).subscribe({
      next: (r) => {
        this.loading.set(false);
        this.successMessage.set(r.message || 'Compte créé. Vérifiez votre e-mail pour confirmer votre inscription.');
        this.form.reset({ firstName:'', lastName:'', email:'', password:'', confirmPassword:'', phone:'', role:'parent', specialization:'', licenseNumber:'', city:'', tariff:'', adminRegistrationKey:'' });
        this.applyConditionalValidation();
      },
      error: (e) => { this.loading.set(false); this.errorMessage.set(e?.error?.message || 'Inscription impossible.'); },
    });
  }

  private applyConditionalValidation(): void {
    const role = this.currentRole();
    this.sv('specialization',      role === 'specialist' ? [Validators.required] : []);
    this.sv('licenseNumber',       role === 'specialist' ? [Validators.required] : []);
    this.sv('adminRegistrationKey',role === 'admin'      ? [Validators.required] : []);
  }

  private sv(name: string, validators: any[]): void {
    const c = this.form.get(name);
    if (!c) return;
    c.setValidators(validators);
    c.updateValueAndValidity({ emitEvent: false });
  }
}