import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AdolescentDashboardService, AdolescentDashboard } from '../services/adolescent-dashboard.service';
import { EducationResource } from '../../education/models/education.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent, StatCardTone } from '../../../shared/components/stat-card/stat-card.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-adolescent-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatSnackBarModule,
    PageHeaderComponent,
    StatCardComponent,
    EmptyStateComponent,
  ],
  templateUrl: './adolescent-dashboard.page.html',
  styleUrls: ['./adolescent-dashboard.page.css'],
})
export class AdolescentDashboardPage implements OnInit {
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly dashboard = signal<AdolescentDashboard | null>(null);
  readonly resources = signal<EducationResource[]>([]);
  readonly ageGroup = signal<string | null>(null);

  constructor(
    private adolescentDashboardService: AdolescentDashboardService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.loadResources();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.adolescentDashboardService.getDashboard().subscribe({
      next: (response) => {
        this.dashboard.set(response);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        const errorMsg = error?.error?.message || 'Impossible de charger le dashboard';
        this.errorMessage.set(errorMsg);
        this.snackBar.open(errorMsg, 'Fermer', { duration: 5000 });
      },
    });
  }

  loadResources(): void {
    this.adolescentDashboardService.getResources().subscribe({
      next: (response) => {
        this.resources.set(response.resources);
        this.ageGroup.set(response.ageGroup);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des ressources:', error);
      },
    });
  }

  private riskKey(): string {
    return this.dashboard()?.stats?.riskLevel?.toLowerCase() || '';
  }

  /** Ton de la carte « niveau » : couleurs d'état réservées, toujours accompagnées d'un libellé et d'une icône. */
  riskTone(): StatCardTone {
    const tones: Record<string, StatCardTone> = {
      'equilibre-sain': 'success',
      'vigilance-legere': 'warning',
      'risque-modere': 'warning',
      'risque-eleve': 'danger',
    };
    return tones[this.riskKey()] || 'neutral';
  }

  riskIcon(): string {
    const icons: Record<string, string> = {
      'equilibre-sain': 'check_circle',
      'vigilance-legere': 'info',
      'risque-modere': 'warning',
      'risque-eleve': 'warning',
    };
    return icons[this.riskKey()] || 'help_outline';
  }

  getRiskLevelLabel(): string {
    const labels: { [key: string]: string } = {
      'equilibre-sain': 'Équilibre sain',
      'vigilance-legere': 'Vigilance légère',
      'risque-modere': 'Risque modéré',
      'risque-eleve': 'Risque élevé',
      'non-evaluée': 'Non évaluée',
    };
    return labels[this.riskKey()] || 'Non évaluée';
  }

  /** Un score élevé = meilleur équilibre (seuils identiques au tableau de bord famille). */
  scoreTone(score: number): 'high' | 'medium' | 'low' {
    if (score >= 75) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  goToSurvey(): void {
    this.router.navigate(['/survey/dynamic']);
  }

  goToScoring(): void {
    this.router.navigate(['/scoring/results']);
  }

  goToResources(): void {
    this.router.navigate(['/education/resources']);
  }

  viewResource(resource: EducationResource): void {
    if (resource.contentUrl) {
      window.open(resource.contentUrl, '_blank', 'noopener');
      return;
    }
    this.snackBar.open('Cette ressource ne contient pas encore de contenu.', 'Fermer', { duration: 3000 });
  }

  contactParent(): void {
    const email = this.dashboard()?.parent?.email;
    if (!email) {
      this.snackBar.open("Adresse e-mail du parent indisponible.", 'Fermer', { duration: 3000 });
      return;
    }
    window.location.href = `mailto:${email}`;
  }
}
