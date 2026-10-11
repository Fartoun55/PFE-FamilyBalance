import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

/** Illustrations disponibles dans src/assets/illustrations (scripts/generate-illustrations.js). */
export type IllustrationName =
  | 'family-hero'
  | 'family-welcome'
  | 'auth-secure'
  | 'auth-email'
  | 'auth-key'
  | 'survey'
  | 'results'
  | 'family-dashboard'
  | 'add-child'
  | 'teen-space'
  | 'teleconsultation'
  | 'specialist'
  | 'specialists-team'
  | 'messaging'
  | 'education'
  | 'appointments'
  | 'notifications'
  | 'admin'
  | 'profile'
  | 'empty-search';

/**
 * Illustration SVG légère et responsive.
 * - `alt` vide (par défaut) : image décorative, ignorée par les lecteurs d'écran.
 * - Si le fichier ne se charge pas, l'icône `fallbackIcon` prend sa place (ou rien).
 */
@Component({
  selector: 'app-illustration',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      *ngIf="!failed(); else fallback"
      class="illustration-img"
      [src]="'assets/illustrations/' + name + '.svg'"
      [attr.alt]="alt"
      [attr.aria-hidden]="alt ? null : 'true'"
      width="480"
      height="360"
      [attr.loading]="eager ? 'eager' : 'lazy'"
      decoding="async"
      (error)="failed.set(true)"
    />
    <ng-template #fallback>
      <span class="illustration-fallback" *ngIf="fallbackIcon" aria-hidden="true">
        <mat-icon>{{ fallbackIcon }}</mat-icon>
      </span>
    </ng-template>
  `,
  styles: [
    `
      :host {
        display: block;
        line-height: 0;
      }
      .illustration-img {
        display: block;
        width: 100%;
        height: auto;
        max-width: 100%;
        user-select: none;
        -webkit-user-drag: none;
      }
      .illustration-fallback {
        display: grid;
        place-items: center;
        width: 64px;
        height: 64px;
        margin: 0 auto;
        border-radius: 20px;
        background: var(--fb-primary-soft);
        color: var(--fb-primary);
      }
      .illustration-fallback mat-icon {
        width: 28px;
        height: 28px;
        font-size: 28px;
      }
    `,
  ],
})
export class IllustrationComponent {
  @Input({ required: true }) name!: IllustrationName;
  @Input() alt = '';
  @Input() fallbackIcon?: string;
  /** Pour les visuels au-dessus de la ligne de flottaison (pages de connexion). */
  @Input() eager = false;

  readonly failed = signal(false);
}
