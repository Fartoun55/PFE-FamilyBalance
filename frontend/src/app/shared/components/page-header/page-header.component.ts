import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="page-header">
      <div class="page-header-text">
        <p class="page-header-eyebrow" *ngIf="eyebrow">{{ eyebrow }}</p>
        <h1 class="page-header-title">{{ title }}</h1>
        <p class="page-header-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="page-header-actions">
        <ng-content></ng-content>
      </div>
    </header>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-md);
        flex-wrap: wrap;
        margin-bottom: var(--space-lg);
      }
      .page-header-text {
        min-width: 0;
      }
      .page-header-eyebrow {
        margin: 0 0 6px;
        font-size: var(--type-xs);
        font-weight: 700;
        color: var(--fb-muted);
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .page-header-title {
        margin: 0 0 4px;
        font-size: clamp(2rem, 3vw, 2.8rem);
        font-weight: 800;
        color: var(--fb-text);
        letter-spacing: -0.01em;
        line-height: 1.05;
      }
      .page-header-subtitle {
        margin: 0;
        color: var(--fb-muted);
        font-size: var(--type-md);
        line-height: 1.5;
      }
      .page-header-actions {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        flex-wrap: wrap;
      }

      @media (max-width: 768px) {
        .page-header {
          flex-direction: column;
          align-items: stretch;
        }
        .page-header-actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class PageHeaderComponent {
  @Input() eyebrow?: string;
  @Input() title = '';
  @Input() subtitle?: string;
}
