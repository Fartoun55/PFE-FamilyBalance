import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '../services/notification.service';
import { IllustrationComponent } from '../../shared/components/illustration/illustration.component';
import { AppNotification, NotificationType } from '../models/notification.models';

const TYPE_META: Record<NotificationType, { icon: string; tone: 'primary' | 'accent' | 'success' | 'danger' | 'neutral' }> = {
  'appointment-requested': { icon: 'event_available', tone: 'primary' },
  'appointment-confirmed': { icon: 'event_available', tone: 'success' },
  'appointment-cancelled': { icon: 'event_busy', tone: 'danger' },
  'appointment-rescheduled': { icon: 'update', tone: 'accent' },
  'bilan-shared': { icon: 'assignment_ind', tone: 'primary' },
  'message-received': { icon: 'chat', tone: 'primary' },
  'score-available': { icon: 'insights', tone: 'success' },
  'risk-alert': { icon: 'priority_high', tone: 'danger' },
  'reevaluation-due': { icon: 'event_repeat', tone: 'accent' },
  'resource-published': { icon: 'menu_book', tone: 'neutral' },
};

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatMenuModule, MatTooltipModule, IllustrationComponent],
  template: `
    <button
      type="button"
      class="bell"
      [matMenuTriggerFor]="panel"
      (menuOpened)="onOpened()"
      [attr.aria-label]="center.unreadCount() ? 'Notifications, ' + center.unreadCount() + ' non lue(s)' : 'Notifications'"
      matTooltip="Notifications"
    >
      <mat-icon>{{ center.hasUnread() ? 'notifications_active' : 'notifications_none' }}</mat-icon>
      <span class="badge" *ngIf="center.unreadCount()" aria-hidden="true">
        {{ center.unreadCount() > 99 ? '99+' : center.unreadCount() }}
      </span>
    </button>

    <mat-menu #panel="matMenu" xPosition="before" class="notif-panel">
      <div class="panel" role="dialog" aria-label="Centre de notifications">
        <header class="panel-head" (click)="$event.stopPropagation()">
          <div>
            <h2>Notifications</h2>
            <p>{{ center.unreadCount() ? center.unreadCount() + ' non lue(s)' : 'Tout est lu' }}</p>
          </div>
          <button type="button" class="text-btn" [disabled]="!center.unreadCount()" (click)="center.markAllAsRead()">
            Tout marquer comme lu
          </button>
        </header>

        <div class="panel-body" (click)="$event.stopPropagation()" *ngIf="center.loading() && !center.notifications().length">
          <div class="state"><span class="fb-spinner"></span>Chargement…</div>
        </div>

        <div class="panel-body" (click)="$event.stopPropagation()" *ngIf="center.error()">
          <div class="fb-alert fb-alert--error alert">
            <mat-icon>error_outline</mat-icon>
            <span>{{ center.error() }}</span>
            <button type="button" class="text-btn" (click)="center.load()">Réessayer</button>
          </div>
        </div>

        <div
          class="panel-body"
          (click)="$event.stopPropagation()"
          *ngIf="center.loaded() && !center.loading() && !center.notifications().length && !center.error()"
        >
          <div class="state empty">
            <app-illustration class="empty-illus" name="notifications" fallbackIcon="notifications_off"></app-illustration>
            <strong>Aucune notification</strong>
            <span>Vous serez prévenu ici des rendez-vous, messages et résultats.</span>
          </div>
        </div>

        <ul class="list" *ngIf="center.notifications().length">
          <li
            *ngFor="let n of center.notifications(); trackBy: trackById"
            class="item"
            [class.unread]="!n.read"
          >
            <button type="button" class="item-main" (click)="open(n)">
              <span class="icon" [attr.data-tone]="meta(n).tone"><mat-icon>{{ meta(n).icon }}</mat-icon></span>
              <span class="text">
                <strong>{{ n.title }}</strong>
                <span class="msg">{{ n.message }}</span>
                <time [attr.datetime]="n.lastEventAt" [title]="n.lastEventAt | date: 'dd/MM/yyyy HH:mm'">
                  {{ relative(n.lastEventAt) }}
                </time>
              </span>
              <span class="dot" *ngIf="!n.read" aria-label="Non lue"></span>
            </button>
            <div class="item-actions">
              <button
                type="button"
                *ngIf="!n.read"
                (click)="$event.stopPropagation(); center.markAsRead(n)"
                aria-label="Marquer comme lue"
                matTooltip="Marquer comme lue"
              >
                <mat-icon>done</mat-icon>
              </button>
              <button
                type="button"
                (click)="$event.stopPropagation(); center.remove(n)"
                aria-label="Supprimer la notification"
                matTooltip="Supprimer"
              >
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </li>
        </ul>

        <footer class="panel-foot" *ngIf="center.hasMore()" (click)="$event.stopPropagation()">
          <button type="button" class="text-btn" [disabled]="center.loadingMore()" (click)="center.loadMore()">
            {{ center.loadingMore() ? 'Chargement…' : 'Voir plus' }}
          </button>
        </footer>
      </div>
    </mat-menu>
  `,
  styles: [`
    :host { display: inline-flex; }

    .bell {
      position: relative;
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: var(--fb-text-mid);
      cursor: pointer;
    }
    .bell:hover { background: var(--fb-surface-alt); color: var(--fb-text); }
    .badge {
      position: absolute;
      top: 3px;
      right: 2px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border: 2px solid var(--fb-bg);
      border-radius: 9px;
      background: var(--fb-danger);
      color: #fff;
      font-size: 10.5px;
      font-weight: 800;
      line-height: 14px;
      text-align: center;
    }

    .panel { display: flex; flex-direction: column; max-height: min(560px, calc(100vh - 100px)); }
    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 18px 12px;
      border-bottom: 1px solid var(--fb-border);
    }
    .panel-head h2 { margin: 0; font-family: var(--fb-font-sans); font-variation-settings: normal; font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
    .panel-head p { margin: 2px 0 0; font-size: 12.5px; color: var(--fb-muted); }

    .text-btn {
      padding: 6px 4px;
      border: none;
      background: none;
      color: var(--fb-primary);
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
      cursor: pointer;
    }
    .text-btn:hover:not(:disabled) { text-decoration: underline; }
    .text-btn:disabled { color: var(--fb-faint); cursor: default; }

    .panel-body { padding: 12px 16px; }
    .state { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 28px 8px; color: var(--fb-muted); font-size: 14px; }
    .state.empty { flex-direction: column; gap: 6px; text-align: center; }
    .state.empty .empty-illus { width: 150px; }
    .state.empty mat-icon { width: 40px; height: 40px; font-size: 40px; color: var(--fb-faint); }
    .state.empty strong { color: var(--fb-text); }
    .alert { align-items: center; }

    .list { flex: 1; margin: 0; padding: 6px; overflow-y: auto; list-style: none; }
    .item { position: relative; border-radius: var(--fb-radius-sm); }
    .item:hover { background: var(--fb-surface-alt); }
    .item.unread { background: rgba(var(--fb-primary-rgb), 0.05); }
    .item.unread:hover { background: rgba(var(--fb-primary-rgb), 0.09); }
    .item-main {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      width: 100%;
      padding: 12px 64px 12px 12px;
      border: none;
      background: none;
      color: var(--fb-text);
      text-align: left;
      cursor: pointer;
    }
    .icon {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border-radius: 12px;
      background: var(--fb-primary-soft);
      color: var(--fb-primary);
    }
    .icon mat-icon { width: 20px; height: 20px; font-size: 20px; }
    .icon[data-tone="accent"] { background: var(--fb-accent-soft); color: var(--fb-accent-strong); }
    .icon[data-tone="success"] { background: rgba(var(--fb-success-rgb), 0.1); color: var(--fb-success); }
    .icon[data-tone="danger"] { background: rgba(var(--fb-danger-rgb), 0.08); color: var(--fb-danger); }
    .icon[data-tone="neutral"] { background: var(--fb-surface-alt); color: var(--fb-text-mid); }
    .text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .text strong { font-size: 14px; line-height: 1.3; }
    .item:not(.unread) .text strong { font-weight: 600; color: var(--fb-text-mid); }
    .msg {
      color: var(--fb-text-mid);
      font-size: 13px;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    time { font-size: 12px; color: var(--fb-muted); }
    .dot { position: absolute; top: 18px; right: 14px; width: 8px; height: 8px; border-radius: 50%; background: var(--fb-primary); }
    .item-actions {
      position: absolute;
      right: 8px;
      bottom: 8px;
      display: flex;
      gap: 2px;
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    .item:hover .item-actions, .item:focus-within .item-actions { opacity: 1; }
    .item-actions button {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 50%;
      background: var(--fb-surface);
      color: var(--fb-text-mid);
      box-shadow: var(--fb-elev-1);
      cursor: pointer;
    }
    .item-actions button:hover { color: var(--fb-text); }
    .item-actions mat-icon { width: 16px; height: 16px; font-size: 16px; }

    .panel-foot { padding: 8px; border-top: 1px solid var(--fb-border); text-align: center; }

    /* Écrans tactiles : actions toujours visibles (pas de survol). */
    @media (hover: none) {
      .item-actions { opacity: 1; }
    }
  `],
})
export class NotificationBellComponent {
  protected readonly center = inject(NotificationService);
  private readonly router = inject(Router);

  onOpened(): void {
    this.center.load();
  }

  open(notification: AppNotification): void {
    this.center.markAsRead(notification);
    if (notification.link) {
      this.router.navigate([notification.link], { queryParams: notification.linkParams || {} });
    }
  }

  meta(notification: AppNotification) {
    return TYPE_META[notification.type] || { icon: 'notifications', tone: 'neutral' as const };
  }

  relative(value: string): string {
    const diff = Date.now() - new Date(value).getTime();
    if (Number.isNaN(diff)) return '';
    const minutes = Math.round(diff / 60000);
    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `Il y a ${hours} h`;
    const days = Math.round(hours / 24);
    if (days < 7) return days === 1 ? 'Hier' : `Il y a ${days} jours`;
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  trackById(_index: number, notification: AppNotification): string {
    return notification._id;
  }
}
