import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ScoringService } from '../../../core/services/scoring.service';
import { ChildContextService } from '../../../core/services/child-context.service';
import { RiskAlert, ScorePeriodStat, ScoreRecord } from '../models/scoring.models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-scoring-dashboard-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, EmptyStateComponent, PageHeaderComponent],
  template: `
    <app-page-header
      eyebrow="Résultats"
      title="Suivi des résultats"
      subtitle="Score global sur 100 et sous-scores comportemental, émotionnel, social et parental, suivis dans le temps."
      illustration="results"
    >
      <button
        class="fb-btn fb-btn--ghost"
        type="button"
        (click)="calculateLatest()"
        [disabled]="loading() || !latestCompletedSessionId()"
      >
        <mat-icon>refresh</mat-icon>
        {{ loading() ? 'Calcul…' : 'Recalculer' }}
      </button>
      <button class="fb-btn" type="button" (click)="downloadPdfReport()" [disabled]="loading() || !latestRecord()">
        <mat-icon>picture_as_pdf</mat-icon>
        Exporter en PDF
      </button>
    </app-page-header>

    <div class="child-banner" *ngIf="childContext.selectedChildId()">
      <mat-icon>face</mat-icon>
      <p>Résultats de <strong>{{ childContext.selectedChildName() }}</strong></p>
      <button class="fb-btn fb-btn--ghost fb-btn--sm" type="button" (click)="childContext.clear(); refreshAll()">Voir mes propres résultats</button>
    </div>

    <div class="fb-alert fb-alert--error block" role="alert" *ngIf="errorMessage()">
      <mat-icon>error_outline</mat-icon><span>{{ errorMessage() }}</span>
    </div>
    <div class="fb-alert fb-alert--success block" role="status" *ngIf="successMessage()">
      <mat-icon>check_circle</mat-icon><span>{{ successMessage() }}</span>
    </div>
    <p class="hint" *ngIf="!latestCompletedSessionId()">
      <mat-icon>info</mat-icon>
      Aucune évaluation terminée pour le moment : le recalcul sera possible après un questionnaire complet.
    </p>

    <div class="grid" *ngIf="latestRecord(); else emptyTpl">
      <!-- Score global -->
      <section class="fb-card gauge-card">
        <h2 class="section-title">Score global</h2>
        <div class="gauge" [style.--score]="latestRecord()!.globalScore" [style.--tone]="riskColor()" role="img" [attr.aria-label]="'Score global ' + (latestRecord()!.globalScore | number: '1.0-0') + ' sur 100'">
          <div class="gauge-inner">
            <strong>{{ latestRecord()!.globalScore | number: '1.0-0' }}</strong>
            <span>sur 100</span>
          </div>
        </div>
        <p class="risk" [style.color]="riskColor()"><mat-icon>flag</mat-icon>{{ riskCategoryLabel() }}</p>
        <div class="weights">
          <span class="fb-badge fb-badge--neutral">Tranche d'âge {{ latestRecord()!.ageSegment }}</span>
          <span class="fb-badge fb-badge--neutral" *ngFor="let item of weightEntries()">
            {{ item.dimension }} {{ item.value | percent:'1.0-0' }}
          </span>
        </div>
      </section>

      <!-- Radar -->
      <section class="fb-card radar-card">
        <h2 class="section-title">Sous-scores</h2>
        <svg viewBox="-50 0 400 300" class="radar" role="img" aria-label="Radar des sous-scores">
          <polygon class="ring" points="150,30 270,150 150,270 30,150"></polygon>
          <polygon class="ring" points="150,60 240,150 150,240 60,150"></polygon>
          <polygon class="ring" points="150,90 210,150 150,210 90,150"></polygon>
          <polygon class="ring" points="150,120 180,150 150,180 120,150"></polygon>
          <line x1="150" y1="30" x2="150" y2="270"></line>
          <line x1="30" y1="150" x2="270" y2="150"></line>
          <polygon class="shape" [attr.points]="radarPoints()"></polygon>
          <text x="150" y="20">Émotionnel</text>
          <text x="10" y="138" text-anchor="start">Comportemental</text>
          <text x="290" y="138" text-anchor="end">Social</text>
          <text x="150" y="292">Parental</text>
        </svg>
        <dl class="subscores">
          <div><dt>Comportemental</dt><dd>{{ latestRecord()!.subScores.comportemental | number: '1.0-0' }}</dd></div>
          <div><dt>Émotionnel</dt><dd>{{ latestRecord()!.subScores.emotionnel | number: '1.0-0' }}</dd></div>
          <div><dt>Social</dt><dd>{{ latestRecord()!.subScores.social | number: '1.0-0' }}</dd></div>
          <div><dt>Parental</dt><dd>{{ latestRecord()!.subScores.parental | number: '1.0-0' }}</dd></div>
        </dl>
      </section>

      <!-- Recommandations -->
      <section class="reco">
        <mat-icon>tips_and_updates</mat-icon>
        <div>
          <span class="fb-eyebrow">Recommandations personnalisées</span>
          <ul>
            <li *ngFor="let rec of latestRecord()!.recommendations">{{ rec }}</li>
          </ul>
          <p>Elles sont recalculées automatiquement à chaque nouvelle évaluation.</p>
        </div>
      </section>

      <!-- Alertes -->
      <section class="fb-card alerts" *ngIf="openAlerts().length">
        <h2 class="section-title">Alertes automatiques</h2>
        <div class="alert-item" *ngFor="let alert of openAlerts()">
          <mat-icon>warning</mat-icon>
          <div><strong>Risque élevé</strong><p>{{ alert.message }}</p></div>
        </div>
      </section>

      <!-- Historique -->
      <section class="fb-card history">
        <div class="history-head">
          <h2 class="section-title">Historique</h2>
          <div class="segmented" role="group" aria-label="Période">
            <button type="button" [class.active]="selectedWindow() === 'all'" [attr.aria-pressed]="selectedWindow() === 'all'" (click)="setWindow('all')">Tout</button>
            <button type="button" [class.active]="selectedWindow() === 3" [attr.aria-pressed]="selectedWindow() === 3" (click)="setWindow(3)">3 mois</button>
            <button type="button" [class.active]="selectedWindow() === 6" [attr.aria-pressed]="selectedWindow() === 6" (click)="setWindow(6)">6 mois</button>
            <button type="button" [class.active]="selectedWindow() === 12" [attr.aria-pressed]="selectedWindow() === 12" (click)="setWindow(12)">12 mois</button>
          </div>
        </div>

        <div class="periods">
          <article *ngFor="let item of periodStats()" class="period">
            <h3>{{ item.months }} mois</h3>
            <p>Moyenne <strong>{{ item.averageGlobalScore ?? '—' }}</strong></p>
            <p>Dernier <strong>{{ item.latestGlobalScore ?? '—' }}</strong></p>
            <small>
              <span class="pip ok"></span>{{ item.riskDistribution.green }}
              <span class="pip warn"></span>{{ item.riskDistribution.orange }}
              <span class="pip bad"></span>{{ item.riskDistribution.red }}
            </small>
          </article>
        </div>

        <div class="trend" *ngIf="filteredTrendRecords().length > 1">
          <ul class="legend">
            <li><i class="s1"></i>Global</li>
            <li><i class="s2"></i>Comportemental</li>
            <li><i class="s3"></i>Émotionnel</li>
            <li><i class="s4"></i>Social</li>
            <li><i class="s5"></i>Parental</li>
          </ul>
          <svg viewBox="0 0 760 280" class="trend-svg" role="img" aria-label="Courbes d'évolution des scores">
            <line *ngFor="let y of yGrid" class="gridline" [attr.x1]="50" [attr.y1]="toY(y)" [attr.x2]="730" [attr.y2]="toY(y)"></line>
            <text *ngFor="let y of yGrid" x="40" [attr.y]="toY(y) + 4" class="axis-y">{{ y }}</text>
            <path class="line s2" [attr.d]="buildLinePath('comportemental')"></path>
            <path class="line s3" [attr.d]="buildLinePath('emotionnel')"></path>
            <path class="line s4" [attr.d]="buildLinePath('social')"></path>
            <path class="line s5" [attr.d]="buildLinePath('parental')"></path>
            <path class="line s1 main" [attr.d]="buildLinePath('globalScore')"></path>
            <g *ngFor="let item of filteredTrendRecords(); let i = index">
              <circle class="point" [attr.cx]="toX(i)" [attr.cy]="toY(item.globalScore)" r="5">
                <title>{{ item.calculatedAt | date: 'dd/MM/yyyy' }} — global {{ item.globalScore | number: '1.0-0' }}</title>
              </circle>
              <text class="axis-x" [attr.x]="toX(i)" y="270">{{ item.calculatedAt | date: 'dd/MM' }}</text>
            </g>
          </svg>
        </div>
        <p class="muted" *ngIf="filteredTrendRecords().length <= 1">Au moins 2 mesures sont nécessaires pour afficher les courbes d'évolution.</p>

        <div class="fb-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Global</th>
                <th>Comportemental</th>
                <th>Émotionnel</th>
                <th>Social</th>
                <th>Parental</th>
                <th>Catégorie</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of filteredHistoryRecords()">
                <td>{{ row.calculatedAt | date: 'dd/MM/yyyy' }}</td>
                <td><strong>{{ row.globalScore | number: '1.0-0' }}</strong></td>
                <td>{{ row.subScores.comportemental | number: '1.0-0' }}</td>
                <td>{{ row.subScores.emotionnel | number: '1.0-0' }}</td>
                <td>{{ row.subScores.social | number: '1.0-0' }}</td>
                <td>{{ row.subScores.parental | number: '1.0-0' }}</td>
                <td>{{ getRiskCategoryLabel(row.riskCategory, row.riskLevel) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Méthodologie -->
      <details class="fb-card fb-card--tint method">
        <summary><mat-icon>help_outline</mat-icon>Comment ce score est-il calculé ?</summary>
        <p>
          Chaque réponse est normalisée sur une échelle de 0 à 100 selon son type, puis agrégée en quatre
          sous-scores. Le score global applique ensuite une pondération qui dépend de la tranche d'âge.
          Plus le score est élevé, plus l'équilibre est bon.
        </p>
      </details>
    </div>

    <ng-template #emptyTpl>
      <div class="fb-card">
        <app-empty-state
          icon="query_stats"
          illustration="survey"
          title="Aucun score disponible"
          message="Terminez un questionnaire pour afficher le score, les sous-scores et les recommandations."
        ></app-empty-state>
      </div>
    </ng-template>
  `,
  styles: [
    `
      :host { display: block; }
      .block { margin-bottom: 20px; }
      .hint { display: flex; align-items: center; gap: 8px; margin: 0 0 20px; color: var(--fb-text-mid); font-size: 14px; }
      .hint mat-icon { width: 20px; height: 20px; font-size: 20px; color: var(--fb-muted); }
      .muted { margin: 0 0 16px; color: var(--fb-muted); font-size: 14px; }
      .section-title { margin: 0 0 16px; font-size: 17px; font-weight: 700; }

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
      .child-banner p { flex: 1; margin: 0; }

      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
      .history, .reco, .method { grid-column: 1 / -1; }

      /* Jauge */
      .gauge-card { display: flex; flex-direction: column; align-items: center; text-align: center; }
      .gauge-card .section-title { align-self: flex-start; }
      .gauge {
        --score: 0;
        --tone: var(--fb-success);
        display: grid;
        place-items: center;
        width: 190px;
        height: 190px;
        border-radius: 50%;
        background: conic-gradient(var(--tone) calc(var(--score) * 1%), var(--fb-sunken) 0);
      }
      .gauge-inner {
        display: grid;
        place-items: center;
        align-content: center;
        width: 150px;
        height: 150px;
        border-radius: 50%;
        background: var(--fb-surface);
      }
      .gauge-inner strong { font-family: var(--fb-font-serif); font-size: 48px; font-weight: 650; line-height: 1; }
      .gauge-inner span { font-size: 13px; color: var(--fb-muted); }
      .risk { display: inline-flex; align-items: center; gap: 6px; margin: 18px 0 14px; font-weight: 700; font-size: 16px; }
      .risk mat-icon { width: 20px; height: 20px; font-size: 20px; }
      .weights { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }

      /* Radar */
      .radar { display: block; width: 100%; max-width: 360px; margin: 0 auto; }
      .radar .ring, .radar line { fill: none; stroke: var(--fb-border); stroke-width: 1; }
      .radar .shape { fill: rgba(var(--fb-primary-rgb), 0.18); stroke: var(--fb-primary); stroke-width: 2; stroke-linejoin: round; }
      .radar text { font-family: var(--fb-font-sans); font-size: 12px; fill: var(--fb-text-mid); text-anchor: middle; }
      .subscores { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 16px 0 0; }
      .subscores div { padding: 10px; border-radius: 12px; background: var(--fb-surface-alt); text-align: center; }
      .subscores dt { font-size: 11.5px; color: var(--fb-muted); }
      .subscores dd { margin: 2px 0 0; font-weight: 700; font-size: 18px; }

      /* Recommandations */
      .reco {
        display: flex;
        gap: 14px;
        padding: 24px;
        border-radius: var(--fb-radius-md);
        background: var(--fb-ink);
        color: var(--fb-on-ink);
      }
      .reco > mat-icon { flex-shrink: 0; color: var(--fb-accent); }
      .reco .fb-eyebrow { color: var(--fb-accent-hover); }
      .reco ul { display: grid; gap: 8px; margin: 12px 0; padding-left: 18px; color: #fff; line-height: 1.5; }
      .reco p { margin: 0; font-size: 13px; color: var(--fb-on-ink-dim); }

      /* Alertes */
      .alerts { grid-column: 1 / -1; }
      .alert-item { display: flex; gap: 12px; padding: 12px 14px; border-radius: var(--fb-radius-sm); background: rgba(var(--fb-danger-rgb), 0.06); }
      .alert-item + .alert-item { margin-top: 8px; }
      .alert-item mat-icon { color: var(--fb-danger); }
      .alert-item strong { color: var(--fb-danger); }
      .alert-item p { margin: 2px 0 0; color: var(--fb-text-mid); font-size: 14px; }

      /* Historique */
      .history-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
      .history-head .section-title { margin: 0; }
      .segmented { display: inline-flex; padding: 4px; border-radius: var(--fb-radius-pill); background: var(--fb-surface-alt); }
      .segmented button { padding: 6px 14px; border: none; border-radius: var(--fb-radius-pill); background: transparent; color: var(--fb-text-mid); font-weight: 600; font-size: 13px; cursor: pointer; }
      .segmented button.active { background: var(--fb-surface); color: var(--fb-text); box-shadow: var(--fb-elev-1); }

      .periods { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 20px; }
      .period { padding: 14px 16px; border-radius: 16px; background: var(--fb-surface-alt); }
      .period h3 { margin: 0 0 6px; font-size: 14px; color: var(--fb-text-mid); }
      .period p { display: flex; justify-content: space-between; margin: 2px 0; font-size: 14px; }
      .period small { display: flex; align-items: center; gap: 4px; margin-top: 8px; font-size: 12.5px; color: var(--fb-muted); }
      .pip { display: inline-block; width: 8px; height: 8px; margin-left: 6px; border-radius: 50%; }
      .pip:first-child { margin-left: 0; }
      .pip.ok { background: var(--fb-success); }
      .pip.warn { background: var(--fb-accent); }
      .pip.bad { background: var(--fb-danger); }

      .trend { margin-bottom: 20px; }
      .legend { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 0 0 8px; padding: 0; list-style: none; font-size: 13px; color: var(--fb-text-mid); }
      .legend li { display: inline-flex; align-items: center; gap: 6px; }
      .legend i { width: 10px; height: 10px; border-radius: 50%; }
      .trend-svg { display: block; width: 100%; height: auto; }
      .gridline { stroke: var(--fb-border); stroke-width: 1; }
      .axis-y, .axis-x { font-family: var(--fb-font-sans); font-size: 12px; fill: var(--fb-muted); }
      .axis-y { text-anchor: end; }
      .axis-x { text-anchor: middle; }
      .line { fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
      .line.main { stroke-width: 3; }
      /* Palette catégorielle validée (voir shared/chart-palette.ts), ordre fixe. */
      .s1 { stroke: #2a78d6; background: #2a78d6; }
      .s2 { stroke: #eb6834; background: #eb6834; }
      .s3 { stroke: #1baf7a; background: #1baf7a; }
      .s4 { stroke: #eda100; background: #eda100; }
      .s5 { stroke: #e87ba4; background: #e87ba4; }
      .point { fill: #2a78d6; stroke: var(--fb-surface); stroke-width: 2; cursor: default; }
      .point:hover { r: 7; }

      .method summary { display: flex; align-items: center; gap: 8px; font-weight: 700; cursor: pointer; list-style: none; }
      .method summary::-webkit-details-marker { display: none; }
      .method summary mat-icon { color: var(--fb-primary); }
      .method p { margin: 12px 0 0; color: var(--fb-text-mid); line-height: 1.6; }

      @media (max-width: 1024px) {
        .grid { grid-template-columns: minmax(0, 1fr); }
      }
      @media (max-width: 480px) {
        .subscores { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
    `,
  ],
})
export class ScoringDashboardPage implements OnInit {
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly latestRecord = signal<ScoreRecord | null>(null);
  readonly historyRecords = signal<ScoreRecord[]>([]);
  readonly periodStats = signal<ScorePeriodStat[]>([]);
  readonly openAlerts = signal<RiskAlert[]>([]);
  readonly latestCompletedSessionId = signal<string | null>(null);
  readonly yGrid = [0, 25, 50, 75, 100];
  readonly trendRecords = computed(() => [...this.historyRecords()].slice().reverse());
  readonly selectedWindow = signal<'all' | 3 | 6 | 12>('all');
  readonly filteredHistoryRecords = computed(() => {
    const window = this.selectedWindow();
    const records = this.historyRecords();

    if (window === 'all') {
      return records;
    }

    const threshold = new Date();
    threshold.setMonth(threshold.getMonth() - window);

    return records.filter((record) => new Date(record.calculatedAt) >= threshold);
  });
  readonly filteredTrendRecords = computed(() => [...this.filteredHistoryRecords()].slice().reverse());

