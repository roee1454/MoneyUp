import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { MessageRole } from '@money-up/types';
import { ConversationEntity } from './conversation.entity';
export type { MessageRole };

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

  @ManyToOne(() => ConversationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: ConversationEntity;

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
