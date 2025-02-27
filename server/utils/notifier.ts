import { WebSocket } from 'ws';
import { logger } from './logger';

export interface NotificationPayload {
  type: 'new_user' | 'kyc_submitted' | 'order_approved' | 'order_created';
  message: string;
  data?: Record<string, any>;
}

/**
 * WebSocket clients collection for broadcasting notifications
 */
let wsClients: Set<WebSocket>;

/**
 * Initializes the notifier with WebSocket clients
 * @param clients WebSocket clients from the server
 */
export function initializeNotifier(clients: Set<WebSocket>) {
  wsClients = clients;
}

/**
 * Broadcasts a notification to all connected admin clients
 * @param payload The notification payload to broadcast
 */
export function broadcastNotification(payload: NotificationPayload): void {
  if (!wsClients) {
    logger.warn('Notifier not initialized, skipping broadcast');
    return;
  }

  const message = JSON.stringify({
    success: true,
    type: 'notification',
    data: {
      ...payload,
      timestamp: new Date().toISOString()
    }
  });

  let broadcastCount = 0;
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      broadcastCount++;
    }
  });

  logger.info({ 
    type: payload.type,
    recipients: broadcastCount 
  }, 'Notification broadcasted');
}
