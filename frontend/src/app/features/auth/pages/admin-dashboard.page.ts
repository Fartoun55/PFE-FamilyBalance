import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { API_BASE_URL } from '../../../core/config/api.config';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';

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
  imports: [CommonModule, ReactiveFormsModule, MatSelectModule, MatCheckboxModule, MatIconModule, PageHeaderComponent, StatCardComponent],
  template: `
        <!-- Content -->
        <div class="content">

          <app-page-header
            eyebrow="Administration"
            title="Gestion des utilisateurs"
            subtitle="Créez, modifiez, activez ou supprimez les comptes, et modérez les ressources en attente."
            illustration="admin"
          >
            <span class="admin-badge"><mat-icon>admin_panel_settings</mat-icon>Administrateur</span>
          </app-page-header>

          <div class="kpi-grid">
            <app-stat-card icon="groups" label="Total utilisateurs" [value]="users().length" tone="primary"></app-stat-card>
            <app-stat-card icon="check_circle" label="Comptes actifs" [value]="activeCount()" tone="success"></app-stat-card>
            <app-stat-card icon="pause_circle" label="Comptes inactifs" [value]="inactiveCount()" tone="warning"></app-stat-card>
            <app-stat-card icon="admin_panel_settings" label="Administrateurs" [value]="adminCount()" tone="neutral"></app-stat-card>
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
                <div class="fb-alert fb-alert--error" role="alert" *ngIf="errorMessage()">
                  <mat-icon>error_outline</mat-icon><span>{{ errorMessage() }}</span>
                </div>
                <div class="fb-alert fb-alert--success" role="status" *ngIf="successMessage()">
                  <mat-icon>check_circle</mat-icon><span>{{ successMessage() }}</span>
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
                        <span class="role-badge" [ngClass]="'rb-' + user.role">{{ roleLabel(user.role) }}</span>
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
                <span class="foot-hint">Cliquez sur une ligne pour afficher le détail.</span>
              </div>
            </div>

            <!-- Right column -->
            <aside class="right-col">

              <!-- Detail card -->
              <div class="r-card detail-card" *ngIf="selectedUser(); else noSelTpl">
                <div class="r-head compact">
                  <div>
                    <h4>Détail compte</h4>
                    <p>{{ roleLabel(selectedUser()?.role) }} · {{ selectedUser()?.isActive ? 'Actif' : 'Inactif' }}</p>
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
                  <div class="dg-item"><label>Rôle</label><p>{{ roleLabel(selectedUser()?.role) }}</p></div>
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
                      <input class="f-input" formControlName="phone" placeholder="+216 20 123 456"/>
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
    <div class="fb-modal-backdrop" *ngIf="userPendingDelete() as target" (click)="cancelDelete()">
      <div
        class="fb-modal confirm-modal"
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
    :host { display: block; }
    .content { display: flex; flex-direction: column; gap: 20px; }
    .content > app-page-header { display: block; margin-bottom: -4px; }

    .admin-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--fb-radius-pill);
      background: var(--fb-ink);
      color: #fff;
      font-size: 13.5px;
      font-weight: 700;
    }
    .admin-badge mat-icon { width: 18px; height: 18px; font-size: 18px; color: var(--fb-accent); }

    .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }

    /* Cartes */
    .moderation-card, .table-card, .r-card {
      padding: clamp(18px, 2.5vw, 24px);
      border-radius: var(--fb-radius-md);
      background: var(--fb-surface);
      box-shadow: var(--fb-elev-1);
      min-width: 0;
    }
    .card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
    .card-head h3, .r-card h4 { margin: 0; font-size: 17px; font-weight: 700; }
    .card-head p, .r-head p, .form-subtitle { margin: 2px 0 0; color: var(--fb-text-mid); font-size: 13.5px; }
    .head-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }

    /* Modération */
    .moderation-card { border-left: 4px solid var(--fb-accent); }
    .moderation-list { display: flex; flex-direction: column; gap: 8px; }
    .moderation-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 14px; border-radius: var(--fb-radius-sm); background: var(--fb-surface-alt); }
    .moderation-info { display: flex; flex-direction: column; min-width: 0; }
    .moderation-info strong { font-size: 14.5px; }
    .moderation-info span { color: var(--fb-muted); font-size: 13px; }
    .moderation-actions { display: flex; gap: 8px; }

    /* Grille principale */
    .dash-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 24px; align-items: start; }
    .right-col { display: flex; flex-direction: column; gap: 20px; position: sticky; top: 92px; }

    /* Boutons */
    .export-group { display: inline-flex; padding: 4px; border-radius: var(--fb-radius-pill); background: var(--fb-surface-alt); }
    .export-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border: none;
      border-radius: var(--fb-radius-pill);
      background: transparent;
      color: var(--fb-text-mid);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .export-btn:hover { background: var(--fb-surface); color: var(--fb-text); box-shadow: var(--fb-elev-1); }
    .btn-add, .btn-submit, .btn-cancel, .da-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 40px;
      padding: 0 18px;
      border: 1px solid transparent;
      border-radius: var(--fb-radius-pill);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-add, .btn-submit, .da-btn.primary { background: var(--fb-primary); color: #fff; }
    .btn-add:hover, .btn-submit:hover:not(:disabled), .da-btn.primary:hover { background: var(--fb-primary-strong); }
    .btn-cancel, .da-btn { background: var(--fb-surface); border-color: var(--fb-border-strong); color: var(--fb-text); }
    .btn-cancel:hover, .da-btn:not(.primary):hover { background: var(--fb-surface-alt); }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    .act-btn {
      padding: 5px 12px;
      border: 1px solid var(--fb-border);
      border-radius: var(--fb-radius-pill);
      background: var(--fb-surface);
      color: var(--fb-text-mid);
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }
    .act-btn:hover:not(:disabled) { border-color: var(--fb-border-strong); color: var(--fb-text); }
    .act-btn.primary { border-color: rgba(var(--fb-primary-rgb), 0.3); color: var(--fb-primary-strong); }
    .act-btn.primary:hover:not(:disabled) { background: var(--fb-primary-soft); }
    .act-btn.danger { border-color: rgba(var(--fb-danger-rgb), 0.3); color: var(--fb-danger); }
    .act-btn.danger:hover:not(:disabled) { background: rgba(var(--fb-danger-rgb), 0.06); }
    .act-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Recherche et filtres */
    .toolbar { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
    .search-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 44px;
      padding: 0 14px;
      border: 1.5px solid var(--fb-border);
      border-radius: var(--fb-radius-sm);
    }
    .search-wrap:focus-within { border-color: var(--fb-primary); box-shadow: 0 0 0 4px rgba(var(--fb-primary-rgb), 0.12); }
    .search-icon { width: 16px; height: 16px; stroke: var(--fb-faint); flex-shrink: 0; }
    .search-input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: 14px; color: var(--fb-text); }
    .search-clear { display: grid; place-items: center; width: 26px; height: 26px; border: none; border-radius: 50%; background: var(--fb-surface-alt); color: var(--fb-text-mid); cursor: pointer; }
    .filter-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border: 1px solid var(--fb-border);
      border-radius: var(--fb-radius-pill);
      background: var(--fb-surface);
      color: var(--fb-text-mid);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .chip:hover { border-color: var(--fb-border-strong); }
    .chip.active { border-color: var(--fb-ink); background: var(--fb-ink); color: #fff; }
    .chip.reset { border-style: dashed; }
    .msg-row { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }

    /* Tableau */
    .tbl-wrap { overflow-x: auto; margin: 0 calc(-1 * clamp(18px, 2.5vw, 24px)); }
    .tbl-wrap table { min-width: 680px; }
    .tbl-wrap th:first-child, .tbl-wrap td:first-child { padding-left: clamp(18px, 2.5vw, 24px); }
    .tbl-wrap tbody tr { cursor: pointer; }
    .tbl-wrap tbody tr.selected { background: var(--fb-primary-soft); }
    .user-cell { display: flex; align-items: center; gap: 12px; }
    .u-name { margin: 0; font-weight: 700; font-size: 14px; }
    .u-email { color: var(--fb-muted); font-size: 12.5px; }
    .date-cell { color: var(--fb-text-mid); font-size: 13.5px; white-space: nowrap; }
    .row-actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .empty-row { padding: 40px 16px !important; text-align: center; color: var(--fb-muted); }
    .empty-row p { margin: 8px 0 0; }

    .av {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: var(--fb-primary);
      color: #fff;
      font-size: 13px;
      font-weight: 700;
    }
    .av[data-role="admin"] { background: var(--fb-ink); }
    .av[data-role="specialist"] { background: var(--fb-ink-2); }
    .av[data-role="adolescent"] { background: var(--fb-accent); color: var(--fb-ink); }
    .av.large { width: 54px; height: 54px; border-radius: 18px; font-size: 18px; }

    .role-badge, .status-pill { display: inline-flex; padding: 3px 10px; border-radius: var(--fb-radius-pill); font-size: 12px; font-weight: 700; white-space: nowrap; }
    .role-badge { background: var(--fb-surface-alt); color: var(--fb-text-mid); }
    .rb-parent { background: var(--fb-primary-soft); color: var(--fb-primary-strong); }
    .rb-adolescent { background: var(--fb-accent-soft); color: var(--fb-warning-ink); }
    .rb-admin { background: rgba(var(--fb-ink-rgb), 0.08); color: var(--fb-ink); }
    .status-pill { background: var(--fb-surface-alt); color: var(--fb-muted); }
    .status-pill.active { background: rgba(var(--fb-success-rgb), 0.1); color: var(--fb-success-ink); }

    .card-foot { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 14px; color: var(--fb-muted); font-size: 13px; }

    /* Détail */
    .r-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
    .close-btn { display: grid; place-items: center; width: 32px; height: 32px; border: none; border-radius: 50%; background: var(--fb-surface-alt); color: var(--fb-text-mid); cursor: pointer; }
    .close-btn:hover { color: var(--fb-text); }
    .detail-person { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
    .dp-name { display: block; font-size: 16px; }
    .dp-email { color: var(--fb-text-mid); font-size: 13.5px; overflow-wrap: anywhere; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
    .dg-item { padding: 10px 12px; border-radius: 12px; background: var(--fb-surface-alt); }
    .dg-item label { font-size: 12px; color: var(--fb-muted); }
    .dg-item p { margin: 2px 0 0; font-weight: 700; font-size: 14px; }
    .det-actions { display: flex; gap: 8px; }
    .det-actions > * { flex: 1; }
    .no-sel { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; color: var(--fb-muted); }
    .no-sel p { margin: 0; font-size: 14px; }

    /* Formulaire */
    .form-subtitle { margin-bottom: 16px; }
    .adm-form { display: flex; flex-direction: column; gap: 12px; }
    .f-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .f-row.triple { grid-template-columns: minmax(0, 1fr); }
    .f-group { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
    .f-group > label { font-size: 12.5px; font-weight: 600; color: var(--fb-text); }
    .f-input {
      width: 100%;
      height: 42px;
      padding: 0 12px;
      border: 1.5px solid var(--fb-border);
      border-radius: var(--fb-radius-sm);
      background: var(--fb-surface);
      color: var(--fb-text);
      font-size: 14px;
    }
    .f-input:focus { outline: none; border-color: var(--fb-primary); box-shadow: 0 0 0 4px rgba(var(--fb-primary-rgb), 0.12); }
    .f-input.invalid { border-color: var(--fb-danger); }
    .f-select { cursor: pointer; }
    .sub-section { margin: 0; padding: 14px; border: 1px dashed var(--fb-border-strong); border-radius: var(--fb-radius-sm); }
    .sub-section legend { display: inline-flex; align-items: center; gap: 6px; padding: 0 6px; font-size: 12.5px; font-weight: 700; color: var(--fb-text-mid); }
    .consent-group { justify-content: center; }
    .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 13.5px; cursor: pointer; }
    .f-checkbox { width: 18px; height: 18px; accent-color: var(--fb-primary); }
    .form-actions { display: flex; gap: 8px; margin-top: 4px; }
    .form-actions > * { flex: 1; }
    .saving-state { display: inline-flex; align-items: center; gap: 8px; }
    .mini-spinner { width: 16px; height: 16px; border: 2px solid rgba(255, 255, 255, 0.35); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }

    /* Chargement */
    .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 16px; color: var(--fb-muted); }
    .loading-state p { margin: 0; }
    .loader { width: 28px; height: 28px; border: 3px solid rgba(var(--fb-primary-rgb), 0.18); border-top-color: var(--fb-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }

    /* Confirmation de suppression */
    .confirm-modal { display: flex; flex-direction: column; gap: 10px; max-width: 460px; text-align: center; }
    .confirm-icon { display: grid; place-items: center; width: 56px; height: 56px; margin: 0 auto 4px; border-radius: 18px; background: rgba(var(--fb-danger-rgb), 0.08); color: var(--fb-danger); }
    .confirm-modal h3 { margin: 0; font-size: 19px; }
    .confirm-modal p { margin: 0; color: var(--fb-text-mid); font-size: 14.5px; }
    .confirm-warning { padding: 10px 12px; border-radius: var(--fb-radius-sm); background: var(--fb-accent-soft); color: var(--fb-warning-ink) !important; text-align: left; }
    .confirm-hint { font-size: 13px !important; color: var(--fb-muted) !important; }
    .confirm-actions { display: flex; justify-content: center; gap: 10px; margin-top: 8px; }
    .confirm-actions .act-btn { padding: 10px 18px; font-size: 14px; }

    @media (max-width: 1280px) {
      .dash-grid { grid-template-columns: minmax(0, 1fr); }
      .right-col { position: static; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }
    }

    @media (max-width: 1024px) {
      .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 768px) {
      .right-col { grid-template-columns: minmax(0, 1fr); }
      .f-row { grid-template-columns: minmax(0, 1fr); }
    }

    @media (max-width: 480px) {
      .kpi-grid { grid-template-columns: minmax(0, 1fr); }
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

  roleLabel(role?: string): string {
    const labels: Record<string, string> = {
      parent: 'Parent',
      adolescent: 'Adolescent',
      specialist: 'Spécialiste',
      admin: 'Administrateur',
    };
    return role ? labels[role] || role : '—';
  }

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