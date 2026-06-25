import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('account_settings')
export class AccountSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  userId: string;

  @Column({ default: false })
  isLocked: boolean;

  @Column({ type: 'text', nullable: true })
  unlockKeyHash: string | null;

  @Column({ type: 'text', nullable: true })
  unlockKeySalt: string | null;

  @Column({ type: 'text', default: '/dashboard' })
  initialLandingPage: string;

  @Column({ type: 'text', default: 'default' })
  accentColor: string;

  @Column({ type: 'text', default: 'ILS' })
  defaultCurrency: string;

  @Column({ type: 'integer', default: 30 })
  sessionTimeoutMinutes: number;
}
