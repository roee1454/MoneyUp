import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

/**
 * Database Entity representing the Message table/collection.
 */
@Entity('messages')
@Index(['conversationId', 'createdAt'])
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  conversationId: string;

  @Column({ type: 'text' })
  role: MessageRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-json', nullable: true })
  tool_calls: any[] | null;

  @Column({ type: 'text', nullable: true })
  tool_call_id: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
