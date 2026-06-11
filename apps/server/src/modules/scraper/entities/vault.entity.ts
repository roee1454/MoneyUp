import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Database Entity representing the Vault table/collection.
 */
@Entity('vault')
export class VaultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  bankId: string;

  @Column()
  encryptedCredentials: string;

  @Column({ nullable: true, type: 'text' })
  lastError: string | null;

  /** Timestamp of the last SUCCESSFUL scrape for this connection.
   *  Distinct from updatedAt which changes on credential saves and error updates. */
  @Column({ nullable: true, type: 'datetime' })
  lastScrapedAt: Date | null;

  @UpdateDateColumn()
  updatedAt: Date;
}

