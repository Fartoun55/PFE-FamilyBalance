import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, signal, HostListener } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { SurveyService } from '../../../core/services/survey.service';
import { ChildContextService } from '../../../core/services/child-context.service';
import { AuthService } from '../../../core/services/auth.service';
import { LinkedAdolescentProfile } from '../../../core/models/auth.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import {
  SurveyCatalogResponse,
  SurveyQuestion,
  SurveySession,
  SurveyStateResponse,
} from '../models/survey.models';

@Component({
  selector: 'app-dynamic-survey-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatIconModule,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      eyebrow="Évaluation"
      title="Questionnaire personnalisé"
      subtitle="Les questions s'adaptent à l'âge, au domaine choisi et à vos réponses précédentes."
      illustration="survey"
    ></app-page-header>

    <div class="child-banner" *ngIf="childContext.selectedChildId()">
      <mat-icon>face</mat-icon>
      <p>Questionnaire pour <strong>{{ childContext.selectedChildName() }}</strong> — l'âge est déterminé automatiquement à partir de son profil.</p>
      <button class="fb-btn fb-btn--ghost fb-btn--sm" type="button" (click)="exitChildContext()">Remplir pour moi-même</button>
    </div>

    <!-- ── Configuration ─────────────────────────────── -->
    <div class="setup" *ngIf="!session(); else sessionTpl">
      <section class="fb-card fb-card--lg step">
        <header class="step-head">
          <span class="step-num">1</span>
          <div>
            <h2 class="section-title">Pour qui est ce questionnaire ?</h2>
            <p>Ces informations permettent d'adapter les questions au profil.</p>
          </div>
        </header>

        <form [formGroup]="setupForm" class="setup-form">
          <mat-form-field appearance="outline">
            <mat-label>Qui répond ?</mat-label>
            <mat-select formControlName="respondent">
              <mat-option value="parent">Parent / tuteur</mat-option>
              <mat-option value="adolescent">Adolescent(e)</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Parent connecté sans enfant choisi : uniquement ses enfants réels (pas de saisie
               libre), pour rattacher la session au bon enfant côté backend. -->
          <ng-container *ngIf="isParentRole() && !childContext.selectedChildId()">
            <mat-form-field appearance="outline" *ngIf="!loadingChildren() && children().length">
              <mat-label>Enfant concerné</mat-label>
              <mat-select (selectionChange)="onChildSelected($event.value)">
                <mat-option *ngFor="let child of children()" [value]="child._id">
                  {{ child.firstName }} {{ child.lastName }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <p class="inline-loading" *ngIf="loadingChildren()">
              <span class="fb-spinner"></span>
              Chargement de vos enfants…
            </p>

            <div class="fb-alert fb-alert--warning wide" *ngIf="!loadingChildren() && !children().length">
              <mat-icon>info</mat-icon>
              <span>
                Aucun enfant n'est associé à votre compte.
                <a routerLink="/family/add-adolescent">Ajoutez un profil adolescent</a> pour démarrer une évaluation.
              </span>
            </div>
          </ng-container>

          <!-- Répondant adolescent (ou cas hors parent) : saisie libre conservée. -->
          <mat-form-field appearance="outline" *ngIf="!childContext.selectedChildId() && !isParentRole()">
            <mat-label>Prénom</mat-label>
            <input matInput type="text" formControlName="targetFirstName" placeholder="Ex. : Lina, Thomas…" />
            <mat-hint>2 caractères minimum</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" *ngIf="!childContext.selectedChildId() && !isParentRole()">
            <mat-label>Âge (3 à 18 ans)</mat-label>
            <input matInput type="number" min="3" max="18" formControlName="age" />
          </mat-form-field>
        </form>

        <div class="step-actions">
          <button class="fb-btn" type="button" (click)="loadCatalog()" [disabled]="setupForm.invalid || loadingCatalog()">
            <span class="fb-spinner light" *ngIf="loadingCatalog()" aria-hidden="true"></span>
            {{ loadingCatalog() ? 'Chargement…' : 'Continuer' }}
            <mat-icon *ngIf="!loadingCatalog()">arrow_forward</mat-icon>
          </button>
          <p class="recap" *ngIf="catalog().domains.length">
            <mat-icon>check_circle</mat-icon>
            {{ respondentLabel() }} · {{ setupForm.getRawValue().targetFirstName }} ·
            {{ childContext.selectedChildId() ? catalog().age : setupForm.getRawValue().age }} ans
          </p>
        </div>
      </section>

      <section class="fb-card fb-card--lg step" *ngIf="catalog().domains.length">
        <header class="step-head">
          <span class="step-num">2</span>
          <div>
            <h2 class="section-title">Choisissez un domaine</h2>
            <p>Chaque domaine explore un aspect différent du rapport aux écrans.</p>
          </div>
        </header>

        <div class="domains" role="radiogroup" aria-label="Domaine d'évaluation">
          <button
            type="button"
            role="radio"
            class="domain"
            *ngFor="let domain of catalog().domains"
            [class.active]="selectedDomain() === domain.value"
            [attr.aria-checked]="selectedDomain() === domain.value"
            (click)="selectDomain(domain.value)"
          >
            <span class="domain-icon"><mat-icon>{{ selectedDomain() === domain.value ? 'check_circle' : 'assessment' }}</mat-icon></span>
            <span class="domain-text">
              <strong>{{ domain.label }}</strong>
              <small>{{ domain.questionCount }} questions</small>
            </span>
          </button>
        </div>

        <div class="step-actions">
          <button class="fb-btn fb-btn--accent" type="button" (click)="startSurvey()" [disabled]="!selectedDomain() || loadingSession()">
            <mat-icon>play_arrow</mat-icon>
            {{ loadingSession() ? 'Démarrage…' : 'Démarrer le questionnaire' }}
          </button>
        </div>
      </section>

      <div class="fb-alert fb-alert--error" role="alert" *ngIf="errorMessage()">
        <mat-icon>error_outline</mat-icon>
        <span>{{ errorMessage() }}</span>
      </div>
    </div>

    <!-- ── Session ───────────────────────────────────── -->
    <ng-template #sessionTpl>
      <section class="fb-card fb-card--lg session">
        <header class="session-head">
          <div class="session-title">
            <span class="fb-eyebrow">{{ currentQuestion()?.domainLabel || session()?.domainLabel }}</span>
            <p>{{ dynamicSessionMessage() }}</p>
          </div>
          <div class="session-stats">
            <span class="stat"><strong>{{ progress().answered }}</strong>/{{ progress().total }} réponses</span>
            <span class="stat" *ngIf="elapsedTime()"><mat-icon>schedule</mat-icon>{{ formatTime(elapsedTime()) }}</span>
          </div>
        </header>

        <div class="progress" role="progressbar" aria-label="Progression du questionnaire" [attr.aria-valuenow]="progress().percent" aria-valuemin="0" aria-valuemax="100">
          <span class="progress-fill" [style.width.%]="progress().percent"></span>
        </div>

        <div class="meta">
          <span class="chip"><mat-icon>person</mat-icon>{{ respondentLabel() }}</span>
          <span class="chip"><mat-icon>child_care</mat-icon>{{ setupForm.getRawValue().targetFirstName || 'Profil' }}</span>
          <span class="chip"><mat-icon>cake</mat-icon>{{ session()?.age }} ans</span>
          <span class="chip"><mat-icon>groups</mat-icon>{{ ageSegment() }}</span>
        </div>

        <nav class="dots" *ngIf="session() && session()!.answers.length" aria-label="Réponses déjà données">
          <button
            *ngFor="let answer of session()?.answers; let i = index"
            type="button"
            class="dot"
            [class.answered]="!answer.draft"
            [class.draft]="answer.draft"
            [matTooltip]="'Revoir la question ' + (i + 1)"
            [attr.aria-label]="'Question ' + (i + 1) + ' — ' + (answer.draft ? 'brouillon' : 'répondue')"
            (click)="reviewAnswer(i)"
          ></button>
        </nav>

        <div class="fb-alert resume" *ngIf="resumeNotice()">
          <mat-icon>info</mat-icon>
          <span>{{ resumeNotice() }}</span>
        </div>

        <!-- Terminé -->
        <div class="done" *ngIf="completed(); else questionTpl">
          <div class="done-head">
            <span class="done-icon"><mat-icon>task_alt</mat-icon></span>
            <h2>Questionnaire terminé !</h2>
            <p>Vos réponses ont bien été enregistrées. Durée : <strong>{{ formatTime(elapsedTime()) }}</strong></p>
          </div>

          <div class="fb-alert" *ngIf="scoreSubmitting()">
            <span class="fb-spinner"></span>
            <span>Calcul de votre score en cours…</span>
          </div>
          <div class="fb-alert fb-alert--error" *ngIf="scoreError()">
            <mat-icon>error_outline</mat-icon>
            <span>{{ scoreError() }}</span>
            <button class="fb-btn fb-btn--ghost fb-btn--sm retry" type="button" (click)="retryScoreCalculation()">Réessayer</button>
          </div>

          <div class="done-actions">
            <button class="fb-btn" type="button" (click)="viewResults()" [disabled]="scoreSubmitting()">
              <mat-icon>insights</mat-icon>
              Voir mon résultat
            </button>
            <button class="fb-btn fb-btn--ghost" type="button" (click)="exportSummary()">
              <mat-icon>download</mat-icon>
              Exporter en PDF
            </button>
            <button class="fb-btn fb-btn--ghost" type="button" (click)="resetSurvey()">
              <mat-icon>restart_alt</mat-icon>
              Recommencer
            </button>
          </div>

          <div class="summary" *ngIf="summaryAnswers().length">
            <h3 class="section-title">Synthèse de vos réponses</h3>
            <ol>
              <li *ngFor="let item of summaryAnswers(); let i = index">
                <span class="num">{{ i + 1 }}</span>
                <div class="summary-q">
                  <p>{{ item.questionPrompt || item.questionCode }}</p>
                  <small>{{ item.domain }} · {{ getQuestionTypeLabel(item.type) }}</small>
                </div>
                <strong>{{ item.answer }}</strong>
              </li>
            </ol>
          </div>
        </div>

        <!-- Question -->
        <ng-template #questionTpl>
          <ng-container *ngIf="currentQuestion(); else waitingTpl">
            <div class="question">
              <div class="question-badges">
                <span class="fb-badge">Question {{ progress().answered + 1 }} sur {{ progress().total }}</span>
                <span class="fb-badge fb-badge--neutral">{{ questionTypeLabel() }}</span>
              </div>
              <h2 class="prompt">{{ currentQuestion()?.prompt }}</h2>
              <p class="help" *ngIf="currentQuestion()?.helpText">
                <mat-icon>lightbulb</mat-icon>
                {{ currentQuestion()?.helpText }}
              </p>
            </div>

            <div class="choices" *ngIf="currentQuestion()?.type === 'single-choice'">
              <button
                type="button"
                class="choice"
                *ngFor="let option of currentQuestion()?.options || []"
                [disabled]="saving()"
                (click)="chooseOption(option.value)"
              >
                <span class="radio" aria-hidden="true"></span>
                {{ option.label }}
              </button>
            </div>

            <div class="likert" *ngIf="currentQuestion()?.type === 'likert'">
              <button
                type="button"
                class="likert-btn"
                *ngFor="let option of likertOptions"
                [disabled]="saving()"
                (click)="chooseLikert(option.value)"
              >
                <span class="likert-value">{{ option.value }}</span>
                <small>{{ option.label }}</small>
              </button>
            </div>
            <p class="kbd-hint" *ngIf="currentQuestion()?.type === 'likert'">Astuce : tapez 1 à 5 au clavier pour répondre.</p>

            <form *ngIf="currentQuestion()?.type === 'text'" [formGroup]="answerForm" class="text-form">
              <mat-form-field appearance="outline">
                <mat-label>Votre réponse</mat-label>
                <textarea matInput rows="5" formControlName="textAnswer" placeholder="Exprimez-vous librement…"></textarea>
                <mat-hint align="end">{{ getCharacterCount() }}/500 caractères</mat-hint>
              </mat-form-field>
            </form>

            <div class="question-nav">
              <button class="fb-btn fb-btn--ghost" type="button" (click)="previousQuestion()" [disabled]="!canGoBack() || saving()">
                <mat-icon>arrow_back</mat-icon>
                Précédent
              </button>
              <span class="status" aria-live="polite">
                <ng-container *ngIf="saving()"><span class="fb-spinner"></span>Enregistrement…</ng-container>
                <ng-container *ngIf="!saving() && successMessage()"><mat-icon class="ok">check_circle</mat-icon>{{ successMessage() }}</ng-container>
              </span>
              <button
                *ngIf="currentQuestion()?.type === 'text'"
                class="fb-btn"
                type="button"
                (click)="advanceTextQuestion()"
                [disabled]="saving()"
              >
                Suivant
                <mat-icon>arrow_forward</mat-icon>
              </button>
            </div>

            <div class="fb-alert fb-alert--error" role="alert" *ngIf="errorMessage()">
              <mat-icon>error_outline</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>
          </ng-container>
        </ng-template>

        <ng-template #waitingTpl>
          <div class="fb-loading">
            <span class="fb-spinner"></span>
            Chargement de la question suivante…
          </div>
        </ng-template>
      </section>
    </ng-template>
  `,
  styles: [
    `
      :host { display: block; max-width: 920px; }

      .child-banner {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 20px;
        padding: 14px 18px;
        border-radius: var(--fb-radius-md);
        background: var(--fb-primary-tint);
        color: var(--fb-primary-strong);
      }
      .child-banner p { flex: 1; min-width: 220px; margin: 0; font-size: 14.5px; }

      /* Configuration */
      .setup { display: flex; flex-direction: column; gap: 20px; }
      .step { animation: slideUp 0.3s var(--fb-ease); }
      .step-head { display: flex; gap: 14px; margin-bottom: 20px; }
      .step-head p { margin: 4px 0 0; color: var(--fb-text-mid); font-size: 14.5px; }
      .step-num {
        display: grid;
        place-items: center;
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        border-radius: 12px;
        background: var(--fb-ink);
        color: #fff;
        font-weight: 700;
      }
      .setup-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; }
      .setup-form .wide, .setup-form .inline-loading { grid-column: 1 / -1; }
      .inline-loading { display: flex; align-items: center; gap: 10px; margin: 0; color: var(--fb-muted); font-size: 14px; }
      .step-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 8px; }
      .recap { display: flex; align-items: center; gap: 6px; margin: 0; color: var(--fb-text-mid); font-size: 14px; font-weight: 600; }
      .recap mat-icon { color: var(--fb-success); width: 20px; height: 20px; font-size: 20px; }
      .fb-spinner.light { width: 18px; height: 18px; border-color: rgba(255, 255, 255, 0.35); border-top-color: #fff; }

      .domains { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-bottom: 20px; }
      .domain {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px;
        border: 1.5px solid var(--fb-border);
        border-radius: 16px;
        background: var(--fb-surface);
        color: var(--fb-text);
        text-align: left;
        cursor: pointer;
      }
      .domain:hover { border-color: var(--fb-border-strong); background: var(--fb-surface-alt); }
      .domain.active { border-color: var(--fb-primary); background: var(--fb-primary-soft); box-shadow: 0 0 0 3px rgba(var(--fb-primary-rgb), 0.1); }
      .domain-icon {
        display: grid;
        place-items: center;
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: var(--fb-surface-alt);
        color: var(--fb-text-mid);
      }
      .domain.active .domain-icon { background: var(--fb-primary); color: #fff; }
      .domain-text strong { display: block; font-size: 14.5px; }
      .domain-text small { color: var(--fb-muted); font-size: 13px; }

      /* Session */
      .session { display: flex; flex-direction: column; gap: 18px; }
      .session-head { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
      .session-title p { margin: 6px 0 0; color: var(--fb-text-mid); font-size: 14px; }
      .session-stats { display: flex; gap: 10px; align-items: flex-start; }
      .stat {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        border-radius: var(--fb-radius-pill);
        background: var(--fb-surface-alt);
        font-size: 13px;
        color: var(--fb-text-mid);
        white-space: nowrap;
      }
      .stat strong { color: var(--fb-text); }
      .stat mat-icon { width: 16px; height: 16px; font-size: 16px; }
      .progress { height: 8px; border-radius: 8px; background: var(--fb-sunken); overflow: hidden; }
      .progress-fill { display: block; height: 100%; border-radius: 8px; background: var(--fb-primary); transition: width 0.4s var(--fb-ease); }

      .meta { display: flex; flex-wrap: wrap; gap: 8px; }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border: 1px solid var(--fb-border);
        border-radius: var(--fb-radius-pill);
        font-size: 13px;
        color: var(--fb-text-mid);
      }
      .chip mat-icon { width: 16px; height: 16px; font-size: 16px; color: var(--fb-muted); }

      .dots { display: flex; flex-wrap: wrap; gap: 6px; }
      .dot { width: 14px; height: 14px; padding: 0; border: none; border-radius: 50%; background: var(--fb-sunken); cursor: pointer; }
      .dot.answered { background: var(--fb-primary); }
      .dot.draft { background: var(--fb-accent); }
      .dot:hover { transform: scale(1.25); }

      /* Question */
      .question { padding-top: 6px; border-top: 1px solid var(--fb-border); animation: fadeIn 0.25s ease; }
      .question-badges { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 12px; }
      .prompt { margin: 0; font-size: clamp(1.35rem, 1.1rem + 0.8vw, 1.75rem); line-height: 1.25; }
      .help {
        display: flex;
        gap: 8px;
        margin: 12px 0 0;
        padding: 10px 14px;
        border-radius: var(--fb-radius-sm);
        background: var(--fb-accent-soft);
        color: var(--fb-warning-ink);
        font-size: 14px;
      }
      .help mat-icon { flex-shrink: 0; width: 20px; height: 20px; font-size: 20px; }

      .choices { display: grid; gap: 10px; }
      .choice {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 54px;
        padding: 12px 16px;
        border: 1.5px solid var(--fb-border);
        border-radius: 16px;
        background: var(--fb-surface);
        color: var(--fb-text);
        font-size: 15px;
        font-weight: 600;
        text-align: left;
        cursor: pointer;
      }
      .radio { flex-shrink: 0; width: 20px; height: 20px; border: 2px solid var(--fb-border-strong); border-radius: 50%; transition: border 0.15s ease; }
      .choice:hover:not(:disabled) { border-color: var(--fb-primary); background: var(--fb-primary-soft); }
      .choice:hover:not(:disabled) .radio { border: 6px solid var(--fb-primary); }
      .choice:disabled { opacity: 0.55; cursor: wait; }

      .likert { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
      .likert-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 16px 8px;
        border: 1.5px solid var(--fb-border);
        border-radius: 16px;
        background: var(--fb-surface);
        color: var(--fb-text);
        cursor: pointer;
      }
      .likert-btn:hover:not(:disabled) { border-color: var(--fb-primary); background: var(--fb-primary-soft); }
      .likert-btn:disabled { opacity: 0.55; cursor: wait; }
      .likert-value { font-family: var(--fb-font-serif); font-size: 1.6rem; font-weight: 650; line-height: 1; }
      .likert-btn small { font-size: 12.5px; color: var(--fb-text-mid); text-align: center; }
      .kbd-hint { margin: -6px 0 0; font-size: 12.5px; color: var(--fb-muted); }

      .text-form mat-form-field { width: 100%; }

      .question-nav { display: flex; align-items: center; gap: 12px; padding-top: 16px; border-top: 1px solid var(--fb-border); }
      .status { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 13.5px; color: var(--fb-muted); }
      .status .fb-spinner { width: 16px; height: 16px; }
      .status .ok { width: 18px; height: 18px; font-size: 18px; color: var(--fb-success); }

      /* Terminé */
      .done { display: flex; flex-direction: column; gap: 18px; animation: fadeIn 0.3s ease; }
      .done-head { text-align: center; padding: 12px 0 4px; }
      .done-icon {
        display: inline-grid;
        place-items: center;
        width: 64px;
        height: 64px;
        margin-bottom: 12px;
        border-radius: 22px;
        background: rgba(var(--fb-success-rgb), 0.1);
        color: var(--fb-success);
      }
      .done-icon mat-icon { width: 32px; height: 32px; font-size: 32px; }
      .done-head h2 { margin: 0 0 6px; font-size: 1.75rem; }
      .done-head p { margin: 0; color: var(--fb-text-mid); }
      .done-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
      .retry { margin-left: auto; }

      .summary { padding-top: 18px; border-top: 1px solid var(--fb-border); }
      .summary ol { display: grid; gap: 8px; margin: 14px 0 0; padding: 0; list-style: none; }
      .summary li { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; padding: 12px 14px; border-radius: var(--fb-radius-sm); background: var(--fb-surface-alt); }
      .num { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; background: var(--fb-surface); font-size: 12.5px; font-weight: 700; color: var(--fb-text-mid); }
      .summary-q { min-width: 0; }
      .summary-q p { margin: 0; font-size: 14px; font-weight: 600; }
      .summary-q small { color: var(--fb-muted); font-size: 12.5px; }
      .summary li > strong { font-size: 14px; color: var(--fb-primary-strong); text-align: right; }

      @media (max-width: 768px) {
        .setup-form { grid-template-columns: 1fr; }
        .likert { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
        .likert-btn { padding: 12px 4px; }
        .likert-btn small { font-size: 11px; }
        .question-nav { flex-wrap: wrap; }
        .status { order: 3; flex-basis: 100%; }
        .done-actions .fb-btn { flex: 1 1 100%; }
        .summary li { grid-template-columns: auto 1fr; }
        .summary li > strong { grid-column: 2; text-align: left; }
      }
    `,
  ],
})
export class DynamicSurveyPage implements OnInit {
  readonly loadingCatalog = signal(false);
  readonly loadingSession = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly resumeNotice = signal('');
  readonly selectedDomain = signal('');
  readonly catalog = signal<SurveyCatalogResponse>({ status: 'success', age: 0, ageSegment: '', domains: [] });
  readonly session = signal<SurveySession | null>(null);
  readonly currentQuestion = signal<SurveyQuestion | null>(null);
  readonly progress = signal({ answered: 0, total: 0, percent: 0 });
  readonly completed = signal(false);
  readonly ageSegment = signal('');
  readonly elapsedTime = signal(0);
  readonly currentAnswerIndex = signal(0);

  readonly summaryAnswers = computed(() =>
    [...(this.session()?.answers || [])]
      .filter((item) => !item.draft)
      .sort((a, b) => new Date(a.answeredAt).getTime() - new Date(b.answeredAt).getTime())
  );

  readonly likertOptions = [
    { value: '1', label: 'Pas du tout' },
    { value: '2', label: 'Très peu' },
    { value: '3', label: 'Moyen' },
    { value: '4', label: 'Plutôt oui' },
    { value: '5', label: 'Tout à fait' },
  ];

  readonly setupForm = this.formBuilder.group({
    respondent: ['parent', [Validators.required]],
    targetFirstName: ['', [Validators.required, Validators.minLength(2)]],
    age: [null as number | null, [Validators.required, Validators.min(3), Validators.max(18)]],
  });

  readonly children = signal<LinkedAdolescentProfile[]>([]);
  readonly loadingChildren = signal(false);
  readonly isParentRole = computed(() => this.authService.currentUser()?.role === 'parent');

  readonly answerForm = this.formBuilder.group({
    textAnswer: ['', [Validators.maxLength(500)]],
  });

  private startTime: number | null = null;
  private timerInterval: any;

  readonly scoreSubmitting = signal(false);
  readonly scoreReady = signal(false);
  readonly scoreError = signal('');

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly surveyService: SurveyService,
    private readonly destroyRef: DestroyRef,
    private readonly router: Router,
    protected readonly childContext: ChildContextService,
    private readonly authService: AuthService
  ) {}

  private readonly ACTIVE_SESSION_KEY = 'familybalance_survey_active_session';

  ngOnInit(): void {
    this.answerForm.get('textAnswer')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef), debounceTime(600), distinctUntilChanged())
      .subscribe((value) => {
        if (!this.currentQuestion() || this.currentQuestion()?.type !== 'text') {
          return;
        }

        this.saveDraft(String(value || ''));
      });

    // Reprise automatique après fermeture/actualisation de la page ou perte de connexion : si une
    // session était en cours, on la relance directement au lieu de renvoyer l'utilisateur au
    // formulaire de configuration — aucune réponse déjà enregistrée n'est redemandée.
    const savedRaw = localStorage.getItem(this.ACTIVE_SESSION_KEY);
    if (savedRaw) {
      try {
        const saved = JSON.parse(savedRaw) as { sessionId: string; domain: string; age?: number; childId?: string; respondent?: string; targetFirstName?: string };
        this.setupForm.patchValue({
          respondent: (saved.respondent as 'parent' | 'adolescent') || 'parent',
          targetFirstName: saved.targetFirstName || '',
          age: saved.age ?? null,
        });
        this.selectedDomain.set(saved.domain || '');
        this.resumeAutomatically(saved);
        return;
      } catch {
        localStorage.removeItem(this.ACTIVE_SESSION_KEY);
      }
    }

    if (this.childContext.selectedChildId()) {
      // Un parent pilote le questionnaire pour un enfant sélectionné depuis le dashboard famille :
      // l'âge est dérivé côté serveur à partir de la date de naissance réelle de l'enfant.
      this.setupForm.get('age')?.clearValidators();
      this.setupForm.get('age')?.updateValueAndValidity();
      this.setupForm.patchValue({
        targetFirstName: this.childContext.selectedChildName() || '',
      });
    } else if (this.isParentRole()) {
      // Parent arrivé directement sur la page (sans passer par "Démarrer le questionnaire"
      // depuis le tableau de bord famille) : on charge ses vrais enfants pour la liste
      // déroulante, plutôt que de laisser une saisie libre de prénom/âge non reliée à un
      // compte réel.
      this.loadMyChildren();
    } else {
      const storedAge = localStorage.getItem('familybalance_survey_age');
      if (storedAge) {
        const numericAge = Number(storedAge);
        if (!Number.isNaN(numericAge)) {
          this.setupForm.patchValue({ age: numericAge });
        }
      }
    }
  }

  loadMyChildren(): void {
    this.loadingChildren.set(true);
    this.authService.getMyAdolescents().subscribe({
      next: (response) => {
        this.loadingChildren.set(false);
        this.children.set(response.adolescents);
      },
      error: () => {
        // Non bloquant : l'utilisateur voit le message "aucun enfant" plutôt qu'une page cassée.
        this.loadingChildren.set(false);
        this.children.set([]);
      },
    });
  }

  onChildSelected(childId: string): void {
    const child = this.children().find((c) => c._id === childId);
    if (!child) {
      return;
    }

    // Réutilise exactement le même mécanisme que la sélection depuis le tableau de bord
    // famille : l'âge est ensuite dérivé côté serveur à partir de la vraie date de naissance
    // de l'enfant (childId transmis à l'API), jamais d'une valeur saisie manuellement.
    this.childContext.setChild(child._id, child.firstName, child.adolescentProfile?.birthDate || null);
    this.setupForm.get('age')?.clearValidators();
    this.setupForm.get('age')?.updateValueAndValidity();
    this.setupForm.patchValue({ targetFirstName: child.firstName });
  }

  exitChildContext(): void {
    this.childContext.clear();
    this.setupForm.get('age')?.setValidators([Validators.required, Validators.min(3), Validators.max(18)]);
    this.setupForm.get('age')?.updateValueAndValidity();
    this.setupForm.patchValue({ targetFirstName: '' });
    this.catalog.set({ status: 'success', age: 0, ageSegment: '', domains: [] });
  }

  loadCatalog(): void {
    if (this.setupForm.invalid) {
      this.setupForm.markAllAsTouched();
      this.errorMessage.set(
        this.childContext.selectedChildId()
          ? 'Veuillez renseigner qui répond avant de continuer.'
          : 'Veuillez renseigner qui répond, le prénom et l\'âge avant de continuer.'
      );
      return;
    }

    const childId = this.childContext.selectedChildId() || undefined;
    const rawAge = Number(this.setupForm.getRawValue().age);

    if (!childId && (!rawAge || rawAge < 3 || rawAge > 18)) {
      this.errorMessage.set('Veuillez saisir un âge compris entre 3 et 18 ans.');
      return;
    }

    this.loadingCatalog.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.surveyService.loadCatalog(childId ? undefined : rawAge, childId).subscribe({
      next: (response) => {
        this.loadingCatalog.set(false);
        this.catalog.set(response);
        this.ageSegment.set(response.ageSegment);
        this.selectedDomain.set(response.domains[0]?.value || '');
        if (!childId) {
          localStorage.setItem('familybalance_survey_age', String(response.age));
        }
        localStorage.setItem('familybalance_survey_domain', this.selectedDomain());
      },
      error: (error) => {
        this.loadingCatalog.set(false);
        this.errorMessage.set(error?.error?.message || 'Impossible de charger le catalogue survey.');
      },
    });
  }

  selectDomain(domain: string): void {
    this.selectedDomain.set(domain);
    localStorage.setItem('familybalance_survey_domain', domain);
  }

  startSurvey(): void {
    const childId = this.childContext.selectedChildId() || undefined;
    const rawAge = Number(this.setupForm.getRawValue().age);

    if (!this.selectedDomain() || (!childId && !rawAge)) {
      return;
    }

    this.loadingSession.set(true);
    this.errorMessage.set('');
    this.resumeNotice.set('');
    this.successMessage.set('');

    this.surveyService
      .startOrResumeSurvey({ age: childId ? undefined : rawAge, domain: this.selectedDomain(), childId })
      .subscribe({
      next: (response) => {
        this.loadingSession.set(false);
        this.applyState(response, response.message.includes('reprise') ? 'Session reprise.' : 'Session prête.');
        this.startTimer();
      },
      error: (error) => {
        this.loadingSession.set(false);
        this.errorMessage.set(error?.error?.message || 'Impossible de démarrer le survey.');
      },
    });
  }

  chooseOption(value: string): void {
    if (!this.session() || !this.currentQuestion() || this.saving()) {
      return;
    }

    this.saveAnswer(value, true);
  }

  chooseLikert(value: string): void {
    if (!this.session() || !this.currentQuestion() || this.saving()) {
      return;
    }

    this.saveAnswer(value, true);
  }

  advanceTextQuestion(): void {
    const value = String(this.answerForm.getRawValue().textAnswer || '').trim();
    this.saveAnswer(value, true);
  }

  previousQuestion(): void {
    if (!this.session() || !this.canGoBack()) {
      return;
    }

    const answeredQuestions = this.session()!.answers
      .filter((a) => !a.draft)
      .map((a) => a.questionCode);

    if (answeredQuestions.length > 0) {
      const previousCode = answeredQuestions[answeredQuestions.length - 1];
      this.currentAnswerIndex.set(this.currentAnswerIndex() - 1);
      this.successMessage.set('Navigation vers la question précédente.');
    }
  }

  canGoBack(): boolean {
    return this.currentAnswerIndex() > 0;
  }

  reviewAnswer(index: number): void {
    this.currentAnswerIndex.set(index);
    this.successMessage.set(`Révision de la réponse ${index + 1}.`);
  }

  resetSurvey(): void {
    this.stopTimer();
    this.session.set(null);
    this.currentQuestion.set(null);
    this.progress.set({ answered: 0, total: 0, percent: 0 });
    this.completed.set(false);
    this.resumeNotice.set('');
    this.successMessage.set('');
    this.errorMessage.set('');
    this.answerForm.reset({ textAnswer: '' });
    this.currentAnswerIndex.set(0);
    this.elapsedTime.set(0);
    this.clearActiveSession();
  }

  private resumeAutomatically(saved: { age?: number; domain: string; childId?: string }): void {
    this.loadingSession.set(true);
    this.surveyService
      .startOrResumeSurvey({ age: saved.childId ? undefined : saved.age, domain: saved.domain, childId: saved.childId })
      .subscribe({
        next: (response) => {
          this.loadingSession.set(false);
          this.applyState(response, 'Session précédente reprise automatiquement.');
          this.resumeNotice.set('Vous reprenez le questionnaire exactement là où vous vous étiez arrêté(e).');
          this.startTimer();
        },
        error: () => {
          // La session n'existe plus côté serveur (terminée ou expirée ailleurs) : on repart proprement.
          this.loadingSession.set(false);
          this.clearActiveSession();
        },
      });
  }

  private persistActiveSession(): void {
    const currentSession = this.session();

    if (!currentSession || this.completed()) {
      this.clearActiveSession();
      return;
    }

    const raw = this.setupForm.getRawValue();
    const childId = this.childContext.selectedChildId() || undefined;

    localStorage.setItem(
      this.ACTIVE_SESSION_KEY,
      JSON.stringify({
        sessionId: currentSession._id,
        domain: this.selectedDomain(),
        age: childId ? undefined : currentSession.age,
        childId,
        respondent: raw.respondent,
        targetFirstName: raw.targetFirstName,
      })
    );
  }

  private clearActiveSession(): void {
    localStorage.removeItem(this.ACTIVE_SESSION_KEY);
  }

  exportSummary(): void {
    if (!this.session()) {
      return;
    }

    const answers = this.summaryAnswers();
    const content = `
RÉSUMÉ DU QUESTIONNAIRE
========================

Profil: ${this.setupForm.getRawValue().targetFirstName}
Répondant: ${this.respondentLabel()}
Âge: ${this.session()?.age} ans
Domaine: ${this.session()?.domainLabel}
Durée: ${this.formatTime(this.elapsedTime())}

RÉPONSES:
---------
${answers.map((a, i) => `Q${i + 1}. ${a.questionPrompt || a.questionCode}\nRéponse: ${a.answer}\n`).join('\n')}

Date: ${new Date().toLocaleDateString('fr-FR')}
    `;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `questionnaire-${this.session()?.domain}-${Date.now()}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  getCharacterCount(): number {
    return this.answerForm.getRawValue().textAnswer?.length || 0;
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }

  getQuestionTypeLabel(type: string): string {
    const typeMap: { [key: string]: string } = {
      'single-choice': 'Choix unique',
      'likert': 'Échelle 1-5',
      'text': 'Réponse libre',
    };
    return typeMap[type] || type;
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.session() || this.completed()) {
      return;
    }

    const current = this.currentQuestion();
    if (!current) {
      return;
    }

    // Arrow Up/Down for likert navigation
    if (current.type === 'likert') {
      const currentIndex = this.likertOptions.findIndex((opt) => opt.value === event.key);
      if (currentIndex !== -1) {
        this.chooseLikert(event.key);
      }
    }

    // Enter to advance text questions
    if (current.type === 'text' && event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      this.advanceTextQuestion();
    }

    // Arrow Right to go next
    if (event.key === 'ArrowRight' && current.type !== 'text') {
      event.preventDefault();
      // Navigate to next
    }

    // Arrow Left to go back
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previousQuestion();
    }
  }

  private startTimer(): void {
    if (this.startTime === null) {
      this.startTime = Date.now() / 1000;
    }
    this.timerInterval = setInterval(() => {
      if (this.startTime !== null) {
        this.elapsedTime.set(Math.floor(Date.now() / 1000 - this.startTime));
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private saveDraft(value: string): void {
    if (!this.session() || this.currentQuestion()?.type !== 'text') {
      return;
    }

    this.saving.set(true);
    this.surveyService.saveAnswer(this.session()!._id, { answer: value, advance: false }).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.applyState(response, 'Brouillon sauvegardé.');
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(error?.error?.message || 'Impossible de sauvegarder le brouillon.');
      },
    });
  }

  private saveAnswer(value: string | number, advance: boolean): void {
    if (!this.session()) {
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.surveyService.saveAnswer(this.session()!._id, { answer: value, advance }).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.applyState(response, advance ? 'Réponse enregistrée.' : 'Brouillon sauvegardé.');
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(error?.error?.message || 'Impossible d\'enregistrer la réponse.');
      },
    });
  }

  private applyState(response: SurveyStateResponse, successMessage: string): void {
    const wasCompleted = this.completed();

    this.catalog.set(response.catalog as SurveyCatalogResponse);
    this.session.set(response.session);
    this.currentQuestion.set(response.currentQuestion);
    this.progress.set(response.progress);
    this.completed.set(response.completed);
    this.ageSegment.set(response.ageSegment);
    this.successMessage.set(successMessage);
    this.currentAnswerIndex.set((response.session?.answers.length || 0) - 1);

    if (response.currentQuestion?.type !== 'text') {
      this.answerForm.reset({ textAnswer: '' });
    }

    if (response.session?.domain) {
      this.selectedDomain.set(response.session.domain);
    }

    if (response.completed) {
      this.resumeNotice.set('La session a été complétée et sauvegardée automatiquement.');
      this.stopTimer();

      if (!wasCompleted && response.session?._id) {
        this.finalizeCompletion(response.session._id);
      }
    }

    this.persistActiveSession();
  }

  private finalizeCompletion(sessionId: string): void {
    this.scoreSubmitting.set(true);
    this.scoreReady.set(false);
    this.scoreError.set('');

    this.surveyService.completeSession(sessionId).subscribe({
      next: () => {
        this.scoreSubmitting.set(false);
        this.scoreReady.set(true);
      },
      error: (error) => {
        this.scoreSubmitting.set(false);
        this.scoreError.set(error?.message || 'Impossible de calculer le score pour ce questionnaire.');
      },
    });
  }

  retryScoreCalculation(): void {
    const sessionId = this.session()?._id;
    if (sessionId) {
      this.finalizeCompletion(sessionId);
    }
  }

  viewResults(): void {
    this.router.navigateByUrl('/scoring/results');
  }

  respondentLabel(): string {
    return this.setupForm.getRawValue().respondent === 'adolescent' ? 'Adolescent(e)' : 'Parent / Tuteur';
  }

  questionTypeLabel(): string {
    const type = this.currentQuestion()?.type;
    return this.getQuestionTypeLabel(type || '');
  }

  dynamicSessionMessage(): string {
    const respondent = this.setupForm.getRawValue().respondent;
    const firstName = this.setupForm.getRawValue().targetFirstName || 'ce profil';

    if (respondent === 'adolescent') {
      return `Tu réponds pour ${firstName}. Les questions s'adaptent à ton âge et à tes réponses précédentes.`;
    }

    return `Vous répondez pour ${firstName}. Le questionnaire adapte dynamiquement les questions selon l'âge et vos réponses.`;
  }
}