import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from './users.service';

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
      provider: 'openai' | 'claude' | 'gemini';
      apiKey: string;
      preferredModel: string;
      activeProvider?: 'openai' | 'claude' | 'gemini';
      config?: {
        model: string;
        preset: 'accurate' | 'moderate' | 'save_tokens' | 'custom';
        temperature?: number;
        maxTokens?: number;
        stream?: boolean;
      };
    },
  ) {
    return this.usersService.saveAiConfig(payload.id, payload);
  }

  @MessagePattern('user_get_ai_config')
  getAiConfig(@Payload() id: string) {
    return this.usersService.getAiConfig(id);
  }

  @MessagePattern('user_delete_ai_provider')
  deleteAiProvider(
    @Payload() payload: { id: string; provider: 'openai' | 'claude' | 'gemini' },
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
    },
  ) {
    return this.usersService.saveScraperSettings(payload.id, payload);
  }

  @MessagePattern('ping')
  ping() {
    return 'pong';
  }
}
