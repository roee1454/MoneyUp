import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SCRAPERS } from 'israeli-bank-scrapers';
import { SCRAPERS_METADATA } from './config/scrapers.config';
import { VaultEntity } from './entities/vault.entity';
import { ScrapedCacheEntity } from './entities/cache.entity';
import { encrypt, decrypt } from './utils/crypto';

export type SessionStatus = 'PROCESSING' | 'CHALLENGE_REQUIRED' | 'SUCCESS' | 'FAILED';

export interface SessionState {
  userId: string;
  bankId: string;
  status: SessionStatus;
  challenge?: {
    type: string;
    message: string;
  };
  credentials?: Record<string, string>;
  error?: string;
  errorCode?:
    | 'INVALID_CREDENTIALS'
    | 'CHALLENGE_FAILED'
    | 'BANK_UNAVAILABLE'
    | 'SESSION_EXPIRED'
    | 'UNKNOWN_CONNECT_ERROR';
  internalErrorRaw?: string;
  resolveOtp?: (code: string) => void;
  rejectOtp?: (error: any) => void;
  resultData?: any;
}

@Injectable()
export class ScraperService {
  constructor(
    @InjectRepository(VaultEntity)
    private readonly vaultRepository: Repository<VaultEntity>,
    @InjectRepository(ScrapedCacheEntity)
    private readonly cacheRepository: Repository<ScrapedCacheEntity>,
  ) {}

  private readonly sessions = new Map<string, SessionState>();

  // Session Management Methods
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

  getScrapersList(): any[] {
    const list = Object.entries(SCRAPERS_METADATA).map(([key, meta]) => {
      const libraryScraper = SCRAPERS[key];
      return {
        id: key,
        name: meta.name,
        englishName: libraryScraper?.name || key,
        loginFields: libraryScraper?.loginFields || ['username', 'password'],
        icon: meta.icon,
        enabled: meta.enabled,
      };
    });

    return list.filter((s) => s.enabled);
  }

  async saveCredentials(userId: string, bankId: string, credentials: Record<string, string>): Promise<void> {
    const encrypted = encrypt(JSON.stringify(credentials));
    let vaultEntry = await this.vaultRepository.findOne({ where: { userId, bankId } });
    if (!vaultEntry) {
      vaultEntry = this.vaultRepository.create({ userId, bankId });
    }
    vaultEntry.encryptedCredentials = encrypted;
    await this.vaultRepository.save(vaultEntry);
  }

  async getCredentials(userId: string, bankId: string): Promise<Record<string, string> | null> {
    const vaultEntry = await this.vaultRepository.findOne({ where: { userId, bankId } });
    if (!vaultEntry) return null;
    const decrypted = decrypt(vaultEntry.encryptedCredentials);
    return JSON.parse(decrypted);
  }

  async getUserConnections(userId: string): Promise<VaultEntity[]> {
    return this.vaultRepository.find({ where: { userId } });
  }

  async getCachedAccounts(userId: string): Promise<any[]> {
    const cacheEntries = await this.cacheRepository.find({ where: { userId } });
    const results: any[] = [];
    for (const entry of cacheEntries) {
      try {
        const accountsList = JSON.parse(entry.cachedData);
        for (const acc of accountsList) {
          results.push({
            bankId: entry.bankId,
            accountNumber: acc.accountNumber,
            balance: acc.balance,
            transactions: acc.transactions,
          });
        }
      } catch (err) {
        // Skip corrupted caches
      }
    }
    return results;
  }

  async setCachedAccounts(userId: string, bankId: string, accounts: any[]): Promise<void> {
    let cacheEntry = await this.cacheRepository.findOne({ where: { userId, bankId } });
    if (!cacheEntry) {
      cacheEntry = this.cacheRepository.create({ userId, bankId });
    }
    cacheEntry.cachedData = JSON.stringify(accounts);
    await this.cacheRepository.save(cacheEntry);
  }

  getHello(): string {
    return 'Hello World!';
  }
}
