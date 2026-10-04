import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LinkedAdolescentProfile } from '../../../core/models/auth.models';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-root">

      <!-- ── Sidebar nav ─────────────────────────── -->
      <nav class="sidebar">
        <div class="s-logo">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="15" stroke="white" stroke-width="1.5" stroke-opacity=".4"/>
            <path d="M8 16C8 10 16 6 16 16C16 22 24 18 24 16"
                  stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
            <circle cx="10" cy="20" r="2.5" fill="white" fill-opacity=".9"/>
            <circle cx="22" cy="12" r="2.5" fill="white" fill-opacity=".9"/>
          </svg>
        </div>

        <button class="nav-btn active" title="Profil">
          <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
            <path d="M10 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-7 14a7 7 0 0 1 14 0"/>
          </svg>
        </button>
        <button class="nav-btn" title="Survey" (click)="goToSurveyModule()">
          <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
            <path d="M4 5h12M4 9h8M4 13h10M4 17h6"/>
          </svg>
        </button>
        <button class="nav-btn" title="Scoring" (click)="goToScoringModule()">
          <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
            <path d="M3 17V9M7 17V5M11 17v-7M15 17V3"/>
          </svg>
        </button>
      </nav>

      <!-- ── Main ───────────────────────────────── -->
      <main class="main">

        <!-- Topbar -->
        <header class="topbar">
          <div class="breadcrumb">
            <span class="bc-root">FamilyBalance</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            <span class="bc-current">Mon profil</span>
          </div>
          <div class="top-right">
            <span class="role-chip" [attr.data-role]="user()?.role">{{ user()?.role || '…' }}</span>
            <button class="home-btn" type="button" (click)="goBack()">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M2 8l6-5.5L14 8M4 6.5V13a1 1 0 0 0 1 1h2.5v-4h1v4H11a1 1 0 0 0 1-1V6.5"
                      stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Accueil
            </button>
            <button class="logout-btn" type="button" (click)="logout()">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M10 11l4-3-4-3M14 8H6"
                      stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Déconnexion
            </button>
          </div>
        </header>

        <!-- Content -->
        <div class="content">

          <!-- Loading state -->
          <div class="loading-screen" *ngIf="loading()">
            <div class="loader"></div>
            <p>Chargement du profil…</p>
          </div>

          <ng-container *ngIf="!loading()">

            <!-- Error banner -->
            <div class="alert error" *ngIf="errorMessage()">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/>
                <path d="M8 5v3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="8" cy="11" r=".8" fill="currentColor"/>
              </svg>
              {{ errorMessage() }}
            </div>

            <!-- Two-column layout -->
            <div class="profile-grid">

              <!-- Left: Profile card -->
              <div class="left-col">

                <!-- Hero card -->
                <div class="hero-card">
                  <div class="hero-bg"></div>
                  <div class="hero-body">
                    <div class="big-avatar" [attr.data-role]="user()?.role">
                      {{ initials() }}
                    </div>
                    <div class="hero-info">
                      <h1>{{ user()?.firstName }} {{ user()?.lastName }}</h1>
                      <p class="hero-email">{{ user()?.email }}</p>
                      <span class="role-badge" [attr.data-role]="user()?.role">
                        {{ roleLabel() }}
                      </span>
                    </div>
                  </div>

                  <div class="hero-stats">
                    <div class="stat">
                      <p>Statut</p>
                      <strong class="status-dot">
                        <span class="dot active"></span>
                        Actif
                      </strong>
                    </div>
                    <div class="stat-divider"></div>
                    <div class="stat">
                      <p>Téléphone</p>
                      <strong>{{ user()?.phone || '—' }}</strong>
                    </div>
                    <div class="stat-divider"></div>
                    <div class="stat">
                      <p>Rôle</p>
                      <strong>{{ roleLabel() }}</strong>
                    </div>
                  </div>
                </div>

                <!-- Quick actions -->
                <div class="actions-card">
                  <h3>Navigation rapide</h3>
                  <div class="action-list">

                    <button
                      class="action-item admin"
                      *ngIf="user()?.role === 'admin'"
                      (click)="goToAdminDashboard()"
                    >
                      <div class="action-icon">
                        <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                          <rect x="2" y="2" width="7" height="7" rx="2"/>
                          <rect x="11" y="2" width="7" height="7" rx="2"/>
                          <rect x="2" y="11" width="7" height="7" rx="2"/>
                          <rect x="11" y="11" width="7" height="7" rx="2"/>
                        </svg>
                      </div>
                      <div class="action-text">
                        <strong>Dashboard Admin</strong>
                        <span>Gérer les comptes utilisateurs</span>
                      </div>
                      <svg class="action-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                      </svg>
                    </button>

                    <button class="action-item survey" (click)="goToSurveyModule()">
                      <div class="action-icon">
                        <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                          <path d="M4 5h12M4 9h8M4 13h10M4 17h6"/>
                        </svg>
                      </div>
                      <div class="action-text">
                        <strong>Module Survey</strong>
                        <span>Évaluer le rapport aux écrans</span>
                      </div>
                      <svg class="action-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                      </svg>
                    </button>

                    <button class="action-item family" *ngIf="user()?.role === 'parent'" (click)="goToFamilyDashboard()">
                      <div class="action-icon">
                        <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                          <path d="M10 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 16a6 6 0 0 1 12 0"/>
                          <circle cx="4" cy="7" r="2"/>
                          <circle cx="16" cy="7" r="2"/>
                        </svg>
                      </div>
                      <div class="action-text">
                        <strong>Dashboard Famille</strong>
                        <span>Suivre les profils enfants rattachés</span>
                      </div>
                      <svg class="action-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                      </svg>
                    </button>

                    <button class="action-item family" *ngIf="user()?.role === 'adolescent'" (click)="goToAdolescentDashboard()">
                      <div class="action-icon">
                        <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                          <path d="M10 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM3 16a6 6 0 0 1 12 0"/>
                        </svg>
                      </div>
                      <div class="action-text">
                        <strong>Mon Espace Perso</strong>
                        <span>Voir mon suivi personnalisé</span>
                      </div>
                      <svg class="action-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                      </svg>
                    </button>

                    <button class="action-item education" (click)="goToEducationModule()">
                      <div class="action-icon">
                        <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                          <path d="M3 6l7-3 7 3-7 3-7-3z"/>
                          <path d="M5 9v5c0 1.5 2.2 3 5 3s5-1.5 5-3V9"/>
                        </svg>
                      </div>
                      <div class="action-text">
                        <strong>Espace Educatif</strong>
                        <span>Ressources, parcours et boîte parentale</span>
                      </div>
                      <svg class="action-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                      </svg>
                    </button>

                    <button class="action-item teleconsultation" (click)="goToTeleconsultationModule()">
                      <div class="action-icon">
                        <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                          <rect x="3" y="4" width="14" height="9" rx="2" />
                          <path d="M7 16l3-3 3 3" />
                        </svg>
                      </div>
                      <div class="action-text">
                        <strong>Teleconsultation</strong>
                        <span>Rendez-vous, visio et messagerie sécurisée</span>
                      </div>
                      <svg class="action-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                      </svg>
                    </button>

                    <button class="action-item scoring" (click)="goToScoringModule()">
                      <div class="action-icon">
                        <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                          <path d="M3 17V9M7 17V5M11 17v-7M15 17V3"/>
                        </svg>
                      </div>
                      <div class="action-text">
                        <strong>Résultats & Scoring</strong>
                        <span>Consulter les scores obtenus</span>
                      </div>
                      <svg class="action-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                      </svg>
                    </button>

                  </div>
                </div>

                <div class="children-card" *ngIf="user()?.role === 'parent'">
                  <div class="children-head">
                    <h3>Adolescents lies</h3>
                    <span>{{ filteredLinkedAdolescents().length }}</span>
                  </div>

                  <div class="children-search" *ngIf="linkedAdolescents().length">
                    <input
                      type="text"
                      class="children-search-input"
                      [value]="adolescentSearchTerm()"
                      (input)="adolescentSearchTerm.set($any($event.target).value)"
                      placeholder="Rechercher par nom ou e-mail"
                    />
                  </div>

                  <p class="children-note" *ngIf="loadingAdolescents()">Chargement des adolescents lies...</p>
                  <p class="children-note error" *ngIf="adolescentsError()">{{ adolescentsError() }}</p>
                  <p class="children-note" *ngIf="!loadingAdolescents() && !adolescentsError() && !linkedAdolescents().length">
                    Aucun adolescent n'est encore lie a ce compte parent.
                  </p>
                  <p class="children-note" *ngIf="!loadingAdolescents() && !adolescentsError() && linkedAdolescents().length && !filteredLinkedAdolescents().length">
                    Aucun resultat pour "{{ adolescentSearchTerm() }}".
                  </p>

                  <div class="child-list" *ngIf="!loadingAdolescents() && filteredLinkedAdolescents().length">
                    <article class="child-item" *ngFor="let child of filteredLinkedAdolescents()">
                      <div class="child-top">
                        <div>
                          <strong>{{ child.firstName }} {{ child.lastName }}</strong>
                          <p>{{ child.email }}</p>
                        </div>
                        <button type="button" class="child-view-btn" (click)="toggleAdolescentDetails(child)">
                          {{ selectedAdolescentId() === child._id ? 'Masquer profil' : 'Voir profil adolescent' }}
                        </button>
                      </div>
                      <small>
                        Naissance: {{ formatBirthDate(child) }} · Consentement: {{ child.adolescentProfile?.consentGiven ? 'Oui' : 'Non' }}
                      </small>

                      <div class="child-details" *ngIf="selectedAdolescentId() === child._id">
                        <p><strong>Nom complet:</strong> {{ child.firstName }} {{ child.lastName }}</p>
                        <p><strong>Email:</strong> {{ child.email }}</p>
                        <p><strong>Téléphone:</strong> {{ child.phone || '—' }}</p>
                        <p><strong>Date de naissance:</strong> {{ formatBirthDate(child) }}</p>
                        <p><strong>Consentement:</strong> {{ child.adolescentProfile?.consentGiven ? 'Oui' : 'Non' }}</p>
                      </div>
                    </article>
                  </div>
                </div>

              </div>

              <!-- Right: Edit form -->
              <div class="right-col">
                <div class="form-card">
                  <div class="form-card-head">
                    <div class="form-head-icon">
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                        <path d="M14.5 2.5a2.12 2.12 0 0 1 3 3L6 17l-4 1 1-4 11.5-11.5z"/>
                      </svg>
                    </div>
                    <div>
                      <h2>Modifier mon profil</h2>
                      <p>Mettez à jour vos informations personnelles</p>
                    </div>
                  </div>

                  <!-- Success banner -->
                  <div class="alert success" *ngIf="successMessage()">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/>
                      <path d="M5 8l2.5 2.5L11 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                    </svg>
                    {{ successMessage() }}
                  </div>

                  <form [formGroup]="form" (ngSubmit)="saveProfile()" class="edit-form">

                    <div class="f-row">
                      <div class="f-group">
                        <label for="firstName">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M8 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM2 15a6 6 0 0 1 12 0"
                                  stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                          </svg>
                          Prénom
                        </label>
                        <div class="f-wrap" [class.focused]="firstNameFocus()" [class.invalid]="form.get('firstName')?.invalid && form.get('firstName')?.touched">
                          <input
                            id="firstName"
                            class="f-input"
                            formControlName="firstName"
                            placeholder="Votre prénom"
                            (focus)="firstNameFocus.set(true)"
                            (blur)="firstNameFocus.set(false)"
                          />
                        </div>
                        <span class="f-hint" *ngIf="form.get('firstName')?.hasError('required') && form.get('firstName')?.touched">
                          Le prénom est requis
                        </span>
                      </div>

                      <div class="f-group">
                        <label for="lastName">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M8 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM2 15a6 6 0 0 1 12 0"
                                  stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                          </svg>
                          Nom
                        </label>
                        <div class="f-wrap" [class.focused]="lastNameFocus()" [class.invalid]="form.get('lastName')?.invalid && form.get('lastName')?.touched">
                          <input
                            id="lastName"
                            class="f-input"
                            formControlName="lastName"
                            placeholder="Votre nom de famille"
                            (focus)="lastNameFocus.set(true)"
                            (blur)="lastNameFocus.set(false)"
                          />
                        </div>
                        <span class="f-hint" *ngIf="form.get('lastName')?.hasError('required') && form.get('lastName')?.touched">
                          Le nom est requis
                        </span>
                      </div>
                    </div>

                    <div class="f-group full">
                      <label for="phone">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                          <path d="M3 2h3l1.5 3.5-2 1.2a8.5 8.5 0 0 0 3.8 3.8l1.2-2L14 10v3a1 1 0 0 1-1 1A12 12 0 0 1 2 3a1 1 0 0 1 1-1z"
                                stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Téléphone
                        <span class="f-optional">optionnel</span>
                      </label>
                      <div class="f-wrap" [class.focused]="phoneFocus()">
                        <span class="f-prefix">+</span>
                        <input
                          id="phone"
                          class="f-input with-prefix"
                          formControlName="phone"
                          placeholder="33 6 12 34 56 78"
                          (focus)="phoneFocus.set(true)"
                          (blur)="phoneFocus.set(false)"
                        />
                      </div>
                    </div>

                    <!-- Read-only email info box -->
                    <div class="info-box">
                      <div class="info-box-icon">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.3"/>
                          <path d="M1 6l7 4 7-4" stroke="currentColor" stroke-width="1.3"/>
                        </svg>
                      </div>
                      <div>
                        <p class="info-box-label">Adresse e-mail</p>
                        <p class="info-box-value">{{ user()?.email }}</p>
                      </div>
                      <span class="info-box-badge">Non modifiable</span>
                    </div>

                    <button
                      type="submit"
                      class="btn-save"
                      [class.loading]="saving()"
                      [disabled]="form.invalid || saving()"
                    >
                      <span *ngIf="!saving()" class="btn-inner">
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                          <path d="M13 2H5L2 5v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zM5 2v4h6V2M5 15v-5h6v5"
                                stroke="white" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Enregistrer les modifications
                      </span>
                      <span *ngIf="saving()" class="btn-inner">
                        <span class="spinner"></span>
                        Sauvegarde en cours…
                      </span>
                    </button>

                  </form>
                </div>

                <!-- Security notice card -->
                <div class="security-card">
                  <div class="security-head">
                    <div class="security-icon">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                        <path d="M10 2L4 5v5c0 4 2.7 7.7 6 9 3.3-1.3 6-5 6-9V5L10 2z"/>
                        <path d="M7 10l2 2 4-4"/>
                      </svg>
                    </div>
                    <div>
                      <h3>Confidentialité & sécurité</h3>
                      <p>Vos données sont chiffrées AES-256 et conformes au RGPD.</p>
                    </div>
                  </div>
                  <div class="security-items">
                    <div class="sec-item">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path d="M4 8l3 3 5-5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                      </svg>
                      Données hébergées en France (HDS)
                    </div>
                    <div class="sec-item">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path d="M4 8l3 3 5-5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                      </svg>
                      Chiffrement de bout en bout
                    </div>
                    <div class="sec-item">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path d="M4 8l3 3 5-5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                      </svg>
                      Authentification multi-facteurs disponible
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </ng-container>

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
      --r: 16px;
      --r-sm: 12px;
    }

    /* ── Page root ─────────────────────── */
    .page-root {
      display: flex;
      height: 100vh;
      background: var(--surface);
      overflow: hidden;
    }

    /* ── Sidebar ───────────────────────── */
    .sidebar {
      width: 58px;
      background: var(--navy);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 14px 0;
      gap: 4px;
      flex-shrink: 0;
    }
    .s-logo {
      width: 38px; height: 38px;
      background: var(--blue);
      border-radius: 11px;
      display: grid; place-items: center;
      margin-bottom: 14px;
    }
    .nav-btn {
      width: 38px; height: 38px;
      border-radius: 10px;
      display: grid; place-items: center;
      background: transparent;
      border: none; cursor: pointer;
      transition: background .15s;
    }
    .nav-btn svg { width: 18px; height: 18px; stroke: rgba(255,255,255,.3); fill: none; stroke-width: 1.5; }
    .nav-btn.active { background: rgba(255,255,255,.12); }
    .nav-btn.active svg { stroke: rgba(255,255,255,.9); }
    .nav-btn:hover:not(.active) { background: rgba(255,255,255,.07); }
    .nav-btn:hover svg { stroke: rgba(255,255,255,.6); }

    /* ── Main ──────────────────────────── */
    .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

    /* Topbar */
    .topbar {
      height: 54px; padding: 0 20px;
      background: var(--card);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0;
    }
    .breadcrumb { display: flex; align-items: center; gap: 7px; }
    .bc-root { font-size: 12px; color: var(--faint); }
    .breadcrumb svg { stroke: var(--faint); }
    .bc-current { font-size: 14px; font-weight: 700; color: var(--text); }
    .top-right { display: flex; align-items: center; gap: 8px; }
    .role-chip {
      border-radius: 20px; padding: 3px 11px;
      font-size: 11px; font-weight: 600;
      background: var(--fb-primary-soft); color: var(--fb-primary-strong); border: 1px solid rgba(var(--fb-primary-rgb),.25);
    }
    .role-chip[data-role="admin"] { background: rgba(192,57,43,.08); color: var(--red); border-color: rgba(192,57,43,.25); }
    .role-chip[data-role="specialist"] { background: #fdf4ff; color: #7e22ce; border-color: #ddd6fe; }
    .role-chip[data-role="adolescent"] { background: #fffbeb; color: #92400e; border-color: #fde68a; }
    .home-btn {
      display: flex; align-items: center; gap: 5px;
      background: #fff; border: 1px solid var(--border);
      color: var(--blue); border-radius: var(--r-sm);
      padding: 5px 12px; font-size: 11px; font-weight: 600;
      cursor: pointer; font-family: inherit; transition: background .15s;
    }
    .home-btn:hover { background: var(--fb-primary-soft); }
    .logout-btn {
      display: flex; align-items: center; gap: 5px;
      background: #fff; border: 1px solid var(--border);
      color: var(--red); border-radius: var(--r-sm);
      padding: 5px 12px; font-size: 11px; font-weight: 600;
      cursor: pointer; font-family: inherit; transition: background .15s;
    }
    .logout-btn:hover { background: #fef2f2; }

    /* Content */
    .content {
      flex: 1; overflow-y: auto;
      padding: 24px 28px;
      display: flex; flex-direction: column; gap: 20px;
    }

    /* Loading */
    .loading-screen {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      flex: 1; gap: 12px; color: var(--faint); font-size: 13px;
    }
    .loader {
      width: 24px; height: 24px;
      border: 2px solid var(--border);
      border-top-color: var(--blue);
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Alerts */
    .alert {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 14px; border-radius: var(--r-sm);
      font-size: 13px; line-height: 1.4;
    }
    .alert.error { background: rgba(192,57,43,.07); border: 1px solid rgba(192,57,43,.22); color: var(--red); }
    .alert.success { background: rgba(21,127,69,.08); border: 1px solid rgba(21,127,69,.22); color: var(--green); margin-bottom: 4px; }
    .alert svg { flex-shrink: 0; margin-top: 1px; }

    /* ── Profile Grid ──────────────────── */
    .profile-grid {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 20px;
      align-items: start;
    }

    /* Left column */
    .left-col { display: flex; flex-direction: column; gap: 16px; }

    /* Hero card */
    .hero-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--r);
      overflow: hidden;
    }
    .hero-bg {
      height: 80px;
      background: linear-gradient(135deg, var(--navy) 0%, var(--blue) 60%, var(--blue2) 100%);
      position: relative;
    }
    .hero-bg::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 80% 50%, rgba(255,255,255,.06) 0%, transparent 60%);
    }
    .hero-body {
      display: flex;
      align-items: flex-end;
      gap: 14px;
      padding: 0 20px 14px;
      margin-top: -28px;
      position: relative;
    }
    .big-avatar {
      width: 64px; height: 64px;
      border-radius: 50%;
      border: 3px solid var(--card);
      display: grid; place-items: center;
      font-size: 20px; font-weight: 700; color: #fff;
      flex-shrink: 0;
      background: linear-gradient(135deg, var(--blue), var(--blue2));
      box-shadow: 0 4px 12px rgba(var(--fb-primary-rgb),.3);
    }
    .big-avatar[data-role="admin"] { background: linear-gradient(135deg, #7f1d1d, #dc2626); }
    .big-avatar[data-role="specialist"] { background: linear-gradient(135deg, #4c1d95, #7e22ce); }
    .big-avatar[data-role="adolescent"] { background: linear-gradient(135deg, #92400e, #d97706); }
    .hero-info { padding-bottom: 4px; }
    .hero-info h1 { font-size: 16px; font-weight: 700; color: var(--text); margin: 0 0 2px; letter-spacing: -.02em; }
    .hero-email { font-size: 11px; color: var(--faint); margin: 0 0 6px; }
    .role-badge {
      display: inline-block;
      font-size: 9px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .06em;
      padding: 2px 8px; border-radius: 20px;
      background: var(--fb-primary-soft); color: var(--fb-primary-strong);
    }
    .role-badge[data-role="admin"] { background: rgba(192,57,43,.08); color: var(--red); }
    .role-badge[data-role="specialist"] { background: #fdf4ff; color: #7e22ce; }
    .role-badge[data-role="adolescent"] { background: #fffbeb; color: #92400e; }

    .hero-stats {
      display: flex;
      align-items: center;
      gap: 0;
      padding: 12px 20px;
      border-top: 1px solid var(--border);
    }
    .stat { flex: 1; text-align: center; }
    .stat p { font-size: 10px; color: var(--faint); margin: 0 0 3px; font-weight: 500; }
    .stat strong { font-size: 12px; font-weight: 700; color: var(--text); }
    .stat-divider { width: 1px; height: 28px; background: var(--border); flex-shrink: 0; }
    .status-dot { display: flex; align-items: center; gap: 5px; justify-content: center; }
    .dot { width: 7px; height: 7px; border-radius: 50%; }
    .dot.active { background: var(--green); box-shadow: 0 0 0 2px rgba(22,163,74,.2); }

    /* Actions card */
    .actions-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 16px;
    }
    .actions-card h3 {
      font-size: 12px; font-weight: 700;
      color: var(--muted); text-transform: uppercase;
      letter-spacing: .06em; margin: 0 0 12px;
    }
    .action-list { display: flex; flex-direction: column; gap: 6px; }
    .action-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      background: #fff; cursor: pointer; text-align: left; width: 100%;
      transition: all .15s;
    }
    .action-item:hover { border-color: var(--blue); background: var(--fb-primary-soft); transform: translateX(2px); }
    .action-icon {
      width: 34px; height: 34px;
      border-radius: 9px;
      display: grid; place-items: center; flex-shrink: 0;
    }
    .action-icon svg { width: 16px; height: 16px; fill: none; stroke-width: 1.5; }
    .action-item.admin .action-icon { background: #fef2f2; }
    .action-item.admin .action-icon svg { stroke: #dc2626; }
    .action-item.survey .action-icon { background: var(--fb-primary-soft); }
    .action-item.survey .action-icon svg { stroke: var(--fb-primary); }
    .action-item.family .action-icon { background: #ecfeff; }
    .action-item.family .action-icon svg { stroke: #0f766e; }
    .action-item.education .action-icon { background: #fff7ed; }
    .action-item.education .action-icon svg { stroke: #c2410c; }
    .action-item.teleconsultation .action-icon { background: #ecfdf5; }
    .action-item.teleconsultation .action-icon svg { stroke: #047857; }
    .action-item.scoring .action-icon { background: #f0fdf4; }
    .action-item.scoring .action-icon svg { stroke: var(--green); }
    .action-text { flex: 1; min-width: 0; }
    .action-text strong { display: block; font-size: 12px; color: var(--text); font-family: inherit; }
    .action-text span { font-size: 10px; color: var(--faint); }
    .action-arrow { color: var(--faint); flex-shrink: 0; transition: transform .15s; }
    .action-item:hover .action-arrow { color: var(--blue); transform: translateX(3px); }

    .children-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 14px 16px;
      display: grid;
      gap: 10px;
    }
    .children-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .children-head h3 {
      margin: 0;
      font-size: 12px;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: .06em;
    }
    .children-head span {
      font-size: 11px;
      font-weight: 700;
      color: var(--blue);
      background: var(--fb-primary-soft);
      border: 1px solid rgba(var(--fb-primary-rgb),.25);
      border-radius: 20px;
      padding: 2px 8px;
    }
    .children-note {
      margin: 0;
      font-size: 12px;
      color: var(--muted);
    }
    .children-search {
      display: block;
    }
    .children-search-input {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: #fff;
      color: var(--text);
      font-size: 12px;
      padding: 8px 10px;
      outline: none;
      font-family: inherit;
    }
    .children-search-input:focus {
      border-color: var(--blue);
      box-shadow: 0 0 0 3px rgba(var(--fb-primary-rgb), .1);
    }
    .children-note.error {
      color: var(--red);
    }
    .child-list {
      display: grid;
      gap: 8px;
    }
    .child-item {
      border: 1px solid var(--border);
      border-radius: 10px;
      background: rgba(var(--fb-primary-rgb),.04);
      padding: 10px;
      display: grid;
      gap: 4px;
    }
    .child-top {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 10px;
    }
    .child-view-btn {
      border: 1px solid rgba(var(--fb-primary-rgb),.25);
      background: var(--fb-primary-soft);
      color: var(--fb-primary-strong);
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      cursor: pointer;
      white-space: nowrap;
    }
    .child-view-btn:hover {
      background: rgba(var(--fb-primary-rgb),.16);
    }
    .child-item strong {
      font-size: 13px;
      color: var(--text);
    }
    .child-item p {
      margin: 2px 0 0;
      font-size: 11px;
      color: var(--faint);
    }
    .child-item small {
      font-size: 11px;
      color: var(--muted);
    }
    .child-details {
      border-top: 1px dashed var(--border);
      padding-top: 8px;
      display: grid;
      gap: 2px;
    }
    .child-details p {
      margin: 0;
      font-size: 11px;
      color: var(--muted);
    }

    /* Right column */
    .right-col { display: flex; flex-direction: column; gap: 16px; }

    /* Form card */
    .form-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 22px 24px;
    }
    .form-card-head {
      display: flex; align-items: flex-start; gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .form-head-icon {
      width: 40px; height: 40px;
      background: linear-gradient(135deg, var(--navy), var(--blue));
      border-radius: 10px;
      display: grid; place-items: center; flex-shrink: 0;
    }
    .form-head-icon svg { stroke: #fff; fill: none; }
    .form-card-head h2 { margin: 0 0 2px; font-size: 16px; font-weight: 700; color: var(--text); letter-spacing: -.02em; }
    .form-card-head p { margin: 0; font-size: 12px; color: var(--muted); }

    /* Form */
    .edit-form { display: flex; flex-direction: column; gap: 16px; }
    .f-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .f-group { display: flex; flex-direction: column; gap: 5px; }
    .f-group.full { grid-column: 1 / -1; }
    .f-group label {
      display: flex; align-items: center; gap: 5px;
      font-size: 12px; font-weight: 600; color: var(--muted);
    }
    .f-group label svg { stroke: var(--faint); fill: none; }
    .f-optional {
      margin-left: auto;
      font-size: 10px; font-weight: 500; color: var(--faint);
      background: var(--surface); padding: 1px 6px;
      border-radius: 10px;
    }
    .f-wrap {
      display: flex; align-items: center;
      border: 1.5px solid var(--border);
      border-radius: var(--r-sm);
      background: var(--surface);
      transition: border-color .15s, box-shadow .15s, background .15s;
      overflow: hidden;
    }
    .f-wrap.focused {
      border-color: var(--blue);
      box-shadow: 0 0 0 3px rgba(var(--fb-primary-rgb),.1);
      background: #fff;
    }
    .f-wrap.invalid { border-color: var(--red); box-shadow: 0 0 0 3px rgba(192,57,43,.08); }
    .f-prefix {
      padding: 0 0 0 12px;
      font-size: 13px; color: var(--faint); font-weight: 600;
      flex-shrink: 0;
    }
    .f-input {
      flex: 1; border: none; outline: none; background: transparent;
      padding: 10px 12px; font-size: 13px; color: var(--text);
      font-family: inherit; width: 100%;
    }
    .f-input.with-prefix { padding-left: 4px; }
    .f-input::placeholder { color: var(--faint); }
    .f-hint { font-size: 11px; color: var(--red); }

    /* Info box (email) */
    .info-box {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
    }
    .info-box-icon {
      width: 32px; height: 32px;
      background: #fff; border: 1px solid var(--border);
      border-radius: 8px; display: grid; place-items: center; flex-shrink: 0;
    }
    .info-box-icon svg { stroke: var(--blue); fill: none; }
    .info-box-label { font-size: 10px; color: var(--faint); margin: 0 0 1px; font-weight: 500; }
    .info-box-value { font-size: 13px; font-weight: 600; color: var(--text); margin: 0; }
    .info-box-badge {
      margin-left: auto;
      font-size: 9px; font-weight: 600;
      background: #f1f5f9; color: var(--muted);
      border: 1px solid var(--border);
      padding: 2px 8px; border-radius: 20px;
      white-space: nowrap; flex-shrink: 0;
    }

    /* Save button */
    .btn-save {
      height: 48px;
      background: linear-gradient(135deg, var(--blue) 0%, var(--navy) 100%);
      color: #fff; border: none;
      border-radius: 12px;
      font-size: 0.95rem; font-weight: 700;
      font-family: inherit; cursor: pointer;
      box-shadow: 0 4px 14px rgba(var(--fb-primary-rgb),.3);
      transition: opacity .2s, transform .15s, box-shadow .2s;
      display: flex; align-items: center; justify-content: center;
    }
    .btn-save:hover:not(:disabled) {
      opacity: .92; transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(var(--fb-primary-rgb),.4);
    }
    .btn-save:active:not(:disabled) { transform: translateY(0); }
    .btn-save:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
    .btn-inner { display: flex; align-items: center; gap: 7px; }
    .spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }

    /* Security card */
    .security-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 16px 20px;
    }
    .security-head {
      display: flex; align-items: flex-start; gap: 12px;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    .security-icon {
      width: 36px; height: 36px;
      background: #f0fdf4; border: 1px solid #bbf7d0;
      border-radius: 9px; display: grid; place-items: center; flex-shrink: 0;
    }
    .security-icon svg { stroke: var(--green); fill: none; }
    .security-head h3 { margin: 0 0 2px; font-size: 13px; font-weight: 700; color: var(--text); }
    .security-head p { margin: 0; font-size: 11px; color: var(--muted); }
    .security-items { display: flex; flex-direction: column; gap: 6px; }
    .sec-item {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; color: var(--muted);
      padding: 5px 0;
    }
    .sec-item svg { stroke: var(--green); fill: none; flex-shrink: 0; }

    /* ── Responsive ────────────────────── */
    @media (max-width: 1024px) {
      .profile-grid { grid-template-columns: 1fr; }
      .content { padding: 16px; }
    }
    @media (max-width: 768px) {
      .page-root { flex-direction: column; height: auto; min-height: 100vh; }
      .sidebar { display: none; }
      .f-row { grid-template-columns: 1fr; }
      .hero-stats { flex-direction: column; gap: 8px; }
      .stat-divider { width: 100%; height: 1px; }
    }
  `],
})
export class ProfilePage implements OnInit {
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly user = this.authService.currentUser;
  readonly linkedAdolescents = signal<LinkedAdolescentProfile[]>([]);
  readonly adolescentSearchTerm = signal('');
  readonly selectedAdolescentId = signal<string | null>(null);
  readonly loadingAdolescents = signal(false);
  readonly adolescentsError = signal('');
  readonly filteredLinkedAdolescents = computed(() => {
    const term = this.adolescentSearchTerm().trim().toLowerCase();
    if (!term) {
      return this.linkedAdolescents();
    }

    return this.linkedAdolescents().filter((child) => {
      const fullName = `${child.firstName || ''} ${child.lastName || ''}`.trim().toLowerCase();
      const email = String(child.email || '').toLowerCase();
      return fullName.includes(term) || email.includes(term);
    });
  });

  readonly firstNameFocus = signal(false);
  readonly lastNameFocus  = signal(false);
  readonly phoneFocus     = signal(false);

  readonly form = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName:  ['', [Validators.required]],
    phone:     [''],
  });

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: () => {
        const u = this.user();
        this.form.patchValue({
          firstName: u?.firstName || '',
          lastName:  u?.lastName  || '',
          phone:     u?.phone     || '',
        });

        if (u?.role === 'parent') {
          this.loadLinkedAdolescents();
        }

        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.errorMessage.set(e?.error?.message || 'Impossible de charger le profil.');
      },
    });
  }

  saveProfile(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    const v = this.form.getRawValue();
    this.authService.updateProfile({
      firstName: v.firstName || undefined,
      lastName:  v.lastName  || undefined,
      phone:     v.phone     || undefined,
    }).subscribe({
      next: (r) => {
        this.saving.set(false);
        this.successMessage.set(r.message || 'Profil mis à jour avec succès.');
        setTimeout(() => this.successMessage.set(''), 4000);
      },
      error: (e) => {
        this.saving.set(false);
        this.errorMessage.set(e?.error?.message || 'Impossible de mettre à jour le profil.');
      },
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/auth/login'),
      error: () => {
        this.authService.clearSession();
        this.router.navigateByUrl('/auth/login');
      },
    });
  }

  goBack():              void { this.router.navigateByUrl(this.authService.getHomeRoute()); }
  goToAdminDashboard():  void { this.router.navigateByUrl('/admin/dashboard'); }
  goToSurveyModule():    void { this.router.navigateByUrl('/survey/dynamic'); }
  goToEducationModule(): void { this.router.navigateByUrl('/education/resources'); }
  goToTeleconsultationModule(): void { this.router.navigateByUrl('/teleconsultation'); }
  goToFamilyDashboard(): void { this.router.navigateByUrl('/family/dashboard'); }
  goToAdolescentDashboard(): void { this.router.navigateByUrl('/dashboard/adolescent'); }
  goToScoringModule():   void { this.router.navigateByUrl('/scoring/results'); }

  initials(): string {
    const u = this.user();
    if (!u) return '?';
    return `${(u.firstName || '').charAt(0)}${(u.lastName || '').charAt(0)}`.toUpperCase() || '?';
  }

  roleLabel(): string {
    const map: Record<string, string> = {
      parent: 'Parent', admin: 'Administrateur',
      specialist: 'Spécialiste', adolescent: 'Adolescent',
    };
    return map[this.user()?.role || ''] || (this.user()?.role || '—');
  }

  formatBirthDate(child: LinkedAdolescentProfile): string {
    const birthDate = child.adolescentProfile?.birthDate;
    if (!birthDate) return '—';
    const parsed = new Date(birthDate);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString('fr-FR');
  }

  toggleAdolescentDetails(child: LinkedAdolescentProfile): void {
    this.selectedAdolescentId.set(this.selectedAdolescentId() === child._id ? null : child._id);
  }

  private loadLinkedAdolescents(): void {
    this.loadingAdolescents.set(true);
    this.adolescentsError.set('');

    this.authService.getMyAdolescents().subscribe({
      next: (response) => {
        this.linkedAdolescents.set(response.adolescents || []);
        this.adolescentSearchTerm.set('');
        this.selectedAdolescentId.set(null);
        this.loadingAdolescents.set(false);
      },
      error: (error) => {
        this.loadingAdolescents.set(false);
        this.adolescentsError.set(error?.error?.message || 'Impossible de charger les adolescents lies.');
      },
    });
  }
}