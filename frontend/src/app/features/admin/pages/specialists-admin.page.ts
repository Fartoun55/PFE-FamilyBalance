import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SpecialistAdminService } from '../services/specialist-admin.service';
import { AdminSpecialist, SpecialistFilters } from '../models/specialist-admin.models';
import { SpecialistFormComponent, WEEK_DAYS } from '../components/specialist-form.component';

@Component({
  selector: 'app-specialists-admin-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    PageHeaderComponent,
    StatCardComponent,
    EmptyStateComponent,
    SpecialistFormComponent,
  ],
  template: `
    <app-page-header
      eyebrow="Administration"
      title="Spécialistes"
      subtitle="Comptes des professionnels de santé et fiches de l'annuaire de téléconsultation."
      illustration="specialists-team"
    >
      <button type="button" class="fb-btn" (click)="openCreate()">
        <mat-icon>person_add</mat-icon>
        Ajouter un spécialiste
      </button>
    </app-page-header>

    <div class="kpis">
      <app-stat-card icon="medical_services" label="Spécialistes" [value]="totals().all" tone="primary"></app-stat-card>
      <app-stat-card icon="check_circle" label="Comptes actifs" [value]="totals().active" tone="success"></app-stat-card>
      <app-stat-card icon="pause_circle" label="Comptes inactifs" [value]="totals().inactive" tone="neutral"></app-stat-card>
      <app-stat-card icon="event_upcoming" label="Rendez-vous à venir" [value]="totals().upcoming" tone="accent"></app-stat-card>
    </div>

    <section class="fb-card list-card">
      <div class="toolbar">
        <label class="search">
          <mat-icon>search</mat-icon>
          <span class="fb-visually-hidden">Rechercher un spécialiste</span>
          <input
            type="search"
            [ngModel]="filters().search"
            (ngModelChange)="search$.next($event)"
            placeholder="Nom, e-mail, spécialité, licence, ville…"
          />
        </label>
        <div class="segmented" role="group" aria-label="Statut du compte">
          <button type="button" *ngFor="let s of statuses" [class.active]="filters().status === s.value" [attr.aria-pressed]="filters().status === s.value" (click)="setFilter('status', s.value)">
            {{ s.label }}
          </button>
        </div>
        <select class="fb-select" [ngModel]="filters().specialization" (ngModelChange)="setFilter('specialization', $event)" aria-label="Filtrer par spécialité">
          <option value="">Toutes les spécialités</option>
          <option *ngFor="let item of filterOptions().specializations" [value]="item">{{ item }}</option>
        </select>
        <select class="fb-select" [ngModel]="filters().city" (ngModelChange)="setFilter('city', $event)" aria-label="Filtrer par ville">
          <option value="">Toutes les villes</option>
          <option *ngFor="let item of filterOptions().cities" [value]="item">{{ item }}</option>
        </select>
      </div>

      <div class="fb-alert fb-alert--error" role="alert" *ngIf="error()">
        <mat-icon>error_outline</mat-icon>
        <span>{{ error() }}</span>
        <button type="button" class="fb-btn fb-btn--ghost fb-btn--sm retry" (click)="load()">Réessayer</button>
      </div>

      <div class="fb-loading" *ngIf="loading() && !specialists().length">
        <span class="fb-spinner"></span>
        Chargement des spécialistes…
      </div>

      <ng-container *ngIf="!loading() || specialists().length">
        <app-empty-state
          *ngIf="!error() && !specialists().length && !hasActiveFilters()"
          icon="medical_services"
          illustration="specialist"
          title="Aucun spécialiste enregistré"
          message="Ajoutez un premier spécialiste : il apparaîtra dans l'annuaire de téléconsultation des familles."
        >
          <button type="button" class="fb-btn" (click)="openCreate()"><mat-icon>person_add</mat-icon>Ajouter un spécialiste</button>
        </app-empty-state>
        <app-empty-state
          *ngIf="!error() && !specialists().length && hasActiveFilters()"
          icon="search_off"
          illustration="empty-search"
          title="Aucun résultat"
          message="Aucun spécialiste ne correspond à ces critères."
        >
          <button type="button" class="fb-btn fb-btn--ghost" (click)="resetFilters()">Effacer les filtres</button>
        </app-empty-state>

        <div class="fb-table-wrap" *ngIf="specialists().length" [class.refreshing]="loading()">
          <table>
            <thead>
              <tr>
                <th>Spécialiste</th>
                <th>Spécialité</th>
                <th>Ville</th>
                <th>Tarif</th>
                <th>Statut</th>
                <th>RDV à venir</th>
                <th class="actions-col"><span class="fb-visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of specialists(); trackBy: trackById" (click)="openDetail(s)">
                <td>
                  <div class="person">
                    <span class="avatar" aria-hidden="true">{{ s.firstName.charAt(0) }}{{ s.lastName.charAt(0) }}</span>
                    <div>
                      <strong>{{ s.firstName }} {{ s.lastName }}</strong>
                      <small>{{ s.email }}</small>
                    </div>
                  </div>
                </td>
                <td>{{ s.specialization || '—' }}</td>
                <td>{{ s.city || '—' }}</td>
                <td>{{ s.tariff !== null ? s.tariff + ' €' : '—' }}</td>
                <td>
                  <span class="fb-badge" [class.fb-badge--success]="s.isActive" [class.fb-badge--neutral]="!s.isActive">
                    {{ s.isActive ? 'Actif' : 'Inactif' }}
                  </span>
                </td>
                <td>{{ s.stats.upcomingAppointments }}</td>
                <td class="actions-col" (click)="$event.stopPropagation()">
                  <button type="button" class="row-btn" (click)="openDetail(s)" [attr.aria-label]="'Voir ' + s.firstName + ' ' + s.lastName" matTooltip="Voir le détail"><mat-icon>visibility</mat-icon></button>
                  <button type="button" class="row-btn" (click)="openEdit(s)" [attr.aria-label]="'Modifier ' + s.firstName + ' ' + s.lastName" matTooltip="Modifier"><mat-icon>edit</mat-icon></button>
                  <button type="button" class="row-btn danger" (click)="askDelete(s)" [attr.aria-label]="'Supprimer ' + s.firstName + ' ' + s.lastName" matTooltip="Supprimer"><mat-icon>delete</mat-icon></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="count" *ngIf="specialists().length">{{ specialists().length }} spécialiste(s) affiché(s)</p>
      </ng-container>
    </section>

    <!-- Détail -->
    <div class="fb-modal-backdrop" *ngIf="detail() as d" (click)="closeDetail()">
      <div class="fb-modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title" (click)="$event.stopPropagation()">
        <header class="detail-head">
          <span class="avatar large" aria-hidden="true">{{ d.firstName.charAt(0) }}{{ d.lastName.charAt(0) }}</span>
          <div class="detail-id">
            <h2 id="detail-title">{{ d.firstName }} {{ d.lastName }}</h2>
            <p>{{ d.specialization }}{{ d.city ? ' · ' + d.city : '' }}</p>
            <div class="badges">
              <span class="fb-badge" [class.fb-badge--success]="d.isActive" [class.fb-badge--neutral]="!d.isActive">{{ d.isActive ? 'Compte actif' : 'Compte inactif' }}</span>
              <span class="fb-badge" [class.fb-badge--neutral]="!d.listedInDirectory">{{ d.listedInDirectory ? "Visible dans l'annuaire" : "Masqué de l'annuaire" }}</span>
            </div>
          </div>
          <button type="button" class="icon-close" (click)="closeDetail()" aria-label="Fermer"><mat-icon>close</mat-icon></button>
        </header>

        <div class="fb-loading" *ngIf="detailLoading()"><span class="fb-spinner"></span>Chargement…</div>

        <div class="detail-body">
          <div class="stats-row">
            <div><strong>{{ d.stats.upcomingAppointments }}</strong><span>RDV à venir</span></div>
            <div><strong>{{ d.stats.totalAppointments }}</strong><span>RDV au total</span></div>
            <div><strong>{{ d.stats.patientCount }}</strong><span>Patients</span></div>
          </div>

          <dl class="facts">
            <div><dt>E-mail</dt><dd>{{ d.email }}</dd></div>
            <div><dt>Téléphone</dt><dd>{{ d.phone || '—' }}</dd></div>
            <div><dt>N° de licence</dt><dd>{{ d.licenseNumber || '—' }}</dd></div>
            <div><dt>Tarif</dt><dd>{{ d.tariff !== null ? d.tariff + ' €' : '—' }}</dd></div>
            <div><dt>Langues</dt><dd>{{ d.languages.length ? d.languages.join(', ').toUpperCase() : '—' }}</dd></div>
            <div><dt>Dernière connexion</dt><dd>{{ d.lastLoginAt ? (d.lastLoginAt | date: 'dd/MM/yyyy HH:mm') : 'Jamais' }}</dd></div>
            <div><dt>Créé le</dt><dd>{{ d.createdAt | date: 'dd/MM/yyyy' }}</dd></div>
            <div><dt>E-mail vérifié</dt><dd>{{ d.emailVerified ? 'Oui' : 'Non' }}</dd></div>
          </dl>

          <section *ngIf="d.bio">
            <h3>Présentation</h3>
            <p class="bio">{{ d.bio }}</p>
          </section>

          <section>
            <h3>Disponibilités</h3>
            <ul class="slots" *ngIf="d.availabilityRules.length; else noSlots">
              <li *ngFor="let rule of d.availabilityRules">
                <strong>{{ days[rule.dayOfWeek] }}</strong> {{ rule.startTime }} – {{ rule.endTime }} · créneaux de {{ rule.slotDurationMinutes }} min
              </li>
            </ul>
            <ng-template #noSlots><p class="muted">Aucune plage de disponibilité.</p></ng-template>
          </section>

          <section>
            <h3>Derniers rendez-vous</h3>
            <ul class="appts" *ngIf="d.recentAppointments?.length; else noAppts">
              <li *ngFor="let a of d.recentAppointments">
                <span>{{ a.slotStart | date: 'dd/MM/yyyy HH:mm' }}</span>
                <strong>{{ a.patientName }}</strong>
                <span class="fb-badge fb-badge--neutral">{{ statusLabel(a.status) }}</span>
              </li>
            </ul>
            <ng-template #noAppts><p class="muted">Aucun rendez-vous pour le moment.</p></ng-template>
          </section>
        </div>

        <footer class="detail-actions">
          <button type="button" class="fb-btn fb-btn--ghost danger-text" (click)="askDelete(d)"><mat-icon>delete</mat-icon>Supprimer</button>
          <button type="button" class="fb-btn" (click)="openEdit(d)"><mat-icon>edit</mat-icon>Modifier</button>
        </footer>
      </div>
    </div>

    <!-- Formulaire ajout / modification -->
    <app-specialist-form
      *ngIf="formOpen()"
      [specialist]="editing()"
      (saved)="onSaved($event)"
      (cancelled)="closeForm()"
    ></app-specialist-form>

    <!-- Confirmation de suppression -->
    <div class="fb-modal-backdrop" *ngIf="pendingDelete() as target" (click)="cancelDelete()">
      <div class="fb-modal confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" (click)="$event.stopPropagation()">
        <span class="confirm-icon"><mat-icon>warning</mat-icon></span>
        <h2 id="delete-title">Supprimer ce spécialiste ?</h2>
        <p>
          Le compte de <strong>{{ target.firstName }} {{ target.lastName }}</strong> ({{ target.email }}), sa fiche
          d'annuaire et son historique de téléconsultation seront définitivement supprimés.
        </p>
        <p class="fb-alert fb-alert--warning" *ngIf="target.stats.upcomingAppointments > 0">
          <mat-icon>event_busy</mat-icon>
          <span>
            {{ target.stats.upcomingAppointments }} rendez-vous à venir sont prévus avec ce spécialiste : il ne peut pas être
            supprimé tant qu'ils ne sont pas annulés. Vous pouvez désactiver son compte : il ne pourra plus se connecter
            et disparaîtra de l'annuaire.
          </span>
        </p>
        <div class="fb-alert fb-alert--error" role="alert" *ngIf="deleteError()">
          <mat-icon>error_outline</mat-icon><span>{{ deleteError() }}</span>
        </div>
        <div class="confirm-actions">
          <button type="button" class="fb-btn fb-btn--ghost" [disabled]="deleting()" (click)="cancelDelete()">Annuler</button>
          <button
            type="button"
            class="fb-btn"
            [class.fb-btn--ghost]="target.stats.upcomingAppointments === 0"
            *ngIf="target.isActive && (target.stats.upcomingAppointments > 0 || deleteError())"
            [disabled]="deleting()"
            (click)="deactivate(target)"
          >
            Désactiver le compte
          </button>
          <!-- Suppression proposée seulement si elle est possible (la règle reste vérifiée côté serveur). -->
          <button
            type="button"
            class="fb-btn fb-btn--danger"
            *ngIf="target.stats.upcomingAppointments === 0"
            [disabled]="deleting()"
            (click)="confirmDelete(target)"
          >
            <span class="fb-spinner light" *ngIf="deleting()" aria-hidden="true"></span>
            {{ deleting() ? 'Suppression…' : 'Supprimer définitivement' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; }
    .list-card { display: flex; flex-direction: column; gap: 16px; padding: clamp(16px, 2.5vw, 24px); }

    .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
    .search {
      flex: 1 1 280px;
      display: flex;
      align-items: center;
      gap: 8px;
      height: 44px;
      padding: 0 14px;
      border: 1.5px solid var(--fb-border);
      border-radius: var(--fb-radius-sm);
    }
    .search:focus-within { border-color: var(--fb-primary); box-shadow: 0 0 0 4px rgba(var(--fb-primary-rgb), 0.12); }
    .search mat-icon { color: var(--fb-faint); }
    .search input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: 14.5px; color: var(--fb-text); }
    .toolbar .fb-select { flex: 0 1 200px; min-height: 44px; }
    .segmented { display: inline-flex; padding: 4px; border-radius: var(--fb-radius-pill); background: var(--fb-surface-alt); }
    .segmented button { padding: 7px 14px; border: none; border-radius: var(--fb-radius-pill); background: transparent; color: var(--fb-text-mid); font-weight: 600; font-size: 13px; cursor: pointer; }
    .segmented button.active { background: var(--fb-surface); color: var(--fb-text); box-shadow: var(--fb-elev-1); }
    .retry { margin-left: auto; }

    .fb-table-wrap { box-shadow: none; border: 1px solid var(--fb-border); transition: opacity 0.2s ease; }
    .fb-table-wrap.refreshing { opacity: 0.6; }
    table { min-width: 760px; }
    tbody tr { cursor: pointer; }
    .person { display: flex; align-items: center; gap: 12px; }
    .person strong { display: block; font-size: 14.5px; }
    .person small { color: var(--fb-muted); font-size: 12.5px; }
    .avatar {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: var(--fb-ink);
      color: #fff;
      font-size: 13px;
      font-weight: 700;
    }
    .avatar.large { width: 60px; height: 60px; border-radius: 18px; font-size: 20px; }
    .actions-col { width: 132px; text-align: right; white-space: nowrap; }
    .row-btn {
      display: inline-grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: var(--fb-text-mid);
      cursor: pointer;
    }
    .row-btn:hover { background: var(--fb-surface-alt); color: var(--fb-text); }
    .row-btn.danger:hover { background: rgba(var(--fb-danger-rgb), 0.08); color: var(--fb-danger); }
    .row-btn mat-icon { width: 20px; height: 20px; font-size: 20px; }
    .count { margin: 0; color: var(--fb-muted); font-size: 13px; }

    /* Détail */
    .detail-modal { width: min(680px, 100%); padding: 0; }
    .detail-head { display: flex; align-items: flex-start; gap: 16px; padding: 24px 26px 18px; border-bottom: 1px solid var(--fb-border); }
    .detail-id { flex: 1; min-width: 0; }
    .detail-id h2 { margin: 0; font-size: 1.45rem; }
    .detail-id p { margin: 2px 0 8px; color: var(--fb-text-mid); }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; }
    .icon-close { display: grid; place-items: center; flex-shrink: 0; width: 38px; height: 38px; border: none; border-radius: 50%; background: var(--fb-surface-alt); color: var(--fb-text-mid); cursor: pointer; }
    .detail-body { display: flex; flex-direction: column; gap: 18px; padding: 20px 26px; }
    .detail-body h3 { margin: 0 0 8px; font-size: 14px; font-weight: 700; }
    .stats-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .stats-row div { padding: 12px; border-radius: var(--fb-radius-sm); background: var(--fb-surface-alt); text-align: center; }
    .stats-row strong { display: block; font-family: var(--fb-font-serif); font-size: 1.5rem; }
    .stats-row span { font-size: 12.5px; color: var(--fb-muted); }
    .facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 20px; margin: 0; }
    .facts dt { font-size: 12px; color: var(--fb-muted); }
    .facts dd { margin: 2px 0 0; font-weight: 600; font-size: 14px; overflow-wrap: anywhere; }
    .bio { margin: 0; color: var(--fb-text-mid); line-height: 1.55; white-space: pre-line; }
    .slots, .appts { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; font-size: 14px; }
    .appts li { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 8px 12px; border-radius: 10px; background: var(--fb-surface-alt); }
    .appts li span:first-child { color: var(--fb-muted); font-size: 13px; }
    .muted { margin: 0; color: var(--fb-muted); font-size: 14px; }
    .detail-actions { display: flex; justify-content: space-between; gap: 10px; padding: 16px 26px 22px; border-top: 1px solid var(--fb-border); }
    .danger-text { color: var(--fb-danger); }

    /* Confirmation */
    .confirm { display: flex; flex-direction: column; gap: 12px; width: min(500px, 100%); text-align: center; }
    .confirm-icon { display: grid; place-items: center; width: 56px; height: 56px; margin: 0 auto; border-radius: 18px; background: rgba(var(--fb-danger-rgb), 0.08); color: var(--fb-danger); }
    .confirm h2 { margin: 0; font-size: 1.3rem; }
    .confirm p { margin: 0; color: var(--fb-text-mid); }
    .confirm .fb-alert { text-align: left; }
    .confirm-actions { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; margin-top: 6px; }
    .fb-spinner.light { width: 18px; height: 18px; border-color: rgba(255, 255, 255, 0.35); border-top-color: #fff; }

    @media (max-width: 1024px) {
      .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 600px) {
      .toolbar .fb-select { flex: 1 1 100%; }
      .facts, .stats-row { grid-template-columns: minmax(0, 1fr); }
      .detail-actions, .confirm-actions { flex-direction: column-reverse; }
      .detail-actions .fb-btn, .confirm-actions .fb-btn { width: 100%; }
    }
  `],
})
export class SpecialistsAdminPage implements OnInit {
  private readonly api = inject(SpecialistAdminService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly days = WEEK_DAYS;
  readonly statuses = [
    { value: 'all' as const, label: 'Tous' },
    { value: 'active' as const, label: 'Actifs' },
    { value: 'inactive' as const, label: 'Inactifs' },
  ];

  readonly specialists = signal<AdminSpecialist[]>([]);
  readonly filterOptions = signal<{ cities: string[]; specializations: string[] }>({ cities: [], specializations: [] });
  readonly filters = signal<Required<SpecialistFilters>>({ search: '', status: 'all', city: '', specialization: '' });
  readonly loading = signal(false);
  readonly error = signal('');

  /** Totaux sur l'ensemble des spécialistes (indépendants des filtres). */
  readonly totals = signal({ all: 0, active: 0, inactive: 0, upcoming: 0 });
  readonly hasActiveFilters = computed(() => {
    const f = this.filters();
    return !!f.search.trim() || f.status !== 'all' || !!f.city || !!f.specialization;
  });

  readonly detail = signal<AdminSpecialist | null>(null);
  readonly detailLoading = signal(false);
  readonly formOpen = signal(false);
  readonly editing = signal<AdminSpecialist | null>(null);
  readonly pendingDelete = signal<AdminSpecialist | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal('');

  readonly search$ = new Subject<string>();
  private requestId = 0;

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((search) => this.setFilter('search', search));
    this.load();
    this.loadTotals();
  }

