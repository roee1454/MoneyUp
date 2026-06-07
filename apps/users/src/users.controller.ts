import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { MessageRole } from './entities/message.entity';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern('user_create')
  create(
    @Payload()
    data: {
      username: string;
      email: string;
      lockProfile?: boolean;
      unlockKey?: string;
    },
  ) {
    return this.usersService.create(data);
  }

  @MessagePattern('user_find_all')
  findAll() {
    return this.usersService.findAll();
  }

  @MessagePattern('user_find_one')
  findOne(@Payload() id: string) {
    return this.usersService.findOne(id);
  }

  @MessagePattern('user_update')
  update(
    @Payload()
    payload: {
      id: string;
      data: {
        username?: string;
        email?: string;
        scraperTimeoutRetryCount?: number;
        scraperAutoSyncCooldownSeconds?: number;
      };
    },
  ) {
    return this.usersService.update(payload.id, payload.data);
  }

  @MessagePattern('user_delete')
  remove(@Payload() id: string) {
    return this.usersService.remove(id);
  }

  @MessagePattern('user_delete_confirmed')
  removeConfirmed(
    @Payload() payload: { id: string; confirmationEmail: string },
  ) {
    return this.usersService.deleteWithConfirmation(
      payload.id,
      payload.confirmationEmail,
    );
  }

  @MessagePattern('user_verify_unlock')
  verifyUnlock(@Payload() payload: { id: string; unlockKey: string }) {
    return this.usersService.verifyUnlockKey(payload.id, payload.unlockKey);
  }

  @MessagePattern('user_save_ai_config')
  saveAiConfig(
    @Payload()
    payload: {
      id: string;
      provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
      apiKey: string;
      preferredModel: string;
      activeProvider?: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
      config?: {
        model: string;
        preset: 'accurate' | 'moderate' | 'save_tokens' | 'custom';
        temperature?: number;
        maxTokens?: number;
        stream?: boolean;
        forceMarkdown?: boolean;
      };
    },
  ) {
    return this.usersService.saveAiConfig(payload.id, payload);
  }

  @MessagePattern('user_get_ai_config')
  getAiConfig(@Payload() id: string) {
    return this.usersService.getAiConfig(id);
  }

  @MessagePattern('user_update_ai_settings')
  updateAiSettings(@Payload() payload: { id: string; forceMarkdown: boolean }) {
    return this.usersService.updateAiSettings(
      payload.id,
      payload.forceMarkdown,
    );
  }

  @MessagePattern('user_delete_ai_provider')
  deleteAiProvider(
    @Payload()
    payload: {
      id: string;
      provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
    },
  ) {
    return this.usersService.deleteAiProvider(payload.id, payload.provider);
  }

  @MessagePattern('user_save_scraper_settings')
  saveScraperSettings(
    @Payload()
    payload: {
      id: string;
      scraperTimeoutRetryCount: number;
      scraperAutoSyncCooldownSeconds?: number;
      scraperShowBrowser?: boolean;
      scraperLoginTimeoutSeconds?: number;
      scraperDefaultTimeoutSeconds?: number;
      scraperChromiumPath?: string;
    },
  ) {
    return this.usersService.saveScraperSettings(payload.id, payload);
  }

  @MessagePattern('user_get_conversations')
  getConversations(@Payload() userId: string) {
    return this.usersService.getConversations(userId);
  }

  @MessagePattern('user_get_conversation')
  getConversation(
    @Payload() payload: { userId: string; conversationId: string },
  ) {
    return this.usersService.getConversation(
      payload.userId,
      payload.conversationId,
    );
  }

  @MessagePattern('user_create_conversation')
  createConversation(@Payload() payload: { userId: string; title: string }) {
    return this.usersService.createConversation(payload.userId, payload.title);
  }

  @MessagePattern('user_add_message')
  addMessage(
    @Payload()
    payload: {
      userId: string;
      conversationId: string;
      role: MessageRole;
      content: string;
      tool_calls?: any[];
      tool_call_id?: string;
    },
  ) {
    return this.usersService.addMessage(
      payload.userId,
      payload.conversationId,
      payload.role,
      payload.content,
      payload.tool_calls,
      payload.tool_call_id,
    );
  }

  @MessagePattern('user_delete_conversation')
  deleteConversation(
    @Payload() payload: { userId: string; conversationId: string },
  ) {
    return this.usersService.deleteConversation(
      payload.userId,
      payload.conversationId,
    );
  }

  @MessagePattern('ping')
  ping() {
    return 'pong';
  }
}
