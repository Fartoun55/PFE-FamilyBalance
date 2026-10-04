import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ScoringService } from '../../../core/services/scoring.service';
import { ChildContextService } from '../../../core/services/child-context.service';
import { RiskAlert, ScorePeriodStat, ScoreRecord } from '../models/scoring.models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-scoring-dashboard-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, EmptyStateComponent],
  template: `
    <section class="score-shell">
      <div class="child-context-banner" *ngIf="childContext.selectedChildId()">
        <mat-icon>face</mat-icon>
        <p>Score de <strong>{{ childContext.selectedChildName() }}</strong></p>
        <button mat-stroked-button type="button" (click)="childContext.clear(); refreshAll()">Voir mon propre score</button>
      </div>

      <header class="score-hero">
        <div class="hero-top">
          <p class="kicker">Algorithme de scoring</p>
        </div>
        <h1>Suivi longitudinal des risques</h1>
        <p>Lecture des sous-scores comportemental, émotionnel, social et parental avec score global 0-100.</p>
      </header>

      <mat-card class="toolbar">
        <button
          mat-flat-button
          color="primary"
          (click)="calculateLatest()"
          [disabled]="loading() || !latestCompletedSessionId()"
        >
          {{ loading() ? 'Calcul...' : 'Recalculer depuis la dernière session complétée' }}
        </button>
        <button mat-stroked-button color="primary" (click)="downloadPdfReport()" [disabled]="loading() || !latestRecord()">
          Export PDF
        </button>
        <span class="muted" *ngIf="!latestCompletedSessionId()">Aucune session survey complétée trouvée.</span>
      </mat-card>

      <div class="grid" *ngIf="latestRecord(); else emptyTpl">
        <mat-card class="score-card gauge-card">
          <h2>Score global</h2>
          <div class="gauge" [style.--score]="latestRecord()!.globalScore" [style.--tone]="riskColor()">
            <div class="gauge-inner">
              <strong>{{ latestRecord()!.globalScore | number: '1.0-0' }}</strong>
              <span>/ 100</span>
            </div>
          </div>
          <p class="risk" [style.color]="riskColor()">Catégorie: {{ riskCategoryLabel() }}</p>
          <div class="age-weight">
            <span class="meta-item">Tranche d’âge : <strong>{{ latestRecord()!.ageSegment }}</strong></span>
            <div class="weights">
              <span class="weight-pill" *ngFor="let item of weightEntries()">
                {{ item.dimension }} : {{ item.value | percent:'1.0-0' }}
              </span>
            </div>
          </div>
        </mat-card>

        <mat-card class="score-card method-card">
          <h2>Méthodologie</h2>
          <p>
            Chaque réponse est normalisée sur une échelle 0–100 selon son type, puis agrégée
            en quatre sous-scores. Le score global est ensuite calculé avec une pondération dynamique
            basée sur la tranche d’âge sélectionnée.
          </p>
          <ul>
            <li>Comportemental, émotionnel, social, parental</li>
            <li>Pondérations ajustées par tranche d’âge</li>
            <li>Score global 0–100 et niveau de risque</li>
            <li>Suivi longitudinal sur 3, 6 et 12 mois</li>
          </ul>
        </mat-card>

        <mat-card class="score-card radar-card">
          <h2>Radar des sous-scores</h2>
          <svg viewBox="0 0 300 300" class="radar-svg" role="img" aria-label="Radar des sous-scores">
            <polygon class="grid-1" points="150,30 270,150 150,270 30,150"></polygon>
            <polygon class="grid-2" points="150,60 240,150 150,240 60,150"></polygon>
            <polygon class="grid-3" points="150,90 210,150 150,210 90,150"></polygon>
            <polygon class="grid-4" points="150,120 180,150 150,180 120,150"></polygon>
            <line x1="150" y1="30" x2="150" y2="270"></line>
            <line x1="30" y1="150" x2="270" y2="150"></line>
            <polygon class="shape" [attr.points]="radarPoints()"></polygon>
            <text x="150" y="22">Emotionnel</text>
            <text x="7" y="155">Comportemental</text>
            <text x="278" y="155">Social</text>
            <text x="150" y="292">Parental</text>
          </svg>
        </mat-card>

        <mat-card class="score-card reco-card">
          <h2>Recommandations personnalisées</h2>
          <p class="reco-note">Ces recommandations sont recalculées automatiquement à chaque nouvelle évaluation.</p>
          <ul>
            <li *ngFor="let rec of latestRecord()!.recommendations">{{ rec }}</li>
          </ul>
        </mat-card>

        <mat-card class="score-card history-card">
          <h2>Historique (3, 6, 12 mois)</h2>
          <div class="window-filters">
            <button class="chip" [class.active]="selectedWindow() === 'all'" (click)="setWindow('all')">Tout</button>
            <button class="chip" [class.active]="selectedWindow() === 3" (click)="setWindow(3)">3 mois</button>
            <button class="chip" [class.active]="selectedWindow() === 6" (click)="setWindow(6)">6 mois</button>
            <button class="chip" [class.active]="selectedWindow() === 12" (click)="setWindow(12)">12 mois</button>
          </div>

          <div class="period-grid">
            <article *ngFor="let item of periodStats()" class="period-card">
              <h3>{{ item.months }} mois</h3>
              <p>Moyenne: <strong>{{ item.averageGlobalScore ?? '-' }}</strong></p>
              <p>Dernier: <strong>{{ item.latestGlobalScore ?? '-' }}</strong></p>
              <small>Vert {{ item.riskDistribution.green }} | Orange {{ item.riskDistribution.orange }} | Rouge {{ item.riskDistribution.red }}</small>
            </article>
          </div>

          <div class="trend-chart" *ngIf="filteredTrendRecords().length > 1">
            <div class="legend">
              <span><i class="dot global"></i>Global</span>
              <span><i class="dot comportemental"></i>Comportemental</span>
              <span><i class="dot emotionnel"></i>Emotionnel</span>
              <span><i class="dot social"></i>Social</span>
              <span><i class="dot parental"></i>Parental</span>
            </div>

            <svg viewBox="0 0 760 280" class="trend-svg" role="img" aria-label="Courbes d'évolution des scores">
              <line *ngFor="let y of yGrid" [attr.x1]="50" [attr.y1]="toY(y)" [attr.x2]="730" [attr.y2]="toY(y)"></line>
              <text *ngFor="let y of yGrid" x="44" [attr.y]="toY(y) + 4" class="axis-y">{{ y }}</text>

              <path class="line global" [attr.d]="buildLinePath('globalScore')"></path>
              <path class="line comportemental" [attr.d]="buildLinePath('comportemental')"></path>
              <path class="line emotionnel" [attr.d]="buildLinePath('emotionnel')"></path>
              <path class="line social" [attr.d]="buildLinePath('social')"></path>
              <path class="line parental" [attr.d]="buildLinePath('parental')"></path>

              <g *ngFor="let item of filteredTrendRecords(); let i = index">
                <circle class="point global" [attr.cx]="toX(i)" [attr.cy]="toY(item.globalScore)" r="3"></circle>
                <text class="axis-x" [attr.x]="toX(i)" y="270">{{ item.calculatedAt | date: 'MM/yy' }}</text>
              </g>
            </svg>
          </div>

          <p class="muted" *ngIf="filteredTrendRecords().length <= 1">Au moins 2 mesures sont nécessaires pour afficher les courbes d'évolution.</p>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Global</th>
                <th>Comportemental</th>
                <th>Emotionnel</th>
                <th>Social</th>
                <th>Parental</th>
                <th>Catégorie</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of filteredHistoryRecords()">
                <td>{{ row.calculatedAt | date: 'shortDate' }}</td>
                <td>{{ row.globalScore | number: '1.0-0' }}</td>
                <td>{{ row.subScores.comportemental | number: '1.0-0' }}</td>
                <td>{{ row.subScores.emotionnel | number: '1.0-0' }}</td>
                <td>{{ row.subScores.social | number: '1.0-0' }}</td>
                <td>{{ row.subScores.parental | number: '1.0-0' }}</td>
                <td>{{ getRiskCategoryLabel(row.riskCategory, row.riskLevel) }}</td>
              </tr>
            </tbody>
          </table>
        </mat-card>

        <mat-card class="score-card alert-card" *ngIf="openAlerts().length">
          <h2>Alertes automatiques</h2>
          <div class="alert" *ngFor="let alert of openAlerts()">
            <mat-icon>warning</mat-icon>
            <div>
              <strong>Risque élevé</strong>
              <p>{{ alert.message }}</p>
            </div>
          </div>
        </mat-card>
      </div>

      <ng-template #emptyTpl>
        <mat-card class="score-card empty">
          <app-empty-state
            icon="query_stats"
            title="Aucun score disponible"
            message="Complétez un survey puis lancez le calcul pour afficher la jauge et les recommandations."
          ></app-empty-state>
        </mat-card>
      </ng-template>

      <p class="error" *ngIf="errorMessage()">{{ errorMessage() }}</p>
      <p class="success" *ngIf="successMessage()">{{ successMessage() }}</p>
    </section>
  `,
  styles: [
    `
      .score-shell {
        max-width: 1180px;
        margin: 0 auto;
        padding: 1.5rem 1rem 3rem;
        display: grid;
        gap: 1rem;
        background: radial-gradient(circle at top, rgba(var(--fb-primary-rgb), 0.08), transparent 32%), var(--fb-bg);
      }
      .child-context-banner {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.85rem 1.1rem;
        border-radius: 14px;
        background: var(--fb-primary-soft);
        border: 1px solid rgba(var(--fb-primary-rgb), 0.25);
        color: var(--fb-primary-strong);
      }
      .child-context-banner p { margin: 0; flex: 1; font-size: 0.9rem; }
      .score-hero {
        background: linear-gradient(135deg, var(--fb-primary-strong) 0%, var(--fb-primary) 100%);
        color: #ffffff;
        border-radius: 30px;
        padding: 2rem 2rem 1.9rem;
        box-shadow: 0 30px 70px rgba(var(--fb-primary-rgb), 0.2);
      }
      .hero-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 0.75rem;
      }
      .kicker {
        margin: 0;
        font-size: 0.82rem;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        opacity: 0.85;
      }
      .score-hero h1 {
        margin: 0 0 0.55rem;
        font-size: clamp(2rem, 3vw, 2.8rem);
        line-height: 1.05;
      }
      .score-hero p {
        margin: 0;
        max-width: 720px;
        color: rgba(255, 255, 255, 0.88);
        font-size: 1rem;
        line-height: 1.8;
      }
      .toolbar {
        padding: 1rem 1.1rem;
        display: flex;
        gap: 0.9rem;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        border-radius: 24px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        background: #ffffff;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
      }
      .toolbar button {
        min-width: 220px;
      }
      .window-filters {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin: 0 0 0.8rem;
      }
      .chip {
        border: 1px solid var(--fb-border);
        background: #ffffff;
        border-radius: 999px;
        font-size: 12px;
        padding: 0.45rem 0.95rem;
        cursor: pointer;
        transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
      }
      .chip.active {
        background: var(--fb-primary-soft);
        border-color: var(--fb-primary);
        color: var(--fb-primary-strong);
      }
      .muted { color: var(--fb-muted); font-size: 13px; }
      .grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      }
      .score-card {
        padding: 1.4rem;
        border-radius: 24px;
        border: 1px solid rgba(148, 163, 184, 0.14);
        background: #ffffff;
        box-shadow: 0 24px 50px rgba(15, 23, 42, 0.05);
      }
      .gauge-card,
      .radar-card,
      .reco-card,
      .alert-card { min-height: 280px; }
      .history-card { grid-column: 1 / -1; }
      .gauge {
        --score: 0;
        --tone: #157f45;
        width: 190px;
        height: 190px;
        border-radius: 50%;
        margin: 0.5rem auto;
        background: conic-gradient(var(--tone) calc(var(--score) * 1%), var(--fb-border) 0);
        display: grid;
        place-items: center;
        box-shadow: inset 0 0 0 6px rgba(255, 255, 255, 0.85);
      }
      .gauge-inner {
        width: 142px;
        height: 142px;
        background: #ffffff;
        border-radius: 50%;
        display: grid;
        place-items: center;
        text-align: center;
        box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
      }
      .gauge-inner strong { font-size: 38px; line-height: 1; }
      .gauge-inner span { font-size: 12px; color: #64748b; }
      .risk { text-align: center; font-weight: 800; font-size: 1rem; color: var(--fb-text); letter-spacing: 0.01em; }
      .age-weight {
        margin-top: 0.95rem;
        display: grid;
        gap: 0.45rem;
        text-align: center;
      }
      .method-card {
        min-height: 220px;
        background: linear-gradient(180deg, #ffffff 0%, var(--fb-bg) 100%);
        border: 1px solid var(--fb-border);
      }
      .method-card h2 {
        margin-bottom: 0.65rem;
      }
      .method-card p {
        margin: 0 0 0.95rem;
        color: var(--fb-muted);
        line-height: 1.75;
      }
      .method-card ul {
        margin: 0;
        padding-left: 1.2rem;
        color: var(--fb-muted);
        font-size: 13px;
      }
      .method-card li {
        margin-bottom: 0.5rem;
      }
      .meta-item {
        color: var(--fb-muted);
        font-size: 0.95rem;
      }
      .weights {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.45rem;
      }
      .weight-pill {
        padding: 0.4rem 0.85rem;
        border-radius: 999px;
        background: var(--fb-primary-soft);
        color: var(--fb-primary-strong);
        font-size: 12px;
        border: 1px solid rgba(var(--fb-primary-rgb), 0.2);
      }
      .radar-svg {
        width: 100%;
        max-width: 300px;
        display: block;
        margin: 0 auto;
      }
      .radar-svg polygon,
      .radar-svg line {
        fill: none;
        stroke: #d1d5db;
        stroke-width: 1.2;
      }
      .radar-svg .shape {
        fill: rgba(var(--fb-primary-rgb), 0.22);
        stroke: var(--fb-primary);
        stroke-width: 2;
      }
      .radar-svg text {
        font-size: 11px;
        fill: #334155;
        text-anchor: middle;
      }
      .reco-card ul {
        margin: 0;
        padding-left: 1.15rem;
        display: grid;
        gap: 0.55rem;
      }
      .reco-note {
        margin: 0 0 0.9rem;
        font-size: 0.92rem;
        color: #475569;
      }
      .period-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 0.9rem;
        margin-bottom: 1rem;
      }
      .trend-chart {
        border: 1px solid #d8e1ea;
        border-radius: 18px;
        padding: 0.9rem;
        background: #ffffff;
        margin-bottom: 1rem;
        box-shadow: 0 16px 30px rgba(15, 23, 42, 0.04);
      }
      .legend {
        display: flex;
        gap: 0.9rem;
        flex-wrap: wrap;
        font-size: 12px;
        color: #475569;
        margin-bottom: 0.5rem;
      }
      .legend .dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 0.35rem;
      }
      .dot.global { background: var(--fb-primary); }
      .dot.comportemental { background: #dc2626; }
      .dot.emotionnel { background: #7c3aed; }
      .dot.social { background: #0284c7; }
      .dot.parental { background: #16a34a; }
      .trend-svg {
        width: 100%;
        height: auto;
      }
      .trend-svg line {
        stroke: #e2e8f0;
        stroke-width: 1;
      }
      .line {
        fill: none;
        stroke-width: 2.6;
      }
      .line.global,
      .point.global { stroke: var(--fb-primary); fill: var(--fb-primary); }
      .line.comportemental { stroke: #dc2626; }
      .line.emotionnel { stroke: #7c3aed; }
      .line.social { stroke: #0284c7; }
      .line.parental { stroke: #16a34a; }
      .axis-y {
        font-size: 11px;
        text-anchor: end;
        fill: #64748b;
      }
      .axis-x {
        font-size: 11px;
        text-anchor: middle;
        fill: #64748b;
      }
      .period-card {
        border: 1px solid #dfe7f1;
        border-radius: 16px;
        padding: 0.9rem;
        background: #f8fbff;
      }
      .period-card h3,
      .period-card p,
      .period-card small { margin: 0; }
      .period-card p { margin-top: 0.35rem; }
      table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 18px;
        overflow: hidden;
        background: #ffffff;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
      }
      th,
      td {
        text-align: left;
        padding: 0.85rem 0.9rem;
        font-size: 12.7px;
        color: #334155;
      }
      th {
        background: #f8fafc;
        color: #475569;
        font-weight: 700;
      }
      tbody tr {
        border-top: 1px solid #e5e7eb;
      }
      tbody tr:nth-child(even) {
        background: #f8fafc;
      }
      .alert {
        display: flex;
        gap: 0.8rem;
        align-items: flex-start;
        border: 1px solid rgba(192,57,43,.28);
        border-radius: 18px;
        background: rgba(192,57,43,.06);
        padding: 1rem;
      }
      .alert mat-icon { color: var(--fb-danger); }
      .alert p { margin: 0.1rem 0 0; color: var(--fb-danger); }
      .empty { text-align: center; }
      .error { color: var(--fb-danger); }
      .success { color: var(--fb-success); }
      @media (max-width: 1024px) {
        .grid,
        .period-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 768px) {
        .toolbar {
          justify-content: stretch;
        }
        .toolbar button {
          width: 100%;
        }
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
    if (category === 'risque-modere') return 'var(--fb-warning)';
    if (category === 'vigilance-legere') return 'var(--fb-primary)';
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