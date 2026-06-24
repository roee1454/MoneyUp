import { Entity, PrimaryColumn, Column, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Database Entity representing the ScrapedCache table/collection.
 */
@Entity('scraped_cache')
export class ScrapedCacheEntity {
  @PrimaryColumn()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

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
