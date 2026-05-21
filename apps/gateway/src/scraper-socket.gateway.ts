import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { SyncJobService } from './sync-job.service';

type ScraperSessionStatus =
  | 'PROCESSING'
  | 'CHALLENGE_REQUIRED'
  | 'SUCCESS'
  | 'FAILED';

type ScraperSocket = {
  id: string;
  handshake: {
    headers: Record<string, string | string[] | undefined>;
  };
  data: {
    userId?: string;
    scraperIntervals?: Set<NodeJS.Timeout>;
    syncUnsubscribe?: () => void;
  };
  emit: (event: string, payload: unknown) => void;
  disconnect: (close?: boolean) => void;
};

@WebSocketGateway({
  namespace: '/scrapers',
  cors: {
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      process.env.CLIENT_URL,
    ].filter(Boolean),
    credentials: true,
  },
})
export class ScraperSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server!: unknown;

  private readonly sessionOwners = new Map<string, string>();

  constructor(
    @Inject('SCRAPER_SERVICE')
    private readonly scraperServiceClient: ClientProxy,
    private readonly syncJobService: SyncJobService,
  ) {}

  handleConnection(client: ScraperSocket): void {
    try {
      const token = this.getCookie(client, 'moneyup_session');
      if (!token) {
        throw new UnauthorizedException('No active session found');
      }
      const userId = this.verifyJwtToken(token).userId;
      client.data.userId = userId;
      client.data.scraperIntervals = new Set();
      client.data.syncUnsubscribe = this.syncJobService.subscribeListener(
        userId,
        (event, snapshot) => {
          client.emit('sync:event', { event, snapshot });
        },
      );
    } catch {
      client.emit('scraper:error', {
        status: 'FAILED',
        errorCode: 'SESSION_EXPIRED',
        error: 'פג תוקף הסשן. התחבר מחדש.',
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: ScraperSocket): void {
    for (const interval of client.data.scraperIntervals ?? []) {
      clearInterval(interval);
    }
    client.data.scraperIntervals?.clear();
    client.data.syncUnsubscribe?.();
    client.data.syncUnsubscribe = undefined;
  }

  @SubscribeMessage('scraper:connect')
  async connectScraper(
    @ConnectedSocket() client: ScraperSocket,
    @MessageBody()
    payload: {
      bankId?: string;
      credentials?: Record<string, string>;
      startDate?: string;
    },
  ) {
    const userId = this.requireUserId(client);
    const response = await firstValueFrom(
      this.scraperServiceClient
        .send('scrape_and_connect', {
          userId,
          bankId: payload.bankId,
          credentials: payload.credentials,
          startDate: payload.startDate,
        })
        .pipe(timeout(180000)),
    );

    if (response?.status === 'PROCESSING' && response.sessionId) {
      this.sessionOwners.set(response.sessionId, userId);
      client.emit('scraper:status', response);
      this.watchSession(client, response.sessionId);
    } else {
      client.emit('scraper:error', response);
    }

    return response;
  }

  @SubscribeMessage('scraper:challenge:submit')
  async submitChallenge(
    @ConnectedSocket() client: ScraperSocket,
    @MessageBody() payload: { sessionId?: string; code?: string },
  ) {
    const userId = this.requireUserId(client);
    const sessionId = String(payload.sessionId ?? '');
    if (!sessionId || this.sessionOwners.get(sessionId) !== userId) {
      const response = {
        status: 'FAILED',
        errorCode: 'SESSION_EXPIRED',
        error: 'פג תוקף הסשן. התחל מחדש את תהליך החיבור.',
      };
      client.emit('scraper:error', response);
      return response;
    }

    const response = await firstValueFrom(
      this.scraperServiceClient
        .send('submit_challenge', {
          sessionId,
          code: payload.code,
        })
        .pipe(timeout(60000)),
    );

    if (response?.status === 'PROCESSING') {
      client.emit('scraper:status', response);
      this.watchSession(client, sessionId);
    } else if (response?.status === 'SUCCESS') {
      client.emit('scraper:success', response);
      this.sessionOwners.delete(sessionId);
    } else {
      client.emit('scraper:error', response);
    }

    return response;
  }

  @SubscribeMessage('scraper:cancel')
  cancelScraper(
    @ConnectedSocket() client: ScraperSocket,
    @MessageBody() payload: { sessionId?: string },
  ) {
    const userId = this.requireUserId(client);
    const sessionId = String(payload.sessionId ?? '');
    if (sessionId && this.sessionOwners.get(sessionId) === userId) {
      this.sessionOwners.delete(sessionId);
    }
    for (const interval of client.data.scraperIntervals ?? []) {
      clearInterval(interval);
    }
    client.data.scraperIntervals?.clear();
    client.emit('scraper:status', { sessionId, status: 'CANCELLED' });
    return { sessionId, status: 'CANCELLED' };
  }

  @SubscribeMessage('sync:start')
  startSync(
    @ConnectedSocket() client: ScraperSocket,
    @MessageBody()
    payload?: {
      mode?: 'initial' | 'manual';
      startDate?: string;
      endDate?: string;
    },
  ) {
    const userId = this.requireUserId(client);
    const mode = payload?.mode === 'initial' ? 'initial' : 'manual';
    const { snapshot, reused } = this.syncJobService.startOrReuseSyncJob(
      userId,
      mode,
      payload?.startDate,
      payload?.endDate,
    );

    return {
      jobId: snapshot.jobId,
      reused,
      status: snapshot.status,
      phase: snapshot.phase,
      progress: snapshot.progress,
      message: snapshot.message,
      source: snapshot.source,
      syncPolicy: snapshot.syncPolicy,
      startDate: snapshot.startDate,
      endDate: snapshot.endDate,
      sourcesChecked: snapshot.sourcesChecked,
      sourcesScraped: snapshot.sourcesScraped,
      sourcesSkippedCovered: snapshot.sourcesSkippedCovered,
      startedAt: snapshot.startedAt,
      updatedAt: snapshot.updatedAt,
    };
  }

  @SubscribeMessage('sync:snapshot')
  getSyncSnapshot(@ConnectedSocket() client: ScraperSocket) {
    const userId = this.requireUserId(client);
    return this.syncJobService.getSnapshot(userId);
  }

  private watchSession(client: ScraperSocket, sessionId: string): void {
    for (const interval of client.data.scraperIntervals ?? []) {
      clearInterval(interval);
    }
    client.data.scraperIntervals?.clear();

    const interval = setInterval(async () => {
      try {
        const response = await firstValueFrom(
          this.scraperServiceClient
            .send<{
              status: ScraperSessionStatus;
              challenge?: { type?: string; message?: string };
              errorCode?: string;
              error?: string;
            }>('get_scraper_status', { sessionId })
            .pipe(timeout(10000)),
        );

        if (response.status === 'CHALLENGE_REQUIRED') {
          client.emit('scraper:challenge', { sessionId, ...response });
          clearInterval(interval);
          client.data.scraperIntervals?.delete(interval);
          return;
        }

        if (response.status === 'SUCCESS') {
          client.emit('scraper:success', { sessionId, ...response });
          this.sessionOwners.delete(sessionId);
          clearInterval(interval);
          client.data.scraperIntervals?.delete(interval);
          return;
        }

        if (response.status === 'FAILED') {
          client.emit('scraper:error', { sessionId, ...response });
          this.sessionOwners.delete(sessionId);
          clearInterval(interval);
          client.data.scraperIntervals?.delete(interval);
          return;
        }

        client.emit('scraper:status', { sessionId, ...response });
      } catch (err: any) {
        client.emit('scraper:error', {
          sessionId,
          status: 'FAILED',
          errorCode: 'UNKNOWN_CONNECT_ERROR',
          error: err?.message ?? 'ההתחברות נכשלה. נסה שוב.',
        });
        clearInterval(interval);
        client.data.scraperIntervals?.delete(interval);
      }
    }, 2000);

    client.data.scraperIntervals?.add(interval);
  }

  private requireUserId(client: ScraperSocket): string {
    if (!client.data.userId) {
      throw new UnauthorizedException('No active session found');
    }
    return client.data.userId;
  }

  private getCookie(client: ScraperSocket, key: string): string | null {
    const rawCookie = client.handshake.headers.cookie;
    const cookieHeader = Array.isArray(rawCookie)
      ? rawCookie.join(';')
      : rawCookie;
    if (!cookieHeader) return null;

    for (const entry of cookieHeader.split(';')) {
      const [name, ...rest] = entry.trim().split('=');
      if (name === key) {
        return decodeURIComponent(rest.join('='));
      }
    }

    return null;
  }

  private verifyJwtToken(token: string): { userId: string } {
    const parts = token.split('.');
    if (parts.length < 2) {
      throw new UnauthorizedException('Invalid session token');
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    ) as { userId?: string };
    if (!payload.userId) {
      throw new UnauthorizedException('Invalid session payload');
    }
    return { userId: payload.userId };
  }
}