  readonly riskColor = computed(() => {
    // Les 4 couleurs "risque" correspondent exactement aux tokens --fb-danger/--fb-warning/
    // --fb-success/--fb-primary déjà définis dans styles.css : on référence directement ces
    // tokens plutôt que de dupliquer leur valeur hexadécimale en dur, pour rester la seule
    // source de vérité si la palette évolue un jour.
    const category = this.latestRecord()?.riskCategory;
    if (category === 'risque-eleve') return 'var(--fb-danger)';
    if (category === 'risque-modere') return 'var(--fb-risk-moderate)';
    if (category === 'vigilance-legere') return 'var(--fb-accent-strong)';
    if (category === 'equilibre-sain') return 'var(--fb-success)';

    const risk = this.latestRecord()?.riskLevel;
    if (risk === 'red') return 'var(--fb-danger)';
    if (risk === 'orange') return 'var(--fb-accent-strong)';
    return 'var(--fb-success)';
  });

  readonly riskCategoryLabel = computed(() => {
    const category = this.latestRecord()?.riskCategory;
    if (category === 'risque-eleve') return 'Risque élevé';
    if (category === 'risque-modere') return 'Risque modéré';
    if (category === 'vigilance-legere') return 'Vigilance légère';
    if (category === 'equilibre-sain') return 'Équilibre sain';
    return '-';
  });

