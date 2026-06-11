import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Class representing User.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: false })
  isLocked: boolean;

  @Column({ type: 'text', nullable: true })
  unlockKeyHash: string | null;

  @Column({ type: 'text', nullable: true })
  unlockKeySalt: string | null;

  @Column({ type: 'text', nullable: true })
  openaiKeyEncrypted: string | null;

  @Column({ type: 'text', nullable: true })
  claudeKeyEncrypted: string | null;

  @Column({ type: 'text', nullable: true })
  geminiKeyEncrypted: string | null;

  @Column({ type: 'text', nullable: true })
  ollamaKeyEncrypted: string | null;

  @Column({ type: 'text', nullable: true })
  openrouterKeyEncrypted: string | null;

  @Column({ type: 'text', nullable: true })
  preferredModel: string | null;

  @Column({ type: 'text', nullable: true })
  activeAiProvider: string | null;

  @Column({ type: 'simple-json', nullable: true })
  aiProviderConfigs: Record<string, any> | null;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
