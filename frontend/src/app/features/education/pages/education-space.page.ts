import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EducationService } from '../../../core/services/education.service';
import { AuthService } from '../../../core/services/auth.service';
import { ChildContextService } from '../../../core/services/child-context.service';
import { UserProfile } from '../../../core/models/auth.models';
import {
  EducationResource,
  EducationResourceContentType,
  EducationResourceFormValue,
  LearningPath,
  NewsletterPreview,
  ParentToolboxItem,
} from '../models/education.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

const CONTENT_TYPE_LABELS: Record<EducationResourceContentType, string> = {
  image: 'Image',
  pdf: 'PDF',
  video: 'Vidéo',
  link: 'Lien externe',
};

const CONTENT_ACTION_LABELS: Record<EducationResourceContentType, string> = {
  image: 'Voir en grand',
  pdf: 'Voir le PDF',
  video: 'Voir la vidéo',
  link: 'Ouvrir le lien',
};

@Component({
  selector: 'app-education-space-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    EmptyStateComponent,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <section class="edu-shell">
      <app-page-header
        class="hero"
        eyebrow="Espace Educatif & Ressources"
        [title]="userRole() === 'admin' ? 'Gérer les ressources éducatives' : 'Apprendre, progresser et outiller la famille'"
        [subtitle]="userRole() === 'admin'
          ? 'Ajoutez, modifiez, publiez ou dépubliez les ressources adaptées par âge affichées aux familles.'
          : 'Bibliothèque filtrée, e-learning gamifié, boîte parentale et newsletter personnalisée.'"
      ></app-page-header>

      <p class="status" *ngIf="statusMessage()">{{ statusMessage() }}</p>
      <p class="error" *ngIf="errorMessage()">{{ errorMessage() }}</p>

      <!-- ============================= ADMINISTRATEUR ============================= -->
      <ng-container *ngIf="userRole() === 'admin'">
        <article class="card">
          <h2>{{ editingResourceId() ? 'Modifier la ressource' : 'Ajouter une ressource' }}</h2>
          <form [formGroup]="resourceForm" (ngSubmit)="saveResource()" class="resource-form">
            <mat-form-field appearance="outline">
              <mat-label>Titre</mat-label>
              <input matInput type="text" formControlName="title" required />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Catégorie</mat-label>
              <input matInput type="text" formControlName="category" required list="category-suggestions" />
            </mat-form-field>
            <datalist id="category-suggestions">
              <option *ngFor="let cat of adminCategories()" [value]="cat"></option>
            </datalist>

            <mat-form-field appearance="outline" class="full">
              <mat-label>Description</mat-label>
              <textarea matInput formControlName="description" rows="2" required></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Âge minimum</mat-label>
              <input matInput type="number" formControlName="ageMin" min="3" max="18" required />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Âge maximum</mat-label>
              <input matInput type="number" formControlName="ageMax" min="3" max="18" required />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Type de contenu</mat-label>
              <mat-select formControlName="contentType">
                <mat-option value="image">Image</mat-option>
                <mat-option value="pdf">PDF</mat-option>
                <mat-option value="video">Vidéo</mat-option>
                <mat-option value="link">Lien externe</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Difficulté</mat-label>
              <mat-select formControlName="difficulty">
                <mat-option value="debutant">Débutant</mat-option>
                <mat-option value="intermediaire">Intermédiaire</mat-option>
                <mat-option value="avance">Avancé</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="file-field" *ngIf="needsFile()">
              <label class="field-label">Fichier ({{ resourceForm.get('contentType')?.value === 'image' ? 'image' : 'PDF' }})</label>
              <input
                type="file"
                [attr.accept]="resourceForm.get('contentType')?.value === 'image' ? 'image/*' : 'application/pdf'"
                (change)="onFileSelected($event)"
              />
              <small *ngIf="editingResourceId() && !selectedFile()">Le fichier actuel est conservé si aucun nouveau fichier n'est choisi.</small>
              <small *ngIf="selectedFile()">Fichier sélectionné : {{ selectedFile()!.name }}</small>
            </div>

            <mat-form-field appearance="outline" class="full" *ngIf="needsUrl()">
              <mat-label>{{ resourceForm.get('contentType')?.value === 'video' ? 'URL de la vidéo' : "URL du lien externe" }}</mat-label>
              <input matInput type="url" formControlName="externalUrl" placeholder="https://..." />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Durée estimée (min)</mat-label>
              <input matInput type="number" formControlName="estimatedMinutes" min="1" max="240" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full">
              <mat-label>Mots-clés (facultatif, séparés par des virgules)</mat-label>
              <input matInput type="text" formControlName="themes" />
            </mat-form-field>

            <div class="form-actions full">
              <button mat-flat-button color="primary" type="submit" [disabled]="resourceForm.invalid || adminSaving()">
                {{ adminSaving() ? 'Enregistrement...' : (editingResourceId() ? 'Enregistrer les modifications' : 'Créer la ressource') }}
              </button>
              <button mat-stroked-button type="button" *ngIf="editingResourceId()" (click)="cancelEdit()">Annuler la modification</button>
            </div>
          </form>
        </article>

        <article class="card">
          <h2>Ressources ({{ adminResources().length }})</h2>
          <div class="admin-list" *ngIf="adminResources().length; else noAdminResources">
            <article class="admin-row" *ngFor="let item of adminResources()">
              <div class="admin-row-top">
                <strong>{{ item.title }}</strong>
                <span class="status-pill" [attr.data-status]="item.status">
                  {{ item.status === 'published' ? 'Publié' : 'Brouillon' }}
                </span>
              </div>
              <p>{{ item.description }}</p>
              <div class="admin-row-meta">
                <span class="theme-chip">{{ item.category }}</span>
                <small>{{ item.ageMin }}-{{ item.ageMax }} ans</small>
                <small>{{ contentTypeLabel(item.contentType) }}</small>
              </div>
              <div class="admin-row-actions">
                <button mat-stroked-button type="button" (click)="startEdit(item)">Modifier</button>
                <button mat-stroked-button type="button" (click)="togglePublish(item)">
                  {{ item.status === 'published' ? 'Dépublier' : 'Publier' }}
                </button>
                <button mat-stroked-button class="danger-action" type="button" (click)="askDeleteResource(item)">Supprimer</button>
              </div>
            </article>
          </div>
          <ng-template #noAdminResources>
            <app-empty-state
              icon="menu_book"
              title="Aucune ressource"
              message="Créez votre première ressource éducative avec le formulaire ci-dessus."
            ></app-empty-state>
          </ng-template>
        </article>

        <div class="confirm-overlay" *ngIf="resourcePendingDelete() as target" (click)="cancelDeleteResource()">
          <div class="confirm-box" (click)="$event.stopPropagation()">
            <h3>Supprimer cette ressource ?</h3>
            <p>« {{ target.title }} » sera définitivement supprimée, y compris son fichier éventuel. Cette action est irréversible.</p>
            <div class="confirm-actions">
              <button mat-stroked-button type="button" [disabled]="deletingResource()" (click)="cancelDeleteResource()">Annuler</button>
              <button mat-flat-button class="danger-action" type="button" [disabled]="deletingResource()" (click)="confirmDeleteResource()">
                {{ deletingResource() ? 'Suppression...' : 'Supprimer définitivement' }}
              </button>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- ============================= PARENT / ADOLESCENT ============================= -->
      <ng-container *ngIf="userRole() !== 'admin'">
        <article class="card">
          <h2>Bibliothèque de ressources</h2>

          <div class="child-context-banner" *ngIf="userRole() === 'parent' && childContext.selectedChildId()">
            <mat-icon>face</mat-icon>
            <p>
              Ressources adaptées à <strong>{{ childContext.selectedChildName() }}</strong>
              <ng-container *ngIf="resolvedAge() !== null"> ({{ resolvedAge() }} ans)</ng-container>.
            </p>
            <button mat-stroked-button type="button" (click)="childContext.clear(); loadResources()">Voir toutes les ressources</button>
          </div>
          <p class="hint" *ngIf="userRole() === 'parent' && !childContext.selectedChildId()">
            Sélectionnez un enfant depuis le tableau de bord famille pour un filtrage automatique par âge.
          </p>

          <form [formGroup]="filterForm" class="filters" (ngSubmit)="loadResources()">
            <mat-form-field appearance="outline">
              <mat-label>Catégorie</mat-label>
              <mat-select formControlName="category">
                <mat-option value="">Toutes catégories</mat-option>
                <mat-option *ngFor="let cat of categories()" [value]="cat">{{ cat }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Recherche</mat-label>
              <input matInput type="text" formControlName="search" />
            </mat-form-field>
            <button mat-flat-button color="primary" type="submit" class="filter-submit">Filtrer</button>
          </form>

          <div class="resource-list">
            <article class="resource" *ngFor="let item of resources()">
              <img class="resource-image" *ngIf="item.contentType === 'image' && item.contentUrl" [src]="item.contentUrl" [alt]="item.title" />
              <div class="resource-header">
                <strong>{{ item.title }}</strong>
                <span class="theme-chip">{{ item.category }}</span>
              </div>
              <p>{{ item.description }}</p>
              <div class="resource-meta">
                <small>{{ item.ageMin }}-{{ item.ageMax }} ans</small>
                <small>{{ item.estimatedMinutes }} min</small>
              </div>
              <div class="resource-actions" *ngIf="item.contentUrl">
                <button mat-stroked-button color="primary" type="button" (click)="openResource(item.contentUrl!)">
                  {{ contentActionLabel(item.contentType) }}
                </button>
              </div>
            </article>
          </div>
          <app-empty-state
            *ngIf="!resources().length"
            icon="menu_book"
            title="Aucune ressource trouvée"
            message="Essayez d'élargir votre recherche ou de changer de catégorie."
          ></app-empty-state>
        </article>

        <article class="card">
          <h2>Parcours e-learning & badges</h2>
          <div class="path-list">
            <article class="path" *ngFor="let path of paths()">
              <div class="path-top">
                <div>
                  <strong>{{ path.title }}</strong>
                  <p>{{ path.theme }} · Progression: {{ path.progressPercent }}%</p>
                </div>
                <span class="badge" *ngFor="let badge of path.badges">{{ badge }}</span>
              </div>

              <div class="steps">
                <button
                  mat-stroked-button
                  type="button"
                  *ngFor="let step of path.steps"
                  [disabled]="isStepCompleted(path, step.id)"
                  (click)="completeStep(path.id, step.id)"
                >
                  <mat-icon *ngIf="isStepCompleted(path, step.id)">check_circle</mat-icon>
                  {{ step.title }}
                </button>
              </div>
            </article>
            <p *ngIf="!paths().length" class="empty">Aucun parcours disponible pour ce profil.</p>
          </div>
        </article>

        <article class="card" *ngIf="userRole() === 'parent'">
          <h2>Boîte à outils parentale</h2>

          <div class="tool-forms">
            <form [formGroup]="contractForm" (ngSubmit)="createContract()">
              <h3>Contrat numérique</h3>
              <mat-form-field appearance="outline">
                <mat-label>Titre du contrat</mat-label>
                <input matInput type="text" formControlName="title" required />
                <mat-error *ngIf="contractForm.get('title')?.hasError('required')">Le titre est obligatoire.</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Règles, engagements, conséquences...</mat-label>
                <textarea matInput formControlName="content" rows="3" required></textarea>
                <mat-error *ngIf="contractForm.get('content')?.hasError('required')">Le contenu est obligatoire.</mat-error>
              </mat-form-field>
              <button mat-flat-button color="primary" type="submit" [disabled]="contractForm.invalid || contractSaving()">
                {{ contractSaving() ? 'Création...' : 'Créer contrat' }}
              </button>
            </form>

            <form [formGroup]="scheduleForm" (ngSubmit)="createSchedule()">
              <h3>Planning d'activités</h3>
              <mat-form-field appearance="outline">
                <mat-label>Titre du planning</mat-label>
                <input matInput type="text" formControlName="title" required />
                <mat-error *ngIf="scheduleForm.get('title')?.hasError('required')">Le titre est obligatoire.</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Description du planning</mat-label>
                <textarea matInput formControlName="content" rows="3" required></textarea>
                <mat-error *ngIf="scheduleForm.get('content')?.hasError('required')">La description est obligatoire.</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Activités (séparées par virgule)</mat-label>
                <input matInput type="text" formControlName="activities" />
              </mat-form-field>
              <div class="date-row">
                <mat-form-field appearance="outline">
                  <mat-label>Début</mat-label>
                  <input matInput type="date" formControlName="startDate" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Fin</mat-label>
                  <input matInput type="date" formControlName="endDate" />
                </mat-form-field>
              </div>
              <button mat-flat-button color="primary" type="submit" [disabled]="scheduleForm.invalid || scheduleSaving()">
                {{ scheduleSaving() ? 'Création...' : 'Créer planning' }}
              </button>
            </form>
          </div>

          <div class="tool-list">
            <article *ngFor="let item of toolboxItems()" class="tool-item">
              <strong>{{ item.title }}</strong>
              <p>{{ item.content }}</p>
              <div class="tool-activities" *ngIf="item.activities?.length">
                <span class="theme-chip" *ngFor="let activity of item.activities">{{ activity }}</span>
              </div>
              <small *ngIf="item.startDate || item.endDate">
                {{ item.startDate ? (item.startDate | date:'dd/MM/yyyy') : '…' }} → {{ item.endDate ? (item.endDate | date:'dd/MM/yyyy') : '…' }}
              </small>
              <small>{{ item.itemType === 'contract' ? 'Contrat' : 'Planning' }}</small>
            </article>
          </div>
        </article>

        <article class="card">
          <h2>Newsletter personnalisée</h2>
          <button mat-flat-button color="primary" type="button" (click)="loadNewsletter()">Générer newsletter</button>

          <div *ngIf="newsletter() as digest" class="newsletter">
            <h3>{{ digest.subject }}</h3>
            <p *ngFor="let item of digest.profileInsights">{{ item }}</p>
            <p *ngFor="let item of digest.scoreInsights">{{ item }}</p>
            <ul>
              <li *ngFor="let item of digest.recommendations">{{ item }}</li>
            </ul>
            <small>Thèmes suggérés: {{ digest.suggestedThemes.join(', ') }}</small>
          </div>
        </article>
      </ng-container>
    </section>
  `,
  styles: [
    `
      .edu-shell { max-width: 1100px; margin: 0 auto; padding: 1rem; display: grid; gap: 1rem; }
      .hero { display: block; border: 1px solid var(--fb-border); border-radius: var(--fb-radius-lg); background: var(--fb-surface-strong); padding: 1.25rem 1.5rem; box-shadow: var(--fb-shadow-soft); }
      .card { border: 1px solid var(--fb-border); border-radius: var(--fb-radius-lg); background: var(--fb-surface-strong); padding: 1.25rem; display: grid; gap: .9rem; box-shadow: var(--fb-shadow-soft); }
      .card h2 { margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--fb-text); }
      .filters { display: grid; grid-template-columns: 1fr 1fr auto; gap: .6rem; align-items: start; }
      .filters mat-form-field { width: 100%; }
      .filter-submit { margin-top: 8px; height: fit-content; }
      .resource-list, .path-list, .tool-list, .admin-list { display: grid; gap: .7rem; }
      .resource, .path, .tool-item, .admin-row { border: 1px solid var(--fb-border); border-radius: var(--fb-radius-md); background: var(--fb-bg); padding: .85rem; display: grid; gap: .35rem; }
      .resource p, .path p, .tool-item p, .admin-row p { margin: 0; color: var(--fb-muted); }
      .resource-image { width: 100%; max-height: 180px; object-fit: cover; border-radius: var(--fb-radius-sm); }
      .resource-header, .admin-row-top { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
      .resource-meta, .admin-row-meta { display: flex; flex-wrap: wrap; gap: .6rem; color: var(--fb-muted); font-size: 12px; align-items: center; }
      .resource-actions, .admin-row-actions { display: flex; justify-content: flex-end; gap: .5rem; flex-wrap: wrap; }
      .admin-row-actions { justify-content: flex-start; }
      .theme-chip { background: var(--fb-primary-soft); color: var(--fb-primary-strong); border-radius: 999px; padding: .25rem .6rem; font-size: 11px; font-weight: 600; }
      .status { margin: 0; color: var(--fb-success); font-weight: 600; }
      .hint { margin: 0; color: var(--fb-muted); font-size: 13px; }
      .path-top { display: flex; align-items: start; justify-content: space-between; gap: .5rem; }
      .badge { background: rgba(var(--fb-accent-rgb),.12); color: var(--fb-accent-strong); border-radius: 999px; padding: .2rem .55rem; font-size: 12px; font-weight: 600; }
      .steps { display: grid; gap: .45rem; }
      .steps button { text-align: left; justify-content: flex-start; gap: 6px; }
      .steps button[disabled] { color: var(--fb-success); border-color: rgba(var(--fb-success-rgb),.3); background: rgba(var(--fb-success-rgb),.06); opacity: 1; }
      .steps button mat-icon { color: var(--fb-success); }
      .tool-forms { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: .8rem; }
      .tool-forms form { border: 1px solid var(--fb-border); border-radius: var(--fb-radius-md); padding: .85rem; display: grid; gap: .25rem; background: var(--fb-bg); }
      .tool-forms mat-form-field { width: 100%; }
      .tool-forms h3 { margin: 0 0 .35rem; font-size: 1rem; font-weight: 700; color: var(--fb-text); }
      .date-row { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
      .tool-activities { display: flex; flex-wrap: wrap; gap: .35rem; }
      .newsletter ul { margin: .35rem 0 .35rem 1.1rem; }
      .empty { margin: 0; color: var(--fb-muted); }
      .error { margin: 0; color: var(--fb-danger); font-weight: 600; }
      .child-context-banner { display: flex; align-items: center; gap: .6rem; background: var(--fb-primary-soft); border: 1px solid rgba(var(--fb-primary-rgb),.2); border-radius: var(--fb-radius-md); padding: .7rem .9rem; }
      .child-context-banner p { flex: 1; margin: 0; color: var(--fb-text); }
      .child-context-banner mat-icon { color: var(--fb-primary); }

      /* Formulaire admin */
      .resource-form { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: .7rem .9rem; }
      .resource-form mat-form-field { width: 100%; }
      .resource-form .full { grid-column: 1 / -1; }
      .file-field { display: grid; gap: .3rem; align-content: start; }
      .file-field .field-label { font-size: 13px; font-weight: 600; color: var(--fb-text); }
      .file-field small { color: var(--fb-muted); font-size: 12px; }
      .form-actions { display: flex; gap: .6rem; flex-wrap: wrap; }

      /* Table admin */
      .status-pill { border-radius: 999px; padding: .2rem .6rem; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; }
      .status-pill[data-status="published"] { background: rgba(var(--fb-success-rgb),.12); color: var(--fb-success); }
      .status-pill[data-status="draft"] { background: rgba(var(--fb-warning-rgb),.14); color: var(--fb-warning); }
      .danger-action { color: var(--fb-danger) !important; border-color: rgba(var(--fb-danger-rgb),.35) !important; }

      /* Confirmation de suppression */
      .confirm-overlay { position: fixed; inset: 0; background: var(--fb-overlay); display: grid; place-items: center; z-index: 1000; padding: 1rem; }
      .confirm-box { background: var(--fb-surface-strong); border-radius: var(--fb-radius-lg); padding: 1.5rem; max-width: 420px; width: 100%; box-shadow: var(--fb-shadow); display: grid; gap: .7rem; }
      .confirm-box h3 { margin: 0; color: var(--fb-text); }
      .confirm-box p { margin: 0; color: var(--fb-muted); }
      .confirm-actions { display: flex; justify-content: flex-end; gap: .6rem; }

      @media (max-width: 768px) {
        .hero { flex-direction: column; align-items: stretch; }
        .filters { grid-template-columns: 1fr; }
        .tool-forms { grid-template-columns: 1fr; }
        .resource-form { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class EducationSpacePage implements OnInit {
  readonly resources = signal<EducationResource[]>([]);
  readonly categories = signal<string[]>([]);
  readonly paths = signal<LearningPath[]>([]);
  readonly toolboxItems = signal<ParentToolboxItem[]>([]);
  readonly newsletter = signal<NewsletterPreview | null>(null);
  readonly errorMessage = signal('');
  readonly statusMessage = signal('');
  readonly contractSaving = signal(false);
  readonly scheduleSaving = signal(false);
  readonly userRole = signal<string | null>(null);
  readonly currentUser = signal<UserProfile | null>(null);

  // --- Administration ---------------------------------------------------------
  readonly adminResources = signal<EducationResource[]>([]);
  readonly adminSaving = signal(false);
  readonly editingResourceId = signal<string | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly resourcePendingDelete = signal<EducationResource | null>(null);
  readonly deletingResource = signal(false);

  readonly adminCategories = computed(() => {
    const set = new Set(this.adminResources().map((r) => r.category).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  });

  /**
   * Âge résolu automatiquement pour le filtrage de la bibliothèque : celui de
   * l'adolescent connecté, ou celui de l'enfant sélectionné par le parent (via
   * ChildContextService, alimenté depuis le tableau de bord famille). Aucune saisie
   * manuelle d'âge n'est proposée côté Parent/Adolescent.
   */
  readonly resolvedAge = computed<number | null>(() => {
    if (this.userRole() === 'adolescent') {
      return this.computeAge(this.currentUser()?.adolescentProfile?.birthDate);
    }
    if (this.userRole() === 'parent' && this.childContext.selectedChildId()) {
      return this.computeAge(this.childContext.selectedChildBirthDate());
    }
    return null;
  });

  readonly filterForm = this.fb.group({
    category: [''],
    search: [''],
  });

  readonly resourceForm = this.fb.group({
    title: ['', [Validators.required]],
    description: ['', [Validators.required]],
    category: ['', [Validators.required]],
    ageMin: [6, [Validators.required, Validators.min(3), Validators.max(18)]],
    ageMax: [12, [Validators.required, Validators.min(3), Validators.max(18)]],
    contentType: ['link' as EducationResourceContentType, [Validators.required]],
    externalUrl: [''],
    difficulty: ['debutant' as 'debutant' | 'intermediaire' | 'avance'],
    estimatedMinutes: [10],
    themes: [''],
  });

  readonly contractForm = this.fb.group({
    title: ['', [Validators.required]],
    content: ['', [Validators.required]],
  });

  readonly scheduleForm = this.fb.group({
    title: ['', [Validators.required]],
    content: ['', [Validators.required]],
    activities: [''],
    startDate: [''],
    endDate: [''],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly educationService: EducationService,
    private readonly authService: AuthService,
    readonly childContext: ChildContextService
  ) {}

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: (response) => {
        this.userRole.set(response.user.role);
        this.currentUser.set(response.user);

        if (response.user.role === 'admin') {
          this.loadAdminResources();
          return;
        }

        this.loadCategories();
        this.loadResources();
        this.loadPaths();
        if (response.user.role === 'parent') {
          this.loadToolbox();
        }
      },
      error: () => {
        this.errorMessage.set('Session invalide. Veuillez vous reconnecter.');
      },
    });
  }

  private computeAge(birthDateIso: string | null | undefined): number | null {
    if (!birthDateIso) return null;
    const birth = new Date(birthDateIso);
    if (Number.isNaN(birth.getTime())) return null;

    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const hasHadBirthdayThisYear =
      now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
    if (!hasHadBirthdayThisYear) age -= 1;

    return age;
  }

  contentTypeLabel(type: EducationResourceContentType): string {
    return CONTENT_TYPE_LABELS[type];
  }

  contentActionLabel(type: EducationResourceContentType): string {
    return CONTENT_ACTION_LABELS[type];
  }

  needsFile(): boolean {
    const type = this.resourceForm.get('contentType')?.value;
    return type === 'image' || type === 'pdf';
  }

  needsUrl(): boolean {
    const type = this.resourceForm.get('contentType')?.value;
    return type === 'video' || type === 'link';
  }

  // --- Bibliothèque (Parent/Adolescent) ----------------------------------------

  loadCategories(): void {
    this.educationService.getCategories().subscribe({
      next: (response) => this.categories.set(response.categories),
      error: () => {
        /* Filtre non bloquant : une catégorie absente n'empêche pas de consulter la bibliothèque. */
      },
    });
  }

  loadResources(): void {
    this.errorMessage.set('');
    this.statusMessage.set('');

    const raw = this.filterForm.getRawValue();
    this.educationService
      .getResources({
        age: this.resolvedAge() ?? undefined,
        category: raw.category || undefined,
        search: raw.search || undefined,
      })
      .subscribe({
        next: (response) => this.resources.set(response.resources),
        error: (error) => this.errorMessage.set(error?.error?.message || 'Impossible de charger la bibliothèque.'),
      });
  }

  openResource(url: string): void {
    window.open(url, '_blank', 'noopener');
  }

  loadPaths(): void {
    this.educationService.getLearningPaths().subscribe({
      next: (response) => this.paths.set(response.paths),
      error: (error) => this.errorMessage.set(error?.error?.message || 'Impossible de charger les parcours.'),
    });
  }

  completeStep(pathId: string, stepId: string): void {
    this.educationService.completeStep(pathId, stepId).subscribe({
      next: () => this.loadPaths(),
      error: (error) => this.errorMessage.set(error?.error?.message || 'Mise à jour de progression impossible.'),
    });
  }

  isStepCompleted(path: LearningPath, stepId: string): boolean {
    return path.completedStepIds.includes(stepId);
  }

  loadToolbox(): void {
    this.educationService.getToolbox().subscribe({
      next: (response) => this.toolboxItems.set(response.items),
      error: (error) => this.errorMessage.set(error?.error?.message || 'Impossible de charger la boîte à outils.'),
    });
  }

  createContract(): void {
    if (this.contractForm.invalid) return;

    this.contractSaving.set(true);
    this.educationService.createContract(this.contractForm.getRawValue() as { title: string; content: string }).subscribe({
      next: () => {
        this.contractSaving.set(false);
        this.contractForm.reset();
        this.loadToolbox();
        this.statusMessage.set('Contrat numérique ajouté à votre boîte à outils.');
      },
      error: (error) => {
        this.contractSaving.set(false);
        this.errorMessage.set(error?.error?.message || 'Création du contrat impossible.');
      },
    });
  }

  createSchedule(): void {
    if (this.scheduleForm.invalid) return;

    this.scheduleSaving.set(true);
    const raw = this.scheduleForm.getRawValue();
    this.educationService
      .createSchedule({
        title: raw.title || '',
        content: raw.content || '',
        activities: (raw.activities || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        startDate: raw.startDate || undefined,
        endDate: raw.endDate || undefined,
      })
      .subscribe({
        next: () => {
          this.scheduleSaving.set(false);
          this.scheduleForm.reset();
          this.loadToolbox();
          this.statusMessage.set('Planning d’activités enregistré avec succès.');
        },
        error: (error) => {
          this.scheduleSaving.set(false);
          this.errorMessage.set(error?.error?.message || 'Création du planning impossible.');
        },
      });
  }

  loadNewsletter(): void {
    this.educationService.getNewsletterPreview().subscribe({
      next: (response) => this.newsletter.set(response.newsletter),
      error: (error) => this.errorMessage.set(error?.error?.message || 'Impossible de générer la newsletter.'),
    });
  }

  // --- Administration des ressources -------------------------------------------

  loadAdminResources(): void {
    this.educationService.adminListResources().subscribe({
      next: (response) => this.adminResources.set(response.resources),
      error: (error) => this.errorMessage.set(error?.error?.message || 'Impossible de charger les ressources.'),
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  private resetResourceForm(): void {
    this.editingResourceId.set(null);
    this.selectedFile.set(null);
    this.resourceForm.reset({
      title: '',
      description: '',
      category: '',
      ageMin: 6,
      ageMax: 12,
      contentType: 'link',
      externalUrl: '',
      difficulty: 'debutant',
      estimatedMinutes: 10,
      themes: '',
    });
  }

  startEdit(resource: EducationResource): void {
    this.editingResourceId.set(resource._id);
    this.selectedFile.set(null);
    this.resourceForm.reset({
      title: resource.title,
      description: resource.description,
      category: resource.category,
      ageMin: resource.ageMin,
      ageMax: resource.ageMax,
      contentType: resource.contentType,
      externalUrl: resource.externalUrl || '',
      difficulty: resource.difficulty,
      estimatedMinutes: resource.estimatedMinutes,
      themes: (resource.themes || []).join(', '),
    });
    this.errorMessage.set('');
  }

  cancelEdit(): void {
    this.resetResourceForm();
  }

  saveResource(): void {
    if (this.resourceForm.invalid) {
      this.resourceForm.markAllAsTouched();
      return;
    }

    const raw = this.resourceForm.getRawValue();

    if ((raw.ageMin ?? 0) > (raw.ageMax ?? 0)) {
      this.errorMessage.set("L'âge minimum doit être inférieur ou égal à l'âge maximum.");
      return;
    }

    const editingId = this.editingResourceId();

    if (this.needsFile() && !editingId && !this.selectedFile()) {
      this.errorMessage.set('Un fichier est requis pour une ressource de type image ou PDF.');
      return;
    }

    if (this.needsUrl() && !raw.externalUrl) {
      this.errorMessage.set('Une URL est requise pour une ressource de type vidéo ou lien externe.');
      return;
    }

    this.adminSaving.set(true);
    this.errorMessage.set('');

    const payload: EducationResourceFormValue = {
      title: raw.title || '',
      description: raw.description || '',
      category: raw.category || '',
      ageMin: raw.ageMin ?? 3,
      ageMax: raw.ageMax ?? 18,
      contentType: raw.contentType as EducationResourceContentType,
      externalUrl: raw.externalUrl || undefined,
      themes: raw.themes || undefined,
      estimatedMinutes: raw.estimatedMinutes ?? undefined,
      difficulty: raw.difficulty ?? undefined,
    };

    const request$ = editingId
      ? this.educationService.adminUpdateResource(editingId, payload, this.selectedFile())
      : this.educationService.adminCreateResource(payload, this.selectedFile());

    request$.subscribe({
      next: () => {
        this.adminSaving.set(false);
        this.statusMessage.set(editingId ? 'Ressource mise à jour.' : 'Ressource créée en brouillon.');
        this.resetResourceForm();
        this.loadAdminResources();
      },
      error: (error) => {
        this.adminSaving.set(false);
        this.errorMessage.set(error?.error?.message || "Enregistrement de la ressource impossible.");
      },
    });
  }

  askDeleteResource(resource: EducationResource): void {
    this.resourcePendingDelete.set(resource);
  }

  cancelDeleteResource(): void {
    if (this.deletingResource()) return;
    this.resourcePendingDelete.set(null);
  }

  confirmDeleteResource(): void {
    const target = this.resourcePendingDelete();
    if (!target || this.deletingResource()) return;

    this.deletingResource.set(true);
    this.educationService.adminDeleteResource(target._id).subscribe({
      next: () => {
        this.deletingResource.set(false);
        this.resourcePendingDelete.set(null);
        this.statusMessage.set('Ressource supprimée.');
        if (this.editingResourceId() === target._id) {
          this.resetResourceForm();
        }
        this.loadAdminResources();
      },
      error: (error) => {
        this.deletingResource.set(false);
        this.errorMessage.set(error?.error?.message || 'Suppression impossible.');
      },
    });
  }

  togglePublish(resource: EducationResource): void {
    this.errorMessage.set('');
    const request$ =
      resource.status === 'published'
        ? this.educationService.adminUnpublishResource(resource._id)
        : this.educationService.adminPublishResource(resource._id);

    request$.subscribe({
      next: () => {
        this.statusMessage.set(resource.status === 'published' ? 'Ressource repassée en brouillon.' : 'Ressource publiée.');
        this.loadAdminResources();
      },
      error: (error) => this.errorMessage.set(error?.error?.message || 'Action impossible.'),
    });
  }
}
