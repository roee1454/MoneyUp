import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

/**
 * Database Entity representing the ScrapedCoverage table/collection.
 */
@Entity('scraper_coverage')
@Index(['userId', 'bankId'])
export class ScrapedCoverageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  bankId!: string;

  @Column()
  startDate!: string; // YYYY-MM-DD

  @Column()
  endDate!: string; // YYYY-MM-DD
}
