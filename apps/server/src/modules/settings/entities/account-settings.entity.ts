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
}
