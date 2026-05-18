import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('scraped_cache')
export class ScrapedCacheEntity {
  @PrimaryColumn()
  userId: string;

  @PrimaryColumn()
  bankId: string;

  @Column({ type: 'text' })
  cachedData: string; // JSON string of UnifiedAccount[]

  @UpdateDateColumn()
  updatedAt: Date;
}
