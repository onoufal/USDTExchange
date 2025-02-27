import { logger } from "./logger";

let socket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000; // Start with 1 second delay

function getReconnectDelay(): number {
  // Exponential backoff with max of 30 seconds
  return Math.min(RECONNECT_DELAY * Math.pow(2, reconnectAttempts), 30000);
}

export function initializeWebSocket(): WebSocket {
  if (socket?.readyState === WebSocket.OPEN) {
    return socket;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  socket = new WebSocket(wsUrl);

  socket.addEventListener('open', () => {
    logger.info('WebSocket connection established');
    reconnectAttempts = 0; // Reset reconnect attempts on successful connection

    // Send initial ping to verify connection
    sendWebSocketMessage({ type: 'ping' });
  });

  socket.addEventListener('close', (event) => {
    logger.warn('WebSocket connection closed', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = getReconnectDelay();
      logger.info(`Attempting to reconnect in ${delay}ms`, { attempt: reconnectAttempts + 1 });
      setTimeout(() => {
        reconnectAttempts++;
        initializeWebSocket();
      }, delay);
    } else {
      logger.error('Max reconnection attempts reached');
      socket = null;
    }
  });

  socket.addEventListener('error', (error) => {
    logger.error('WebSocket error:', error);
  });

  // Handle incoming messages
  socket.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data);
      logger.debug('Received message:', message);

      if (message.type === 'pong') {
        logger.debug('Received pong response');
      }
    } catch (error) {
      logger.error('Failed to parse WebSocket message:', error);
    }
  });

  return socket;
}

export function sendWebSocketMessage(message: any): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    logger.warn('WebSocket not connected, attempting to reconnect...');
    const newSocket = initializeWebSocket();
    newSocket.addEventListener('open', () => {
      try {
        newSocket.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Failed to send message:', error);
      }
    });
    return;
  }

  try {
    socket.send(JSON.stringify(message));
  } catch (error) {
    logger.error('Failed to send message:', error);
  }
}

export function closeWebSocket(): void {
  if (socket) {
    try {
      socket.close();
    } catch (error) {
      logger.error('Error closing WebSocket:', error);
    } finally {
      socket = null;
      reconnectAttempts = 0;
    }
  }
}