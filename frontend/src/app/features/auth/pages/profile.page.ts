import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { LinkedAdolescentProfile, UserRole } from '../../../core/models/auth.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

interface QuickAction {
  label: string;
  description: string;
  icon: string;
  route: string;
  roles: UserRole[];
}

/** Raccourcis affichés selon le rôle (alignés sur les droits de l'API). */
const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Administration', description: 'Gérer les comptes et les contenus', icon: 'admin_panel_settings', route: '/admin/dashboard', roles: ['admin'] },
  { label: 'Tableau de bord famille', description: 'Suivre les profils enfants rattachés', icon: 'space_dashboard', route: '/family/dashboard', roles: ['parent'] },
  { label: 'Mon espace', description: 'Voir mon suivi personnalisé', icon: 'space_dashboard', route: '/dashboard/adolescent', roles: ['adolescent'] },
  { label: 'Évaluation', description: 'Faire le point sur le rapport aux écrans', icon: 'quiz', route: '/survey/dynamic', roles: ['parent', 'adolescent'] },
  { label: 'Résultats', description: 'Consulter les scores obtenus', icon: 'insights', route: '/scoring/results', roles: ['parent', 'adolescent'] },
  { label: 'Téléconsultation', description: 'Rendez-vous, visio et messagerie sécurisée', icon: 'video_call', route: '/teleconsultation', roles: ['parent', 'adolescent', 'specialist'] },
  { label: 'Ressources éducatives', description: 'Articles, parcours et boîte à outils', icon: 'menu_book', route: '/education/resources', roles: ['parent', 'adolescent', 'specialist', 'admin'] },
];

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, PageHeaderComponent],
  template: `
    <app-page-header eyebrow="Mon compte" title="Mon profil" subtitle="Vos informations personnelles et vos accès rapides." illustration="profile"></app-page-header>

    <div class="fb-loading" *ngIf="loading()">
      <span class="fb-spinner"></span>
      Chargement du profil…
    </div>

    <ng-container *ngIf="!loading()">
      <div class="fb-alert fb-alert--error page-alert" role="alert" *ngIf="errorMessage()">
        <mat-icon>error_outline</mat-icon><span>{{ errorMessage() }}</span>
      </div>

      <div class="profile-grid">
        <!-- Colonne gauche -->
        <div class="col">
          <section class="fb-card identity">
            <div class="identity-top">
              <span class="avatar" aria-hidden="true">{{ initials() }}</span>
              <div class="identity-text">
                <h2>{{ user()?.firstName }} {{ user()?.lastName }}</h2>
                <p>{{ user()?.email }}</p>
                <span class="fb-badge">{{ roleLabel() }}</span>
              </div>
            </div>
            <dl class="identity-facts">
              <div>
                <dt>Statut</dt>
                <dd><span class="dot" aria-hidden="true"></span>Actif</dd>
              </div>
              <div>
                <dt>Téléphone</dt>
                <dd>{{ user()?.phone || '—' }}</dd>
              </div>
              <div>
                <dt>Rôle</dt>
                <dd>{{ roleLabel() }}</dd>
              </div>
            </dl>
          </section>

          <section class="fb-card">
            <h3 class="card-title">Accès rapides</h3>
            <nav class="actions" aria-label="Accès rapides">
              <a class="action" *ngFor="let action of quickActions()" [routerLink]="action.route">
                <span class="action-icon"><mat-icon>{{ action.icon }}</mat-icon></span>
                <span class="action-text">
                  <strong>{{ action.label }}</strong>
                  <small>{{ action.description }}</small>
                </span>
                <mat-icon class="action-arrow">chevron_right</mat-icon>
              </a>
            </nav>
          </section>

          <section class="fb-card" *ngIf="user()?.role === 'parent'">
            <div class="card-head">
              <h3 class="card-title">Adolescents liés</h3>
              <span class="fb-badge fb-badge--neutral">{{ filteredLinkedAdolescents().length }}</span>
            </div>

            <label class="search" *ngIf="linkedAdolescents().length">
              <mat-icon>search</mat-icon>
              <span class="fb-visually-hidden">Rechercher un adolescent</span>
              <input
                type="search"
                [value]="adolescentSearchTerm()"
                (input)="adolescentSearchTerm.set($any($event.target).value)"
                placeholder="Rechercher par nom ou e-mail"
              />
            </label>

            <p class="note" *ngIf="loadingAdolescents()">Chargement des adolescents liés…</p>
            <p class="note error" *ngIf="adolescentsError()">{{ adolescentsError() }}</p>
            <p class="note" *ngIf="!loadingAdolescents() && !adolescentsError() && !linkedAdolescents().length">
              Aucun adolescent n'est encore lié à ce compte.
              <a routerLink="/family/add-adolescent">Ajouter un adolescent</a>
            </p>
            <p class="note" *ngIf="!loadingAdolescents() && !adolescentsError() && linkedAdolescents().length && !filteredLinkedAdolescents().length">
              Aucun résultat pour « {{ adolescentSearchTerm() }} ».
            </p>

            <ul class="children" *ngIf="!loadingAdolescents() && filteredLinkedAdolescents().length">
              <li class="child" *ngFor="let child of filteredLinkedAdolescents()">
                <div class="child-top">
                  <span class="child-avatar" aria-hidden="true">{{ child.firstName.charAt(0) }}{{ child.lastName.charAt(0) }}</span>
                  <div class="child-text">
                    <strong>{{ child.firstName }} {{ child.lastName }}</strong>
                    <small>Né(e) le {{ formatBirthDate(child) }}</small>
                  </div>
                  <button
                    type="button"
                    class="fb-btn fb-btn--soft fb-btn--sm"
                    (click)="toggleAdolescentDetails(child)"
                    [attr.aria-expanded]="selectedAdolescentId() === child._id"
                  >
                    {{ selectedAdolescentId() === child._id ? 'Masquer' : 'Détails' }}
                  </button>
                </div>
                <dl class="child-details" *ngIf="selectedAdolescentId() === child._id">
                  <div><dt>E-mail</dt><dd>{{ child.email }}</dd></div>
                  <div><dt>Téléphone</dt><dd>{{ child.phone || '—' }}</dd></div>
                  <div><dt>Date de naissance</dt><dd>{{ formatBirthDate(child) }}</dd></div>
                  <div><dt>Consentement</dt><dd>{{ child.adolescentProfile?.consentGiven ? 'Oui' : 'Non' }}</dd></div>
                </dl>
              </li>
            </ul>
          </section>
        </div>

        <!-- Colonne droite -->
        <div class="col">
          <section class="fb-card">
            <h3 class="card-title">Modifier mon profil</h3>
            <p class="card-sub">Mettez à jour vos informations personnelles.</p>

            <div class="fb-alert fb-alert--success" role="status" *ngIf="successMessage()">
              <mat-icon>check_circle</mat-icon><span>{{ successMessage() }}</span>
            </div>

            <form [formGroup]="form" (ngSubmit)="saveProfile()" class="form" novalidate>
              <div class="form-row">
                <div class="fb-field">
                  <label class="fb-label" for="firstName">Prénom</label>
                  <input id="firstName" class="fb-input" formControlName="firstName" placeholder="Votre prénom" autocomplete="given-name" />
                  <span class="fb-error-text" *ngIf="form.get('firstName')?.hasError('required') && form.get('firstName')?.touched">
                    Le prénom est requis.
                  </span>
                </div>
                <div class="fb-field">
                  <label class="fb-label" for="lastName">Nom</label>
                  <input id="lastName" class="fb-input" formControlName="lastName" placeholder="Votre nom de famille" autocomplete="family-name" />
                  <span class="fb-error-text" *ngIf="form.get('lastName')?.hasError('required') && form.get('lastName')?.touched">
                    Le nom est requis.
                  </span>
                </div>
              </div>

              <div class="fb-field">
                <label class="fb-label" for="phone">Téléphone <span class="optional">facultatif</span></label>
                <input id="phone" class="fb-input" formControlName="phone" placeholder="+33 6 12 34 56 78" autocomplete="tel" />
              </div>

              <div class="readonly">
                <mat-icon>mail_outline</mat-icon>
                <div>
                  <span>Adresse e-mail</span>
                  <strong>{{ user()?.email }}</strong>
                </div>
                <span class="fb-badge fb-badge--neutral">Non modifiable</span>
              </div>

              <div class="form-actions">
                <button type="submit" class="fb-btn" [disabled]="form.invalid || saving()">
                  <span class="fb-spinner light" *ngIf="saving()" aria-hidden="true"></span>
                  <mat-icon *ngIf="!saving()">save</mat-icon>
                  {{ saving() ? 'Enregistrement…' : 'Enregistrer les modifications' }}
                </button>
              </div>
            </form>
          </section>

          <section class="fb-card fb-card--tint security">
            <div class="security-head">
              <mat-icon>verified_user</mat-icon>
              <div>
                <h3 class="card-title">Confidentialité et sécurité</h3>
                <p class="card-sub">Vos données sont chiffrées et traitées conformément au RGPD.</p>
              </div>
            </div>
            <ul>
              <li><mat-icon>check</mat-icon>Données hébergées en France (HDS)</li>
              <li><mat-icon>check</mat-icon>Chiffrement des échanges</li>
              <li><mat-icon>check</mat-icon>Authentification multi-facteurs disponible</li>
            </ul>
          </section>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .page-alert { margin-bottom: 20px; }

    .profile-grid {
      display: grid;
      grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
      gap: 24px;
      align-items: start;
    }

    .col { display: flex; flex-direction: column; gap: 24px; min-width: 0; }

    .card-title { margin: 0; font-size: 17px; font-weight: 700; }
    .card-sub { margin: 4px 0 20px; color: var(--fb-text-mid); font-size: 14px; }
    .card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
    section > .card-title + .actions { margin-top: 14px; }

    /* Identité */
    .identity-top { display: flex; align-items: center; gap: 16px; }
    .avatar {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 68px;
      height: 68px;
      border-radius: 22px;
      background: var(--fb-ink);
      color: #fff;
      font-family: var(--fb-font-serif);
      font-size: 24px;
      font-weight: 650;
    }
    .identity-text { min-width: 0; }
    .identity-text h2 { margin: 0; font-size: 1.4rem; line-height: 1.2; }
    .identity-text p { margin: 2px 0 8px; color: var(--fb-text-mid); font-size: 14px; overflow-wrap: anywhere; }

    .identity-facts {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin: 20px 0 0;
      padding-top: 18px;
      border-top: 1px solid var(--fb-border);
    }
    .identity-facts dt { font-size: 12px; color: var(--fb-muted); }
    .identity-facts dd { display: flex; align-items: center; gap: 6px; margin: 2px 0 0; font-weight: 700; font-size: 14px; overflow-wrap: anywhere; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--fb-success); box-shadow: 0 0 0 3px rgba(var(--fb-success-rgb), 0.15); }

    /* Accès rapides */
    .actions { display: flex; flex-direction: column; gap: 4px; }
    .action {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px;
      margin: 0 -10px;
      border-radius: var(--fb-radius-sm);
      color: var(--fb-text);
      text-decoration: none;
    }
    .action:hover { background: var(--fb-surface-alt); color: var(--fb-text); text-decoration: none; }
    .action-icon {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--fb-primary-soft);
      color: var(--fb-primary);
    }
    .action-text { flex: 1; min-width: 0; }
    .action-text strong { display: block; font-size: 14.5px; }
    .action-text small { display: block; color: var(--fb-muted); font-size: 13px; font-weight: 500; }
    .action-arrow { color: var(--fb-faint); transition: transform 0.2s var(--fb-ease); }
    .action:hover .action-arrow { transform: translateX(3px); color: var(--fb-primary); }

    /* Adolescents liés */
    .search {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 42px;
      padding: 0 12px;
      margin-bottom: 12px;
      border: 1.5px solid var(--fb-border);
      border-radius: var(--fb-radius-sm);
    }
    .search:focus-within { border-color: var(--fb-primary); box-shadow: 0 0 0 4px rgba(var(--fb-primary-rgb), 0.12); }
    .search mat-icon { color: var(--fb-faint); }
    .search input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: 14px; }
    .note { margin: 0; color: var(--fb-text-mid); font-size: 14px; }
    .note.error { color: var(--fb-danger); }
    .children { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none; }
    .child { padding: 12px; border-radius: var(--fb-radius-sm); background: var(--fb-surface-alt); }
    .child-top { display: flex; align-items: center; gap: 12px; }
    .child-avatar {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: var(--fb-accent-soft);
      color: var(--fb-accent-strong);
      font-weight: 700;
      font-size: 13px;
    }
    .child-text { flex: 1; min-width: 0; }
    .child-text strong { display: block; font-size: 14.5px; }
    .child-text small { color: var(--fb-muted); font-size: 12.5px; }
    .child-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0 0; padding-top: 12px; border-top: 1px solid var(--fb-border); }
    .child-details dt { font-size: 12px; color: var(--fb-muted); }
    .child-details dd { margin: 0; font-size: 13.5px; font-weight: 600; overflow-wrap: anywhere; }

    /* Formulaire */
    .fb-alert { margin-bottom: 18px; }
    .form { display: flex; flex-direction: column; gap: 18px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .optional { margin-left: 4px; font-weight: 500; color: var(--fb-muted); font-size: 12px; }
    .readonly {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: var(--fb-radius-sm);
      background: var(--fb-surface-alt);
    }
    .readonly mat-icon { color: var(--fb-muted); }
    .readonly div { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .readonly div span { font-size: 12px; color: var(--fb-muted); }
    .readonly div strong { font-size: 14px; overflow-wrap: anywhere; }
    .form-actions { display: flex; justify-content: flex-end; }
    .fb-spinner.light { width: 18px; height: 18px; border-color: rgba(255, 255, 255, 0.35); border-top-color: #fff; }

    /* Sécurité */
    .security-head { display: flex; gap: 12px; }
    .security-head > mat-icon { color: var(--fb-success); }
    .security .card-sub { margin-bottom: 12px; }
    .security ul { display: grid; gap: 8px; margin: 0; padding: 0 0 0 36px; list-style: none; }
    .security li { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--fb-text-mid); }
    .security li mat-icon { width: 18px; height: 18px; font-size: 18px; color: var(--fb-success); }

    @media (max-width: 1024px) {
      .profile-grid { grid-template-columns: minmax(0, 1fr); }
    }

    @media (max-width: 480px) {
      .form-row, .child-details { grid-template-columns: 1fr; }
      .identity-facts { grid-template-columns: 1fr 1fr; }
      .form-actions .fb-btn { width: 100%; }
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
  readonly quickActions = computed(() => {
    const role = this.user()?.role;
    return role ? QUICK_ACTIONS.filter((action) => action.roles.includes(role)) : [];
  });

  readonly form = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName:  ['', [Validators.required]],
    phone:     [''],
  });

  constructor(
    private readonly authService: AuthService,
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
        this.adolescentsError.set(error?.error?.message || 'Impossible de charger les adolescents liés.');
      },
    });
  }
}
