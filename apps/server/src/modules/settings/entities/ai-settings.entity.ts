import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('ai_settings')
export class AiSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  userId: string;

  @Column({ type: 'text', nullable: true })
  openaiKeyEncrypted: string | null;

  @Column({ type: 'text', nullable: true })
  claudeKeyEncrypted: string | null;

  @Column({ type: 'text', nullable: true })
  geminiKeyEncrypted: string | null;

  @Column({ type: 'text', nullable: true })
  ollamaKeyEncrypted: string | null;

  @Column({ type: 'text', nullable: true })
  preferredModel: string | null;

  @Column({ type: 'text', nullable: true })
  activeAiProvider: string | null;

  @Column({ type: 'simple-json', nullable: true })
  aiProviderConfigs: Record<string, any> | null;
}
