import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchantAnnotationEntity } from '../entities/merchant-annotation.entity';
import {
  ScanIncomeRequest,
  ScanIncomeResult,
} from '@money-up/types';
import { scanIncomeDeterministic } from './helpers/scans-calculator.helper';
import { normalizeMerchantKey } from './helpers/scans-description.helper';
import { isValidCategory } from './helpers/scans-categorizer.helper';

/**
 * Service responsible for processing transaction scans.
 * Orchestrates deterministic income and expense calculations, and manages merchant categorization annotations.
 */
@Injectable()
export class ScansService {
  constructor(
    @InjectRepository(MerchantAnnotationEntity)
    private readonly annotationRepository: Repository<MerchantAnnotationEntity>,
  ) {}

  /**
   * Scans a set of user accounts deterministically to calculate income/expense breakdowns and categorization.
   *
   * @param input ScanIncomeRequest containing accounts and range options.
   * @returns Promise<ScanIncomeResult>
   */
  async scanIncome(input: ScanIncomeRequest): Promise<ScanIncomeResult> {
    const annotationCache = new Map<string, string>();
    return scanIncomeDeterministic(
      input.accounts ?? [],
      input.period ?? 'current',
      input.startDate,
      input.endDate,
      input.debug === true,
      this.annotationRepository,
      annotationCache,
    );
  }

  /**
   * Saves or updates merchant categorization annotations in the database.
   *
   * @param annotations Array of annotation details to upsert.
   * @returns Promise<{ upserted: number }>
   */
  async upsertMerchantAnnotations(
    annotations: Array<{
      normalizedMerchant: string;
      displayMerchant: string;
      category: string;
      keywords?: string;
      source?: 'ai' | 'manual' | 'rule_seed';
      model?: string;
      confidence?: number;
    }>,
  ): Promise<{ upserted: number }> {
    let upserted = 0;
    for (const item of annotations) {
      const normalizedMerchant = normalizeMerchantKey(item.normalizedMerchant);
      if (!normalizedMerchant) continue;
      const existing = await this.annotationRepository.findOne({
        where: { normalizedMerchant },
      });
      const entity =
        existing ?? this.annotationRepository.create({ normalizedMerchant });
      entity.displayMerchant =
        String(item.displayMerchant ?? '').trim() || normalizedMerchant;
      entity.category = isValidCategory(item.category)
        ? item.category
        : 'לא מסווג';
      entity.keywords = item.keywords || entity.keywords || null;
      entity.source = item.source ?? 'ai';
      entity.model = item.model;
      entity.confidence = Number.isFinite(item.confidence)
        ? item.confidence
        : undefined;
      await this.annotationRepository.save(entity);
      upserted += 1;
    }
    return { upserted };
  }

  /**
   * Returns all merchant annotation records from the database.
   *
   * @returns Promise<MerchantAnnotationEntity[]>
   */
  async getAllAnnotations(): Promise<MerchantAnnotationEntity[]> {
    return this.annotationRepository.find({
      select: ['displayMerchant', 'normalizedMerchant', 'category', 'keywords'],
    });
  }

  /**
   * Search annotations by topic name, ranking them in-memory by matches.
   *
   * @param topic Topic keyword string.
   * @returns Promise<string[]> Top 15 matching merchant display names.
   */
  async findMerchantsByTopic(topic: string): Promise<string[]> {
    const term = topic.toLowerCase().trim();
    if (!term) return [];

    const allAnnotations = await this.annotationRepository.find({
      select: ['displayMerchant', 'normalizedMerchant', 'category', 'keywords'],
    });

    const scores = allAnnotations
      .map((ma) => {
        let score = 0;
        const display = (ma.displayMerchant || '').toLowerCase();
        const normalized = (ma.normalizedMerchant || '').toLowerCase();
        const category = (ma.category || '').toLowerCase();
        const keywords = (ma.keywords || '').toLowerCase().split(/[,\s]+/);

        if (display === term || normalized === term) score += 100;
        else if (display.includes(term) || normalized.includes(term))
          score += 50;

        if (category.includes(term)) score += 30;

        if (keywords.some((k) => k === term)) score += 80;
        else if (keywords.some((k) => k.includes(term))) score += 40;

        return { merchant: ma.displayMerchant, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    return [...new Set(scores.map((s) => s.merchant))].slice(0, 15);
  }
}
