import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="empty-state">
      <div class="empty-icon" *ngIf="icon" aria-hidden="true">
        <mat-icon>{{ icon }}</mat-icon>
      </div>
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
      .empty-icon {
        width: 56px;
        height: 56px;
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
        font-size: var(--type-lg);
        font-weight: 700;
        color: var(--fb-text);
      }
      .empty-message {
        margin: 0;
        max-width: 40ch;
        font-size: var(--type-md);
        line-height: 1.5;
      }
      .empty-actions {
        margin-top: var(--space-md);
        display: flex;
        gap: var(--space-sm);
      }
    `,
  ],
})
export class EmptyStateComponent {
  @Input() icon?: string;
  @Input() title = '';
  @Input() message?: string;
}
