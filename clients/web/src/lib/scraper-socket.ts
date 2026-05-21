import { io, type Socket } from 'socket.io-client';
import { API_BASE } from '@/lib/api';

let scraperSocket: Socket | null = null;

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

export function closeScraperSocket() {
  scraperSocket?.disconnect();
  scraperSocket = null;
}

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