  load(): void {
    const id = ++this.requestId;
    this.loading.set(true);
    this.error.set('');
    this.api.list(this.filters()).subscribe({
      next: (r) => {
        if (id !== this.requestId) return; // réponse d'une recherche obsolète
        this.loading.set(false);
        this.specialists.set(r.specialists);
        this.filterOptions.set(r.filters);
      },
      error: (e) => {
        if (id !== this.requestId) return;
        this.loading.set(false);
        this.error.set(SpecialistAdminService.describeError(e, 'Impossible de charger les spécialistes.').message);
      },
    });
  }

  private loadTotals(): void {
    this.api.list().subscribe({
      next: (r) => this.totals.set({
        all: r.specialists.length,
        active: r.specialists.filter((s) => s.isActive).length,
        inactive: r.specialists.filter((s) => !s.isActive).length,
        upcoming: r.specialists.reduce((sum, s) => sum + s.stats.upcomingAppointments, 0),
      }),
      error: () => undefined, // l'erreur est déjà affichée par le chargement de la liste
    });
  }

  private refresh(): void {
    this.load();
    this.loadTotals();
  }

  setFilter<K extends keyof SpecialistFilters>(key: K, value: SpecialistFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value ?? '' }));
    this.load();
  }

  resetFilters(): void {
    this.filters.set({ search: '', status: 'all', city: '', specialization: '' });
    this.load();
  }

  openDetail(specialist: AdminSpecialist): void {
    this.detail.set(specialist);
    this.detailLoading.set(true);
    this.api.get(specialist._id).subscribe({
      next: (r) => {
        this.detailLoading.set(false);
        if (this.detail()?._id === specialist._id) this.detail.set(r.specialist);
      },
      error: (e) => {
        this.detailLoading.set(false);
        this.detail.set(null);
        this.notify(SpecialistAdminService.describeError(e, 'Impossible de charger ce spécialiste.').message, true);
        if ((e as { status?: number })?.status === 404) this.refresh();
      },
    });
  }

  closeDetail(): void {
    this.detail.set(null);
  }

  openCreate(): void {
    this.editing.set(null);
    this.formOpen.set(true);
  }

  openEdit(specialist: AdminSpecialist): void {
    this.detail.set(null);
    this.editing.set(specialist);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  onSaved(event: { specialist: AdminSpecialist; message: string }): void {
    this.closeForm();
    this.notify(event.message);
    this.refresh();
  }

  askDelete(specialist: AdminSpecialist): void {
    this.detail.set(null);
    this.deleteError.set('');
    this.pendingDelete.set(specialist);
  }

  cancelDelete(): void {
    if (!this.deleting()) this.pendingDelete.set(null);
  }

  confirmDelete(specialist: AdminSpecialist): void {
    this.deleting.set(true);
    this.deleteError.set('');
    this.api.remove(specialist._id).subscribe({
      next: (r) => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.notify(r.message || 'Spécialiste supprimé.');
        this.refresh();
      },
      error: (e) => {
        this.deleting.set(false);
        this.deleteError.set(SpecialistAdminService.describeError(e, 'La suppression a échoué.').message);
      },
    });
  }

  /** Alternative à la suppression quand des rendez-vous sont encore prévus. */
  deactivate(specialist: AdminSpecialist): void {
    this.deleting.set(true);
    this.api.update(specialist._id, { isActive: false }).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.notify(`Compte de ${specialist.firstName} ${specialist.lastName} désactivé : il n'apparaît plus dans l'annuaire.`);
        this.refresh();
      },
      error: (e) => {
        this.deleting.set(false);
        this.deleteError.set(SpecialistAdminService.describeError(e, 'La désactivation a échoué.').message);
      },
    });
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'En attente',
      confirmed: 'Confirmé',
      'in-progress': 'En cours',
      completed: 'Terminé',
      cancelled: 'Annulé',
    };
    return labels[status] || status;
  }

  trackById(_index: number, specialist: AdminSpecialist): string {
    return specialist._id;
  }

  private notify(message: string, isError = false): void {
    this.snackBar.open(message, 'Fermer', { duration: isError ? 6000 : 4000 });
  }
}
