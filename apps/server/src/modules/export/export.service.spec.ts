import { Test, TestingModule } from '@nestjs/testing';

jest.mock('../chromium/chromium.service', () => ({
  ChromiumService: jest.fn().mockImplementation(() => ({
    getCommonBrowserArgs: jest.fn().mockReturnValue([]),
    ensureBrowser: jest.fn().mockResolvedValue('/mock/chrome'),
  })),
}));

import { ExportService } from './export.service';
import { ChromiumService } from '../chromium/chromium.service';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as puppeteer from 'puppeteer';

jest.mock('fs/promises');
jest.mock('os');
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn().mockResolvedValue(undefined),
      waitForFunction: jest.fn().mockResolvedValue(undefined),
      emulateMediaType: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-data')),
    }),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('ExportService', () => {
  let service: ExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: ChromiumService,
          useValue: {
            getCommonBrowserArgs: jest.fn().mockReturnValue([]),
            ensureBrowser: jest.fn().mockResolvedValue('/mock/chrome'),
          },
        },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should save data file to selected dialog path', async () => {
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    jest.spyOn(service as any, 'openDialog').mockResolvedValue({ filepath: '/home/user/test-file.csv' });

    const result = await service.saveFile('test-content', 'test-file.csv', 'csv');
    expect(result.success).toBe(true);
    expect(result.filepath).toBe('/home/user/test-file.csv');
    expect(fs.writeFile).toHaveBeenCalledWith('/home/user/test-file.csv', 'test-content', 'utf8');
  });

  it('should render HTML to PDF and save the buffer to selected dialog path', async () => {
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    jest.spyOn(service as any, 'openDialog').mockResolvedValue({ filepath: '/home/user/test-file.pdf' });

    const result = await service.saveFile('<html></html>', 'test-file.pdf', 'pdf');
    expect(result.success).toBe(true);
    expect(result.filepath).toBe('/home/user/test-file.pdf');
    expect(puppeteer.launch).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalledWith('/home/user/test-file.pdf', expect.any(Buffer));
  });

  it('should return aborted when user cancels the dialog', async () => {
    jest.spyOn(service as any, 'openDialog').mockResolvedValue({ aborted: true });

    const result = await service.saveFile('test-content', 'test-file.csv', 'csv');
    expect(result.success).toBe(true);
    expect(result.aborted).toBe(true);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should return error when dialog is unsupported/fails', async () => {
    jest.spyOn(service as any, 'openDialog').mockResolvedValue({});

    const result = await service.saveFile('test-content', 'test-file.csv', 'csv');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Dialog not supported');
    expect(fs.writeFile).not.toHaveBeenCalled();
  });
});
