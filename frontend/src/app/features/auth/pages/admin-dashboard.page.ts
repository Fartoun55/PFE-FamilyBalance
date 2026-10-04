import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { API_BASE_URL } from '../../../core/config/api.config';

interface AdminUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  phone?: string;
  specialistProfile?: {
    specialization?: string;
    licenseNumber?: string;
    city?: string;
    tariff?: number;
  };
  adolescentProfile?: {
    parentId?: string;
    birthDate?: string;
    consentGiven?: boolean;
  };
}

interface ModerationItem {
  id: string;
  type: string;
  title: string;
  description: string;
  category: string;
  ageRange: string;
  contentType: string;
  reason: string;
  createdAt: string;
}

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSelectModule, MatCheckboxModule],
  template: `
        <!-- Content -->
        <div class="content">

          <div class="page-topbar">
            <div class="breadcrumb">
              <span class="bc-root">Administration</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
              <span class="bc-current">Gestion des utilisateurs</span>
            </div>
            <div class="top-right">
              <span class="admin-badge">Super Admin</span>
            </div>
          </div>

          <!-- KPIs -->
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-icon blue">
                <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                  <path d="M10 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-7 14a7 7 0 0 1 14 0"/>
                </svg>
              </div>
              <div class="kpi-body">
                <p>Total utilisateurs</p>
                <strong>{{ users().length }}</strong>
              </div>
              <div class="kpi-trend up">↑ 12%</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon green">
                <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                  <path d="M4 10l4 4 8-8"/>
                </svg>
              </div>
              <div class="kpi-body">
                <p>Comptes actifs</p>
                <strong>{{ activeCount() }}</strong>
              </div>
              <div class="kpi-trend up">+{{ activeCount() }}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon amber">
                <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                  <circle cx="10" cy="10" r="8"/>
                  <path d="M10 6v4l2.5 2.5"/>
                </svg>
              </div>
              <div class="kpi-body">
                <p>Comptes inactifs</p>
                <strong>{{ inactiveCount() }}</strong>
              </div>
              <div class="kpi-trend neutral">—</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon navy">
                <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                  <path d="M10 2l1.8 4.2L16 6.5l-3.1 3 1 4.2L10 11.7l-3.9 2 1-4.2L4 6.5l4.2-.3z"/>
                </svg>
              </div>
              <div class="kpi-body">
                <p>Administrateurs</p>
                <strong>{{ adminCount() }}</strong>
              </div>
              <div class="kpi-trend neutral">—</div>
            </div>
          </div>

          <!-- File de modération : ressources éducatives en brouillon en attente de publication -->
          <div class="moderation-card" *ngIf="moderationItems().length">
            <div class="card-head">
              <div>
                <h3>File de modération</h3>
                <p>{{ moderationItems().length }} ressource(s) éducative(s) en attente de publication</p>
              </div>
            </div>
            <div class="moderation-list">
              <div class="moderation-row" *ngFor="let item of moderationItems()">
                <div class="moderation-info">
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.category }} · {{ item.ageRange }} · {{ item.reason }}</span>
                </div>
                <div class="moderation-actions">
                  <button class="act-btn primary" type="button" [disabled]="moderating() === item.id" (click)="approveModerationItem(item)">
                    Publier
                  </button>
                  <button class="act-btn danger" type="button" [disabled]="moderating() === item.id" (click)="rejectModerationItem(item)">
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Dashboard grid -->
          <div class="dash-grid">

            <!-- Left: Table -->
            <div class="table-card">
              <div class="card-head">
                <div>
                  <h3>Comptes utilisateurs</h3>
                  <p>Gérer, modifier et supprimer les comptes enregistrés</p>
                </div>
                <div class="head-actions">
                  <div class="export-group">
                    <button class="export-btn" (click)="exportToExcel()">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.3"/>
                        <path d="M5 6l3 4 3-4M8 10V5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                      </svg>
                      Excel
                    </button>
                    <button class="export-btn" (click)="exportToWord()">Word</button>
                    <button class="export-btn" (click)="exportToPDF()">PDF</button>
                  </div>
                  <button class="btn-add" (click)="resetForm()">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1v10M1 6h10" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Ajouter
                  </button>
                </div>
              </div>

              <div class="toolbar">
                <div class="search-wrap">
                  <svg class="search-icon" viewBox="0 0 16 16" fill="none" stroke-width="1.4">
                    <circle cx="7" cy="7" r="5"/>
                    <path d="M11 11l3 3" stroke-linecap="round"/>
                  </svg>
                  <input
                    class="search-input"
                    type="text"
                    [value]="searchTerm()"
                    (input)="setSearchTerm($any($event.target).value)"
                    placeholder="Rechercher un utilisateur, e-mail ou rôle…"
                  />
                  <button class="search-clear" *ngIf="searchTerm()" (click)="setSearchTerm('')">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                  </button>
                </div>
                <div class="filter-row">
                  <button class="chip" [class.active]="statusFilter() === 'all'"       (click)="setFilter('all')">Tous</button>
                  <button class="chip" [class.active]="statusFilter() === 'active'"    (click)="setFilter('active')">Actifs</button>
                  <button class="chip" [class.active]="statusFilter() === 'inactive'"  (click)="setFilter('inactive')">Inactifs</button>
                  <button class="chip" [class.active]="statusFilter() === 'admin'"     (click)="setFilter('admin')">Admins</button>
                  <button class="chip" [class.active]="statusFilter() === 'specialist'"(click)="setFilter('specialist')">Spécialistes</button>
                  <button class="chip" [class.active]="statusFilter() === 'adolescent'"(click)="setFilter('adolescent')">Adolescents</button>
                  <button class="chip reset" type="button" (click)="clearFilters()">
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                      <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    Réinitialiser
                  </button>
                </div>
              </div>

              <div class="msg-row" *ngIf="errorMessage() || successMessage()">
                <div class="msg error" *ngIf="errorMessage()">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/>
                    <path d="M8 5v3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="8" cy="11" r=".8" fill="currentColor"/>
                  </svg>
                  {{ errorMessage() }}
                </div>
                <div class="msg success" *ngIf="successMessage()">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/>
                    <path d="M5 8l2.5 2.5L11 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                  </svg>
                  {{ successMessage() }}
                </div>
              </div>

              <div class="tbl-wrap" *ngIf="!loading(); else loadingTpl">
                <table>
                  <thead>
                    <tr>
                      <th>Utilisateur</th>
                      <th>Rôle</th>
                      <th>Statut</th>
                      <th>Inscription</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      *ngFor="let user of filteredUsers()"
                      [class.selected]="selectedUser()?._id === user._id"
                      (click)="viewUser(user)"
                    >
                      <td>
                        <div class="user-cell">
                          <div class="av" [attr.data-role]="user.role">{{ initials(user) }}</div>
                          <div>
                            <p class="u-name">{{ user.firstName }} {{ user.lastName }}</p>
                            <span class="u-email">{{ user.email }}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="role-badge" [ngClass]="'rb-' + user.role">{{ user.role }}</span>
                      </td>
                      <td>
                        <span class="status-pill" [class.active]="user.isActive">
                          {{ user.isActive ? 'Actif' : 'Inactif' }}
                        </span>
                      </td>
                      <td class="date-cell">{{ formatDate(user.createdAt) }}</td>
                      <td>
                        <div class="row-actions">
                          <button class="act-btn" (click)="viewUser(user); $event.stopPropagation()">Voir</button>
                          <button class="act-btn primary" (click)="editUser(user); $event.stopPropagation()">Modifier</button>
                          <button class="act-btn" (click)="toggleStatus(user); $event.stopPropagation()">
                            {{ user.isActive ? 'Désactiver' : 'Activer' }}
                          </button>
                          <button class="act-btn danger" (click)="deleteUser(user); $event.stopPropagation()">Supprimer</button>
                        </div>
                      </td>
                    </tr>
                    <tr *ngIf="filteredUsers().length === 0">
                      <td colspan="5" class="empty-row">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                          <circle cx="16" cy="16" r="15" stroke="currentColor" stroke-width="1.5" stroke-opacity=".3"/>
                          <path d="M10 16h12M16 10v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-opacity=".3"/>
                        </svg>
                        <p>Aucun utilisateur trouvé</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="card-foot">
                <span>{{ filteredUsers().length }} utilisateur(s) affiché(s)</span>
                <span class="foot-hint">Cliquez sur une ligne pour voir le détail →</span>
              </div>
            </div>

            <!-- Right column -->
            <aside class="right-col">

              <!-- Quick list -->
              <div class="r-card">
                <div class="r-head">
                  <div>
                    <h4>File rapide</h4>
                    <p>Accès direct aux comptes</p>
                  </div>
                  <span class="r-count">{{ filteredUsers().length }}</span>
                </div>
                <div class="quick-list" *ngIf="!loading(); else listLoadingTpl">
                  <button
                    type="button"
                    class="q-item"
                    *ngFor="let user of filteredUsers()"
                    [class.active]="selectedUser()?._id === user._id"
                    (click)="viewUser(user)"
                  >
                    <div class="av small" [attr.data-role]="user.role">{{ initials(user) }}</div>
                    <div class="q-body">
                      <strong>{{ user.firstName }} {{ user.lastName }}</strong>
                      <span>{{ user.email }}</span>
                      <small>{{ user.role }} · {{ user.isActive ? 'Actif' : 'Inactif' }}</small>
                    </div>
                  </button>
                  <p class="empty-list" *ngIf="filteredUsers().length === 0">Aucun résultat</p>
                </div>
              </div>

              <!-- Detail card -->
              <div class="r-card detail-card" *ngIf="selectedUser(); else noSelTpl">
                <div class="r-head compact">
                  <div>
                    <h4>Détail compte</h4>
                    <p>{{ selectedUser()?.role }} · {{ selectedUser()?.isActive ? 'Actif' : 'Inactif' }}</p>
                  </div>
                  <button class="close-btn" (click)="selectedUser.set(null)">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                  </button>
                </div>
                <div class="detail-person">
                  <div class="av large" [attr.data-role]="selectedUser()?.role">{{ initials(selectedUser()!) }}</div>
                  <div>
                    <strong class="dp-name">{{ selectedUser()?.firstName }} {{ selectedUser()?.lastName }}</strong>
                    <span class="dp-email">{{ selectedUser()?.email }}</span>
                  </div>
                </div>
                <div class="detail-grid">
                  <div class="dg-item"><label>Téléphone</label><p>{{ selectedUser()?.phone || '—' }}</p></div>
                  <div class="dg-item"><label>Inscrit le</label><p>{{ formatDate(selectedUser()?.createdAt) }}</p></div>
                  <div class="dg-item"><label>Dernière connexion</label><p>{{ formatDate(selectedUser()?.lastLoginAt) }}</p></div>
                  <div class="dg-item"><label>Rôle</label><p>{{ selectedUser()?.role || '—' }}</p></div>
                </div>
                <div class="det-actions">
                  <button class="da-btn primary" (click)="editUser(selectedUser()!)">Modifier</button>
                  <button class="da-btn" (click)="toggleStatus(selectedUser()!)">
                    {{ selectedUser()?.isActive ? 'Désactiver' : 'Activer' }}
                  </button>
                </div>
              </div>

              <!-- Form card -->
              <div class="r-card form-card">
                <h4>{{ editMode() ? 'Modifier le compte' : 'Créer un compte' }}</h4>
                <p class="form-subtitle">{{ editMode() ? 'Modifiez les informations ci-dessous' : 'Remplissez les champs pour créer un nouvel utilisateur' }}</p>

                <form [formGroup]="form" (ngSubmit)="submit()" class="adm-form">

                  <div class="f-row">
                    <div class="f-group">
                      <label>Prénom</label>
                      <input class="f-input" formControlName="firstName" placeholder="Prénom" [class.invalid]="form.get('firstName')?.invalid && form.get('firstName')?.touched"/>
                    </div>
                    <div class="f-group">
                      <label>Nom</label>
                      <input class="f-input" formControlName="lastName" placeholder="Nom" [class.invalid]="form.get('lastName')?.invalid && form.get('lastName')?.touched"/>
                    </div>
                  </div>

                  <div class="f-row">
                    <div class="f-group">
                      <label>Email</label>
                      <input class="f-input" type="email" formControlName="email" placeholder="email@example.com" [class.invalid]="form.get('email')?.invalid && form.get('email')?.touched"/>
                    </div>
                    <div class="f-group">
                      <label>Téléphone</label>
                      <input class="f-input" formControlName="phone" placeholder="+33 6 …"/>
                    </div>
                  </div>

                  <div class="f-row triple">
                    <div class="f-group">
                      <label>Rôle</label>
                      <select class="f-input f-select" formControlName="role">
                        <option value="parent">Parent</option>
                        <option value="adolescent">Adolescent</option>
                        <option value="specialist">Spécialiste</option>
                        <option value="admin">Administrateur</option>
                      </select>
                    </div>
                    <div class="f-group">
                      <label>Mot de passe</label>
                      <input class="f-input" type="password" formControlName="password" placeholder="••••••••••"/>
                    </div>
                    <div class="f-group">
                      <label>Confirmer</label>
                      <input class="f-input" type="password" formControlName="confirmPassword" placeholder="••••••••••"/>
                    </div>
                  </div>

                  <fieldset class="sub-section" *ngIf="isSpecialist()">
                    <legend>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM2 15a6 6 0 0 1 12 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                      Profil spécialiste
                    </legend>
                    <div class="f-row triple">
                      <div class="f-group">
                        <label>Spécialisation</label>
                        <input class="f-input" formControlName="specialization" placeholder="Ex : Psychiatrie"/>
                      </div>
                      <div class="f-group">
                        <label>N° de licence</label>
                        <input class="f-input" formControlName="licenseNumber" placeholder="RPPS …"/>
                      </div>
                      <div class="f-group">
                        <label>Ville</label>
                        <input class="f-input" formControlName="city" placeholder="Paris"/>
                      </div>
                    </div>
                  </fieldset>

                  <fieldset class="sub-section" *ngIf="isAdolescent()">
                    <legend>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM2 15a6 6 0 0 1 12 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                      Profil adolescent
                    </legend>
                    <div class="f-row triple">
                      <div class="f-group">
                        <label>Parent</label>
                        <select class="f-input f-select" formControlName="parentId">
                          <option value="" disabled>Sélectionner un parent…</option>
                          <option *ngFor="let p of parentAccounts()" [value]="p._id">{{ p.firstName }} {{ p.lastName }} ({{ p.email }})</option>
                        </select>
                      </div>
                      <div class="f-group">
                        <label>Date de naissance</label>
                        <input class="f-input" type="date" formControlName="birthDate"/>
                      </div>
                      <div class="f-group consent-group">
                        <label class="checkbox-label">
                          <input type="checkbox" formControlName="consentGiven" class="f-checkbox"/>
                          Consentement explicite donné
                        </label>
                      </div>
                    </div>
                  </fieldset>

                  <div class="form-actions">
                    <button type="submit" class="btn-submit" [disabled]="saving() || form.invalid">
                      <span *ngIf="!saving()">
                        {{ editMode() ? 'Mettre à jour' : 'Créer le compte' }}
                      </span>
                      <span class="saving-state" *ngIf="saving()">
                        <span class="mini-spinner"></span>
                        Enregistrement…
                      </span>
                    </button>
                    <button type="button" class="btn-cancel" (click)="resetForm()">Réinitialiser</button>
                  </div>

                </form>
              </div>

            </aside>
          </div>
        </div>

    <ng-template #loadingTpl>
      <div class="loading-state">
        <div class="loader"></div>
        <p>Chargement des utilisateurs…</p>
      </div>
    </ng-template>

    <ng-template #listLoadingTpl>
      <div class="loading-state compact">
        <div class="loader small"></div>
      </div>
    </ng-template>

    <ng-template #noSelTpl>
      <div class="r-card no-sel">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="17" stroke="currentColor" stroke-width="1.5" stroke-opacity=".2"/>
          <path d="M18 10a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm-8 16a8 8 0 0 1 16 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-opacity=".4"/>
        </svg>
        <p>Sélectionnez un utilisateur<br>pour afficher son profil</p>
      </div>
    </ng-template>

    <!-- Confirmation de suppression -->
    <div class="confirm-overlay" *ngIf="userPendingDelete() as target" (click)="cancelDelete()">
      <div
        class="confirm-modal"
        role="alertdialog"
        aria-modal="true"
        [attr.aria-label]="'Confirmer la suppression du compte de ' + target.firstName + ' ' + target.lastName"
        (click)="$event.stopPropagation()"
      >
        <div class="confirm-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h3>Supprimer ce compte ?</h3>
        <p>
          Vous êtes sur le point de supprimer définitivement le compte de
          <strong>{{ target.firstName }} {{ target.lastName }}</strong> ({{ target.email }}).
        </p>
        <p class="confirm-warning" *ngIf="target.role === 'parent'">
          Les comptes adolescents rattachés à ce parent ainsi que leurs données (questionnaires, scores) seront également supprimés.
        </p>
        <p class="confirm-hint">Cette action est irréversible.</p>
        <div class="confirm-actions">
          <button type="button" class="act-btn" [disabled]="deleting()" (click)="cancelDelete()">Annuler</button>
          <button type="button" class="act-btn danger" [disabled]="deleting()" (click)="confirmDelete()">
            {{ deleting() ? 'Suppression...' : 'Supprimer définitivement' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      --navy: var(--fb-primary-strong);
      --navy2: var(--fb-primary-strong);
      --blue: var(--fb-primary);
      --blue2: var(--fb-primary);
      --accent: var(--fb-accent);
      --surface: var(--fb-bg);
      --card: var(--fb-surface-strong);
      --border: var(--fb-border);
      --text: var(--fb-text);
      --muted: var(--fb-muted);
      --faint: #a89f92;
      --green: var(--fb-success);
      --red: var(--fb-danger);
      --amber: var(--fb-warning);
      --r: 16px;
      --r-sm: 12px;
    }

    /* ── Page topbar (breadcrumb + actions, sits inside the shared shell) ── */
    .page-topbar {
      padding: 0 0 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 4px;
    }
    .breadcrumb { display: flex; align-items: center; gap: 6px; }
    .bc-root { font-size: 12px; color: var(--faint); }
    .breadcrumb svg { stroke: var(--faint); }
    .bc-current { font-size: 14px; font-weight: 700; color: var(--text); }
    .top-right { display: flex; align-items: center; gap: 8px; }
    .admin-badge {
      background: var(--fb-primary-soft);
      color: var(--fb-primary-strong);
      border: 1px solid rgba(var(--fb-primary-rgb),.25);
      border-radius: 20px;
      padding: 3px 11px;
      font-size: 11px;
      font-weight: 600;
    }

    /* Content */
    .content {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    /* ── KPIs ──────────────────────────── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .kpi-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .kpi-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }
    .kpi-icon svg { width: 18px; height: 18px; fill: none; stroke-width: 1.5; }
    .kpi-icon.blue { background: var(--fb-primary-soft); } .kpi-icon.blue svg { stroke: var(--fb-primary); }
    .kpi-icon.green { background: #f0fdf4; } .kpi-icon.green svg { stroke: var(--green); }
    .kpi-icon.amber { background: #fffbeb; } .kpi-icon.amber svg { stroke: var(--amber); }
    .kpi-icon.navy { background: #eef2ff; } .kpi-icon.navy svg { stroke: var(--navy); }
    .kpi-body { flex: 1; }
    .kpi-body p { font-size: 10px; color: var(--muted); margin: 0 0 3px; font-weight: 500; }
    .kpi-body strong { font-size: 22px; font-weight: 700; color: var(--text); line-height: 1; }
    .kpi-trend { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px; }
    .kpi-trend.up { background: #f0fdf4; color: var(--green); }
    .kpi-trend.neutral { background: var(--surface); color: var(--faint); }

    /* ── Dash Grid ─────────────────────── */
    .dash-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) 300px;
      gap: 14px;
      align-items: start;
    }

    /* ── Moderation Card ───────────────── */
    .moderation-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--r);
      overflow: hidden;
      margin-bottom: 16px;
    }
    .moderation-list { padding: 10px 16px 16px; display: flex; flex-direction: column; gap: 8px; }
    .moderation-row {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--r-sm); background: var(--surface);
    }
    .moderation-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .moderation-info strong { font-size: 13px; color: var(--text); }
    .moderation-info span { font-size: 11px; color: var(--muted); }
    .moderation-actions { display: flex; gap: 8px; flex-shrink: 0; }

    /* ── Table Card ────────────────────── */
    .table-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--r);
      overflow: hidden;
    }
    .card-head {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .card-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--text); }
    .card-head p { margin: 2px 0 0; font-size: 11px; color: var(--muted); }
    .head-actions { display: flex; align-items: center; gap: 8px; }
    .export-group { display: flex; gap: 4px; }
    .export-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      border: 1px solid var(--border);
      background: #fff;
      color: var(--muted);
      border-radius: 7px;
      padding: 5px 10px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all .15s;
    }
    .export-btn:hover { border-color: var(--blue); color: var(--blue); }
    .btn-add {
      display: flex;
      align-items: center;
      gap: 5px;
      background: var(--navy);
      color: #fff;
      border: none;
      border-radius: var(--r-sm);
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: background .15s;
    }
    .btn-add:hover { background: var(--navy2); }

    /* Toolbar */
    .toolbar {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .search-wrap {
      position: relative;
    }
    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 14px;
      height: 14px;
      stroke: var(--faint);
      fill: none;
    }
    .search-input {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      padding: 8px 32px;
      font-size: 12px;
      font-family: inherit;
      color: var(--text);
      outline: none;
      background: var(--surface);
      transition: border .15s, box-shadow .15s;
    }
    .search-input:focus {
      border-color: var(--blue);
      box-shadow: 0 0 0 3px rgba(var(--fb-primary-rgb),.1);
      background: #fff;
    }
    .search-input::placeholder { color: var(--faint); }
    .search-clear {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      color: var(--faint);
      padding: 2px;
      display: grid;
      place-items: center;
    }
    .filter-row { display: flex; flex-wrap: wrap; gap: 5px; }
    .chip {
      border: 1px solid var(--border);
      background: #fff;
      color: var(--muted);
      border-radius: 20px;
      padding: 4px 11px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: all .15s;
    }
    .chip:hover { border-color: var(--blue); color: var(--blue); }
    .chip.active { background: var(--navy); color: #fff; border-color: var(--navy); }
    .chip.reset {
      background: var(--surface);
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--faint);
    }

    /* Messages */
    .msg-row { padding: 8px 16px; }
    .msg {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: var(--r-sm);
      font-size: 12px;
    }
    .msg.error { background: rgba(192,57,43,.07); border: 1px solid rgba(192,57,43,.22); color: var(--red); }
    .msg.success { background: rgba(21,127,69,.08); border: 1px solid rgba(21,127,69,.22); color: var(--green); }

    /* Table */
    .tbl-wrap { overflow-x: auto; max-height: 48vh; overflow-y: auto; }
    table { width: 100%; border-collapse: collapse; }
    th {
      font-size: 10px;
      font-weight: 600;
      color: var(--faint);
      text-transform: uppercase;
      letter-spacing: .06em;
      padding: 8px 14px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
      text-align: left;
      position: sticky;
      top: 0;
    }
    td {
      padding: 9px 14px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 12px;
      white-space: nowrap;
      vertical-align: middle;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8fafc; cursor: pointer; }
    tr.selected td { background: var(--fb-primary-soft); }

    .user-cell { display: flex; align-items: center; gap: 9px; }
    .av {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 10px;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
      background: linear-gradient(135deg, var(--blue), var(--blue2));
    }
    .av[data-role="specialist"] { background: linear-gradient(135deg, #7e22ce, #a855f7); }
    .av[data-role="adolescent"] { background: linear-gradient(135deg, #d97706, #f59e0b); }
    .av[data-role="admin"] { background: linear-gradient(135deg, #dc2626, #ef4444); }
    .av.small { width: 28px; height: 28px; font-size: 9px; }
    .av.large { width: 42px; height: 42px; font-size: 13px; }

    .u-name { margin: 0; font-weight: 600; font-size: 12px; color: var(--text); }
    .u-email { font-size: 10px; color: var(--faint); }

    .role-badge {
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .05em;
    }
    .rb-parent { background: var(--fb-primary-soft); color: var(--fb-primary-strong); }
    .rb-specialist { background: #fdf4ff; color: #7e22ce; }
    .rb-adolescent { background: #fffbeb; color: #92400e; }
    .rb-admin { background: #fef2f2; color: #991b1b; }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 500;
      color: var(--faint);
    }
    .status-pill::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--faint);
      flex-shrink: 0;
    }
    .status-pill.active { color: var(--green); }
    .status-pill.active::before { background: var(--green); }

    .date-cell { color: var(--muted); font-size: 11px; }

    .row-actions { display: flex; gap: 4px; }
    .act-btn {
      border: 1px solid var(--border);
      background: #fff;
      color: var(--muted);
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all .15s;
      white-space: nowrap;
    }
    .act-btn:hover { border-color: var(--blue); color: var(--blue); }
    .act-btn.primary { background: var(--navy); color: #fff; border-color: var(--navy); }
    .act-btn.primary:hover { background: var(--navy2); }
    .act-btn.danger:hover { border-color: var(--red); color: var(--red); }
    .act-btn:disabled { opacity: .55; cursor: not-allowed; }

    /* Confirmation de suppression */
    .confirm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(2px);
      display: grid;
      place-items: center;
      z-index: 1000;
      padding: 1rem;
      animation: fadeIn .18s ease-out;
    }
    .confirm-modal {
      width: 100%;
      max-width: 420px;
      background: #fff;
      border-radius: var(--r, 16px);
      box-shadow: 0 30px 70px rgba(15, 23, 42, 0.25);
      padding: 1.75rem;
      text-align: center;
      animation: scaleIn .18s ease-out;
    }
    .confirm-icon {
      width: 52px;
      height: 52px;
      margin: 0 auto 1rem;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: rgba(var(--fb-danger-rgb), 0.1);
      color: var(--red);
    }
    .confirm-modal h3 { margin: 0 0 .6rem; font-size: 1.15rem; font-weight: 800; color: var(--fb-text); }
    .confirm-modal p { margin: 0 0 .6rem; font-size: .9rem; color: var(--muted); line-height: 1.5; }
    .confirm-modal p strong { color: var(--fb-text); }
    .confirm-warning { color: var(--red) !important; font-weight: 600; }
    .confirm-hint { font-size: .78rem !important; text-transform: uppercase; letter-spacing: .04em; font-weight: 700; }
    .confirm-actions { display: flex; gap: .6rem; margin-top: 1.25rem; }
    .confirm-actions .act-btn {
      flex: 1;
      padding: .65rem 1rem;
      font-size: .85rem;
      border-radius: 10px;
    }
    .confirm-actions .act-btn.danger { background: var(--red); color: #fff; border-color: var(--red); }
    .confirm-actions .act-btn.danger:hover:not(:disabled) { opacity: .9; }

    @media (max-width: 480px) {
      .confirm-modal { padding: 1.25rem; }
      .confirm-actions { flex-direction: column-reverse; }
    }

    .empty-row {
      text-align: center;
      padding: 32px !important;
      color: var(--faint);
    }
    .empty-row svg { display: block; margin: 0 auto 8px; stroke: var(--faint); }
    .empty-row p { margin: 0; font-size: 12px; }

    .card-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-top: 1px solid var(--border);
      font-size: 11px;
      color: var(--faint);
    }
    .foot-hint { font-style: italic; }

    /* Loading */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px;
      gap: 10px;
      color: var(--faint);
      font-size: 12px;
    }
    .loading-state.compact { padding: 14px; flex-direction: row; }
    .loader {
      width: 20px;
      height: 20px;
      border: 2px solid var(--border);
      border-top-color: var(--blue);
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    .loader.small { width: 14px; height: 14px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Right Column ──────────────────── */
    .right-col { display: flex; flex-direction: column; gap: 12px; }
    .r-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 14px;
    }
    .r-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 10px;
    }
    .r-head.compact { margin-bottom: 8px; }
    .r-head h4 { margin: 0; font-size: 13px; font-weight: 700; color: var(--text); }
    .r-head p { margin: 2px 0 0; font-size: 10px; color: var(--muted); }
    .r-count {
      min-width: 26px;
      height: 26px;
      background: var(--fb-primary-soft);
      color: var(--fb-primary-strong);
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 10px;
      font-weight: 700;
    }
    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--faint);
      padding: 2px;
      display: grid;
      place-items: center;
      transition: color .15s;
    }
    .close-btn:hover { color: var(--text); }

    /* Quick list */
    .quick-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 180px;
      overflow-y: auto;
    }
    .q-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 8px;
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      cursor: pointer;
      background: #fff;
      text-align: left;
      width: 100%;
      transition: all .15s;
    }
    .q-item:hover, .q-item.active { border-color: var(--blue); background: var(--fb-primary-soft); }
    .q-body { min-width: 0; }
    .q-body strong { font-size: 11px; color: var(--text); display: block; font-family: inherit; }
    .q-body span { font-size: 10px; color: var(--faint); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .q-body small { font-size: 9px; color: var(--muted); font-family: inherit; }
    .empty-list { font-size: 11px; color: var(--faint); text-align: center; padding: 8px; }

    /* Detail card */
    .detail-card { }
    .detail-person {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: var(--surface);
      border-radius: var(--r-sm);
      margin-bottom: 10px;
    }
    .dp-name { display: block; font-size: 13px; font-weight: 700; color: var(--text); }
    .dp-email { font-size: 10px; color: var(--faint); }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 10px;
    }
    .dg-item label {
      display: block;
      font-size: 9px;
      font-weight: 700;
      color: var(--faint);
      text-transform: uppercase;
      letter-spacing: .06em;
      margin-bottom: 2px;
    }
    .dg-item p { margin: 0; font-size: 11px; font-weight: 600; color: var(--text); }
    .det-actions { display: flex; gap: 6px; }
    .da-btn {
      flex: 1;
      border: 1px solid var(--border);
      background: #fff;
      color: var(--muted);
      border-radius: var(--r-sm);
      padding: 7px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all .15s;
    }
    .da-btn:hover { border-color: var(--blue); color: var(--blue); }
    .da-btn.primary { background: var(--navy); color: #fff; border-color: var(--navy); }
    .da-btn.primary:hover { background: var(--navy2); }

    /* No selection */
    .no-sel {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 120px;
      text-align: center;
    }
    .no-sel svg { stroke: var(--faint); }
    .no-sel p { margin: 0; font-size: 11px; color: var(--faint); line-height: 1.5; }

    /* ── Form Card ─────────────────────── */
    .form-card h4 { margin: 0 0 2px; font-size: 14px; font-weight: 700; color: var(--text); }
    .form-subtitle { font-size: 11px; color: var(--muted); margin: 0 0 14px; }

    .adm-form { display: flex; flex-direction: column; gap: 10px; }
    .f-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .f-row.triple { grid-template-columns: 1fr 1fr 1fr; }

    .f-group { display: flex; flex-direction: column; gap: 4px; }
    .f-group label {
      font-size: 11px;
      font-weight: 600;
      color: var(--muted);
    }
    .f-input {
      border: 1.5px solid var(--border);
      border-radius: var(--r-sm);
      padding: 7px 10px;
      font-size: 12px;
      font-family: inherit;
      color: var(--text);
      background: var(--surface);
      outline: none;
      transition: border .15s, box-shadow .15s;
      width: 100%;
    }
    .f-input:focus {
      border-color: var(--blue);
      box-shadow: 0 0 0 3px rgba(var(--fb-primary-rgb),.1);
      background: #fff;
    }
    .f-input.invalid { border-color: var(--red); }
    .f-input::placeholder { color: var(--faint); }
    .f-select { appearance: none; cursor: pointer; }

    .sub-section {
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .sub-section legend {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 700;
      color: var(--blue);
      padding: 0 4px;
    }
    .sub-section legend svg { stroke: var(--blue); fill: none; }

    .consent-group { justify-content: flex-end; }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--muted);
      cursor: pointer;
    }
    .f-checkbox { width: 14px; height: 14px; cursor: pointer; accent-color: var(--blue); }

    .form-actions { display: flex; gap: 8px; margin-top: 4px; }
    .btn-submit {
      flex: 1;
      height: 48px;
      background: linear-gradient(135deg, var(--blue) 0%, var(--navy) 100%);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition: background .15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .btn-submit:hover:not(:disabled) { background: var(--navy2); }
    .btn-submit:disabled { opacity: .5; cursor: not-allowed; }
    .saving-state { display: flex; align-items: center; gap: 6px; }
    .mini-spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255,255,255,.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    .btn-cancel {
      border: 1px solid var(--border);
      background: #fff;
      color: var(--muted);
      border-radius: var(--r-sm);
      padding: 0 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all .15s;
    }
    .btn-cancel:hover { border-color: var(--blue); color: var(--blue); }

    /* ── Responsive ────────────────────── */
    @media (max-width: 1280px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .dash-grid { grid-template-columns: 1fr; }
      .f-row.triple { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 768px) {
      .f-row { grid-template-columns: 1fr; }
      .f-row.triple { grid-template-columns: 1fr; }
      .row-actions { flex-wrap: wrap; }
    }
  `],
})
export class AdminDashboardPage implements OnInit {
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly searchTerm = signal('');
  readonly statusFilter = signal<'all' | 'active' | 'inactive' | 'admin' | 'specialist' | 'adolescent'>('all');
  readonly moderationItems = signal<ModerationItem[]>([]);
  readonly moderating = signal<string | null>(null);
  readonly users = signal<AdminUser[]>([]);
  readonly selectedUser = signal<AdminUser | null>(null);
  readonly editingUserId = signal<string | null>(null);
  readonly userPendingDelete = signal<AdminUser | null>(null);
  readonly deleting = signal(false);
  readonly editMode = computed(() => !!this.editingUserId());

  readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.statusFilter();
    return this.users().filter((user) => {
      const matchesTerm = !term ||
        [user.firstName, user.lastName, user.email, user.phone, user.role]
          .filter(Boolean).join(' ').toLowerCase().includes(term);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && user.isActive) ||
        (filter === 'inactive' && !user.isActive) ||
        (filter === 'admin' && user.role === 'admin') ||
        (filter === 'specialist' && user.role === 'specialist') ||
        (filter === 'adolescent' && user.role === 'adolescent');
      return matchesTerm && matchesFilter;
    });
  });

  readonly activeCount = computed(() => this.users().filter(u => u.isActive).length);
  readonly inactiveCount = computed(() => this.users().filter(u => !u.isActive).length);
  readonly adminCount = computed(() => this.users().filter(u => u.role === 'admin').length);
  // Alimente le sélecteur "Parent" du formulaire adolescent : évite de demander à l'admin
  // de saisir un ObjectId brut qu'aucune interface ne lui montrait nulle part.
  readonly parentAccounts = computed(() => this.users().filter(u => u.role === 'parent'));

  readonly form = this.fb.group({
    firstName:       ['', [Validators.required]],
    lastName:        ['', [Validators.required]],
    email:           ['', [Validators.required, Validators.email]],
    phone:           [''],
    role:            ['parent', [Validators.required]],
    password:        [''],
    confirmPassword: [''],
    specialization:  [''],
    licenseNumber:   [''],
    city:            [''],
    tariff:          [''],
    parentId:        [''],
    birthDate:       [''],
    consentGiven:    [false],
  });

  constructor(
    private readonly http: HttpClient,
    private readonly fb: FormBuilder,
  ) {
    this.form.get('role')?.valueChanges.subscribe(() => this.applyConditionalValidation());
    this.applyConditionalValidation();
  }

  ngOnInit(): void { this.loadUsers(); this.loadModerationQueue(); }

  setSearchTerm(t: string): void { this.searchTerm.set(t); }
  setFilter(f: 'all'|'active'|'inactive'|'admin'|'specialist'|'adolescent'): void { this.statusFilter.set(f); }
  clearFilters(): void { this.searchTerm.set(''); this.statusFilter.set('all'); }

  loadUsers(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.http.get<{ users: AdminUser[] }>(`${API_BASE_URL}/admin/accounts`, { withCredentials: true }).subscribe({
      next: r => { this.users.set(r.users || []); this.loading.set(false); },
      error: e => { this.errorMessage.set(e?.error?.message || 'Impossible de charger les comptes.'); this.loading.set(false); },
    });
  }

  loadModerationQueue(): void {
    this.http.get<{ items: ModerationItem[] }>(`${API_BASE_URL}/admin/content/moderation-queue`, { withCredentials: true }).subscribe({
      next: r => this.moderationItems.set(r.items || []),
      error: () => { /* non bloquant : le reste du tableau de bord reste utilisable */ },
    });
  }

  // Réutilise directement les vraies routes de gestion des ressources éducatives
  // (déjà construites et testées côté Espace Éducatif) plutôt que d'inventer un mécanisme
  // d'approbation séparé pour la file de modération.
  approveModerationItem(item: ModerationItem): void {
    this.moderating.set(item.id);
    this.http.patch<{ message: string }>(`${API_BASE_URL}/education/admin/resources/${item.id}/publish`, {}, { withCredentials: true }).subscribe({
      next: r => {
        this.moderating.set(null);
        this.flashSuccess(r.message || 'Ressource publiée.');
        this.loadModerationQueue();
      },
      error: e => { this.moderating.set(null); this.flashError(e?.error?.message || 'Publication impossible.'); },
    });
  }

  rejectModerationItem(item: ModerationItem): void {
    this.moderating.set(item.id);
    this.http.delete<{ message: string }>(`${API_BASE_URL}/education/admin/resources/${item.id}`, { withCredentials: true }).subscribe({
      next: r => {
        this.moderating.set(null);
        this.flashSuccess(r.message || 'Ressource supprimée.');
        this.loadModerationQueue();
      },
      error: e => { this.moderating.set(null); this.flashError(e?.error?.message || 'Suppression impossible.'); },
    });
  }

  viewUser(user: AdminUser): void {
    this.http.get<{ user: AdminUser }>(`${API_BASE_URL}/admin/accounts/${user._id}`, { withCredentials: true }).subscribe({
      next: r => this.selectedUser.set(r.user),
      error: e => this.errorMessage.set(e?.error?.message || 'Impossible de consulter le compte.'),
    });
  }

  editUser(user: AdminUser): void {
    this.editingUserId.set(user._id);
    this.form.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      password: '',
      confirmPassword: '',
      specialization: user.specialistProfile?.specialization || '',
      licenseNumber: user.specialistProfile?.licenseNumber || '',
      city: user.specialistProfile?.city || '',
      tariff: user.specialistProfile?.tariff != null ? String(user.specialistProfile.tariff) : '',
      parentId: user.adolescentProfile?.parentId || '',
      birthDate: user.adolescentProfile?.birthDate?.slice(0, 10) || '',
      consentGiven: !!user.adolescentProfile?.consentGiven,
    });
    this.applyConditionalValidation();
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const payload = this.buildPayload();
    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    const url = this.editMode()
      ? `${API_BASE_URL}/admin/accounts/${this.editingUserId()}`
      : `${API_BASE_URL}/admin/accounts`;
    const req = this.editMode()
      ? this.http.patch<{ message: string }>(url, payload, { withCredentials: true })
      : this.http.post<{ message: string }>(url, payload, { withCredentials: true });
    req.subscribe({
      next: r => {
        this.saving.set(false);
        this.flashSuccess(r.message || (this.editMode() ? 'Compte mis à jour.' : 'Compte créé.'));
        this.resetForm();
        this.loadUsers();
      },
      error: e => { this.saving.set(false); this.flashError(e?.error?.message || 'Opération impossible.'); },
    });
  }

  deleteUser(user: AdminUser): void {
    this.userPendingDelete.set(user);
  }

  cancelDelete(): void {
    if (this.deleting()) return;
    this.userPendingDelete.set(null);
  }

  confirmDelete(): void {
    const user = this.userPendingDelete();
    if (!user || this.deleting()) return;

    this.deleting.set(true);
    this.http.delete<{ message: string }>(`${API_BASE_URL}/admin/accounts/${user._id}`, { withCredentials: true }).subscribe({
      next: r => {
        this.deleting.set(false);
        this.userPendingDelete.set(null);
        this.flashSuccess(r.message || 'Compte supprimé.');
        if (this.selectedUser()?._id === user._id) this.selectedUser.set(null);
        if (this.editingUserId() === user._id) this.resetForm();
        this.loadUsers();
      },
      error: e => {
        this.deleting.set(false);
        this.userPendingDelete.set(null);
        this.flashError(e?.error?.message || 'Suppression impossible.');
      },
    });
  }

  toggleStatus(user: AdminUser): void {
    this.http.patch<{ message: string }>(`${API_BASE_URL}/admin/accounts/${user._id}/status`, { isActive: !user.isActive }, { withCredentials: true })
      .subscribe({
        next: r => {
          this.flashSuccess(r.message || 'Statut mis à jour.');
          this.loadUsers();
        },
        error: e => this.flashError(e?.error?.message || 'Mise à jour impossible.'),
      });
  }

  private flashSuccess(message: string): void {
    this.errorMessage.set('');
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(''), 4000);
  }

  private flashError(message: string): void {
    this.successMessage.set('');
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(''), 6000);
  }

  resetForm(): void {
    this.editingUserId.set(null);
    this.selectedUser.set(null);
    this.form.reset({ firstName:'', lastName:'', email:'', phone:'', role:'parent', password:'', confirmPassword:'', specialization:'', licenseNumber:'', city:'', tariff:'', parentId:'', birthDate:'', consentGiven: false });
    this.applyConditionalValidation();
  }

  isSpecialist(): boolean { return this.form.get('role')?.value === 'specialist'; }
  isAdolescent(): boolean { return this.form.get('role')?.value === 'adolescent'; }

  initials(user: AdminUser): string {
    return `${(user.firstName || '').trim().charAt(0)}${(user.lastName || '').trim().charAt(0)}`.toUpperCase() || 'U';
  }

  formatDate(date?: string): string {
    if (!date) return '—';
    try { return new Date(date).toLocaleDateString('fr-FR'); } catch { return '—'; }
  }

  exportToExcel(): void { this.downloadFile(`${API_BASE_URL}/admin/exports/accounts-excel`, 'comptes-familybalance.xlsx'); }
  exportToWord():  void { this.downloadFile(`${API_BASE_URL}/admin/exports/accounts-word`,  'comptes-familybalance.docx'); }
  exportToPDF():   void { this.downloadFile(`${API_BASE_URL}/admin/exports/accounts-pdf`,   'comptes-familybalance.pdf'); }

  private applyConditionalValidation(): void {
    const role = this.form.get('role')?.value;
    const editing = this.editMode();
    this.setV('specialization', role === 'specialist' ? [Validators.required] : []);
    this.setV('licenseNumber',  role === 'specialist' ? [Validators.required] : []);
    this.setV('parentId',       role === 'adolescent' ? [Validators.required] : []);
    this.setV('birthDate',      role === 'adolescent' ? [Validators.required] : []);
    this.setV('consentGiven',   role === 'adolescent' ? [Validators.requiredTrue] : []);
    this.setV('password',        editing ? [] : [Validators.required, Validators.minLength(10)]);
    this.setV('confirmPassword', editing ? [] : [Validators.required, Validators.minLength(10)]);
  }

  private setV(ctrl: string, v: any[]): void {
    const c = this.form.get(ctrl);
    if (!c) return;
    c.setValidators(v);
    c.updateValueAndValidity({ emitEvent: false });
  }

  private buildPayload(): Record<string, unknown> {
    const v = this.form.getRawValue();
    const p: Record<string, unknown> = { firstName: v.firstName, lastName: v.lastName, email: v.email, phone: v.phone || undefined, role: v.role };
    if (v.password) { p['password'] = v.password; p['confirmPassword'] = v.confirmPassword; }
    if (v.role === 'specialist') p['specialistProfile'] = { specialization: v.specialization || undefined, licenseNumber: v.licenseNumber || undefined, city: v.city || undefined, tariff: v.tariff ? Number(v.tariff) : undefined };
    if (v.role === 'adolescent') p['adolescentProfile'] = { parentId: v.parentId || undefined, birthDate: v.birthDate || undefined, consentGiven: !!v.consentGiven };
    return p;
  }

  private downloadFile(url: string, filename: string): void {
    this.http.get(url, { responseType: 'blob', withCredentials: true }).subscribe({
      next: (blob) => {
        if (blob.type === 'application/json') {
          const reader = new FileReader();
          reader.onload = () => { try { this.errorMessage.set(JSON.parse(reader.result as string).message || 'Erreur.'); } catch { this.errorMessage.set('Erreur lors du téléchargement.'); } };
          reader.readAsText(blob); return;
        }
        const link = document.createElement('a');
        const url2 = URL.createObjectURL(blob);
        link.href = url2; link.download = filename;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link); URL.revokeObjectURL(url2);
        this.successMessage.set('Fichier téléchargé avec succès.');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: e => this.errorMessage.set(e?.error?.message || 'Erreur lors du téléchargement.'),
    });
  }
}