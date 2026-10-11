import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';
import {
  AppNotification,
  MessagePushEvent,
  NotificationListResponse,
  NotificationPushEvent,
} from '../models/notification.models';

const PAGE_SIZE = 15;
/** Délai avant une nouvelle tentative quand le serveur refuse la connexion temps réel (jeton expiré…). */
const RECONNECT_DELAY_MS = 10000;

/**
 * Centre de notifications : liste paginée, compteur de non-lues et réception en temps réel
 * via Socket.IO (même jeton JWT que l'API ; le serveur n'envoie à chaque socket que les
 * événements de son propre utilisateur).
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = signal(0);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal('');
  readonly hasMore = signal(false);
  readonly loaded = signal(false);
  readonly connected = signal(false);
  readonly hasUnread = computed(() => this.unreadCount() > 0);

  /** Nouveau message de téléconsultation reçu (pour rafraîchir la conversation ouverte). */
  readonly messageEvents$ = new Subject<MessagePushEvent>();
  /** Toute notification reçue en temps réel (pour rafraîchir la page concernée si elle est ouverte). */
  readonly notificationEvents$ = new Subject<AppNotification>();

  private socket: Socket | null = null;
  private started = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Déconnexion de l'utilisateur : on coupe le temps réel et on vide l'état.
    effect(() => {
      if (!this.auth.currentUser()) {
        this.stop();
      }
    }, { allowSignalWrites: true });
  }

  /** Démarre le centre de notifications pour l'utilisateur connecté (idempotent). */
  start(): void {
    if (this.started || !this.auth.getAccessToken()) return;
    this.started = true;
    this.refreshUnreadCount();
    this.connect();
  }

  stop(): void {
    this.started = false;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
    this.notifications.set([]);
    this.unreadCount.set(0);
    this.hasMore.set(false);
    this.loaded.set(false);
    this.error.set('');
  }

  /* ── API REST ─────────────────────────────────────────────────────────── */

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.http
      .get<NotificationListResponse>(`${API_BASE_URL}/notifications`, { params: { limit: PAGE_SIZE } })
      .subscribe({
        next: (r) => {
          this.loading.set(false);
          this.loaded.set(true);
          this.notifications.set(r.notifications);
          this.hasMore.set(r.hasMore);
          this.unreadCount.set(r.unreadCount);
        },
        error: (e) => {
          this.loading.set(false);
          this.error.set(e?.error?.message || 'Impossible de charger les notifications.');
        },
      });
  }

  loadMore(): void {
    const last = this.notifications().at(-1);
    if (!last || this.loadingMore()) return;
    this.loadingMore.set(true);
    this.http
      .get<NotificationListResponse>(`${API_BASE_URL}/notifications`, {
        params: { limit: PAGE_SIZE, before: last.lastEventAt },
      })
      .subscribe({
        next: (r) => {
          this.loadingMore.set(false);
          const known = new Set(this.notifications().map((n) => n._id));
          this.notifications.update((list) => [...list, ...r.notifications.filter((n) => !known.has(n._id))]);
          this.hasMore.set(r.hasMore);
          this.unreadCount.set(r.unreadCount);
        },
        error: (e) => {
          this.loadingMore.set(false);
          this.error.set(e?.error?.message || 'Impossible de charger plus de notifications.');
        },
      });
  }

  refreshUnreadCount(): void {
    this.http.get<{ unreadCount: number }>(`${API_BASE_URL}/notifications/unread-count`).subscribe({
      next: (r) => this.unreadCount.set(r.unreadCount),
      error: () => undefined, // le badge garde sa valeur ; l'erreur sera visible à l'ouverture de la liste
    });
  }

  markAsRead(notification: AppNotification): void {
    if (notification.read) return;
    this.applyRead(notification._id);
    this.http.patch(`${API_BASE_URL}/notifications/${notification._id}/read`, {}).subscribe({
      error: (e) => {
        this.error.set(e?.error?.message || 'Impossible de marquer la notification comme lue.');
        this.refreshUnreadCount();
      },
    });
  }

  markAllAsRead(): void {
    if (!this.unreadCount()) return;
    const now = new Date().toISOString();
    this.notifications.update((list) => list.map((n) => (n.read ? n : { ...n, read: true, readAt: now })));
    this.unreadCount.set(0);
    this.http.patch(`${API_BASE_URL}/notifications/read-all`, {}).subscribe({
      error: (e) => {
        this.error.set(e?.error?.message || 'Impossible de tout marquer comme lu.');
        this.load();
      },
    });
  }

  remove(notification: AppNotification): void {
    this.notifications.update((list) => list.filter((n) => n._id !== notification._id));
    if (!notification.read) this.unreadCount.update((c) => Math.max(0, c - 1));
    this.http.delete(`${API_BASE_URL}/notifications/${notification._id}`).subscribe({
      error: (e) => {
        this.error.set(e?.error?.message || 'Impossible de supprimer la notification.');
        this.load();
      },
    });
  }

  private applyRead(id: string): void {
    const now = new Date().toISOString();
    this.notifications.update((list) => list.map((n) => (n._id === id ? { ...n, read: true, readAt: now } : n)));
    this.unreadCount.update((c) => Math.max(0, c - 1));
  }

  /* ── Temps réel ───────────────────────────────────────────────────────── */

  private connect(): void {
    // Même origine que l'application : le proxy de développement (et le serveur en production)
    // relaie /socket.io vers l'API.
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      // Fonction : le jeton courant (éventuellement rafraîchi) est relu à chaque tentative.
      auth: (cb) => cb({ token: this.auth.getAccessToken() }),
    });
    this.socket = socket;

    socket.on('connect', () => {
      this.connected.set(true);
      // Resynchronisation après une coupure : on rattrape ce qui a pu être manqué.
      this.refreshUnreadCount();
      if (this.loaded()) this.load();
    });

    socket.on('disconnect', () => this.connected.set(false));

    // Refus du serveur (jeton expiré, compte désactivé) : Socket.IO ne réessaie pas seul.
    socket.on('connect_error', () => {
      this.connected.set(false);
      if (!this.started || socket.active) return;
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => {
        if (this.started && this.auth.getAccessToken()) socket.connect();
      }, RECONNECT_DELAY_MS);
    });

    const onPushed = (event: NotificationPushEvent) => {
      this.unreadCount.set(event.unreadCount);
      // Remplace la version précédente (notification regroupée) et la remonte en tête.
      this.notifications.update((list) => [event.notification, ...list.filter((n) => n._id !== event.notification._id)]);
      this.notificationEvents$.next(event.notification);
    };
    socket.on('notification:new', onPushed);
    socket.on('notification:updated', onPushed);

    socket.on('notification:count', (event: { unreadCount: number }) => this.unreadCount.set(event.unreadCount));

    socket.on('message:new', (event: MessagePushEvent) => this.messageEvents$.next(event));
  }
}
