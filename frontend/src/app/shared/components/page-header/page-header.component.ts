import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IllustrationComponent, IllustrationName } from '../illustration/illustration.component';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, IllustrationComponent],
  template: `
    <header class="page-header" [class.page-header--hero]="illustration">
      <div class="page-header-main">
        <div class="page-header-text">
          <p class="page-header-eyebrow" *ngIf="eyebrow">{{ eyebrow }}</p>
          <h1 class="page-header-title">{{ title }}</h1>
          <p class="page-header-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
        </div>
        <div class="page-header-actions">
          <ng-content></ng-content>
        </div>
      </div>
      <app-illustration
        *ngIf="illustration"
        class="page-header-illustration"
        [name]="illustration"
        [alt]="illustrationAlt"
        [eager]="true"
      ></app-illustration>
    </header>
  `,
  styles: [
    `
      .page-header-main {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-md);
        flex-wrap: wrap;
        flex: 1 1 auto;
        min-width: 0;
      }

      /* Bandeau illustré : texte et actions à gauche, illustration à droite. */
      .page-header.page-header--hero {
        position: relative;
        align-items: center;
        flex-wrap: nowrap;
        gap: clamp(16px, 3vw, 40px);
        padding: clamp(20px, 3vw, 32px) clamp(20px, 3.5vw, 40px);
        border: 1px solid var(--fb-border);
        border-radius: var(--fb-radius-lg);
        background:
          radial-gradient(120% 140% at 100% 0%, var(--fb-primary-tint) 0%, rgba(227, 243, 241, 0) 55%),
          linear-gradient(135deg, var(--fb-surface) 0%, var(--fb-surface-alt) 100%);
        overflow: hidden;
      }
      .page-header--hero .page-header-main {
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
      }
      .page-header-illustration {
        flex: 0 0 clamp(180px, 24vw, 280px);
        margin-block: -8px;
      }

      @media (max-width: 768px) {
        .page-header.page-header--hero {
          flex-direction: column-reverse;
          align-items: stretch;
        }
        .page-header-illustration {
          flex-basis: auto;
          width: min(220px, 70%);
          margin: 0 auto -4px;
        }
      }
      @media (max-width: 420px) {
        .page-header-illustration {
          display: none;
        }
      }

      .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-md);
        flex-wrap: wrap;
        margin-bottom: clamp(20px, 3vw, 32px);
      }
      .page-header-text {
        min-width: 0;
      }
      .page-header-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 10px;
        font-size: var(--type-xs);
        font-weight: 700;
        color: var(--fb-accent-strong);
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      .page-header-eyebrow::before {
        content: "";
        width: 18px;
        height: 2px;
        border-radius: 2px;
        background: var(--fb-accent);
      }
      .page-header-title {
        margin: 0 0 6px;
        font-size: clamp(1.75rem, 1.2rem + 1.6vw, 2.5rem);
        line-height: 1.1;
      }
      .page-header-subtitle {
        margin: 0;
        max-width: 62ch;
        color: var(--fb-text-mid);
        font-size: 16px;
        line-height: 1.55;
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
  /** Illustration affichée à droite du titre (bandeau illustré). */
  @Input() illustration?: IllustrationName;
  /** Texte alternatif ; vide = illustration décorative. */
  @Input() illustrationAlt = '';
}
