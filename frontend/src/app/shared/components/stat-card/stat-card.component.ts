import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export type StatCardTone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
export type StatCardTrendDirection = 'up' | 'down' | 'flat';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="stat-card" [class]="'tone-' + tone">
      <div class="stat-icon" *ngIf="icon">
        <mat-icon>{{ icon }}</mat-icon>
      </div>
      <div class="stat-body">
        <span class="stat-label">{{ label }}</span>
        <span class="stat-value">{{ value }}</span>
        <span class="stat-trend" *ngIf="trendLabel" [class]="'trend-' + trendDirection">
          <mat-icon *ngIf="trendDirection === 'up'">trending_up</mat-icon>
          <mat-icon *ngIf="trendDirection === 'down'">trending_down</mat-icon>
          <mat-icon *ngIf="trendDirection === 'flat'">trending_flat</mat-icon>
          {{ trendLabel }}
        </span>
      </div>
    </div>
  `,
  styles: [
    `
      .stat-card {
        display: flex;
        align-items: center;
        gap: var(--space-md);
        padding: var(--space-md);
        background: var(--fb-surface-strong);
        border: 1px solid var(--fb-border);
        border-radius: var(--fb-radius-md);
        box-shadow: var(--fb-shadow-soft);
        min-width: 0;
      }
      .stat-icon {
        flex-shrink: 0;
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: var(--fb-primary-soft);
        color: var(--fb-primary);
      }
      .tone-accent .stat-icon { background: rgba(var(--fb-accent-rgb), 0.1); color: var(--fb-accent-strong); }
      .tone-success .stat-icon { background: rgba(21, 127, 69, 0.1); color: var(--fb-success); }
      .tone-warning .stat-icon { background: rgba(183, 121, 31, 0.12); color: var(--fb-warning); }
      .tone-danger .stat-icon { background: rgba(192, 57, 43, 0.1); color: var(--fb-danger); }
      .tone-neutral .stat-icon { background: rgba(38, 33, 27, 0.06); color: var(--fb-muted); }

      .stat-body {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .stat-label {
        font-size: var(--type-sm);
        color: var(--fb-muted);
        font-weight: 600;
      }
      .stat-value {
        font-size: 1.6rem;
        font-weight: 800;
        color: var(--fb-text);
        line-height: 1.2;
      }
      .stat-trend {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        font-size: var(--type-xs);
        font-weight: 700;
        color: var(--fb-muted);
      }
      .stat-trend mat-icon {
        width: 16px;
        height: 16px;
        font-size: 16px;
      }
      .trend-up { color: var(--fb-success); }
      .trend-down { color: var(--fb-danger); }
      .trend-flat { color: var(--fb-muted); }
    `,
  ],
})
export class StatCardComponent {
  @Input() icon?: string;
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() tone: StatCardTone = 'primary';
  @Input() trendLabel?: string;
  @Input() trendDirection: StatCardTrendDirection = 'flat';
}
