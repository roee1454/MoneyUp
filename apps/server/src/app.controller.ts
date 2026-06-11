import { Controller, Get } from '@nestjs/common';

/**
 * NestJS Controller handling incoming HTTP requests for App.
 */
@Controller()
export class AppController {
  @Get('health')
  getHealth(): { status: 'healthy'; timestamp: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
