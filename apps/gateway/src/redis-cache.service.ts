import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: RedisClientType | null = null;
  private connectPromise: Promise<void> | null = null;

  private async getClient(): Promise<RedisClientType> {
    if (this.client?.isOpen) {
      return this.client;
    }

    if (!this.client) {
      const host = process.env.REDIS_HOST ?? '127.0.0.1';
      const port = Number(process.env.REDIS_PORT ?? 6379);
      const password = process.env.REDIS_PASSWORD;
      const db = Number(process.env.REDIS_DB ?? 0);

      this.client = createClient({
        socket: { host, port },
        password: password || undefined,
        database: Number.isFinite(db) ? db : 0,
      });

      this.client.on('error', (error) => {
        this.logger.error(`Redis client error: ${error.message}`);
      });
    }

    if (!this.connectPromise) {
      this.connectPromise = this.client
        .connect()
        .then(() => undefined)
        .finally(() => {
          this.connectPromise = null;
        });
    }

    await this.connectPromise;
    return this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    const client = await this.getClient();
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const client = await this.getClient();
    await client.set(key, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    const client = await this.getClient();
    await client.del(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    const client = await this.getClient();
    const keys = await client.keys(`${prefix}*`);
    if (keys.length === 0) return;
    await client.del(keys);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }
}
