import { ScraperService } from './scraper.service';

describe('ScraperService scanIncome', () => {
  let service: ScraperService;

  beforeEach(() => {
    const repoMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };
    service = new ScraperService(
      repoMock as any,
      repoMock as any,
      repoMock as any,
      repoMock as any,
      repoMock as any,
      {} as any,
    );
  });

  it('counts categorized credit expenses and valid incomes', async () => {
    const result = await service.scanIncome({
      period: 'both',
      accounts: [
        {
          bankId: 'hapoalim',
          balance: 14500,
          transactions: [
            {
              id: 'inc',
              date: new Date().toISOString(),
              processedDate: new Date().toISOString(),
              amount: 5000,
              chargedAmount: 5000,
              description: 'העברה נכנסת',
              memo: 'משכורת',
              originalCurrency: 'ILS',
            },
            {
              id: 'generic-transfer',
              date: new Date().toISOString(),
              processedDate: new Date().toISOString(),
              amount: 340,
              chargedAmount: 340,
              description: 'העברה',
              memo: '',
              originalCurrency: 'ILS',
            },
            {
              id: 'bit-transfer',
              date: new Date().toISOString(),
              processedDate: new Date().toISOString(),
              amount: 75,
              chargedAmount: 75,
              description: 'bit העברת כסף',
              memo: '',
              originalCurrency: 'ILS',
            },
          ],
        },
        {
          bankId: 'max',
          balance: -900,
          transactions: [
            {
              id: 'exp',
              date: new Date().toISOString(),
              processedDate: new Date().toISOString(),
              amount: -150,
              chargedAmount: -150,
              description: 'וולט',
              memo: '',
              originalCurrency: 'ILS',
            },
            {
              id: 'refund',
              date: new Date().toISOString(),
              processedDate: new Date().toISOString(),
              amount: 100,
              chargedAmount: 100,
              description: 'זיכוי אשראי',
              memo: '',
              originalCurrency: 'ILS',
            },
          ],
        },
      ],
    });

    expect(result.totalIncome).toBe(5415);
    expect(result.totalExpenses).toBe(150);
    expect(result.totalBalance).toBe(14500);
    expect(result.categories).toEqual([
      { name: 'מזון', amount: 150, count: 1 },
    ]);
  });

  it('includes uncategorized credit expenses under לא מסווג', async () => {
    const result = await service.scanIncome({
      period: 'both',
      accounts: [
        {
          bankId: 'isracard',
          transactions: [
            {
              id: 'unknown',
              date: new Date().toISOString(),
              processedDate: new Date().toISOString(),
              amount: -210,
              chargedAmount: -210,
              description: 'עסקה לא מזוהה',
              memo: '',
              originalCurrency: 'ILS',
            },
            {
              id: 'generic',
              date: new Date().toISOString(),
              processedDate: new Date().toISOString(),
              amount: -30,
              chargedAmount: -30,
              description: 'הוראת קבע',
              memo: '',
              originalCurrency: 'ILS',
            },
          ],
        },
      ],
    });

    expect(result.totalExpenses).toBe(210);
    expect(result.categories).toEqual([
      { name: 'לא מסווג', amount: 210, count: 1 },
    ]);
  });
});
