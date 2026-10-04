import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { AdolescentDashboardService, AdolescentDashboard } from '../services/adolescent-dashboard.service';
import { EducationResource } from '../../education/models/education.models';

@Component({
  selector: 'app-adolescent-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTabsModule,
    MatSnackBarModule,
    MatTooltipModule,
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

  getRiskLevelColor(): string {
    const riskLevel = this.dashboard()?.stats?.riskLevel?.toLowerCase() || '';
    const colors: { [key: string]: string } = {
      'equilibre-sain': '#157f45',
      'vigilance-legere': '#b7791f',
      'risque-modere': '#c9622f',
      'risque-eleve': '#c0392b',
      'non-evaluée': '#a89f92',
    };
    return colors[riskLevel] || '#a89f92';
  }

  getRiskLevelLabel(): string {
    const labels: { [key: string]: string } = {
      'equilibre-sain': 'Équilibre sain',
      'vigilance-legere': 'Vigilance légère',
      'risque-modere': 'Risque modéré',
      'risque-eleve': 'Risque élevé',
      'non-evaluée': 'Non évaluée',
    };
    return labels[this.dashboard()?.stats?.riskLevel?.toLowerCase() || ''] || 'Non évaluée';
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
