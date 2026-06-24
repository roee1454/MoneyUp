import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

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

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  bankId!: string;

  @Column()
  startDate!: string; // YYYY-MM-DD

  @Column()
  endDate!: string; // YYYY-MM-DD
}
