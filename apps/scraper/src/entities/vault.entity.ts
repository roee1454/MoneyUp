import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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
}
