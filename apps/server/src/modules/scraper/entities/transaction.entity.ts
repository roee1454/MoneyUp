import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Database Entity representing the Transaction table/collection.
 */
@Entity('transaction')
@Index(['userId', 'bankId', 'accountNumber'])
export class TransactionEntity {
  @PrimaryColumn()
  userId!: string;

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

  @Column({ default: false })
  isDuplicate!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
