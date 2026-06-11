import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * Database Entity representing the ScrapedCache table/collection.
 */
@Entity('scraped_cache')
export class ScrapedCacheEntity {
  @PrimaryColumn()
  userId: string;

  @PrimaryColumn()
  bankId: string;

  @Column({ type: 'text' })
  cachedData: string; // JSON string of UnifiedAccount[]

  @Column({ type: 'text', nullable: true })
  coverageStartDate?: string | null;

  @Column({ type: 'text', nullable: true })
  coverageEndDate?: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
