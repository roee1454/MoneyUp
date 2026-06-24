import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('scraper_settings')
export class ScraperSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  userId: string;

  @Column({ type: 'integer', default: 1 })
  scraperTimeoutRetryCount: number;

  @Column({ type: 'integer', default: 1800 })
  scraperAutoSyncCooldownSeconds: number;

  @Column({ type: 'boolean', default: false })
  scraperShowBrowser: boolean;

  @Column({ type: 'integer', default: 90 })
  scraperLoginTimeoutSeconds: number;

  @Column({ type: 'integer', default: 90 })
  scraperDefaultTimeoutSeconds: number;

  @Column({ type: 'text', nullable: true })
  scraperChromiumPath: string | null;
}
