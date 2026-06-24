import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity, MessageRole } from './entities/message.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Fetches all chat conversations belonging to a user, sorted by update date descending.
   */
  async getConversations(userId: string): Promise<ConversationEntity[]> {
    return this.conversationRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Retrieves a single conversation metadata along with its chronological messages list.
   */
  async getConversation(
    userId: string,
    conversationId: string,
  ): Promise<{ conversation: ConversationEntity; messages: MessageEntity[] }> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    const messages = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
    return { conversation, messages };
  }

  /**
   * Creates a new chat conversation session.
   */
  async createConversation(
    userId: string,
    title: string,
  ): Promise<ConversationEntity> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const conversation = this.conversationRepository.create({
      userId,
      title,
    });
    return this.conversationRepository.save(conversation);
  }

  /**
   * Appends a new message log to a conversation session and updates the conversation's updatedAt timestamp.
   */
  async addMessage(
    userId: string,
    conversationId: string,
    role: MessageRole,
    content: string,
    tool_calls?: any[],
    tool_call_id?: string,
  ): Promise<MessageEntity> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const message = this.messageRepository.create({
      conversationId,
      role,
      content,
      tool_calls: tool_calls ?? null,
      tool_call_id: tool_call_id ?? null,
    });
    await this.messageRepository.save(message);

    conversation.updatedAt = new Date();
    await this.conversationRepository.save(conversation);

    return message;
  }

  /**
   * Deletes a conversation session along with all its associated message records.
   */
  async deleteConversation(
    userId: string,
    conversationId: string,
  ): Promise<{ success: boolean }> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.messageRepository.delete({ conversationId });
    await this.conversationRepository.delete({ id: conversationId });

    return { success: true };
  }

  /**
   * Truncates a conversation session history by deleting a target message and all subsequent messages.
   */
  async truncateConversationAtMessage(
    userId: string,
    conversationId: string,
    messageId: string,
  ): Promise<{ success: boolean }> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const targetMessage = await this.messageRepository.findOne({
      where: { id: messageId, conversationId },
    });
    if (!targetMessage) {
      throw new NotFoundException('Message not found');
    }

    // Delete the target message and all subsequent messages
    await this.messageRepository
      .createQueryBuilder()
      .delete()
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('"createdAt" >= :createdAt', { createdAt: targetMessage.createdAt })
      .execute();

    return { success: true };
  }
}
