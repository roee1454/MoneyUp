import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScrapedCoverageEntity } from '../entities/coverage.entity';
import { addDays } from '@money-up/common';

@Injectable()
export class CoverageService {
  constructor(
    @InjectRepository(ScrapedCoverageEntity)
    private readonly coverageRepository: Repository<ScrapedCoverageEntity>,
  ) {}

  async getCachedCoverageMap(
    userId: string,
  ): Promise<Map<string, Array<{ startDate: string; endDate: string }>>> {
    const coverages = await this.coverageRepository.find({ where: { userId } });
    const map = new Map<
      string,
      Array<{ startDate: string; endDate: string }>
    >();
    for (const entry of coverages) {
      const list = map.get(entry.bankId) ?? [];
      list.push({ startDate: entry.startDate, endDate: entry.endDate });
      map.set(entry.bankId, list);
    }
    return map;
  }

  async getCoveredIntervals(
    userId: string,
    bankId: string,
  ): Promise<Array<{ startDate: string; endDate: string }>> {
    const intervals = await this.coverageRepository.find({
      where: { userId, bankId },
    });
    return intervals.map((i) => ({
      startDate: i.startDate,
      endDate: i.endDate,
    }));
  }

  isRangeCovered(
    coverage: Array<{ startDate: string; endDate: string }> | undefined,
    startDate?: string,
    endDate?: string,
  ): boolean {
    if (!coverage || coverage.length === 0) return false;
    if (!startDate || !endDate) return false;
    const uncovered = this.getUncoveredIntervals(
      { startDate: startDate.slice(0, 10), endDate: endDate.slice(0, 10) },
      coverage,
    );
    return uncovered.length === 0;
  }

  getUncoveredIntervals(
    requested: { startDate: string; endDate: string },
    covered: Array<{ startDate: string; endDate: string }>,
  ): Array<{ startDate: string; endDate: string }> {
    const sorted = [...covered].sort((a, b) =>
      a.startDate.localeCompare(b.startDate),
    );
    const uncovered: Array<{ startDate: string; endDate: string }> = [];
    let currentStart = requested.startDate;

    for (const interval of sorted) {
      if (interval.endDate < currentStart) {
        continue;
      }
      if (interval.startDate > requested.endDate) {
        break;
      }
      if (interval.startDate > currentStart) {
        const gapEnd = addDays(interval.startDate, -1);
        if (gapEnd >= currentStart) {
          uncovered.push({ startDate: currentStart, endDate: gapEnd });
        }
      }
      currentStart = addDays(interval.endDate, 1);
      if (currentStart > requested.endDate) {
        break;
      }
    }

    if (currentStart <= requested.endDate) {
      uncovered.push({ startDate: currentStart, endDate: requested.endDate });
    }

    return uncovered;
  }

  mergeIntervals(
    intervals: Array<{ startDate: string; endDate: string }>,
  ): Array<{ startDate: string; endDate: string }> {
    if (intervals.length === 0) return [];
    const sorted = [...intervals].sort((a, b) =>
      a.startDate.localeCompare(b.startDate),
    );
    const merged: Array<{ startDate: string; endDate: string }> = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1];
      const current = sorted[i];
      const dayAfterLastEnd = addDays(last.endDate, 1);
      if (current.startDate <= dayAfterLastEnd) {
        if (current.endDate > last.endDate) {
          last.endDate = current.endDate;
        }
      } else {
        merged.push(current);
      }
    }
    return merged;
  }

  async saveCoveredInterval(
    userId: string,
    bankId: string,
    interval: { startDate: string; endDate: string },
  ): Promise<void> {
    const allIntervals = await this.coverageRepository.find({
      where: { userId, bankId },
    });
    const merged = this.mergeIntervals([
      ...allIntervals.map((i) => ({
        startDate: i.startDate,
        endDate: i.endDate,
      })),
      interval,
    ]);

    await this.coverageRepository.delete({ userId, bankId });
    const newEntities = merged.map((i) =>
      this.coverageRepository.create({
        userId,
        bankId,
        startDate: i.startDate,
        endDate: i.endDate,
      }),
    );
    await this.coverageRepository.save(newEntities);
  }

  async removeCoverage(userId: string, bankId: string): Promise<void> {
    await this.coverageRepository.delete({ userId, bankId });
  }
}
