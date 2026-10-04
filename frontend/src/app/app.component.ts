import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <main class="shell">
      <span class="ambient ambient-a"></span>
      <span class="ambient ambient-b"></span>
      <router-outlet />
    </main>
  `,
  styles: [
    `
      .shell {
        position: relative;
        min-height: 100vh;
        overflow: hidden;
        isolation: isolate;
      }

      .ambient {
        position: fixed;
        inset: auto;
        pointer-events: none;
        border-radius: 999px;
        filter: blur(18px);
        opacity: 0.45;
        z-index: -1;
      }

      .ambient-a {
        width: 28rem;
        height: 28rem;
        top: -10rem;
        right: -8rem;
        background: radial-gradient(circle, rgba(18, 70, 196, 0.22), transparent 68%);
      }

      .ambient-b {
        width: 24rem;
        height: 24rem;
        left: -8rem;
        bottom: -9rem;
        background: radial-gradient(circle, rgba(15, 118, 110, 0.16), transparent 68%);
      }
    `,
  ],
})
export class AppComponent {
  title = 'familybalance-frontend';
}
