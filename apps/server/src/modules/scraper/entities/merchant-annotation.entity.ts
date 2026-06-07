import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('merchant_annotations')
export class MerchantAnnotationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  normalizedMerchant: string;

  @Column()
  displayMerchant: string;

  @Column()
  category: string;

  @Column({ type: 'text', nullable: true })
  keywords?: string | null;

  @Column({ default: 'ai' })
  source: 'ai' | 'manual' | 'rule_seed';

  @Column({ nullable: true })
  model?: string;

  @Column({ type: 'float', nullable: true })
  confidence?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
