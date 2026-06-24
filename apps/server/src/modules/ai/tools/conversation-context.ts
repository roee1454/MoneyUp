import { Injectable } from '@nestjs/common';
import { ConversationsService } from '../../conversations/conversations.service';
import { ToolRunner, ToolRegistry } from './tool-registry';

@Injectable()
export class SearchPastConversationsRunner implements ToolRunner {
  readonly name = 'search_past_conversations';

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly registry: ToolRegistry,
  ) {
    this.registry.register(this);
  }

  async execute(userId: string, args: any): Promise<any> {
    try {
      const conversations = await this.conversationsService.getConversations(userId);
      const query = String(args.query || '').trim().toLowerCase();
      const limit = Number(args.limit || 10);

      let filtered = conversations;
      if (query) {
        filtered = conversations.filter((c) =>
          (c.title || '').toLowerCase().includes(query)
        );
      }

      const results = filtered.slice(0, limit).map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

      return {
        conversations: results,
        count: results.length,
      };
    } catch (e) {
      console.error(`Tool ${this.name} execution failed`, e);
      return { error: 'Failed to search past conversations.' };
    }
  }
}

@Injectable()
export class GetPastConversationMessagesRunner implements ToolRunner {
  readonly name = 'get_past_conversation_messages';

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly registry: ToolRegistry,
  ) {
    this.registry.register(this);
  }

  async execute(userId: string, args: any): Promise<any> {
    try {
      const conversationId = args.conversationId;
      if (!conversationId) {
        return { error: 'conversationId is required.' };
      }

      const limit = Number(args.limit || 50);

      // getConversation handles checking that the conversation belongs to the user
      const { conversation, messages } = await this.conversationsService.getConversation(userId, conversationId);

      // Sort chronological, but respect limit (we take the last N messages to capture the most recent context if it's long)
      const slicedMessages = messages.slice(-limit).map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      }));

      return {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          updatedAt: conversation.updatedAt,
        },
        messages: slicedMessages,
        count: slicedMessages.length,
      };
    } catch (e: any) {
      console.error(`Tool ${this.name} execution failed`, e);
      return { error: e.message || 'Failed to retrieve conversation messages.' };
    }
  }
}
