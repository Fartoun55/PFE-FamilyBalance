import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatSidenavModule, MatToolbarModule, MatIconModule, MatListModule, MatButtonModule, MatMenuModule],
  template: `
    <mat-sidenav-container class="shell-container">
      <mat-sidenav #s mode="side" class="shell-sidenav" fixedInViewport="true" opened>
        <div class="brand">
          <svg class="brand-mark" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#c9a15c" stroke-width="4"/>
            <text x="40" y="90" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="80" fill="#1c3a5e">F</text>
            <text x="82" y="90" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="80" fill="#0d7a6f">B</text>
          </svg>
          <div class="brand-name"><span class="brand-name-family">Family</span><span class="brand-name-balance">Balance</span></div>
        </div>
        <mat-nav-list>
          <ng-container *ngIf="isAdmin()">
            <a mat-list-item routerLink="/admin/dashboard" routerLinkActive="active-link"><mat-icon>admin_panel_settings</mat-icon><span>Administration</span></a>
            <a mat-list-item routerLink="/education/resources" routerLinkActive="active-link"><mat-icon>menu_book</mat-icon><span>Ressources éducatives</span></a>
          </ng-container>
          <ng-container *ngIf="isSpecialist()">
            <a mat-list-item routerLink="/teleconsultation" routerLinkActive="active-link"><mat-icon>videocam</mat-icon><span>Spécialistes</span></a>
          </ng-container>
          <ng-container *ngIf="!isAdmin() && !isSpecialist()">
            <a mat-list-item routerLink="/family/dashboard" routerLinkActive="active-link"><mat-icon>dashboard</mat-icon><span>Tableau de bord</span></a>
            <a mat-list-item routerLink="/education/resources" routerLinkActive="active-link"><mat-icon>menu_book</mat-icon><span>Ressources</span></a>
            <a mat-list-item routerLink="/teleconsultation" routerLinkActive="active-link"><mat-icon>videocam</mat-icon><span>Spécialistes</span></a>
            <a mat-list-item routerLink="/survey/dynamic" routerLinkActive="active-link"><mat-icon>quiz</mat-icon><span>Évaluations</span></a>
            <a mat-list-item routerLink="/scoring/results" routerLinkActive="active-link"><mat-icon>bar_chart</mat-icon><span>Scores</span></a>
          </ng-container>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="shell-content">
        <mat-toolbar class="shell-topbar">
          <button mat-icon-button (click)="s.toggle()" class="menu-btn" aria-label="Toggle menu"><mat-icon>menu</mat-icon></button>
          <div class="top-left">
            <span class="toolbar-title"><span class="brand-name-family">Family</span><span class="brand-name-balance">Balance</span></span>
          </div>
          <span class="spacer"></span>
          <button mat-stroked-button class="fb-cta" *ngIf="!isAdmin() && !isSpecialist()" routerLink="/survey/dynamic">Commencer l'évaluation</button>
          <button mat-stroked-button class="home-btn" aria-label="Retour à l'accueil" title="Retour à l'accueil" [routerLink]="homeRoute()">
            <mat-icon>home</mat-icon>
            <span>Accueil</span>
          </button>
          <button mat-icon-button aria-label="Compte" title="Mon compte" [matMenuTriggerFor]="accountMenu">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #accountMenu="matMenu">
            <button mat-menu-item routerLink="/auth/profile">
              <mat-icon>person</mat-icon>
              <span>Mon profil</span>
            </button>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Déconnexion</span>
            </button>
          </mat-menu>
        </mat-toolbar>

        <main class="shell-main">
          <router-outlet></router-outlet>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      .shell-container { height: 100vh; }
      .shell-sidenav { width: 260px; background: var(--fb-surface-strong); border-right: 1px solid var(--fb-border); }
      .shell-sidenav mat-nav-list { padding-top: 0; }
      .shell-sidenav .mat-list-item {
        margin: 8px 12px;
        border-radius: 14px;
        min-height: 52px;
        transition: var(--fb-transition);
      }
      .shell-sidenav .mat-list-item:hover {
        background: var(--fb-primary-soft);
      }
      .shell-sidenav .mat-list-item.active-link {
        background: var(--fb-primary-soft);
      }
      .shell-sidenav .mat-list-item.active-link mat-icon {
        background: var(--fb-primary);
        color: #fff;
      }
      .shell-sidenav .mat-list-item .mat-list-item-content {
        display: flex;
        align-items: center;
        gap: 14px;
        width: 100%;
      }
      .shell-sidenav .mat-list-item mat-icon {
        min-width: 36px;
        min-height: 36px;
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: var(--fb-primary-soft);
        color: var(--fb-primary);
        transition: var(--fb-transition);
      }
      .shell-sidenav .mat-line {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .brand { display: flex; align-items: center; gap: 10px; padding: 1rem; }
      .brand-mark { width: 40px; height: 40px; flex-shrink: 0; }
      .brand-name { font-family: Georgia, 'Times New Roman', serif; font-weight: 700; font-size: 1.15rem; letter-spacing: -0.01em; white-space: nowrap; }
      .brand-name-family { color: #1c3a5e; }
      .brand-name-balance { color: var(--fb-primary); }
      .shell-topbar {
        position: sticky;
        top: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 0 24px;
        min-height: 72px;
        background: #ffffff;
        border-bottom: 1px solid var(--fb-border);
        box-shadow: 0 16px 40px rgba(16, 24, 40, 0.06);
      }
      .toolbar-title { font-family: Georgia, 'Times New Roman', serif; font-weight: 700; margin-left: .5rem; font-size: 1.05rem; }
      .top-left { display: flex; align-items: center; gap: 16px; min-width: 0; }
      /* Sans flex-grow, cet espaceur ne faisait rien : "Accueil" et "Mon compte"
         restaient collés au titre au lieu d'être poussés à droite de la barre. */
      .spacer { flex: 1 1 auto; }
      .fb-cta {
        margin-right: 8px;
        border-radius: var(--fb-radius-pill);
        color: var(--fb-primary);
        background: #fff;
        font-weight: 700;
        border: 1px solid rgba(var(--fb-primary-rgb), 0.18);
        box-shadow: 0 10px 24px rgba(var(--fb-primary-rgb), 0.1);
      }
      .home-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: var(--fb-radius-pill);
        color: var(--fb-text);
        border-color: var(--fb-border-strong);
      }
      .home-btn mat-icon {
        margin: 0;
      }
      /* mat-toolbar avec color="primary" appliquait par défaut un texte/icônes blancs
         (pensé pour un fond coloré) alors que ce topbar a toujours un fond blanc
         personnalisé — d'où l'icône "Mon compte" invisible en blanc sur blanc signalée.
         L'attribut est retiré ci-dessus ; ces règles fixent explicitement une couleur
         sombre et lisible, avec un léger fond au repos pour que le bouton se lise comme
         un vrai contrôle. */
      .shell-topbar button.mat-icon-button {
        color: var(--fb-text) !important;
        background: var(--fb-primary-soft);
      }
      .shell-topbar button.mat-icon-button mat-icon {
        color: var(--fb-text) !important;
      }
      .shell-topbar button.mat-icon-button:hover {
        background: rgba(var(--fb-primary-rgb), 0.14);
        color: var(--fb-primary-strong) !important;
      }
      .shell-topbar button.mat-icon-button:hover mat-icon {
        color: var(--fb-primary-strong) !important;
      }
      .shell-main { padding: 2rem 1.5rem; max-width: 1300px; margin: 0 auto; }
      .menu-btn { display: none; }

      @media (max-width: 1024px) {
        .shell-sidenav { width: 72px; }
        .brand { display: none; }
        .menu-btn { display: inline-flex; }
        .shell-sidenav .mat-list-item span { display: none; }
        .shell-sidenav .mat-list-item { justify-content: center; margin: 8px 8px; }
      }

      @media (max-width: 768px) {
        .shell-main { padding: 1.25rem 1rem; }
        .fb-cta { display: none; }
        /* Espace restreint : le bouton Accueil reste visible et cliquable (icône +
           aria-label/tooltip), seul son libellé texte se replie. */
        .home-btn span { display: none; }
        .home-btn { padding: 0 10px; min-width: 0; }
      }
    `,
  ],
})
export default class ShellLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly isAdmin = computed(() => this.auth.hasRole('admin'));
  protected readonly isSpecialist = computed(() => this.auth.hasRole('specialist'));
  protected readonly homeRoute = computed(() => this.auth.getHomeRoute());

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/auth/login'),
      error: () => {
        this.auth.clearSession();
        this.router.navigateByUrl('/auth/login');
      },
    });
  }
}
