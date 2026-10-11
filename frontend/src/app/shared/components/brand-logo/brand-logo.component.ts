import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

/**
 * Logo FamilyBalance (monogramme « FB » cerclé + nom). Variante « light » pour
 * les fonds sombres (bandeau d'encre des pages d'authentification).
 */
@Component({
  selector: 'app-brand-logo',
  standalone: true,
  imports: [NgIf],
  template: `
    <span class="logo" [class.light]="tone === 'light'" [style.--logo-size]="size + 'px'">
      <svg class="mark" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="52" fill="none" stroke="#e0a64a" stroke-width="5" />
        <text x="41" y="83" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="700" font-size="64" class="f">F</text>
        <text x="81" y="83" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="700" font-size="64" class="b">B</text>
      </svg>
      <span class="name" *ngIf="wordmark"><span class="f">Family</span><span class="b">Balance</span></span>
    </span>
  `,
  styles: [`
    :host { display: inline-flex; }
    .logo { display: inline-flex; align-items: center; gap: 10px; --logo-size: 36px; }
    .mark { width: var(--logo-size); height: var(--logo-size); flex-shrink: 0; }
    .mark .f { fill: var(--fb-ink); }
    .mark .b { fill: var(--fb-primary); }
    .name {
      font-family: var(--fb-font-serif);
      font-variation-settings: 'SOFT' 100;
      font-weight: 700;
      font-size: calc(var(--logo-size) * 0.5);
      letter-spacing: -0.02em;
      white-space: nowrap;
    }
    .name .f { color: var(--fb-ink); }
    .name .b { color: var(--fb-primary); }
    .light .mark .f, .light .name .f { fill: #fff; color: #fff; }
    .light .mark .b { fill: #7fd4c9; }
    .light .name .b { color: #7fd4c9; }
  `],
})
export class BrandLogoComponent {
  @Input() tone: 'dark' | 'light' = 'dark';
  @Input() size = 36;
  @Input() wordmark = true;
}
