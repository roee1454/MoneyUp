import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Database Entity representing the Transaction table/collection.
 */
@Entity('transaction')
@Index(['userId', 'bankId', 'accountNumber'])
export class TransactionEntity {
  @PrimaryColumn()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @PrimaryColumn()
  bankId!: string;

  @PrimaryColumn()
  accountNumber!: string;

  @PrimaryColumn()
  id!: string;

  @Column()
  date!: string;

  @Column()
  processedDate!: string;

  @Column({ type: 'real' })
  amount!: number;

  @Column({ type: 'real' })
  chargedAmount!: number;

  @Column()
  description!: string;

  @Column({ nullable: true })
  memo?: string;

  @Column({ nullable: true })
  originalCurrency?: string;

  @Column({ nullable: true })
  type?: 'normal' | 'installments';

  @Column({ nullable: true })
  identifier?: string;

  @Column({ type: 'real', nullable: true })
  originalAmount?: number;

  @Column({ nullable: true })
  chargedCurrency?: string;

  @Column({ nullable: true })
  status?: 'completed' | 'pending';

  @Column({ type: 'int', nullable: true })
  installmentNumber?: number;

  @Column({ type: 'int', nullable: true })
  installmentTotal?: number;

  @Column({ default: false })
  isDuplicate!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
