import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, signal, HostListener } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { SurveyService } from '../../../core/services/survey.service';
import { ChildContextService } from '../../../core/services/child-context.service';
import { AuthService } from '../../../core/services/auth.service';
import { LinkedAdolescentProfile } from '../../../core/models/auth.models';
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
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatIconModule,
  ],
  template: `
    <section class="survey-shell" [@fadeInOut]>
      <div class="hero">
        <div class="hero-top">
          <div class="eyebrow">Module Survey Adaptatif</div>
        </div>
        <h1>Questionnaire Personnalisé</h1>
        <p>
          Le questionnaire s'adapte en temps réel à l'âge, au domaine et à vos réponses précédentes pour une meilleure pertinence.
        </p>
      </div>

      <div class="child-context-banner" *ngIf="childContext.selectedChildId()" [@fadeIn]>
        <mat-icon>face</mat-icon>
        <p>Questionnaire piloté pour <strong>{{ childContext.selectedChildName() }}</strong> — l'âge est déterminé automatiquement à partir de son profil.</p>
        <button mat-stroked-button type="button" (click)="exitChildContext()">Remplir pour moi-même</button>
      </div>

      <mat-card class="panel" *ngIf="!session(); else sessionTpl" [@slideIn]>
        <div class="panel-head">
          <h2>Configuration du Questionnaire</h2>
          <p>Renseignez les informations pour démarrer une session adaptée à votre profil.</p>
        </div>

        <form [formGroup]="setupForm" class="setup-form">
          <mat-form-field appearance="outline" class="form-field-large">
            <mat-label>Qui répond ?</mat-label>
            <mat-select formControlName="respondent">
              <mat-option value="parent">Parent / Tuteur</mat-option>
              <mat-option value="adolescent">Adolescent(e)</mat-option>
            </mat-select>
            <mat-hint>Sélectionnez le type de répondant</mat-hint>
          </mat-form-field>

          <!-- Parent connecté, aucun enfant encore choisi : liste dynamique de SES enfants réels
               (jamais de saisie libre), pour que la session soit bien rattachée au bon enfant côté
               backend plutôt qu'à un prénom tapé au clavier et jamais transmis à l'API. -->
          <ng-container *ngIf="isParentRole() && !childContext.selectedChildId()">
            <mat-form-field appearance="outline" class="form-field-large" *ngIf="!loadingChildren() && children().length">
              <mat-label>Enfant concerné</mat-label>
              <mat-select (selectionChange)="onChildSelected($event.value)">
                <mat-option *ngFor="let child of children()" [value]="child._id">
                  {{ child.firstName }} {{ child.lastName }}
                </mat-option>
              </mat-select>
              <mat-hint>Sélectionnez l'enfant pour qui remplir ce questionnaire</mat-hint>
            </mat-form-field>

            <p class="loading-children" *ngIf="loadingChildren()">
              <mat-spinner diameter="16" [strokeWidth]="2"></mat-spinner>
              Chargement de vos enfants…
            </p>

            <div class="alert alert-error" *ngIf="!loadingChildren() && !children().length">
              <mat-icon>error_outline</mat-icon>
              <p>
                Aucun enfant associé à votre compte. <a routerLink="/family/add-adolescent">Ajoutez un profil adolescent</a>
                pour démarrer une évaluation.
              </p>
            </div>
          </ng-container>

          <!-- Répondant adolescent (ou tout autre cas hors parent avec enfants réels) : saisie
               libre conservée, sans lien avec un compte enfant existant. -->
          <mat-form-field appearance="outline" class="form-field-large" *ngIf="!childContext.selectedChildId() && !isParentRole()">
            <mat-label>Prénom de l'enfant / adolescent</mat-label>
            <input matInput type="text" formControlName="targetFirstName" placeholder="Ex: Lina, Thomas..." />
            <mat-hint>Requis - Au minimum 2 caractères</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field-large" *ngIf="!childContext.selectedChildId() && !isParentRole()">
            <mat-label>Âge (3-18 ans)</mat-label>
            <input matInput type="number" min="3" max="18" formControlName="age" />
            <mat-hint>L'âge permet d'adapter le questionnaire</mat-hint>
          </mat-form-field>

          <button
            mat-flat-button
            color="primary"
            type="button"
            (click)="loadCatalog()"
            [disabled]="setupForm.invalid || loadingCatalog()"
            class="btn-large"
          >
            <span *ngIf="!loadingCatalog()">
              <mat-icon>arrow_forward</mat-icon>
              Continuer vers la sélection
            </span>
            <mat-spinner *ngIf="loadingCatalog()" diameter="20" [strokeWidth]="2"></mat-spinner>
          </button>
        </form>

        <div class="setup-summary" *ngIf="catalog().domains.length" [@fadeIn]>
          <p class="summary-label">Configuration actuelle:</p>
          <p class="summary-content">
            <strong>{{ respondentLabel() }}</strong> · 
            <strong>{{ setupForm.getRawValue().targetFirstName }}</strong> · 
            <strong>{{ childContext.selectedChildId() ? catalog().age : setupForm.getRawValue().age }} ans</strong>
          </p>
        </div>

        <div class="catalog" *ngIf="catalog().domains.length" [@fadeIn]>
          <h3 class="catalog-title">Sélectionnez un domaine d'évaluation</h3>
          <div class="domain-cards-grid">
            <button
              type="button"
              class="domain-card"
              *ngFor="let domain of catalog().domains"
              [class.active]="selectedDomain() === domain.value"
              (click)="selectDomain(domain.value)"
              [matTooltip]="'Questionnaire: ' + domain.questionCount + ' questions'"
            >
              <div class="card-icon">
                <mat-icon>assessment</mat-icon>
              </div>
              <div class="card-content">
                <span class="domain-label">{{ domain.label }}</span>
                <strong class="question-count">{{ domain.questionCount }} questions</strong>
              </div>
              <div class="card-indicator" *ngIf="selectedDomain() === domain.value">
                <mat-icon>check_circle</mat-icon>
              </div>
            </button>
          </div>
        </div>

        <div class="actions" *ngIf="catalog().domains.length" [@fadeIn]>
          <button 
            mat-flat-button 
            color="primary" 
            type="button" 
            (click)="startSurvey()" 
            [disabled]="!selectedDomain() || loadingSession()"
            class="btn-primary"
          >
            <mat-icon>play_circle_filled</mat-icon>
            {{ loadingSession() ? 'Démarrage...' : 'Démarrer le Questionnaire' }}
          </button>
        </div>

        <div class="alert alert-error" *ngIf="errorMessage()" [@fadeIn]>
          <mat-icon>error_outline</mat-icon>
          <p>{{ errorMessage() }}</p>
        </div>
      </mat-card>

      <ng-template #sessionTpl>
        <mat-card class="panel survey-panel" [@slideIn]>
          <div class="panel-head compact">
            <div class="header-content">
              <h2>{{ currentQuestion()?.domainLabel || session()?.domainLabel }}</h2>
              <p class="header-subtitle">{{ dynamicSessionMessage() }}</p>
            </div>
            <div class="progress-box">
              <div class="progress-circle">
                <svg class="progress-ring" viewBox="0 0 100 100">
                  <circle class="progress-ring-circle" cx="50" cy="50" r="45" />
                </svg>
                <div class="progress-text">
                  <span class="percentage">{{ progress().percent }}%</span>
                  <span class="counter">{{ progress().answered }}/{{ progress().total }}</span>
                </div>
              </div>
              <div class="timer" *ngIf="elapsedTime()">
                <mat-icon>schedule</mat-icon>
                <span>{{ formatTime(elapsedTime()) }}</span>
              </div>
            </div>
          </div>

          <div class="session-meta">
            <span class="meta-chip">
              <mat-icon>person</mat-icon>
              {{ respondentLabel() }}
            </span>
            <span class="meta-chip">
              <mat-icon>child_care</mat-icon>
              {{ setupForm.getRawValue().targetFirstName || 'Profil' }}
            </span>
            <span class="meta-chip">
              <mat-icon>cake</mat-icon>
              {{ session()?.age }} ans
            </span>
            <span class="meta-chip">
              <mat-icon>group_age</mat-icon>
              {{ ageSegment() }}
            </span>
          </div>

          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="progress().percent" [@expandWidth]></div>
            </div>
            <span class="progress-label">Progression du questionnaire</span>
          </div>

          <div class="question-nav-indicator" *ngIf="session() && session()!.answers.length">
            <div class="nav-dots">
              <button
                *ngFor="let answer of session()?.answers; let i = index"
                type="button"
                class="nav-dot"
                [class.answered]="!answer.draft"
                [class.draft]="answer.draft"
                [matTooltip]="answer.questionCode"
                [attr.aria-label]="answer.questionCode + ' — ' + (answer.draft ? 'brouillon' : 'répondue')"
                (click)="reviewAnswer(i)"
              ></button>
            </div>
          </div>

          <div class="resume-note" *ngIf="resumeNotice()" [@fadeIn]>
            <mat-icon>info</mat-icon>
            <p>{{ resumeNotice() }}</p>
          </div>

          <div class="completed-box" *ngIf="completed(); else questionTpl" [@fadeIn]>
            <div class="completed-header">
              <mat-icon class="success-icon">check_circle</mat-icon>
              <h3>Questionnaire Complété!</h3>
              <p>Vos réponses ont été sauvegardées avec succès. Durée totale: <strong>{{ formatTime(elapsedTime()) }}</strong></p>
            </div>

            <div class="summary" *ngIf="summaryAnswers().length">
              <h4>Synthèse de vos réponses</h4>
              <div class="summary-rows">
                <div class="summary-row" *ngFor="let item of summaryAnswers(); let i = index" [@slideIn]>
                  <div class="row-number">{{ i + 1 }}</div>
                  <div class="row-content">
                    <p class="q-title">{{ item.questionPrompt || item.questionCode }}</p>
                    <div class="row-meta">
                      <span class="meta-domain">{{ item.domain }}</span>
                      <span class="meta-type">{{ getQuestionTypeLabel(item.type) }}</span>
                    </div>
                  </div>
                  <strong class="q-answer">{{ item.answer }}</strong>
                </div>
              </div>
            </div>

            <div class="score-status" *ngIf="scoreSubmitting()">
              <mat-icon>hourglass_top</mat-icon>
              <p>Calcul de votre score en cours…</p>
            </div>
            <div class="score-status error" *ngIf="scoreError()">
              <mat-icon>error_outline</mat-icon>
              <p>{{ scoreError() }}</p>
              <button mat-stroked-button type="button" (click)="retryScoreCalculation()">Réessayer</button>
            </div>

            <div class="completed-actions">
              <button
                mat-flat-button
                color="primary"
                type="button"
                (click)="viewResults()"
                class="btn-results"
                [disabled]="scoreSubmitting()"
              >
                <mat-icon>insights</mat-icon>
                Voir mon résultat
              </button>
              <button mat-stroked-button type="button" (click)="exportSummary()" class="btn-export">
                <mat-icon>download</mat-icon>
                Exporter en PDF
              </button>
              <button mat-stroked-button type="button" (click)="resetSurvey()" class="btn-restart">
                <mat-icon>restart_alt</mat-icon>
                Recommencer
              </button>
            </div>
          </div>

          <ng-template #questionTpl>
            <ng-container *ngIf="currentQuestion(); else waitingTpl">
              <div class="question-head" [@fadeIn]>
                <div class="question-badges">
                  <span class="segment-chip">{{ currentQuestion()?.domainLabel }}</span>
                  <span class="type-chip">{{ questionTypeLabel() }}</span>
                </div>
                <h3 class="question-prompt">{{ currentQuestion()?.prompt }}</h3>
                <p *ngIf="currentQuestion()?.helpText" class="help-text">
                  <mat-icon>info</mat-icon>
                  {{ currentQuestion()?.helpText }}
                </p>
              </div>

              <div *ngIf="currentQuestion()?.type === 'single-choice'" class="choice-grid" [@fadeIn]>
                <button
                  type="button"
                  class="choice-btn"
                  *ngFor="let option of currentQuestion()?.options || []"
                  [disabled]="saving()"
                  (click)="chooseOption(option.value)"
                >
                  <span class="choice-label">{{ option.label }}</span>
                </button>
              </div>

              <div *ngIf="currentQuestion()?.type === 'likert'" class="likert-grid" [@fadeIn]>
                <button
                  type="button"
                  class="likert-btn"
                  *ngFor="let option of likertOptions"
                  [disabled]="saving()"
                  (click)="chooseLikert(option.value)"
                >
                  <span class="likert-value">{{ option.value }}</span>
                  <small class="likert-label">{{ option.label }}</small>
                </button>
              </div>

              <form *ngIf="currentQuestion()?.type === 'text'" [formGroup]="answerForm" class="text-form" [@fadeIn]>
                <mat-form-field appearance="outline" class="text-field-full">
                  <mat-label>Votre réponse</mat-label>
                  <textarea 
                    matInput 
                    rows="6" 
                    formControlName="textAnswer"
                    placeholder="Exprimez votre réponse avec détails si nécessaire..."
                  ></textarea>
                  <mat-hint align="end">{{ getCharacterCount() }}/500 caractères</mat-hint>
                </mat-form-field>

                <div class="actions">
                  <button 
                    mat-stroked-button 
                    type="button" 
                    (click)="previousQuestion()"
                    [disabled]="!canGoBack() || saving()"
                  >
                    <mat-icon>arrow_back</mat-icon>
                    Précédent
                  </button>
                  <button 
                    mat-flat-button 
                    color="primary" 
                    type="button" 
                    (click)="advanceTextQuestion()" 
                    [disabled]="saving()"
                    class="btn-next"
                  >
                    {{ saving() ? 'Enregistrement...' : 'Suivant' }}
                    <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
              </form>

              <div class="question-nav" *ngIf="currentQuestion()?.type !== 'text'">
                <button 
                  mat-stroked-button 
                  type="button" 
                  (click)="previousQuestion()"
                  [disabled]="!canGoBack()"
                >
                  <mat-icon>arrow_back</mat-icon>
                  Précédent
                </button>
                <div class="question-counter">
                  Question {{ (progress().answered + 1) }}/{{ progress().total }}
                </div>
              </div>

              <div class="feedback-messages">
                <p class="autosave" *ngIf="saving()">
                  <mat-icon class="spinner">hourglass_empty</mat-icon>
                  Sauvegarde en cours...
                </p>
                <p class="success" *ngIf="successMessage()" [@fadeIn]>
                  <mat-icon>check_circle</mat-icon>
                  {{ successMessage() }}
                </p>
                <p class="error" *ngIf="errorMessage()" [@fadeIn]>
                  <mat-icon>error_outline</mat-icon>
                  {{ errorMessage() }}
                </p>
              </div>
            </ng-container>
          </ng-template>

          <ng-template #waitingTpl>
            <div class="loading-state">
              <mat-spinner diameter="48" [strokeWidth]="3"></mat-spinner>
              <p>Chargement de la question suivante...</p>
            </div>
          </ng-template>
        </mat-card>
      </ng-template>
    </section>
  `,
  styles: [
    `
      :host {
        --survey-primary: var(--fb-primary);
        --survey-primary-light: var(--fb-primary-soft);
        --survey-success: var(--fb-success);
        --survey-warning: var(--fb-warning);
        --survey-danger: var(--fb-danger);
        --survey-border: var(--fb-border);
        --survey-bg: var(--fb-bg);
        --survey-text: var(--fb-text);
        --survey-muted: var(--fb-muted);
        --survey-transition: var(--fb-transition);
      }

      .survey-shell {
        max-width: 1180px;
        margin: 0 auto;
        padding: 2rem 1.25rem 2.5rem;
        display: grid;
        gap: 1.75rem;
      }

      .hero {
        background: linear-gradient(135deg, var(--fb-primary-soft) 0%, var(--fb-bg) 100%);
        color: var(--fb-text);
        border-radius: 28px;
        padding: 2rem 2.25rem;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.07);
        border: 1px solid rgba(var(--fb-primary-rgb), 0.18);
        animation: slideDown 0.6s ease-out;
      }

      .child-context-banner {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-top: 1rem;
        padding: 0.85rem 1.1rem;
        border-radius: 14px;
        background: var(--fb-primary-soft);
        border: 1px solid rgba(var(--fb-primary-rgb), 0.25);
        color: var(--fb-primary-strong);
      }

      .child-context-banner p {
        margin: 0;
        flex: 1;
        font-size: 0.9rem;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .hero-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 0.75rem;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        background: rgba(var(--fb-primary-rgb), 0.1);
        color: var(--survey-primary);
        padding: 0.45rem 0.95rem;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        margin-bottom: 1rem;
      }

      .hero h1 {
        margin: 0 0 0.75rem;
        font-size: clamp(2rem, 3vw, 2.8rem);
        font-weight: 800;
        line-height: 1.05;
      }

      .hero p {
        margin: 0;
        max-width: 720px;
        color: var(--survey-text);
        line-height: 1.75;
        font-size: 1.03rem;
      }

      .panel {
        padding: 2rem;
        border-radius: 24px;
        border: 1px solid var(--survey-border);
        background: #fff;
        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.06);
        animation: slideUp 0.5s ease-out;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes fadeInOut {
        from {
          opacity: 0.95;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes expandWidth {
        from {
          transform: scaleX(0);
          transform-origin: left;
        }
        to {
          transform: scaleX(1);
          transform-origin: left;
        }
      }

      .panel-head {
        display: grid;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
      }

      .panel-head h2 {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--survey-text);
      }

      .panel-head p {
        margin: 0;
        color: var(--survey-muted);
        font-size: 1rem;
        line-height: 1.5;
      }

      .panel-head.compact {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: flex-start;
        gap: 1.5rem;
      }

      .header-content {
        display: grid;
        gap: 0.25rem;
      }

      .header-subtitle {
        margin: 0;
        color: var(--survey-muted);
        font-size: 0.95rem;
      }

      .setup-form {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .form-field-large {
        width: 100%;
      }

      .form-field-large ::ng-deep .mdc-text-field {
        width: 100%;
      }

      .btn-large {
        width: 100%;
        padding: 0.85rem 1.5rem !important;
        font-size: 1rem !important;
        font-weight: 600 !important;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        transition: var(--survey-transition);
        box-shadow: 0 4px 12px rgba(var(--fb-primary-rgb), 0.3) !important;
      }

      .btn-large:hover:not(:disabled) {
        box-shadow: 0 8px 24px rgba(var(--fb-primary-rgb), 0.4) !important;
        transform: translateY(-2px);
      }

      .setup-summary {
        margin: 1rem 0;
        border: 1px solid var(--survey-border);
        background: linear-gradient(135deg, var(--survey-bg), var(--fb-primary-soft));
        border-radius: 16px;
        padding: 1rem;
        color: var(--survey-text);
        animation: fadeIn 0.4s ease-out;
      }

      .summary-label {
        margin: 0 0 0.5rem;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--survey-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .summary-content {
        margin: 0;
        font-size: 1rem;
        color: var(--survey-text);
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .summary-content strong {
        color: var(--survey-primary);
        font-weight: 700;
      }

      .catalog {
        margin: 1.5rem 0;
      }

      .catalog-title {
        margin: 0 0 1rem;
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--survey-text);
      }

      .domain-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }

      .domain-card {
        position: relative;
        text-align: left;
        border: 1px solid var(--survey-border);
        background: #fff;
        border-radius: 22px;
        padding: 1.5rem;
        cursor: pointer;
        transition: var(--survey-transition);
        overflow: hidden;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 1rem;
        align-items: center;
      }

      .domain-card::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, transparent, rgba(var(--fb-primary-rgb), 0.03));
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .domain-card:hover {
        border-color: var(--survey-primary);
        box-shadow: 0 16px 32px rgba(var(--fb-primary-rgb), 0.12);
        transform: translateY(-2px);
      }

      .domain-card.active {
        border-color: var(--survey-primary);
        background: var(--fb-primary-soft);
        box-shadow: 0 16px 34px rgba(var(--fb-primary-rgb), 0.14);
      }

      .card-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 46px;
        height: 46px;
        border-radius: 16px;
        background: var(--survey-primary-light);
        color: var(--survey-primary);
      }

      .domain-card.active .card-icon {
        background: linear-gradient(135deg, var(--fb-primary), var(--fb-primary-strong));
        color: white;
      }

      .card-content {
        display: grid;
        gap: 0.25rem;
      }

      .domain-label {
        color: var(--survey-text);
        font-size: 0.95rem;
        font-weight: 700;
      }

      .question-count {
        color: var(--survey-muted);
        font-size: 0.95rem;
        font-weight: 500;
      }

      .card-indicator {
        position: absolute;
        top: 18px;
        right: 18px;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--survey-primary);
        color: #fff;
        opacity: 0;
        transform: scale(0.85);
        transition: var(--survey-transition);
      }

      .domain-card.active .card-indicator {
        opacity: 1;
        transform: scale(1);
      }

      .actions {
        margin: 1.75rem 0 0;
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .btn-primary,
      .btn-export,
      .btn-restart,
      .btn-next {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.85rem 1.5rem !important;
        font-weight: 600 !important;
        transition: var(--survey-transition);
      }

      .btn-primary {
        flex: 1;
        min-width: 200px;
        box-shadow: 0 4px 12px rgba(var(--fb-primary-rgb), 0.3) !important;
      }

      .btn-primary:hover:not(:disabled) {
        box-shadow: 0 8px 24px rgba(var(--fb-primary-rgb), 0.4) !important;
        transform: translateY(-2px);
      }

      .alert {
        border-radius: 12px;
        padding: 1rem;
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        animation: slideDown 0.3s ease-out;
      }

      .alert-error {
        background: rgba(var(--fb-danger-rgb), 0.08);
        border: 1px solid rgba(var(--fb-danger-rgb), 0.2);
        color: var(--survey-danger);
      }

      .alert mat-icon {
        flex-shrink: 0;
        margin-top: 2px;
      }

      .alert p {
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.5;
      }

      .survey-panel {
        display: grid;
        gap: 1.5rem;
      }

      .progress-box {
        display: grid;
        gap: 1rem;
        justify-items: end;
      }

      .progress-circle {
        position: relative;
        width: 100px;
        height: 100px;
      }

      .progress-ring {
        transform: rotate(-90deg);
      }

      .progress-ring-circle {
        transition: stroke-dashoffset 0.6s ease;
        stroke: var(--survey-border);
        fill: none;
        stroke-width: 4;
      }

      .progress-text {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
      }

      .percentage {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--survey-primary);
      }

      .counter {
        font-size: 0.8rem;
        color: var(--survey-muted);
      }

      .timer {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--survey-muted);
        font-size: 0.95rem;
        font-weight: 500;
      }

      .session-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .meta-chip,
      .type-chip,
      .segment-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        width: fit-content;
        border-radius: 999px;
        font-size: 0.85rem;
        padding: 0.4rem 0.85rem;
        border: 1px solid var(--survey-border);
        background: #fff;
        color: var(--survey-text);
        font-weight: 500;
        transition: var(--survey-transition);
      }

      .meta-chip mat-icon,
      .type-chip mat-icon,
      .segment-chip mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .meta-chip:hover {
        background: var(--survey-bg);
        border-color: var(--survey-primary);
      }

      .type-chip {
        background: var(--survey-primary-light);
        color: var(--survey-primary);
      }

      .segment-chip {
        background: var(--survey-primary-light);
        color: var(--survey-primary);
        border-color: var(--survey-primary);
      }

      .progress-container {
        display: grid;
        gap: 0.5rem;
      }

      .progress-bar {
        width: 100%;
        height: 12px;
        border-radius: 999px;
        background: var(--survey-border);
        overflow: hidden;
        position: relative;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--fb-primary), var(--fb-primary-strong));
        border-radius: 999px;
        box-shadow: 0 0 12px rgba(var(--fb-primary-rgb), 0.5);
        animation: expandWidth 0.6s ease-out;
      }

      .progress-label {
        font-size: 0.8rem;
        color: var(--survey-muted);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      .question-nav-indicator {
        margin: 1rem 0;
        padding: 1rem;
        background: var(--survey-bg);
        border-radius: 12px;
        border: 1px solid var(--survey-border);
      }

      .nav-dots {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .nav-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: none;
        background: var(--fb-border);
        cursor: pointer;
        transition: var(--survey-transition);
      }

      .nav-dot.answered {
        background: var(--survey-success);
      }

      .nav-dot.draft {
        background: var(--survey-warning);
      }

      .nav-dot:hover {
        transform: scale(1.3);
      }

      .resume-note {
        border: 1px solid var(--survey-border);
        background: var(--survey-bg);
        border-radius: 12px;
        padding: 1rem;
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
        animation: slideDown 0.3s ease-out;
      }

      .resume-note mat-icon {
        color: var(--survey-warning);
        flex-shrink: 0;
        margin-top: 2px;
      }

      .resume-note p {
        margin: 0;
        color: var(--survey-text);
        font-size: 0.95rem;
        line-height: 1.5;
      }

      .completed-box {
        border: 1px solid rgba(var(--fb-success-rgb), 0.24);
        background: #effaf3;
        border-radius: 22px;
        padding: 2rem;
        animation: slideUp 0.5s ease-out;
      }

      .completed-header {
        text-align: center;
        margin-bottom: 2rem;
      }

      .success-icon {
        font-size: 3rem;
        color: var(--survey-success);
        width: 3rem;
        height: 3rem;
        display: block;
        margin: 0 auto 1rem;
        animation: scaleIn 0.5s ease-out 0.2s both;
      }

      @keyframes scaleIn {
        from {
          transform: scale(0);
        }
        to {
          transform: scale(1);
        }
      }

      .completed-box h3 {
        margin: 0 0 0.5rem;
        color: var(--survey-success);
        font-size: 1.5rem;
        font-weight: 700;
      }

      .completed-box > .completed-header p {
        margin: 0;
        color: var(--survey-text);
        line-height: 1.6;
      }

      .summary {
        margin: 1.5rem 0;
      }

      .summary h4 {
        margin: 0 0 1rem;
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--survey-text);
      }

      .summary-rows {
        display: grid;
        gap: 0.75rem;
      }

      .summary-row {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 1rem;
        align-items: flex-start;
        border: 1px solid var(--survey-border);
        border-radius: 12px;
        background: #fff;
        padding: 1rem;
        transition: var(--survey-transition);
      }

      .summary-row:hover {
        box-shadow: 0 4px 12px rgba(16, 24, 40, 0.08);
      }

      .row-number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--survey-primary-light);
        color: var(--survey-primary);
        font-weight: 700;
        font-size: 0.9rem;
        flex-shrink: 0;
      }

      .row-content {
        display: grid;
        gap: 0.35rem;
      }

      .q-title {
        margin: 0;
        font-weight: 600;
        color: var(--survey-text);
        font-size: 1rem;
        line-height: 1.5;
      }

      .row-meta {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .meta-domain,
      .meta-type {
        display: inline-flex;
        align-items: center;
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--survey-muted);
        background: var(--survey-bg);
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
      }

      .q-answer {
        color: var(--survey-primary);
        font-weight: 700;
        font-size: 1rem;
      }

      .score-status {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        margin-top: 1.25rem;
        padding: 0.75rem 1rem;
        border-radius: 12px;
        background: var(--survey-primary-light);
        color: var(--survey-primary);
        font-size: 0.9rem;
      }

      .score-status.error {
        background: rgba(192, 57, 43, 0.08);
        color: var(--survey-danger);
      }

      .score-status p {
        margin: 0;
      }

      .completed-actions {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        margin-top: 1.5rem;
        justify-content: center;
      }

      .btn-results,
      .btn-export,
      .btn-restart {
        min-width: 180px;
      }

      .question-head {
        animation: fadeIn 0.3s ease-out;
      }

      .question-badges {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
      }

      .question-prompt {
        margin: 0.5rem 0 0;
        font-size: 1.4rem;
        font-weight: 700;
        color: var(--survey-text);
        line-height: 1.4;
      }

      .help-text {
        margin: 0.75rem 0 0;
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
        color: var(--survey-muted);
        font-size: 0.95rem;
        line-height: 1.5;
        background: var(--survey-bg);
        padding: 0.75rem;
        border-radius: 8px;
        border-left: 3px solid var(--survey-warning);
      }

      .help-text mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        margin-top: 2px;
        color: var(--survey-warning);
      }

      .choice-grid,
      .likert-grid {
        display: grid;
        gap: 0.85rem;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        margin: 1.5rem 0;
        animation: fadeIn 0.3s ease-out;
      }

      .choice-btn,
      .likert-btn {
        border: 1px solid var(--survey-border);
        background: #fff;
        border-radius: 18px;
        padding: 1.2rem;
        cursor: pointer;
        text-align: center;
        transition: var(--survey-transition);
        font-weight: 600;
        position: relative;
        overflow: hidden;
        min-height: 86px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .choice-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, transparent, rgba(var(--fb-primary-rgb), 0.1));
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .choice-btn:hover,
      .likert-btn:hover {
        border-color: var(--survey-primary);
        box-shadow: 0 14px 28px rgba(var(--fb-primary-rgb), 0.12);
        transform: translateY(-2px);
      }

      .choice-btn:active,
      .likert-btn:active {
        transform: translateY(0);
      }

      .choice-btn.active,
      .likert-btn.active {
        border-color: var(--survey-primary);
        background: var(--survey-primary-light);
        color: var(--survey-primary);
      }

      .choice-label {
        display: block;
        font-size: 1rem;
      }

      .likert-btn {
        display: grid;
        gap: 0.45rem;
        padding: 1.25rem 1rem;
      }

      .likert-value {
        font-size: 1.8rem;
        font-weight: 700;
        color: var(--survey-primary);
      }

      .likert-btn.active .likert-value {
        color: var(--survey-primary);
      }

      .likert-label {
        color: var(--survey-muted);
        font-size: 0.8rem;
        font-weight: 500;
      }

      .text-form {
        display: grid;
        gap: 1rem;
        margin: 1.5rem 0;
      }

      .text-field-full {
        width: 100%;
      }

      .text-field-full ::ng-deep .mdc-text-field {
        width: 100%;
      }

      .question-nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin: 1.5rem 0;
        padding: 1rem 1.15rem;
        background: var(--survey-bg);
        border-radius: 16px;
        border: 1px solid var(--survey-border);
      }

      .question-counter {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--survey-primary);
        text-align: center;
        min-width: 120px;
        padding: 0.55rem 0.9rem;
        border-radius: 999px;
        background: var(--fb-primary-soft);
      }

      .feedback-messages {
        display: grid;
        gap: 0.75rem;
      }

      .autosave,
      .success,
      .error {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.95rem;
        line-height: 1.5;
        animation: slideDown 0.3s ease-out;
      }

      .autosave {
        color: var(--survey-muted);
        background: var(--survey-bg);
        border: 1px solid var(--survey-border);
      }

      .success {
        color: var(--survey-success);
        background: rgba(var(--fb-success-rgb), 0.08);
        border: 1px solid rgba(var(--fb-success-rgb), 0.2);
      }

      .error {
        color: var(--survey-danger);
        background: rgba(var(--fb-danger-rgb), 0.08);
        border: 1px solid rgba(var(--fb-danger-rgb), 0.2);
      }

      .autosave mat-icon,
      .success mat-icon,
      .error mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }

      .spinner {
        animation: spin 2s linear infinite;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .loading-state {
        display: grid;
        place-items: center;
        gap: 1rem;
        padding: 2rem;
        text-align: center;
      }

      .loading-state p {
        color: var(--survey-muted);
        font-size: 1rem;
        margin: 0;
      }

      @media (max-width: 768px) {
        .survey-shell {
          padding: 1.5rem 1rem 2rem;
          gap: 1rem;
        }

        .hero {
          padding: 1.5rem;
        }

        .hero h1 {
          font-size: 1.75rem;
        }

        .panel {
          padding: 1.5rem;
        }

        .panel-head.compact {
          grid-template-columns: 1fr;
          align-items: stretch;
        }

        .progress-box {
          justify-items: start;
        }

        .domain-cards-grid {
          grid-template-columns: 1fr;
        }

        .choice-grid,
        .likert-grid {
          grid-template-columns: 1fr;
        }

        .question-nav {
          flex-direction: column;
        }

        .summary-row {
          grid-template-columns: 1fr;
        }

        .completed-actions {
          flex-direction: column;
        }

        .btn-results,
        .btn-export,
        .btn-restart {
          width: 100%;
        }
      }

      ::ng-deep .mat-mdc-button,
      ::ng-deep .mat-mdc-raised-button {
        text-transform: none !important;
      }

      ::ng-deep .mat-mdc-button:disabled,
      ::ng-deep .mat-mdc-raised-button:disabled {
        opacity: 0.6;
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