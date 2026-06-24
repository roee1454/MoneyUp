import { Test, TestingModule } from '@nestjs/testing';

jest.mock('../chromium/chromium.service', () => ({
  ChromiumService: jest.fn().mockImplementation(() => ({
    getCommonBrowserArgs: jest.fn().mockReturnValue([]),
    ensureBrowser: jest.fn().mockResolvedValue('/mock/chrome'),
  })),
}));

import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('ExportController', () => {
  let controller: ExportController;
  let service: ExportService;

  const mockExportService = {
    saveFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportController],
      providers: [
        {
          provide: ExportService,
          useValue: mockExportService,
        },
      ],
    }).compile();

    controller = module.get<ExportController>(ExportController);
    service = module.get<ExportService>(ExportService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should save file successfully via the service', async () => {
    mockExportService.saveFile.mockResolvedValue({
      success: true,
      filepath: '/path/to/file.csv',
      fallback: false,
    });

    const body = { content: 'csv-data', filename: 'export.csv', extension: 'csv' };
    const result = await controller.saveFile(body);

    expect(result).toEqual({
      success: true,
      filepath: '/path/to/file.csv',
      fallback: false,
    });
    expect(service.saveFile).toHaveBeenCalledWith('csv-data', 'export.csv', 'csv');
  });

  it('should throw HTTP 400 if arguments are missing', async () => {
    const body = { content: '', filename: 'export.csv', extension: '' };
    await expect(controller.saveFile(body)).rejects.toThrow(
      new HttpException('Content, filename, and extension are required', HttpStatus.BAD_REQUEST),
    );
  });

  it('should throw HTTP 500 if save fails', async () => {
    mockExportService.saveFile.mockResolvedValue({
      success: false,
      error: 'Disk write error',
    });

    const body = { content: 'csv-data', filename: 'export.csv', extension: 'csv' };
    await expect(controller.saveFile(body)).rejects.toThrow(
      new HttpException('Disk write error', HttpStatus.INTERNAL_SERVER_ERROR),
    );
  });
});
