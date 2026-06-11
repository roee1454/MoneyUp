import { io, type Socket } from 'socket.io-client';
import { API_BASE } from '@/lib/api';

let scraperSocket: Socket | null = null;

/**
 * Retrieves or establishes the WebSocket connection to the scraper namespace.
 *
 * @returns The active WebSocket instance.
 */
export function getScraperSocket(): Socket {
  if (!scraperSocket) {
    scraperSocket = io(`${API_BASE}/scrapers`, {
      withCredentials: true,
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return scraperSocket;
}

/**
 * Disconnects and cleans up the active scraper WebSocket connection.
 */
export function closeScraperSocket() {
  scraperSocket?.disconnect();
  scraperSocket = null;
}

/**
 * Sends a WebSocket event to the scraper server and waits for a response with a timeout.
 *
 * @param event - The name of the event to emit.
 * @param payload - Optional payload to send with the event.
 * @param timeoutMs - The maximum time in milliseconds to wait for a response.
 * @returns A promise that resolves with the server response or rejects on error/timeout.
 */
export function emitScraperSocket<TResponse>(
  event: string,
  payload?: unknown,
  timeoutMs = 10000,
): Promise<TResponse> {
  const socket = getScraperSocket();

  return new Promise((resolve, reject) => {
    socket.timeout(timeoutMs).emit(event, payload, (error: Error | null, response: TResponse) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(response);
    });
  });
}
