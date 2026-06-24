import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VaultEntity } from '../entities/vault.entity';
import { ScrapedCacheEntity } from '../entities/cache.entity';
import { ScrapedCoverageEntity } from '../entities/coverage.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { encryptVault as encrypt, decryptVault as decrypt } from '../../../utils/crypto.utils';

/**
 * Service providing business logic and database access for Credentials.
 */
@Injectable()
export class CredentialsService {
  constructor(
    @InjectRepository(VaultEntity)
    private readonly vaultRepository: Repository<VaultEntity>,
    @InjectRepository(ScrapedCacheEntity)
    private readonly cacheRepository: Repository<ScrapedCacheEntity>,
    @InjectRepository(ScrapedCoverageEntity)
    private readonly coverageRepository: Repository<ScrapedCoverageEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
  ) {}

  async findDuplicateEntry(
    userId: string,
    bankId: string,
    credentials: Record<string, string>,
  ): Promise<VaultEntity | null> {
    const connections = await this.getUserConnections(userId);
    for (const conn of connections) {
      if (conn.bankId !== bankId) continue;
      try {
        const decrypted = decrypt(conn.encryptedCredentials);
        const creds = JSON.parse(decrypted) as Record<string, string>;
        const newKeys = Object.keys(credentials);
        const oldKeys = Object.keys(creds);
        if (newKeys.length !== oldKeys.length) continue;
        const match = newKeys.every((key) => creds[key] === credentials[key]);
        if (match) return conn;
      } catch {
        // ignore decryption/parse errors
      }
    }
    return null;
  }

  async checkDuplicateCredentials(
    userId: string,
    bankId: string,
    credentials: Record<string, string>,
  ): Promise<boolean> {
    const duplicate = await this.findDuplicateEntry(userId, bankId, credentials);
    return !!duplicate;
  }

  async saveCredentials(
    userId: string,
    bankId: string,
    credentials: Record<string, string>,
  ): Promise<void> {
    const encrypted = encrypt(JSON.stringify(credentials));
    let vaultEntry = await this.findDuplicateEntry(userId, bankId, credentials);
    if (!vaultEntry) {
      vaultEntry = this.vaultRepository.create({ userId, bankId });
    }
    vaultEntry.encryptedCredentials = encrypted;
    vaultEntry.lastError = null;
    await this.vaultRepository.save(vaultEntry);
  }

  async getCredentials(
    userId: string,
    bankId: string,
  ): Promise<Record<string, string> | null> {
    const vaultEntry = await this.vaultRepository.findOne({
      where: { userId, bankId },
    });
    if (!vaultEntry) return null;
    const decrypted = decrypt(vaultEntry.encryptedCredentials);
    return JSON.parse(decrypted) as Record<string, string>;
  }

  async getUserConnections(userId: string): Promise<VaultEntity[]> {
    return this.vaultRepository.find({ where: { userId } });
  }

  async getUserConnectionsCount(userId: string): Promise<number> {
    return this.vaultRepository.count({ where: { userId } });
  }

  async markConnectionFailed(
    userId: string,
    bankId: string,
    error: string,
    credentials?: Record<string, string>,
  ): Promise<void> {
    let vaultEntry: VaultEntity | null = null;
    if (credentials) {
      vaultEntry = await this.findDuplicateEntry(userId, bankId, credentials);
    }
    if (!vaultEntry) {
      vaultEntry = await this.vaultRepository.findOne({
        where: { userId, bankId },
      });
    }
    if (vaultEntry) {
      vaultEntry.lastError = error;
      vaultEntry.updatedAt = new Date();
      await this.vaultRepository.save(vaultEntry);
    }
  }

  async clearConnectionError(
    userId: string,
    bankId: string,
    credentials?: Record<string, string>,
  ): Promise<void> {
    let vaultEntry: VaultEntity | null = null;
    if (credentials) {
      vaultEntry = await this.findDuplicateEntry(userId, bankId, credentials);
    }
    if (!vaultEntry) {
      vaultEntry = await this.vaultRepository.findOne({
        where: { userId, bankId },
      });
    }
    if (vaultEntry) {
      vaultEntry.lastError = null;
      vaultEntry.updatedAt = new Date();
      await this.vaultRepository.save(vaultEntry);
    }
  }

  /** Records the timestamp of the last successful scrape.
   *  This is intentionally separate from updatedAt so we can
   *  reliably distinguish "recently scraped" from "recently connected". */
  async markScrapedAt(
    userId: string,
    bankId: string,
    credentials?: Record<string, string>,
  ): Promise<void> {
    let vaultEntry: VaultEntity | null = null;
    if (credentials) {
      vaultEntry = await this.findDuplicateEntry(userId, bankId, credentials);
    }
    if (vaultEntry) {
      await this.vaultRepository.update({ id: vaultEntry.id }, { lastScrapedAt: new Date() });
    } else {
      await this.vaultRepository.update({ userId, bankId }, { lastScrapedAt: new Date() });
    }
  }

  async getLastError(userId: string, bankId: string): Promise<string | null> {
    const vaultEntry = await this.vaultRepository.findOne({
      where: { userId, bankId },
    });
    return vaultEntry?.lastError ?? null;
  }

  async removeConnection(userId: string, bankId: string): Promise<void> {
    await this.vaultRepository.delete({ userId, bankId });
    await this.cacheRepository.delete({ userId, bankId });
    await this.coverageRepository.delete({ userId, bankId });
    await this.transactionRepository.delete({ userId, bankId });
  }
}
