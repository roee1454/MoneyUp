import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { UnauthorizedException } from '@nestjs/common';
import { SpendingService } from './spending.service';
import { UsersService } from '../users/users.service';
import { AgentProvider } from '@money-up/common';

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
/**
 * WebSocket Gateway managing real-time annotation progress and events for Spending.
 */
export class SpendingSocketGateway {
  constructor(
    private readonly spendingService: SpendingService,
    private readonly usersService: UsersService,
  ) {}

  @SubscribeMessage('spending:annotate')
  async runSpendingAnnotation(
    @ConnectedSocket() client: any,
    @MessageBody()
    payload: {
      startDate?: string;
      endDate?: string;
      provider?: AgentProvider;
      model?: string;
    },
  ) {
    const userId = client.data?.userId;
    if (!userId) {
      throw new UnauthorizedException('No active session found');
    }

    try {
      const scansResponse = await this.spendingService.runSpendingAnnotationPass(
        userId,
        'both',
        payload.startDate,
        payload.endDate,
        payload.provider,
        payload.model,
        (progressInfo) => {
          client.emit('spending:annotate:progress', progressInfo);
        },
      );
      client.emit('spending:annotate:success', scansResponse);
      return scansResponse;
    } catch (err: any) {
      client.emit('spending:annotate:error', { error: err?.message || 'סיווג נכשל' });
      throw err;
    }
  }
}
