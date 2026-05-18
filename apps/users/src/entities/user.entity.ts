import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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
  preferredModel: string | null;

  @Column({ type: 'text', nullable: true })
  activeAiProvider: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