  readonly weightEntries = computed(() => {
    const weights = this.latestRecord()?.weights;
    if (!weights) {
      return [];
    }

    return [
      { dimension: 'Comportemental', value: weights.comportemental },
      { dimension: 'Emotionnel', value: weights.emotionnel },
      { dimension: 'Social', value: weights.social },
      { dimension: 'Parental', value: weights.parental },
    ];
  });

  getRiskCategoryLabel(category?: string, fallbackRiskLevel?: string): string {
    if (category === 'risque-eleve') return 'Risque élevé';
    if (category === 'risque-modere') return 'Risque modéré';
    if (category === 'vigilance-legere') return 'Vigilance légère';
    if (category === 'equilibre-sain') return 'Équilibre sain';
    if (fallbackRiskLevel === 'red') return 'Risque élevé';
    if (fallbackRiskLevel === 'orange') return 'Risque modéré';
    if (fallbackRiskLevel === 'green') return 'Équilibre sain';
    return '-';
  }

  constructor(
    private readonly scoringService: ScoringService,
    protected readonly childContext: ChildContextService
  ) {}

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    const childId = this.childContext.selectedChildId() || undefined;

    this.scoringService.latest(childId).subscribe({
      next: (latest) => {
        this.latestRecord.set(latest.latestRecord);
        this.openAlerts.set(latest.openAlerts || []);
        this.latestCompletedSessionId.set(latest.latestCompletedSessionId);

        this.scoringService.history(childId).subscribe({
          next: (history) => {
            this.loading.set(false);
            this.historyRecords.set(history.records || []);
            this.periodStats.set(history.periodStats || []);
          },
          error: (error) => {
            this.loading.set(false);
            this.errorMessage.set(error?.error?.message || 'Impossible de charger l\'historique des scores.');
          },
        });
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message || 'Impossible de charger le score actuel.');
      },
    });
  }

  calculateLatest(): void {
    if (!this.latestCompletedSessionId()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.scoringService.calculateFromSession(this.latestCompletedSessionId()!).subscribe({
      next: (response) => {
        this.successMessage.set(response.message || 'Scoring recalculé.');
        this.refreshAll();
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message || 'Impossible de calculer le scoring.');
      },
    });
  }

  setWindow(window: 'all' | 3 | 6 | 12): void {
    this.selectedWindow.set(window);
  }

  downloadPdfReport(): void {
    if (!this.latestRecord()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.scoringService.downloadLatestReportPdf(this.childContext.selectedChildId() || undefined).subscribe({
      next: (blob) => {
        this.loading.set(false);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `rapport-scoring-${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.successMessage.set('Rapport PDF téléchargé avec succès.');
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message || 'Impossible de générer le rapport PDF.');
      },
    });
  }

  radarPoints(): string {
    const record = this.latestRecord();
    if (!record) return '150,150 150,150 150,150 150,150';

    const values = [
      record.subScores.emotionnel,
      record.subScores.social,
      record.subScores.parental,
      record.subScores.comportemental,
    ];

    const points = [
      [150, 30],
      [270, 150],
      [150, 270],
      [30, 150],
    ];

    const center = [150, 150];

    return points
      .map((point, index) => {
        const ratio = Math.max(0, Math.min(1, values[index] / 100));
        const x = center[0] + (point[0] - center[0]) * ratio;
        const y = center[1] + (point[1] - center[1]) * ratio;
        return `${x},${y}`;
      })
      .join(' ');
  }

  toX(index: number): number {
    const total = this.filteredTrendRecords().length;
    if (total <= 1) return 390;
    const minX = 70;
    const maxX = 710;
    return minX + ((maxX - minX) * index) / (total - 1);
  }

  toY(value: number): number {
    const minY = 230;
    const maxY = 30;
    const ratio = Math.max(0, Math.min(1, value / 100));
    return minY - (minY - maxY) * ratio;
  }

  buildLinePath(metric: 'globalScore' | 'comportemental' | 'emotionnel' | 'social' | 'parental'): string {
    const records = this.filteredTrendRecords();
    if (!records.length) return '';

    const getValue = (record: ScoreRecord): number => {
      if (metric === 'globalScore') return record.globalScore;
      return record.subScores[metric];
    };

    return records
      .map((record, index) => `${index === 0 ? 'M' : 'L'} ${this.toX(index)} ${this.toY(getValue(record))}`)
      .join(' ');
  }
}