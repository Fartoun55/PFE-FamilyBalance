import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { IllustrationComponent, IllustrationName } from '../illustration/illustration.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule, IllustrationComponent],
  template: `
    <div class="empty-state">
      <app-illustration
        *ngIf="illustration; else iconTpl"
        class="empty-illustration"
        [name]="illustration"
        [fallbackIcon]="icon"
      ></app-illustration>
      <ng-template #iconTpl>
      <div class="empty-icon" *ngIf="icon" aria-hidden="true">
        <mat-icon>{{ icon }}</mat-icon>
      </div>
      </ng-template>
      <h2 class="empty-title">{{ title }}</h2>
      <p class="empty-message" *ngIf="message">{{ message }}</p>
      <div class="empty-actions">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: var(--space-xl) var(--space-md);
        color: var(--fb-muted);
      }
      .empty-illustration {
        width: min(220px, 70%);
        margin-bottom: var(--space-sm);
      }
      .empty-icon {
        width: 64px;
        height: 64px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: var(--fb-primary-soft);
        color: var(--fb-primary);
        margin-bottom: var(--space-md);
      }
      .empty-icon mat-icon {
        width: 28px;
        height: 28px;
        font-size: 28px;
      }
      .empty-title {
        margin: 0 0 4px;
        font-size: 1.25rem;
      }
      .empty-message {
        margin: 0;
        max-width: 40ch;
        font-size: var(--type-md);
        line-height: 1.55;
        color: var(--fb-text-mid);
      }
      .empty-actions {
        margin-top: var(--space-md);
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: var(--space-sm);
      }
    `,
  ],
})
export class EmptyStateComponent {
  @Input() icon?: string;
  @Input() title = '';
  @Input() message?: string;
  /** Illustration affichée à la place de l'icône ; l'icône sert de repli. */
  @Input() illustration?: IllustrationName;
}
