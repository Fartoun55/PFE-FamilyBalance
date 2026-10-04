import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FamilyDashboardService } from '../../../core/services/family-dashboard.service';
import {
  FamilyDashboardChild,
  FamilyDashboardOverviewResponse,
} from '../models/family-dashboard.models';
import { AuthService } from '../../../core/services/auth.service';
import { ChildContextService } from '../../../core/services/child-context.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';

type ChartModule = typeof import('chart.js/auto');

@Component({
  selector: 'app-family-dashboard-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, MatListModule, MatDividerModule, MatProgressBarModule, StatCardComponent],
  template: `
    <section class="family-shell">
      <header class="hero">
        <div>
          <p class="eyebrow">Dashboard Famille</p>
          <h1>Suivi des profils enfants</h1>
          <p>Vue globale, évolution des scores et rappels de réévaluation tous les 3 mois.</p>
        </div>
      </header>

      <p class="error" *ngIf="errorMessage()">{{ errorMessage() }}</p>

      <div class="kpi-row" *ngIf="overview() as data">
        <app-stat-card icon="people" label="Enfants rattachés" [value]="data.totalChildren" tone="primary"></app-stat-card>
        <app-stat-card icon="timer" label="Rappels en attente" [value]="data.dueReminders" tone="warning"></app-stat-card>
        <app-stat-card icon="insights" label="Score moyen" [value]="(computeAverageScore(data) | number:'1.0-0') + '/100'" tone="accent"></app-stat-card>
      </div>

      <div class="layout" *ngIf="overview() as data">
        <aside class="children-list">
          <div class="children-header">
            <h2>Profils enfants</h2>
            <button mat-icon-button aria-label="Ajouter enfant" (click)="goAddAdolescent()"><mat-icon>person_add</mat-icon></button>
          </div>
          <div class="child-scroll">
            <button
              type="button"
              class="child-card"
              *ngFor="let item of data.children"
              [class.active]="selectedChild()?._id === item.child._id"
              (click)="selectChild(item)"
            >
              <div class="avatar">
                <img *ngIf="item.child.avatarUrl; else initialsTpl" [src]="item.child.avatarUrl" [alt]="item.child.firstName + ' ' + item.child.lastName" />
                <ng-template #initialsTpl><div class="initials">{{ item.child.firstName.charAt(0) }}{{ item.child.lastName.charAt(0) }}</div></ng-template>
              </div>
              <div class="child-main">
                <strong>{{ item.child.firstName }} {{ item.child.lastName }}</strong>
                <p class="muted">{{ formatDate(item.child.birthDate) }}</p>
              </div>
              <div
                class="score-badge"
                [class.low]="item.latestRecord && item.latestRecord.globalScore < 50"
                [class.medium]="item.latestRecord && item.latestRecord.globalScore >=50 && item.latestRecord.globalScore < 75"
                [class.high]="item.latestRecord && item.latestRecord.globalScore >= 75"
                [attr.aria-label]="item.latestRecord ? 'Score ' + (item.latestRecord.globalScore | number:'1.0-0') + ' sur 100, ' + riskCategoryLabel(item.latestRecord.riskCategory) : 'Score non disponible'"
              >
                {{ item.latestRecord ? (item.latestRecord.globalScore | number:'1.0-0') : '-' }}
              </div>
            </button>
          </div>
        </aside>

        <section class="content" *ngIf="selectedChildData() as selected">
          <div class="content-head">
            <div>
              <h2>{{ selected.child.firstName }} {{ selected.child.lastName }}</h2>
              <p>{{ selected.child.email }} · Naissance: {{ formatDate(selected.child.birthDate) }}</p>
            </div>
            <div class="content-head-actions">
              <button mat-stroked-button color="primary" type="button" (click)="startSurveyForChild(selected.child)">
                <mat-icon>quiz</mat-icon>
                Démarrer le questionnaire
              </button>
              <button mat-stroked-button color="primary" type="button" (click)="viewDetailedScore(selected.child)">
                <mat-icon>insights</mat-icon>
                Score détaillé
              </button>
              <button mat-flat-button color="primary" type="button" [disabled]="pdfDownloading()" (click)="downloadPdf(selected.child._id)">
                {{ pdfDownloading() ? 'Export en cours...' : 'Export PDF' }}
              </button>
            </div>
          </div>

          <div class="kpis">
            <article>
              <span>Dernier score global</span>
              <strong>{{ selected.latestRecord?.globalScore !== null && selected.latestRecord ? (selected.latestRecord.globalScore | number:'1.0-0') : '-' }}</strong>
            </article>
            <article>
              <span>Risque</span>
              <strong>{{ riskCategoryLabel(selected.latestRecord?.riskCategory) }}</strong>
            </article>
            <article>
              <span>Réévaluation</span>
              <strong>{{ selected.reminders.due ? 'À faire maintenant' : formatDate(selected.reminders.nextReevaluationDate) }}</strong>
            </article>
          </div>

          <div class="coach-card" *ngIf="selected.latestRecord?.recommendations?.length">
            <div class="coach-icon">
              <mat-icon>tips_and_updates</mat-icon>
            </div>
            <div class="coach-body">
              <span class="coach-eyebrow">Conseil de votre coach FamilyBalance</span>
              <p>{{ selected.latestRecord!.recommendations[0] }}</p>
              <details class="coach-more" *ngIf="selected.latestRecord!.recommendations.length > 1">
                <summary>Voir {{ selected.latestRecord!.recommendations.length - 1 }} conseil(s) de plus</summary>
                <ul>
                  <li *ngFor="let tip of selected.latestRecord!.recommendations.slice(1)">{{ tip }}</li>
                </ul>
              </details>
            </div>
          </div>

          <div class="chart-card" *ngIf="selected.history.length; else noHistoryTpl">
            <div class="chart-toolbar">
              <h3>Évolution des scores</h3>
              <div class="range-buttons">
                <button type="button" class="range-btn" [class.active]="selectedRange() === 'all'" (click)="setRange('all')">Toutes</button>
                <button type="button" class="range-btn" [class.active]="selectedRange() === '30'" (click)="setRange('30')">30 jours</button>
                <button type="button" class="range-btn" [class.active]="selectedRange() === '90'" (click)="setRange('90')">3 mois</button>
                <button type="button" class="range-btn" [class.active]="selectedRange() === '365'" (click)="setRange('365')">12 mois</button>
              </div>
            </div>
            <canvas #trendCanvas></canvas>
          </div>
          <ng-template #noHistoryTpl>
            <div class="chart-card empty">Aucun historique de score disponible pour cet enfant.</div>
          </ng-template>

          <div class="right-column">
            <div class="notifications">
              <h3>Centre de notifications</h3>
              <div class="notification" *ngIf="selected.reminders.due">
                <strong>Réévaluation due</strong>
                <p>La réévaluation de l’enfant est due aujourd’hui. Vérifiez le score et planifiez une nouvelle analyse.</p>
              </div>
              <div class="notification" *ngIf="!selected.reminders.due">
                <strong>Prochaine réévaluation</strong>
                <p>Prévue le {{ formatDate(selected.reminders.nextReevaluationDate) }} (dans {{ selected.reminders.daysRemaining }} jours).</p>
              </div>
              <div class="notification" *ngFor="let alert of selected.openAlerts">
                <strong>Alarme clinique</strong>
                <p>{{ alert.message }}</p>
              </div>
              <p class="notification empty" *ngIf="!selected.reminders.due && !selected.openAlerts.length">Aucune notification active pour le moment.</p>
            </div>

            <mat-card class="activity-card">
              <h3>Dernières activités</h3>
              <mat-divider></mat-divider>
              <mat-list>
                <mat-list-item *ngFor="let h of (selected.history || []).slice(-6).reverse()">
                  <mat-icon matListIcon>history</mat-icon>
                  <div matLine>Score calculé: {{ h.globalScore | number:'1.0-0' }}</div>
                  <div matLine class="muted small">{{ formatDate(h.calculatedAt) }}</div>
                </mat-list-item>
                <div *ngIf="!(selected.history && selected.history.length)" class="muted">Aucune activité récente.</div>
              </mat-list>
            </mat-card>
          </div>
        </section>
      </div>
    </section>
  `,
  styles: [
    `
      :host { display: block; background: var(--fb-bg); color: var(--fb-text); }
      .family-shell { max-width: 1240px; margin: 0 auto; padding: 1.5rem 1rem 2.5rem; display: grid; gap: 1.5rem; }
      .hero { display: flex; justify-content: space-between; gap: 1rem; align-items: center; border-radius: 24px; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 400'%3E%3Ccircle cx='700' cy='70' r='120' fill='none' stroke='rgba(255,255,255,0.20)' stroke-width='2'/%3E%3Ccircle cx='630' cy='330' r='60' fill='rgba(255,255,255,0.14)'/%3E%3Ccircle cx='50' cy='50' r='34' fill='rgba(255,255,255,0.11)'/%3E%3Cpath d='M-20,250 C140,190 260,310 420,250 C580,190 700,310 860,250' fill='none' stroke='rgba(255,255,255,0.22)' stroke-width='3'/%3E%3Cpath d='M-20,300 C140,250 260,350 420,300 C580,250 700,350 860,300' fill='none' stroke='rgba(255,255,255,0.14)' stroke-width='3'/%3E%3C/svg%3E") center/cover no-repeat, linear-gradient(135deg, var(--fb-primary-strong) 0%, var(--fb-primary) 100%); padding: 1.8rem 2rem; color: #fff; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12); }
      .hero .eyebrow { margin: 0 0 0.75rem; color: rgba(255, 255, 255, 0.8); font-size: 0.88rem; text-transform: uppercase; letter-spacing: 0.14em; }
      .hero h1 { margin: 0; font-size: clamp(2rem, 3vw, 2.8rem); line-height: 1.05; }
      .hero p { margin: 0.75rem 0 0; color: rgba(255, 255, 255, 0.85); max-width: 720px; }
      .error { color: var(--fb-danger); margin: 0; padding: 0.75rem 1rem; border: 1px solid rgba(192,57,43,.3); border-radius: 14px; background: rgba(192,57,43,.06); }
      .kpi-row { display: grid; gap: 1rem; grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .layout { display: grid; grid-template-columns: 360px 1fr; gap: 1.25rem; }
      .children-list { border-radius: 24px; background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%); padding: 1rem; border: 1px solid rgba(148, 163, 184, 0.14); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7); }
      .children-header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 0.75rem; }
      .children-header h2 { margin:0; font-size: 1.05rem; }
      .child-scroll { display:grid; gap: 0.75rem; max-height: 620px; overflow:auto; padding-right: 0.25rem; }
      .child-card { text-align: left; border: 1px solid transparent; background: #f8fbff; border-radius: 16px; padding: 0.9rem; display: grid; grid-template-columns: auto 1fr auto; gap: 0.8rem; align-items: center; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
      .child-card:hover { transform: translateY(-1px); box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06); }
      .child-card.active { border-color: var(--fb-primary); background: var(--fb-primary-soft); }
      .avatar { width: 54px; height: 54px; border-radius: 18px; overflow:hidden; display:flex; align-items:center; justify-content:center; background:var(--fb-primary-soft); margin-right:0; }
      .avatar img { width:100%; height:100%; object-fit:cover; }
      .initials { font-weight:700; color:var(--fb-primary); font-size:1rem; }
      .child-main { display:flex; flex-direction:column; gap: 0.2rem; }
      .child-main strong { font-size: 1rem; color: var(--fb-text); }
      .child-main .muted { margin:0; color:var(--fb-muted); font-size:0.9rem; }
      .score-badge { min-width: 62px; text-align:center; padding:0.5rem 0.7rem; border-radius: 999px; font-weight:700; font-size:0.95rem; color:var(--fb-text); }
      .score-badge.low { background:rgba(192,57,43,.12); color:var(--fb-danger); }
      .score-badge.medium { background:rgba(183,121,31,.15); color:var(--fb-warning); }
      .score-badge.high { background:rgba(21,127,69,.14); color:var(--fb-success); }
      .content { border-radius: 24px; background: #ffffff; padding: 1.25rem; border: 1px solid rgba(148, 163, 184, 0.14); box-shadow: 0 18px 36px rgba(15, 23, 42, 0.06); display: grid; gap: 1.25rem; }
      .content-head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; flex-wrap: wrap; }
      .content-head-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
      .content-head h2 { margin: 0; font-size: 1.5rem; }
      .content-head p { margin: 0.35rem 0 0; color: var(--fb-muted); }
      .kpis { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 1rem; }
      .kpis article { border-radius: 18px; background: var(--fb-bg); padding: 1rem; display: grid; gap: 0.5rem; border: 1px solid rgba(148, 163, 184, 0.12); }
      .kpis span { color: var(--fb-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.12em; }
      .kpis strong { font-size: 1.5rem; color: var(--fb-text); }
      .coach-card { display: flex; gap: 1rem; align-items: flex-start; border-radius: 20px; background: linear-gradient(135deg, rgba(var(--fb-accent-rgb),.1), rgba(var(--fb-primary-rgb),.06)); border: 1px solid rgba(var(--fb-accent-rgb),.22); padding: 1.1rem 1.3rem; }
      .coach-icon { width: 42px; height: 42px; border-radius: 14px; background: #fff; display: grid; place-items: center; flex-shrink: 0; box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08); }
      .coach-icon mat-icon { color: var(--fb-accent-strong); }
      .coach-body { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
      .coach-eyebrow { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--fb-accent-strong); }
      .coach-body p { margin: 0; color: var(--fb-text); font-weight: 600; line-height: 1.5; }
      .coach-more { font-size: 0.85rem; color: var(--fb-muted); }
      .coach-more summary { cursor: pointer; color: var(--fb-primary); font-weight: 600; }
      .coach-more ul { margin: 0.5rem 0 0; padding-left: 1.1rem; display: grid; gap: 0.35rem; }
      .chart-card { border-radius: 24px; background: #ffffff; padding: 1.2rem; border: 1px solid rgba(148, 163, 184, 0.14); box-shadow: 0 16px 32px rgba(15, 23, 42, 0.06); }
      .chart-card h3 { margin: 0 0 1rem; font-size: 1.1rem; }
      .chart-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
      .range-buttons { display: flex; flex-wrap: wrap; gap: 0.5rem; }
      .range-btn { border: 1px solid rgba(var(--fb-primary-rgb), 0.18); background: var(--fb-primary-soft); color: var(--fb-primary); border-radius: 999px; padding: 0.55rem 0.95rem; cursor: pointer; transition: background 0.15s ease, color 0.15s ease; }
      .range-btn.active { background: var(--fb-primary); color: #ffffff; border-color: var(--fb-primary); }
      .right-column { display: grid; gap: 1rem; }
      .activity-card { border-radius: 24px; background: #ffffff; border: 1px solid rgba(148, 163, 184, 0.14); box-shadow: 0 16px 32px rgba(15, 23, 42, 0.06); padding: 1rem; }
      .activity-card h3 { margin: 0 0 0.75rem; }
      .notifications { border-radius: 24px; background: linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%); padding: 1rem; border: 1px solid rgba(102, 211, 153, 0.22); display: grid; gap: 1rem; }
      .notifications h3 { margin: 0; font-size: 1rem; }
      .notification { border-radius: 18px; background: #ffffff; border: 1px solid rgba(134, 239, 172, 0.35); padding: 0.95rem 1rem; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05); }
      .notification.empty { background: transparent; border: none; box-shadow: none; color: var(--fb-muted); }
      .notification strong { display: block; margin-bottom: 0.4rem; color: var(--fb-text); }
      .notification p { margin: 0; color: var(--fb-muted); }
      mat-list-item { border-radius: 16px; margin-bottom: 0.45rem; }
      mat-list-item:last-child { margin-bottom: 0; }
      mat-divider { margin: 1rem 0; }
      @media (max-width: 1024px) {
        .kpi-row { grid-template-columns: 1fr; }
        .layout { grid-template-columns: 1fr; }
        .kpis { grid-template-columns: 1fr; }
      }
      @media (max-width: 768px) {
        .hero { flex-direction: column; text-align: center; }
        .content-head { flex-direction: column; align-items: stretch; }
        .child-card { grid-template-columns: 1fr; align-items: start; }
        .children-list { padding: 0.85rem; }
      }
    `,
  ],
})
export class FamilyDashboardPage implements AfterViewInit {
  @ViewChild('trendCanvas') trendCanvas?: ElementRef<HTMLCanvasElement>;

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

  goAddAdolescent(): void {
    this.router.navigateByUrl('/family/add-adolescent');
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

  computeAverageScore(data: FamilyDashboardOverviewResponse): number {
    if (!data || !data.children || !data.children.length) return 0;
    const values = data.children
      .map((c) => (c.latestRecord ? c.latestRecord.globalScore : null))
      .filter((v): v is number => v !== null && v !== undefined);
    if (!values.length) return 0;
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
          { label: 'Global', data: history.map((p) => p.globalScore), borderColor: '#0d7a6f', tension: 0.3 },
          { label: 'Comportemental', data: history.map((p) => p.subScores.comportemental), borderColor: '#ef4444', tension: 0.3 },
          { label: 'Emotionnel', data: history.map((p) => p.subScores.emotionnel), borderColor: '#8b5cf6', tension: 0.3 },
          { label: 'Social', data: history.map((p) => p.subScores.social), borderColor: '#0ea5e9', tension: 0.3 },
          { label: 'Parental', data: history.map((p) => p.subScores.parental), borderColor: '#16a34a', tension: 0.3 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: { min: 0, max: 100 },
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
    return category ? labels[category] || category : '-';
  }

  formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('fr-FR');
  }

}
