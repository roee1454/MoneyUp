import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { SpendingService } from './spending.service';
import { SpendingScansResponse } from '../../types/gateway.types';
import { requireSessionUserId } from '../../utils/auth.utils';

@Controller('spending')
export class SpendingController {
  constructor(private readonly spendingService: SpendingService) {}

  @Get('scans')
  async getSpendingScans(
    @Req() request: Request,
    @Query('period') period?: 'current' | 'previous' | 'both',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SpendingScansResponse> {
    const userId = requireSessionUserId(request);
    const normalizedPeriod = this.normalizePeriod(period);
    return this.spendingService.computeSpendingScans(
      userId,
      undefined,
      normalizedPeriod,
      false,
      startDate,
      endDate,
    );
  }

  @Get('scans/debug')
  async getSpendingScansDebug(
    @Req() request: Request,
    @Query('period') period?: 'current' | 'previous' | 'both',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SpendingScansResponse> {
    const userId = requireSessionUserId(request);
    const normalizedPeriod = this.normalizePeriod(period);
    return this.spendingService.computeSpendingScans(
      userId,
      undefined,
      normalizedPeriod,
      true,
      startDate,
      endDate,
    );
  }

  @Post('scans/annotate')
  async annotateSpendingScans(
    @Req() request: Request,
    @Body()
    payload: {
      period?: 'current' | 'previous' | 'both';
      startDate?: string;
      endDate?: string;
      provider?: 'openai' | 'claude' | 'gemini';
      model?: string;
    },
  ): Promise<SpendingScansResponse> {
    const userId = requireSessionUserId(request);
    const normalizedPeriod = this.normalizePeriod(payload.period);
    return this.spendingService.runSpendingAnnotationPass(
      userId,
      normalizedPeriod,
      payload.startDate,
      payload.endDate,
      payload.provider,
      payload.model,
    );
  }

  @Post('transactions/:bankId/:accountNumber/:id/duplicate')
  async toggleTransactionDuplicate(
    @Req() request: Request,
    @Body() payload: { isDuplicate: boolean },
    @Param('bankId') bankId: string,
    @Param('accountNumber') accountNumber: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const userId = requireSessionUserId(request);
    await this.spendingService.markTransactionDuplicate(
      userId,
      bankId,
      accountNumber,
      id,
      payload.isDuplicate,
    );
    return { success: true };
  }

  private normalizePeriod(period?: string): 'current' | 'previous' | 'both' {
    if (period === 'previous' || period === 'both' || period === 'current') {
      return period;
    }
    return 'current';
  }
}
