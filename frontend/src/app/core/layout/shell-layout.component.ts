import { Component, DestroyRef, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { filter } from 'rxjs';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth.models';
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component';
import { NotificationService } from '../services/notification.service';
import { NotificationBellComponent } from './notification-bell.component';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

/** Menu principal propre à chaque rôle (les routes restent celles de app.routes.ts). */
const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  parent: [
    { label: 'Tableau de bord', icon: 'space_dashboard', route: '/family/dashboard' },
    { label: 'Évaluations', icon: 'quiz', route: '/survey/dynamic' },
    { label: 'Résultats', icon: 'insights', route: '/scoring/results' },
    { label: 'Ressources', icon: 'menu_book', route: '/education/resources' },
    { label: 'Spécialistes', icon: 'video_call', route: '/teleconsultation' },
  ],
  adolescent: [
    { label: 'Mon espace', icon: 'space_dashboard', route: '/dashboard/adolescent' },
    { label: 'Évaluations', icon: 'quiz', route: '/survey/dynamic' },
    { label: 'Mes résultats', icon: 'insights', route: '/scoring/results' },
    { label: 'Ressources', icon: 'menu_book', route: '/education/resources' },
    { label: 'Spécialistes', icon: 'video_call', route: '/teleconsultation' },
  ],
  specialist: [
    { label: 'Téléconsultation', icon: 'video_call', route: '/teleconsultation' },
    { label: 'Ressources', icon: 'menu_book', route: '/education/resources' },
  ],
  admin: [
    { label: 'Administration', icon: 'admin_panel_settings', route: '/admin/dashboard' },
    { label: 'Spécialistes', icon: 'medical_services', route: '/admin/specialists' },
    { label: 'Ressources', icon: 'menu_book', route: '/education/resources' },
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  parent: 'Parent',
  adolescent: 'Adolescent',
  specialist: 'Spécialiste',
  admin: 'Administrateur',
};

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatSidenavModule, MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule, BrandLogoComponent, NotificationBellComponent],
  template: `
    <mat-sidenav-container class="shell" [hasBackdrop]="isCompact()">
      <mat-sidenav
        #drawer
        class="sidebar"
        [mode]="isCompact() ? 'over' : 'side'"
        [opened]="!isCompact()"
        [fixedInViewport]="true"
      >
        <div class="sidebar-inner">
          <a class="sidebar-brand" [routerLink]="homeRoute()" aria-label="FamilyBalance — accueil">
            <app-brand-logo [size]="34"></app-brand-logo>
          </a>

          <nav class="nav" aria-label="Navigation principale">
            <p class="nav-caption">Menu</p>
            <a
              *ngFor="let item of navItems()"
              class="nav-link"
              [routerLink]="item.route"
              routerLinkActive="active"
              ariaCurrentWhenActive="page"
            >
              <mat-icon>{{ item.icon }}</mat-icon>
              <span>{{ item.label }}</span>
            </a>

            <p class="nav-caption">Compte</p>
            <a class="nav-link" routerLink="/auth/profile" routerLinkActive="active" ariaCurrentWhenActive="page">
              <mat-icon>person</mat-icon>
              <span>Mon profil</span>
            </a>
          </nav>

          <div class="sidebar-foot">
            <div class="help-card" *ngIf="showEvaluationCta()">
              <strong>Faire le point ?</strong>
              <p>Une évaluation courte pour mieux comprendre l'usage des écrans.</p>
              <a class="fb-btn fb-btn--accent fb-btn--sm fb-btn--block" routerLink="/survey/dynamic">
                Commencer
              </a>
            </div>
          </div>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="content">
        <header class="topbar">
          <button
            *ngIf="isCompact()"
            mat-icon-button
            class="icon-btn"
            (click)="drawer.toggle()"
            aria-label="Ouvrir le menu"
          >
            <mat-icon>menu</mat-icon>
          </button>
          <a *ngIf="isCompact()" class="topbar-brand" [routerLink]="homeRoute()" aria-label="FamilyBalance — accueil">
            <app-brand-logo [size]="30" [wordmark]="!isPhone()"></app-brand-logo>
          </a>

          <span class="spacer"></span>

          <a
            *ngIf="showEvaluationCta() && !isPhone()"
            class="fb-btn fb-btn--accent fb-btn--sm"
            routerLink="/survey/dynamic"
          >
            <mat-icon>play_arrow</mat-icon>
            Commencer l'évaluation
          </a>

          <button
            mat-icon-button
            class="icon-btn"
            [routerLink]="homeRoute()"
            aria-label="Retour à l'accueil"
            matTooltip="Accueil"
          >
            <mat-icon>home</mat-icon>
          </button>

          <app-notification-bell></app-notification-bell>

          <button class="account" type="button" [matMenuTriggerFor]="accountMenu" aria-label="Mon compte">
            <span class="account-avatar" aria-hidden="true">{{ initials() }}</span>
            <span class="account-text" *ngIf="!isPhone()">
              <strong>{{ displayName() }}</strong>
              <small>{{ roleLabel() }}</small>
            </span>
            <mat-icon class="account-caret" *ngIf="!isPhone()">expand_more</mat-icon>
          </button>
          <mat-menu #accountMenu="matMenu" xPosition="before">
            <button mat-menu-item routerLink="/auth/profile">
              <mat-icon>person</mat-icon>
              <span>Mon profil</span>
            </button>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Déconnexion</span>
            </button>
          </mat-menu>
        </header>

        <main class="main" id="contenu">
          <router-outlet></router-outlet>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      :host { display: block; }
      .shell { min-height: 100vh; background: var(--fb-bg); }

      /* ── Barre latérale ─────────────────────────────── */
      .sidebar {
        width: 264px;
        border: none;
        border-right: 1px solid var(--fb-border);
        background: var(--fb-surface);
      }
      .sidebar-inner { display: flex; flex-direction: column; height: 100%; padding: 20px 14px; }
      .sidebar-brand { display: inline-flex; padding: 4px 10px 20px; text-decoration: none; }
      .sidebar-brand:hover { text-decoration: none; }

      .nav { display: flex; flex-direction: column; gap: 2px; }
      .nav-caption {
        margin: 18px 12px 6px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--fb-faint);
      }
      .nav-caption:first-child { margin-top: 4px; }
      .nav-link {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 44px;
        padding: 0 12px;
        border-radius: var(--fb-radius-sm);
        color: var(--fb-text-mid);
        font-weight: 600;
        font-size: 14.5px;
        text-decoration: none;
        transition: background-color 0.15s ease, color 0.15s ease;
      }
      .nav-link mat-icon { color: var(--fb-faint); transition: color 0.15s ease; }
      .nav-link:hover { background: var(--fb-surface-alt); color: var(--fb-text); text-decoration: none; }
      .nav-link:hover mat-icon { color: var(--fb-text-mid); }
      .nav-link.active { background: var(--fb-primary-soft); color: var(--fb-primary-strong); }
      .nav-link.active mat-icon { color: var(--fb-primary); }

      .sidebar-foot { margin-top: auto; padding-top: 20px; }
      .help-card {
        padding: 18px;
        border-radius: var(--fb-radius-md);
        background: var(--fb-ink);
        color: var(--fb-on-ink);
      }
      .help-card strong { font-family: var(--fb-font-serif); font-size: 17px; font-weight: 650; }
      .help-card p { margin: 6px 0 14px; font-size: 13px; line-height: 1.45; color: var(--fb-on-ink-mid); }

      /* ── Barre supérieure ───────────────────────────── */
      .content { background: var(--fb-bg); }
      .topbar {
        position: sticky;
        top: 0;
        z-index: 20;
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 68px;
        padding: 0 clamp(16px, 3vw, 32px);
        background: rgba(247, 249, 253, 0.86);
        backdrop-filter: blur(14px) saturate(1.4);
        -webkit-backdrop-filter: blur(14px) saturate(1.4);
        border-bottom: 1px solid rgba(var(--fb-ink-rgb), 0.06);
      }
      .topbar-brand { display: inline-flex; text-decoration: none; }
      .spacer { flex: 1 1 auto; }
      .icon-btn { color: var(--fb-text-mid); }

      .account {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 4px 10px 4px 4px;
        border: 1px solid var(--fb-border);
        border-radius: var(--fb-radius-pill);
        background: var(--fb-surface);
        color: var(--fb-text);
        cursor: pointer;
      }
      .account:hover { border-color: var(--fb-border-strong); box-shadow: var(--fb-elev-1); }
      .account-avatar {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: var(--fb-primary);
        color: #fff;
        font-size: 13px;
        font-weight: 700;
      }
      .account-text { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.2; }
      .account-text strong { font-size: 13.5px; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .account-text small { font-size: 12px; color: var(--fb-muted); }
      .account-caret { color: var(--fb-muted); }

      .main {
        max-width: 1280px;
        margin: 0 auto;
        padding: clamp(20px, 3vw, 36px) clamp(16px, 3vw, 32px) 56px;
        animation: fadeIn 0.3s ease;
      }

      @media (max-width: 480px) {
        .account { padding: 3px; }
      }
    `,
  ],
})
export default class ShellLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notifications = inject(NotificationService);

  protected readonly isCompact = signal(false);
  protected readonly isPhone = signal(false);

  private readonly role = computed<UserRole>(() => this.auth.currentUser()?.role ?? 'parent');
  protected readonly navItems = computed(() => NAV_BY_ROLE[this.role()]);
  protected readonly homeRoute = computed(() => this.auth.getHomeRoute());
  protected readonly roleLabel = computed(() => ROLE_LABELS[this.role()]);
  protected readonly showEvaluationCta = computed(() => this.role() === 'parent' || this.role() === 'adolescent');
  protected readonly displayName = computed(() => {
    const user = this.auth.currentUser();
    return user ? `${user.firstName} ${user.lastName}`.trim() : 'Mon compte';
  });
  protected readonly initials = computed(() => {
    const user = this.auth.currentUser();
    const value = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
    return value || '?';
  });

  @ViewChild('drawer') private readonly drawer?: MatSidenav;

  constructor() {
    // Centre de notifications : compteur + connexion temps réel pour la session connectée.
    this.notifications.start();

    this.breakpoints
      .observe(['(max-width: 1024px)', '(max-width: 600px)'])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.isCompact.set(state.breakpoints['(max-width: 1024px)']);
        this.isPhone.set(state.breakpoints['(max-width: 600px)']);
      });

    // À chaque navigation : referme le tiroir sur petit écran et revient en haut
    // de page (le contenu défile dans mat-sidenav-content, pas dans la fenêtre).
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.isCompact()) {
          this.drawer?.close();
        }
        document.querySelector('.mat-sidenav-content')?.scrollTo({ top: 0 });
      });
  }

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
