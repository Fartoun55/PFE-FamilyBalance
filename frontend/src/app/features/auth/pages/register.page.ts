import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterPayload } from '../../../core/models/auth.models';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-root">

      <!-- ── Left panel — branding ─────────────────── -->
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
            <h2>Rejoignez la communauté FamilyBalance</h2>
            <p>Créez votre espace en quelques minutes et commencez à accompagner votre famille vers un équilibre numérique sain.</p>

            <div class="role-cards">
              <div class="role-card" [class.selected]="currentRole() === 'parent'" (click)="setRole('parent')">
                <div class="rc-icon parent">
                  <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                    <path d="M10 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-7 14a7 7 0 0 1 14 0"/>
                  </svg>
                </div>
                <div>
                  <strong>Parent</strong>
                  <span>Accompagner mes enfants</span>
                </div>
                <div class="rc-check" *ngIf="currentRole() === 'parent'">✓</div>
              </div>
              <div class="role-card" [class.selected]="currentRole() === 'specialist'" (click)="setRole('specialist')">
                <div class="rc-icon specialist">
                  <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                    <path d="M10 2l1.5 3.5H15l-2.7 2 1 3.3L10 9 6.7 10.8l1-3.3L5 5.5h3.5z"/>
                    <path d="M4 16a6 6 0 0 1 12 0"/>
                  </svg>
                </div>
                <div>
                  <strong>Spécialiste</strong>
                  <span>Psychiatre / Psychologue</span>
                </div>
                <div class="rc-check" *ngIf="currentRole() === 'specialist'">✓</div>
              </div>
            </div>
          </div>

          <div class="brand-footer">
            <div class="trust-badge">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L4 3v4c0 3.3 2 5.9 4 7 2-1.1 4-3.7 4-7V3L8 1z" stroke="currentColor" stroke-width="1.2"/>
              </svg>
              RGPD · HDS · Chiffrement AES-256
            </div>
          </div>
        </div>
      </aside>

      <!-- ── Right panel — form ─────────────────────── -->
      <main class="form-panel">
        <div class="form-scroll">
          <div class="form-container">

            <!-- Header -->
            <div class="form-header">
              <div class="step-row">
                <div class="step active">
                  <span class="step-num">1</span>
                  <span class="step-label">Compte</span>
                </div>
                <div class="step-line"></div>
                <div class="step">
                  <span class="step-num">2</span>
                  <span class="step-label">Confirmation</span>
                </div>
                <div class="step-line"></div>
                <div class="step">
                  <span class="step-num">3</span>
                  <span class="step-label">Profil</span>
                </div>
              </div>
              <h1>Créer un compte</h1>
              <p>Complétez le formulaire pour activer votre espace FamilyBalance.</p>
            </div>

            <!-- Alerts -->
            <div class="alert error" *ngIf="errorMessage()">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/>
                <path d="M8 5v3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="8" cy="11" r=".8" fill="currentColor"/>
              </svg>
              {{ errorMessage() }}
            </div>
            <div class="alert error" *ngIf="passwordMismatch()">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/>
                <path d="M8 5v3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="8" cy="11" r=".8" fill="currentColor"/>
              </svg>
              Les mots de passe ne correspondent pas.
            </div>
            <div class="alert success" *ngIf="successMessage()">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/>
                <path d="M5 8l2.5 2.5L11 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
              {{ successMessage() }}
            </div>

            <!-- Form -->
            <form [formGroup]="form" (ngSubmit)="submit()" class="reg-form" novalidate>

              <!-- Section: Informations personnelles -->
              <div class="form-section">
                <div class="section-label">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM2 15a6 6 0 0 1 12 0"
                          stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                  </svg>
                  Informations personnelles
                </div>

                <div class="f-row">
                  <div class="f-group">
                    <label>Prénom <span class="req">*</span></label>
                    <div class="f-wrap" [class.invalid]="form.get('firstName')?.invalid && form.get('firstName')?.touched">
                      <input class="f-input" formControlName="firstName" placeholder="Votre prénom"/>
                    </div>
                  </div>
                  <div class="f-group">
                    <label>Nom <span class="req">*</span></label>
                    <div class="f-wrap" [class.invalid]="form.get('lastName')?.invalid && form.get('lastName')?.touched">
                      <input class="f-input" formControlName="lastName" placeholder="Votre nom"/>
                    </div>
                  </div>
                </div>

                <div class="f-group">
                  <label>Adresse e-mail <span class="req">*</span></label>
                  <div class="f-wrap" [class.invalid]="form.get('email')?.invalid && form.get('email')?.touched">
                    <svg class="f-icon" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.3"/>
                      <path d="M1 6l7 4 7-4" stroke="currentColor" stroke-width="1.3"/>
                    </svg>
                    <input class="f-input" type="email" formControlName="email" placeholder="vous@example.com"/>
                  </div>
                  <span class="f-hint" *ngIf="form.get('email')?.hasError('email') && form.get('email')?.touched">
                    Format d'adresse invalide
                  </span>
                </div>

                <div class="f-group">
                  <label>Téléphone <span class="optional">optionnel</span></label>
                  <div class="f-wrap">
                    <svg class="f-icon" viewBox="0 0 16 16" fill="none">
                      <path d="M3 2h3l1.5 3.5-2 1.2a8.5 8.5 0 0 0 3.8 3.8l1.2-2L14 10v3a1 1 0 0 1-1 1A12 12 0 0 1 2 3a1 1 0 0 1 1-1z"
                            stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <input class="f-input" formControlName="phone" placeholder="+33 6 12 34 56 78"/>
                  </div>
                </div>
              </div>

              <!-- Section: Mot de passe -->
              <div class="form-section">
                <div class="section-label">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
                    <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                    <circle cx="8" cy="10.5" r="1" fill="currentColor"/>
                  </svg>
                  Sécurité
                </div>

                <div class="f-row">
                  <div class="f-group">
                    <label>Mot de passe <span class="req">*</span></label>
                    <div class="f-wrap" [class.invalid]="form.get('password')?.invalid && form.get('password')?.touched">
                      <svg class="f-icon" viewBox="0 0 16 16" fill="none">
                        <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
                        <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                      </svg>
                      <input class="f-input" [type]="showPwd() ? 'text' : 'password'" formControlName="password" placeholder="10 caractères minimum"/>
                      <button type="button" class="eye-btn" (click)="showPwd.set(!showPwd())">
                        <svg *ngIf="!showPwd()" width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z" stroke="currentColor" stroke-width="1.3"/>
                          <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/>
                        </svg>
                        <svg *ngIf="showPwd()" width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M2 2L14 14M6.5 6.7A2 2 0 0 0 9.3 9.5M4 4.5C2.5 5.6 1 8 1 8S3.5 13 8 13c1.3 0 2.5-.4 3.5-1M7 3.1C7.3 3 7.7 3 8 3c4.5 0 7 5 7 5s-.8 1.7-2.2 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                        </svg>
                      </button>
                    </div>
                    <span class="f-hint" *ngIf="form.get('password')?.hasError('minlength') && form.get('password')?.touched">
                      Minimum 10 caractères
                    </span>
                    <!-- Strength bar -->
                    <div class="pwd-strength" *ngIf="form.get('password')?.value">
                      <div class="strength-bar">
                        <div class="strength-fill" [style.width.%]="pwdStrength()" [attr.data-level]="pwdLevel()"></div>
                      </div>
                      <span class="strength-label" [attr.data-level]="pwdLevel()">{{ pwdLabel() }}</span>
                    </div>
                  </div>

                  <div class="f-group">
                    <label>Confirmer le mot de passe <span class="req">*</span></label>
                    <div class="f-wrap" [class.invalid]="passwordMismatch() && form.get('confirmPassword')?.touched">
                      <svg class="f-icon" viewBox="0 0 16 16" fill="none">
                        <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
                        <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                      </svg>
                      <input class="f-input" [type]="showConfirm() ? 'text' : 'password'" formControlName="confirmPassword" placeholder="Répétez le mot de passe"/>
                      <button type="button" class="eye-btn" (click)="showConfirm.set(!showConfirm())">
                        <svg *ngIf="!showConfirm()" width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z" stroke="currentColor" stroke-width="1.3"/>
                          <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/>
                        </svg>
                        <svg *ngIf="showConfirm()" width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M2 2L14 14M6.5 6.7A2 2 0 0 0 9.3 9.5M4 4.5C2.5 5.6 1 8 1 8S3.5 13 8 13c1.3 0 2.5-.4 3.5-1M7 3.1C7.3 3 7.7 3 8 3c4.5 0 7 5 7 5s-.8 1.7-2.2 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Section: Rôle -->
              <div class="form-section">
                <div class="section-label">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="2" width="5" height="5" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
                    <rect x="9" y="2" width="5" height="5" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
                    <rect x="2" y="9" width="5" height="5" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
                    <rect x="9" y="9" width="5" height="5" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
                  </svg>
                  Type de compte
                </div>

                <div class="role-selector">
                  <button type="button" class="rs-btn" [class.active]="currentRole() === 'parent'"      (click)="setRole('parent')">
                    <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5"><path d="M10 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-7 14a7 7 0 0 1 14 0"/></svg>
                    Parent
                  </button>
                  <button type="button" class="rs-btn" [class.active]="currentRole() === 'specialist'"  (click)="setRole('specialist')">
                    <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5"><path d="M10 2l1.5 3.5H15l-2.7 2 1 3.3L10 9 6.7 10.8l1-3.3L5 5.5h3.5z"/><path d="M4 16a6 6 0 0 1 12 0"/></svg>
                    Spécialiste
                  </button>
                  <button type="button" class="rs-btn" [class.active]="currentRole() === 'admin'"       (click)="setRole('admin')">
                    <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5"><path d="M10 2L4 5v5c0 4 2.7 7.7 6 9 3.3-1.3 6-5 6-9V5L10 2z"/><path d="M7 10l2 2 4-4"/></svg>
                    Admin
                  </button>
                </div>
                <p class="role-hint">
                  Vous êtes adolescent ? Un compte ne peut pas être créé ici : demandez à votre parent de
                  l'ajouter depuis son tableau de bord (« Ajouter un enfant »).
                </p>
              </div>

              <!-- Section conditionnelle: Admin -->
              <div class="form-section conditional" *ngIf="isAdmin()">
                <div class="section-label warning">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2L4 5v4c0 3 1.7 5.5 4 6.5 2.3-1 4-3.5 4-6.5V5L8 2z" stroke="currentColor" stroke-width="1.3"/>
                  </svg>
                  Accès administrateur
                </div>
                <div class="f-group">
                  <label>Clé d'inscription admin <span class="req">*</span></label>
                  <div class="f-wrap" [class.invalid]="form.get('adminRegistrationKey')?.invalid && form.get('adminRegistrationKey')?.touched">
                    <svg class="f-icon" viewBox="0 0 16 16" fill="none">
                      <path d="M7 10a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm4-1l4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                    </svg>
                    <input class="f-input" type="password" formControlName="adminRegistrationKey" placeholder="Clé secrète fournie par l'équipe"/>
                  </div>
                </div>
              </div>

              <!-- Section conditionnelle: Spécialiste -->
              <div class="form-section conditional" *ngIf="isSpecialist()">
                <div class="section-label green">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1L4 3.5v4c0 2.8 1.7 5.2 4 6 2.3-.8 4-3.2 4-6v-4L8 1z" stroke="currentColor" stroke-width="1.3"/>
                    <path d="M6 8l1.5 1.5L10 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                  </svg>
                  Profil spécialiste
                </div>
                <div class="f-row">
                  <div class="f-group">
                    <label>Spécialisation <span class="req">*</span></label>
                    <div class="f-wrap" [class.invalid]="form.get('specialization')?.invalid && form.get('specialization')?.touched">
                      <input class="f-input" formControlName="specialization" placeholder="Ex : Psychiatrie infantile"/>
                    </div>
                  </div>
                  <div class="f-group">
                    <label>N° de licence <span class="req">*</span></label>
                    <div class="f-wrap" [class.invalid]="form.get('licenseNumber')?.invalid && form.get('licenseNumber')?.touched">
                      <input class="f-input" formControlName="licenseNumber" placeholder="RPPS / Ordre…"/>
                    </div>
                  </div>
                </div>
                <div class="f-row">
                  <div class="f-group">
                    <label>Ville <span class="optional">optionnel</span></label>
                    <div class="f-wrap">
                      <input class="f-input" formControlName="city" placeholder="Paris, Lyon…"/>
                    </div>
                  </div>
                  <div class="f-group">
                    <label>Tarif (€) <span class="optional">optionnel</span></label>
                    <div class="f-wrap">
                      <svg class="f-icon" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/>
                        <path d="M8 4v8M6 6h3a2 2 0 0 1 0 4H6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                      </svg>
                      <input class="f-input" type="number" formControlName="tariff" placeholder="60"/>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Submit -->
              <button
                type="submit"
                class="btn-submit"
                [class.loading]="loading()"
                [disabled]="form.invalid || loading() || passwordMismatch()"
              >
                <span class="btn-inner" *ngIf="!loading()">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM2 15a6 6 0 0 1 6-6" stroke="white" stroke-width="1.3" stroke-linecap="round"/>
                    <path d="M11 11l4 4M13 11h2v2" stroke="white" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Créer mon compte
                </span>
                <span class="btn-inner" *ngIf="loading()">
                  <span class="spinner"></span>
                  Inscription en cours…
                </span>
              </button>

            </form>

            <!-- Footer link -->
            <p class="login-cta">
              Déjà inscrit ?
              <a routerLink="/auth/login">Se connecter →</a>
            </p>

          </div>
        </div>
      </main>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      --navy: var(--fb-primary-strong);
      --navy2: var(--fb-primary-strong);
      --blue: var(--fb-primary);
      --blue2: var(--fb-primary);
      --surface: var(--fb-bg);
      --card: var(--fb-surface-strong);
      --border: var(--fb-border);
      --text: var(--fb-text);
      --muted: var(--fb-muted);
      --faint: #a89f92;
      --green: var(--fb-success);
      --red: var(--fb-danger);
      --purple: #8b6bb0;
      --amber: var(--fb-warning);
      --r: 16px;
      --r-sm: 12px;
    }

    /* ── Root ──────────────────────────── */
    .auth-root {
      display: flex;
      min-height: 100vh;
      background: var(--surface);
    }

    /* ── Brand panel ───────────────────── */
    .brand-panel {
      width: 380px;
      flex-shrink: 0;
      background:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 400'%3E%3Ccircle cx='700' cy='70' r='120' fill='none' stroke='rgba(255,255,255,0.20)' stroke-width='2'/%3E%3Ccircle cx='630' cy='330' r='60' fill='rgba(255,255,255,0.14)'/%3E%3Ccircle cx='50' cy='50' r='34' fill='rgba(255,255,255,0.11)'/%3E%3Cpath d='M-20,250 C140,190 260,310 420,250 C580,190 700,310 860,250' fill='none' stroke='rgba(255,255,255,0.22)' stroke-width='3'/%3E%3Cpath d='M-20,300 C140,250 260,350 420,300 C580,250 700,350 860,300' fill='none' stroke='rgba(255,255,255,0.14)' stroke-width='3'/%3E%3C/svg%3E") center/cover no-repeat,
        linear-gradient(155deg, var(--fb-primary-strong) 0%, var(--fb-primary) 100%);
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: hidden;
    }
    .brand-panel::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 15% 85%, rgba(255,255,255,.05) 0%, transparent 45%),
        radial-gradient(circle at 85% 20%, rgba(255,255,255,.04) 0%, transparent 40%);
    }
    .brand-content {
      position: relative; z-index: 1;
      padding: 2.5rem 2.4rem;
      display: flex; flex-direction: column;
      height: 100%;
    }
    .brand-emblem { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 2rem; }
    .emblem-svg { width: 100px; height: 110px; }
    .emblem-wordmark { margin-top: .55rem; font-family: Georgia, 'Times New Roman', serif; font-weight: 700; font-size: 1.25rem; letter-spacing: -.01em; }
    .emblem-family { color: #ffffff; }
    .emblem-balance { color: #c9a15c; }
    .emblem-tagline {
      margin-top: .35rem; display: flex; align-items: center; gap: .55rem;
      font-size: .64rem; font-weight: 600; letter-spacing: .13em; text-transform: uppercase;
      color: rgba(255,255,255,.75);
    }
    .emblem-tagline span { width: 16px; height: 1px; background: #c9a15c; display: inline-block; }
    .brand-body { flex: 1; }
    .brand-body h2 {
      font-size: 1.55rem; font-weight: 700;
      color: #fff; line-height: 1.25;
      letter-spacing: -.03em; margin: 0 0 .9rem;
    }
    .brand-body p { font-size: .88rem; color: rgba(255,255,255,.65); line-height: 1.65; margin: 0 0 1.8rem; }

    /* Role cards */
    .role-cards { display: flex; flex-direction: column; gap: 8px; }
    .role-card {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px;
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 10px;
      cursor: pointer;
      transition: all .15s;
    }
    .role-card:hover { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.2); }
    .role-card.selected { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.3); }
    .rc-icon {
      width: 32px; height: 32px; border-radius: 8px;
      display: grid; place-items: center; flex-shrink: 0;
    }
    .rc-icon svg { width: 16px; height: 16px; fill: none; }
    .rc-icon.parent { background: rgba(255,255,255,.2); }
    .rc-icon.parent svg { stroke: #7dd3c8; }
    .rc-icon.ado { background: rgba(168,85,247,.25); }
    .rc-icon.ado svg { stroke: #c4b5fd; }
    .rc-icon.specialist { background: rgba(52,211,153,.25); }
    .rc-icon.specialist svg { stroke: #6ee7b7; }
    .role-card strong { display: block; font-size: 12px; color: rgba(255,255,255,.9); font-family: inherit; }
    .role-card span { font-size: 10px; color: rgba(255,255,255,.5); }
    .rc-check {
      margin-left: auto;
      width: 18px; height: 18px;
      background: rgba(255,255,255,.2);
      border-radius: 50%;
      display: grid; place-items: center;
      font-size: 10px; color: #fff;
      flex-shrink: 0;
    }

    .brand-footer { margin-top: 2rem; }
    .trust-badge {
      display: flex; align-items: center; gap: .45rem;
      font-size: .72rem; color: rgba(255,255,255,.4);
    }
    .trust-badge svg { stroke: rgba(255,255,255,.4); fill: none; }

    /* ── Form panel ────────────────────── */
    .form-panel { flex: 1; display: flex; justify-content: center; overflow-y: auto; }
    .form-scroll { width: 100%; padding: 2.5rem 2rem; }
    .form-container { max-width: 560px; margin: 0 auto; }

    /* Header */
    .form-header { margin-bottom: 1.8rem; }
    .step-row {
      display: flex; align-items: center;
      margin-bottom: 1.5rem;
    }
    .step { display: flex; align-items: center; gap: 7px; }
    .step-num {
      width: 24px; height: 24px; border-radius: 50%;
      display: grid; place-items: center;
      font-size: 11px; font-weight: 700;
      background: var(--surface);
      color: var(--faint);
      border: 1.5px solid var(--border);
    }
    .step.active .step-num { background: var(--navy); color: #fff; border-color: var(--navy); }
    .step-label { font-size: 11px; color: var(--faint); font-weight: 500; }
    .step.active .step-label { color: var(--navy); font-weight: 700; }
    .step-line { flex: 1; height: 1px; background: var(--border); margin: 0 10px; }
    .form-header h1 {
      font-size: 1.8rem; font-weight: 800;
      color: var(--text); letter-spacing: -.03em;
      margin: 0 0 .4rem; line-height: 1.1;
    }
    .form-header p { font-size: .9rem; color: var(--muted); margin: 0; }

    /* Alerts */
    .alert {
      display: flex; align-items: flex-start; gap: 9px;
      padding: 10px 14px; border-radius: var(--r-sm);
      font-size: 13px; line-height: 1.45; margin-bottom: 14px;
    }
    .alert svg { flex-shrink: 0; margin-top: 1px; }
    .alert.error { background: rgba(192,57,43,.07); border: 1px solid rgba(192,57,43,.22); color: var(--red); }
    .alert.success { background: rgba(21,127,69,.08); border: 1px solid rgba(21,127,69,.22); color: var(--green); }

    /* Form */
    .reg-form { display: flex; flex-direction: column; gap: 6px; }

    /* Sections */
    .form-section {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 16px 18px;
      display: flex; flex-direction: column; gap: 12px;
    }
    .form-section.conditional { border-style: dashed; }
    .section-label {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 700;
      color: var(--blue);
      text-transform: uppercase; letter-spacing: .06em;
    }
    .section-label svg { stroke: var(--blue); fill: none; }
    .section-label.warning { color: var(--amber); }
    .section-label.warning svg { stroke: var(--amber); }
    .section-label.purple { color: var(--purple); }
    .section-label.purple svg { stroke: var(--purple); }
    .section-label.green { color: var(--green); }
    .section-label.green svg { stroke: var(--green); }

    /* Fields */
    .f-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .f-group { display: flex; flex-direction: column; gap: 5px; }
    .f-group label {
      font-size: 12px; font-weight: 600; color: var(--muted);
      display: flex; align-items: center; gap: 5px;
    }
    .req { color: var(--red); font-size: 12px; }
    .optional {
      font-size: 10px; font-weight: 500; color: var(--faint);
      background: var(--surface); padding: 1px 6px; border-radius: 10px; margin-left: 4px;
    }
    .f-wrap {
      display: flex; align-items: center; gap: 6px;
      border: 1.5px solid var(--border);
      border-radius: var(--r-sm);
      background: var(--surface);
      padding: 0 10px;
      height: 42px;
      transition: border .15s, box-shadow .15s, background .15s;
    }
    .f-wrap:focus-within {
      border-color: var(--blue);
      box-shadow: 0 0 0 3px rgba(var(--fb-primary-rgb),.1);
      background: #fff;
    }
    .f-wrap.invalid { border-color: var(--red); box-shadow: 0 0 0 3px rgba(192,57,43,.08); }
    .f-icon { width: 14px; height: 14px; stroke: var(--faint); fill: none; flex-shrink: 0; }
    .f-wrap:focus-within .f-icon { stroke: var(--blue); }
    .f-input {
      flex: 1; border: none; outline: none; background: transparent;
      font-size: 13px; color: var(--text); font-family: inherit; min-width: 0;
    }
    .f-input::placeholder { color: var(--faint); }
    .f-hint { font-size: 11px; color: var(--red); }
    .eye-btn {
      background: none; border: none; cursor: pointer;
      color: var(--faint); display: grid; place-items: center;
      padding: 2px; transition: color .15s;
    }
    .eye-btn:hover { color: var(--blue); }

    /* Password strength */
    .pwd-strength { display: flex; align-items: center; gap: 8px; }
    .strength-bar { flex: 1; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
    .strength-fill {
      height: 100%; border-radius: 2px; transition: width .3s, background .3s;
    }
    .strength-fill[data-level="weak"]   { background: var(--red); }
    .strength-fill[data-level="medium"] { background: var(--amber); }
    .strength-fill[data-level="strong"] { background: var(--green); }
    .strength-label { font-size: 10px; font-weight: 600; min-width: 44px; text-align: right; }
    .strength-label[data-level="weak"]   { color: var(--red); }
    .strength-label[data-level="medium"] { color: var(--amber); }
    .strength-label[data-level="strong"] { color: var(--green); }

    /* Role selector */
    .role-selector { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .role-hint { margin: 10px 0 0; font-size: 12px; line-height: 1.5; color: var(--muted); }
    .rs-btn {
      display: flex; flex-direction: column; align-items: center; gap: 5px;
      padding: 10px 6px;
      border: 1.5px solid var(--border);
      border-radius: var(--r-sm);
      background: var(--surface);
      font-size: 11px; font-weight: 600; color: var(--muted);
      cursor: pointer; font-family: inherit;
      transition: all .15s;
    }
    .rs-btn svg { width: 18px; height: 18px; fill: none; stroke-width: 1.5; stroke: var(--faint); }
    .rs-btn:hover { border-color: var(--blue); color: var(--blue); }
    .rs-btn:hover svg { stroke: var(--blue); }
    .rs-btn.active { background: var(--fb-primary-soft); border-color: var(--blue); color: var(--blue); }
    .rs-btn.active svg { stroke: var(--blue); }

    /* Checkbox */
    .checkbox-label {
      display: flex; align-items: flex-start; gap: 8px;
      font-size: 12px; color: var(--muted); cursor: pointer;
      line-height: 1.4;
    }
    .f-checkbox { width: 15px; height: 15px; flex-shrink: 0; margin-top: 1px; cursor: pointer; accent-color: var(--blue); }

    /* Submit */
    .btn-submit {
      height: 48px;
      background: linear-gradient(135deg, var(--blue) 0%, var(--navy) 100%);
      color: #fff; border: none;
      border-radius: 12px;
      font-size: 0.95rem; font-weight: 700;
      font-family: inherit; cursor: pointer;
      box-shadow: 0 4px 16px rgba(var(--fb-primary-rgb),.35);
      transition: opacity .2s, transform .15s, box-shadow .2s;
      margin-top: 8px;
      display: flex; align-items: center; justify-content: center;
    }
    .btn-submit:hover:not(:disabled) {
      opacity: .92; transform: translateY(-1px);
      box-shadow: 0 6px 22px rgba(var(--fb-primary-rgb),.45);
    }
    .btn-submit:active:not(:disabled) { transform: translateY(0); }
    .btn-submit:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }
    .btn-inner { display: flex; align-items: center; gap: 8px; }
    .spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .login-cta {
      text-align: center;
      font-size: .87rem; color: var(--muted);
      margin-top: 1.2rem;
    }
    .login-cta a { color: var(--blue); font-weight: 600; text-decoration: none; transition: color .15s; }
    .login-cta a:hover { color: var(--navy); }

    /* ── Responsive ────────────────────── */
    @media (max-width: 768px) {
      .brand-panel { display: none; }
      .form-scroll { padding: 1.5rem 1.25rem; }
    }
    @media (max-width: 480px) {
      .f-row { grid-template-columns: 1fr; }
      .role-selector { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class RegisterPage {
  readonly loading     = signal(false);
  readonly errorMessage   = signal('');
  readonly successMessage = signal('');
  readonly showPwd     = signal(false);
  readonly showConfirm = signal(false);

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