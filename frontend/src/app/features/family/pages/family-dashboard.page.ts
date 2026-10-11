import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FamilyDashboardService } from '../../../core/services/family-dashboard.service';
import {
  FamilyDashboardChild,
  FamilyDashboardOverviewResponse,
} from '../models/family-dashboard.models';
import { AuthService } from '../../../core/services/auth.service';
import { ChildContextService } from '../../../core/services/child-context.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { CHART_INK, CHART_SERIES } from '../../../shared/chart-palette';

type ChartModule = typeof import('chart.js/auto');

@Component({
  selector: 'app-family-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, StatCardComponent, PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header
      eyebrow="Tableau de bord famille"
      title="Suivi des profils enfants"
      subtitle="Vue d'ensemble, évolution des scores et rappels de réévaluation tous les 3 mois."
      illustration="family-dashboard"
    >
      <a class="fb-btn fb-btn--ghost" routerLink="/family/add-adolescent">
        <mat-icon>person_add</mat-icon>
        Ajouter un adolescent
      </a>
    </app-page-header>

    <div class="fb-alert fb-alert--error block" role="alert" *ngIf="errorMessage()">
      <mat-icon>error_outline</mat-icon><span>{{ errorMessage() }}</span>
    </div>

    <div class="fb-loading" *ngIf="!overview() && !errorMessage()">
      <span class="fb-spinner"></span>
      Chargement du tableau de bord…
    </div>

    <ng-container *ngIf="overview() as data">
      <div class="kpi-row">
        <app-stat-card icon="groups" label="Enfants rattachés" [value]="data.totalChildren" tone="primary"></app-stat-card>
        <app-stat-card icon="event_repeat" label="Réévaluations à faire" [value]="data.dueReminders" tone="warning"></app-stat-card>
        <app-stat-card
          icon="insights"
          label="Score moyen"
          [value]="computeAverageScore(data) === null ? '—' : computeAverageScore(data) + '/100'"
          tone="accent"
        ></app-stat-card>
      </div>

      <div class="fb-card" *ngIf="!data.children.length">
        <app-empty-state
          icon="family_restroom"
          illustration="add-child"
          title="Aucun enfant rattaché pour le moment"
          message="Ajoutez le profil de votre adolescent pour démarrer une évaluation et suivre son évolution."
        >
          <a class="fb-btn" routerLink="/family/add-adolescent"><mat-icon>person_add</mat-icon>Ajouter un adolescent</a>
        </app-empty-state>
      </div>

      <div class="layout" *ngIf="data.children.length">
        <aside class="fb-card children" aria-label="Profils enfants">
          <h2 class="section-title">Profils enfants</h2>
          <div class="child-list">
            <button
              type="button"
              class="child"
              *ngFor="let item of data.children"
              [class.active]="selectedChild()?._id === item.child._id"
              [attr.aria-pressed]="selectedChild()?._id === item.child._id"
              (click)="selectChild(item)"
            >
              <span class="avatar">
                <img *ngIf="item.child.avatarUrl; else initialsTpl" [src]="item.child.avatarUrl" [alt]="item.child.firstName + ' ' + item.child.lastName" />
                <ng-template #initialsTpl>{{ item.child.firstName.charAt(0) }}{{ item.child.lastName.charAt(0) }}</ng-template>
              </span>
              <span class="child-main">
                <strong>{{ item.child.firstName }} {{ item.child.lastName }}</strong>
                <small>Né(e) le {{ formatDate(item.child.birthDate) }}</small>
              </span>
              <span
                class="score"
                [class.low]="item.latestRecord && item.latestRecord.globalScore < 50"
                [class.medium]="item.latestRecord && item.latestRecord.globalScore >= 50 && item.latestRecord.globalScore < 75"
                [class.high]="item.latestRecord && item.latestRecord.globalScore >= 75"
                [attr.aria-label]="item.latestRecord ? 'Score ' + (item.latestRecord.globalScore | number:'1.0-0') + ' sur 100, ' + riskCategoryLabel(item.latestRecord.riskCategory) : 'Score non disponible'"
              >
                {{ item.latestRecord ? (item.latestRecord.globalScore | number:'1.0-0') : '—' }}
              </span>
            </button>
          </div>
        </aside>

        <section class="detail" *ngIf="selectedChildData() as selected">
          <div class="fb-card detail-head">
            <div class="detail-id">
              <h2>{{ selected.child.firstName }} {{ selected.child.lastName }}</h2>
              <p>{{ selected.child.email }} · Né(e) le {{ formatDate(selected.child.birthDate) }}</p>
            </div>
            <div class="detail-actions">
              <button class="fb-btn fb-btn--accent" type="button" (click)="startSurveyForChild(selected.child)">
                <mat-icon>quiz</mat-icon>
                Démarrer le questionnaire
              </button>
              <button class="fb-btn fb-btn--ghost" type="button" (click)="viewDetailedScore(selected.child)">
                <mat-icon>insights</mat-icon>
                Score détaillé
              </button>
              <button class="fb-btn fb-btn--ghost" type="button" [disabled]="pdfDownloading()" (click)="downloadPdf(selected.child._id)">
                <mat-icon>picture_as_pdf</mat-icon>
                {{ pdfDownloading() ? 'Export en cours…' : 'Exporter le bilan' }}
              </button>
            </div>

            <dl class="facts">
              <div>
                <dt>Dernier score global</dt>
                <dd>{{ selected.latestRecord ? (selected.latestRecord.globalScore | number:'1.0-0') + '/100' : '—' }}</dd>
              </div>
              <div>
                <dt>Niveau de risque</dt>
                <dd>{{ riskCategoryLabel(selected.latestRecord?.riskCategory) }}</dd>
              </div>
              <div>
                <dt>Réévaluation</dt>
                <dd [class.due]="selected.reminders.due">
                  {{ selected.reminders.due ? 'À faire maintenant' : formatDate(selected.reminders.nextReevaluationDate) }}
                </dd>
              </div>
            </dl>
          </div>

          <div class="coach" *ngIf="selected.latestRecord?.recommendations?.length">
            <mat-icon>tips_and_updates</mat-icon>
            <div class="coach-body">
              <span class="fb-eyebrow">Le conseil FamilyBalance</span>
              <p>{{ selected.latestRecord!.recommendations[0] }}</p>
              <details *ngIf="selected.latestRecord!.recommendations.length > 1">
                <summary>Voir {{ selected.latestRecord!.recommendations.length - 1 }} conseil(s) de plus</summary>
                <ul>
                  <li *ngFor="let tip of selected.latestRecord!.recommendations.slice(1)">{{ tip }}</li>
                </ul>
              </details>
            </div>
          </div>

          <div class="fb-card" *ngIf="selected.history.length; else noHistoryTpl">
            <div class="chart-toolbar">
              <h3 class="section-title">Évolution des scores</h3>
              <div class="segmented" role="group" aria-label="Période">
                <button
                  type="button"
                  *ngFor="let option of rangeOptions"
                  [class.active]="selectedRange() === option.id"
                  [attr.aria-pressed]="selectedRange() === option.id"
                  (click)="setRange(option.id)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
            <div class="chart-box"><canvas #trendCanvas aria-label="Évolution du score global et des sous-scores"></canvas></div>
          </div>
          <ng-template #noHistoryTpl>
            <div class="fb-card">
              <app-empty-state
                icon="show_chart"
                title="Pas encore de score"
                message="Lancez un premier questionnaire pour suivre l'évolution de cet enfant dans le temps."
              ></app-empty-state>
            </div>
          </ng-template>

          <div class="two-col">
            <div class="fb-card">
              <h3 class="section-title">Notifications</h3>
              <ul class="feed">
                <li class="notice warn" *ngIf="selected.reminders.due">
                  <mat-icon>event_repeat</mat-icon>
                  <div><strong>Réévaluation due</strong><p>La réévaluation est due aujourd'hui. Vérifiez le score et planifiez une nouvelle analyse.</p></div>
                </li>
                <li class="notice" *ngIf="!selected.reminders.due">
                  <mat-icon>event</mat-icon>
                  <div>
                    <strong>Prochaine réévaluation</strong>
                    <p>Prévue le {{ formatDate(selected.reminders.nextReevaluationDate) }} (dans {{ selected.reminders.daysRemaining }} jours).</p>
                  </div>
                </li>
                <li class="notice danger" *ngFor="let alert of selected.openAlerts">
                  <mat-icon>report</mat-icon>
                  <div><strong>Alerte clinique</strong><p>{{ alert.message }}</p></div>
                </li>
              </ul>
            </div>

            <div class="fb-card">
              <h3 class="section-title">Dernières activités</h3>
              <ul class="feed" *ngIf="selected.history.length; else noActivity">
                <li class="activity" *ngFor="let h of selected.history.slice(-6).reverse()">
                  <mat-icon>history</mat-icon>
                  <div><strong>Score calculé : {{ h.globalScore | number:'1.0-0' }}/100</strong><p>{{ formatDate(h.calculatedAt) }}</p></div>
                </li>
              </ul>
              <ng-template #noActivity><p class="muted">Aucune activité récente.</p></ng-template>
            </div>
          </div>
        </section>
      </div>
    </ng-container>
  `,
  styles: [
    `
      :host { display: block; }
      .block { margin-bottom: 20px; }
      .kpi-row { display: grid; gap: 16px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 24px; }
      .layout { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 24px; align-items: start; }
      .section-title { margin: 0; font-size: 17px; font-weight: 700; }
      .muted { margin: 12px 0 0; color: var(--fb-muted); font-size: 14px; }

      /* Liste des enfants */
      .children { position: sticky; top: 92px; padding: 18px; }
      .children .section-title { margin: 2px 4px 12px; }
      .child-list { display: grid; gap: 6px; max-height: 560px; overflow: auto; }
      .child {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 12px;
        align-items: center;
        padding: 10px;
        border: 1.5px solid transparent;
        border-radius: 16px;
        background: transparent;
        color: var(--fb-text);
        text-align: left;
        cursor: pointer;
      }
      .child:hover { background: var(--fb-surface-alt); }
      .child.active { border-color: rgba(var(--fb-primary-rgb), 0.35); background: var(--fb-primary-soft); }
      .avatar {
        display: grid;
        place-items: center;
        width: 46px;
        height: 46px;
        overflow: hidden;
        border-radius: 15px;
        background: var(--fb-accent-soft);
        color: var(--fb-accent-strong);
        font-weight: 700;
      }
      .avatar img { width: 100%; height: 100%; object-fit: cover; }
      .child-main { display: flex; flex-direction: column; min-width: 0; }
      .child-main strong { font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .child-main small { color: var(--fb-muted); font-size: 13px; }
      .score {
        min-width: 46px;
        padding: 6px 10px;
        border-radius: var(--fb-radius-pill);
        background: var(--fb-surface-alt);
        color: var(--fb-text-mid);
        font-weight: 700;
        font-size: 14px;
        text-align: center;
      }
      .score.low { background: rgba(var(--fb-danger-rgb), 0.08); color: var(--fb-danger); }
      .score.medium { background: var(--fb-accent-soft); color: var(--fb-warning-ink); }
      .score.high { background: rgba(var(--fb-success-rgb), 0.1); color: var(--fb-success-ink); }

      /* Détail */
      .detail { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
      .detail-head { display: grid; gap: 18px; }
      .detail-id h2 { margin: 0; font-size: 1.6rem; }
      .detail-id p { margin: 4px 0 0; color: var(--fb-text-mid); overflow-wrap: anywhere; }
      .detail-actions { display: flex; flex-wrap: wrap; gap: 10px; }
      .facts {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin: 0;
        border-radius: 16px;
        background: var(--fb-surface-alt);
      }
      .facts div { padding: 14px 16px; }
      .facts div + div { border-left: 1px solid var(--fb-border); }
      .facts dt { font-size: 12.5px; color: var(--fb-muted); }
      .facts dd { margin: 4px 0 0; font-family: var(--fb-font-serif); font-size: 1.25rem; font-weight: 650; }
      .facts dd.due { color: var(--fb-accent-strong); }

      .coach {
        display: flex;
        gap: 14px;
        padding: 20px 22px;
        border-radius: var(--fb-radius-md);
        background: var(--fb-ink);
        color: var(--fb-on-ink);
      }
      .coach > mat-icon { flex-shrink: 0; color: var(--fb-accent); }
      .coach-body { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
      .coach .fb-eyebrow { color: var(--fb-accent-hover); }
      .coach p { margin: 0; font-size: 15.5px; line-height: 1.55; color: #fff; }
      .coach details { font-size: 14px; color: var(--fb-on-ink-mid); }
      .coach summary { cursor: pointer; font-weight: 700; color: var(--fb-accent-hover); }
      .coach ul { display: grid; gap: 6px; margin: 8px 0 0; padding-left: 18px; }

      .chart-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
      .segmented { display: inline-flex; padding: 4px; border-radius: var(--fb-radius-pill); background: var(--fb-surface-alt); }
      .segmented button {
        padding: 6px 14px;
        border: none;
        border-radius: var(--fb-radius-pill);
        background: transparent;
        color: var(--fb-text-mid);
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
      }
      .segmented button.active { background: var(--fb-surface); color: var(--fb-text); box-shadow: var(--fb-elev-1); }
      .chart-box { position: relative; height: 300px; }

      .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .feed { display: grid; gap: 10px; margin: 14px 0 0; padding: 0; list-style: none; }
      .feed li { display: flex; gap: 12px; align-items: flex-start; }
      .feed mat-icon {
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        padding: 8px;
        font-size: 20px;
        border-radius: 12px;
        background: var(--fb-surface-alt);
        color: var(--fb-text-mid);
      }
      .feed strong { display: block; font-size: 14.5px; }
      .feed p { margin: 2px 0 0; color: var(--fb-text-mid); font-size: 13.5px; line-height: 1.45; }
      .notice.warn mat-icon { background: var(--fb-accent-soft); color: var(--fb-accent-strong); }
      .notice.danger mat-icon { background: rgba(var(--fb-danger-rgb), 0.08); color: var(--fb-danger); }

      @media (max-width: 1280px) {
        .two-col { grid-template-columns: minmax(0, 1fr); }
      }
      @media (max-width: 1024px) {
        .layout { grid-template-columns: minmax(0, 1fr); }
        .children { position: static; }
      }
      @media (max-width: 768px) {
        .kpi-row { grid-template-columns: 1fr; }
        .facts { grid-template-columns: 1fr; }
        .facts div + div { border-left: none; border-top: 1px solid var(--fb-border); }
        .detail-actions .fb-btn { flex: 1 1 100%; }
        .chart-box { height: 240px; }
      }
    `,
  ],
})
export class FamilyDashboardPage implements AfterViewInit {
  trendCanvas?: ElementRef<HTMLCanvasElement>;

  /**
   * Le canvas n'existe qu'une fois les données chargées (*ngIf) : on dessine le
   * graphique dès qu'il apparaît, sinon le premier rendu (ngAfterViewInit /
   * microtâche) passait avant sa création et le graphique restait vide.
   */
  @ViewChild('trendCanvas')
  set trendCanvasRef(ref: ElementRef<HTMLCanvasElement> | undefined) {
    const appeared = !!ref && ref !== this.trendCanvas;
    this.trendCanvas = ref;
    if (appeared) {
      queueMicrotask(() => this.renderChart());
    }
  }

  readonly overview = signal<FamilyDashboardOverviewResponse | null>(null);
  readonly selectedChild = signal<FamilyDashboardChild['child'] | null>(null);
  readonly selectedChildData = signal<FamilyDashboardChild | null>(null);
  readonly selectedRange = signal<'all' | '30' | '90' | '365'>('all');
  readonly errorMessage = signal('');
  readonly pdfDownloading = signal(false);

  readonly rangeOptions = [
    { id: 'all', label: 'Toutes' },
    { id: '30', label: '30 jours' },
    { id: '90', label: '3 mois' },
    { id: '365', label: '12 mois' },
  ] as const;

  private chartInstance: any = null;

  constructor(
    private readonly familyService: FamilyDashboardService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly childContext: ChildContextService
  ) {
    this.loadOverview();
  }

  startSurveyForChild(child: { _id: string; firstName: string; birthDate?: string | null }): void {
    this.childContext.setChild(child._id, child.firstName, child.birthDate || null);
    this.router.navigateByUrl('/survey/dynamic');
  }

  viewDetailedScore(child: { _id: string; firstName: string; birthDate?: string | null }): void {
    this.childContext.setChild(child._id, child.firstName, child.birthDate || null);
    this.router.navigateByUrl('/scoring/results');
  }

  ngAfterViewInit(): void {
    this.renderChart();
  }

  loadOverview(): void {
    this.errorMessage.set('');

    this.authService.me().subscribe({
      next: (meResponse) => {
        if (meResponse.user.role !== 'parent') {
          this.errorMessage.set('Ce dashboard est réservé aux comptes parent.');
          return;
        }

        this.familyService.getOverview().subscribe({
          next: (response) => {
            this.overview.set(response);
            if (response.children.length) {
              this.selectChild(response.children[0]);
            }
          },
          error: (error) => {
            this.errorMessage.set(error?.error?.message || 'Impossible de charger le dashboard famille.');
          },
        });
      },
      error: () => {
        this.errorMessage.set('Session invalide. Veuillez vous reconnecter.');
      },
    });
  }

  /** Moyenne des derniers scores ; null tant qu'aucun enfant n'a de score (affiché « — », pas « 0 »). */
  computeAverageScore(data: FamilyDashboardOverviewResponse): number | null {
    if (!data || !data.children || !data.children.length) return null;
    const values = data.children
      .map((c) => (c.latestRecord ? c.latestRecord.globalScore : null))
      .filter((v): v is number => v !== null && v !== undefined);
    if (!values.length) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round(sum / values.length);
  }

  selectChild(item: FamilyDashboardChild): void {
    this.selectedChild.set(item.child);
    this.selectedChildData.set(item);
    this.selectedRange.set('all');
    queueMicrotask(() => this.renderChart());
  }

  setRange(range: 'all' | '30' | '90' | '365'): void {
    this.selectedRange.set(range);
    queueMicrotask(() => this.renderChart());
  }

  private filterHistory(history: FamilyDashboardChild['history']): FamilyDashboardChild['history'] {
    const range = this.selectedRange();
    if (range === 'all') return history;

    const days = Number(range);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return history.filter((item) => new Date(item.calculatedAt) >= cutoff);
  }

  async renderChart(): Promise<void> {
    const canvas = this.trendCanvas?.nativeElement;
    const selected = this.selectedChildData();

    if (!canvas || !selected || !selected.history.length) {
      if (this.chartInstance) {
        this.chartInstance.destroy();
        this.chartInstance = null;
      }
      return;
    }

    const chartJs: ChartModule = await import('chart.js/auto');
    const Chart = chartJs.default;

    const history = [...this.filterHistory(selected.history)].sort(
      (a, b) => new Date(a.calculatedAt).getTime() - new Date(b.calculatedAt).getTime()
    );

    const labels = history.map((item) => this.formatDate(item.calculatedAt));

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    this.chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Global', data: history.map((p) => p.globalScore) },
          { label: 'Comportemental', data: history.map((p) => p.subScores.comportemental) },
          { label: 'Émotionnel', data: history.map((p) => p.subScores.emotionnel) },
          { label: 'Social', data: history.map((p) => p.subScores.social) },
          { label: 'Parental', data: history.map((p) => p.subScores.parental) },
        ].map((dataset, index) => ({
          ...dataset,
          borderColor: CHART_SERIES[index],
          backgroundColor: CHART_SERIES[index],
          borderWidth: index === 0 ? 3 : 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.3,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, boxWidth: 8, color: CHART_INK.text, font: { family: CHART_INK.font, size: 12 } },
          },
          tooltip: { backgroundColor: '#0e1726', padding: 10, cornerRadius: 8, usePointStyle: true },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: CHART_INK.text, font: { family: CHART_INK.font } } },
          y: {
            min: 0,
            max: 100,
            border: { display: false },
            grid: { color: CHART_INK.grid },
            ticks: { stepSize: 25, color: CHART_INK.text, font: { family: CHART_INK.font } },
          },
        },
      },
    });
  }

  downloadPdf(childId: string): void {
    this.pdfDownloading.set(true);
    this.familyService.downloadChildPdf(childId).subscribe({
      next: (blob) => {
        this.pdfDownloading.set(false);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bilan-enfant-${childId}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.pdfDownloading.set(false);
        this.errorMessage.set('Impossible d\'exporter le PDF pour cet enfant.');
      },
    });
  }

  riskCategoryLabel(category?: string): string {
    const labels: { [key: string]: string } = {
      'equilibre-sain': 'Équilibre sain',
      'vigilance-legere': 'Vigilance légère',
      'risque-modere': 'Risque modéré',
      'risque-eleve': 'Risque élevé',
    };
    return category ? labels[category] || category : '—';
  }

  formatDate(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('fr-FR');
  }

}
