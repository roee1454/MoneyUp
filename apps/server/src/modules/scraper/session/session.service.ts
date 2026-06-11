import { Injectable } from '@nestjs/common';
import { SessionState } from '../types/scraper.types';

/**
 * Service providing business logic and database access for Session.
 */
@Injectable()
export class SessionService {
  private readonly sessions = new Map<string, SessionState>();

  createSession(sessionId: string, state: SessionState): void {
    this.sessions.set(sessionId, state);
  }

  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, updates: Partial<SessionState>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
    }
  }

  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
