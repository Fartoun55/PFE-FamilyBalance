export type NotificationType =
  | 'appointment-requested'
  | 'appointment-confirmed'
  | 'appointment-cancelled'
  | 'appointment-rescheduled'
  | 'bilan-shared'
  | 'message-received'
  | 'score-available'
  | 'risk-alert'
  | 'reevaluation-due'
  | 'resource-published';

export interface AppNotification {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Route frontend à ouvrir au clic. */
  link: string | null;
  linkParams: Record<string, string> | null;
  data: Record<string, string> | null;
  /** Nombre d'événements regroupés (ex. plusieurs messages d'une même conversation). */
  count: number;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  lastEventAt: string;
}

export interface NotificationListResponse {
  status: string;
  notifications: AppNotification[];
  hasMore: boolean;
  unreadCount: number;
}

/** Événements temps réel émis par le serveur (Socket.IO). */
export interface NotificationPushEvent {
  notification: AppNotification;
  unreadCount: number;
}

export interface MessagePushEvent {
  appointmentId: string;
  messageId: string;
}
