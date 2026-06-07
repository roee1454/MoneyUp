import * as fs from 'fs';
import { BrowserService } from './browser.service';
import * as browsers from '@puppeteer/browsers';
import * as puppeteer from 'puppeteer';

import { ConfigService } from '@nestjs/config';

// Mock fs
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    existsSync: jest.fn(),
    accessSync: jest.fn(),
  };
});

// Mock @puppeteer/browsers
jest.mock('@puppeteer/browsers', () => ({
  Browser: { CHROMIUM: 'chromium', CHROME: 'chrome' },
  BrowserPlatform: { LINUX: 'linux' },
  getInstalledBrowsers: jest.fn(),
  install: jest.fn(),
  resolveBuildId: jest.fn(),
  detectBrowserPlatform: jest.fn(),
}));

// Mock puppeteer
jest.mock('puppeteer', () => ({
  executablePath: jest.fn(),
}));

const CHROMIUM_PATH = '/usr/bin/chromium';

describe('BrowserService', () => {
  let service: BrowserService;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService = {
      get: jest.fn(),
    } as unknown as ConfigService;
    service = new BrowserService(mockConfigService);
  });

  describe('detectChromium', () => {
    it('should detect chromium when it exists in puppeteer cache', async () => {
      (browsers.getInstalledBrowsers as jest.Mock).mockResolvedValue([
        {
          browser: 'chromium',
          buildId: '148.0.7778.97',
          platform: 'linux',
          executablePath: CHROMIUM_PATH,
        },
      ]);

      const detection = await service.detectChromium();

      expect(detection.success).toBe(true);
      expect(detection.path).toBe(CHROMIUM_PATH);
      expect(detection.version).toBe('chromium@148.0.7778.97');
      expect(detection.availableBrowsers).toHaveLength(1);
      expect(detection.availableBrowsers[0].installed).toBe(true);
    });

    it('should return success: false when no browser is found in cache', async () => {
      (browsers.getInstalledBrowsers as jest.Mock).mockResolvedValue([]);

      const detection = await service.detectChromium();

      expect(detection.success).toBe(false);
      expect(detection.path).toBeNull();
    });
  });

  describe('findSystemBrowser', () => {
    it('should find browser via puppeteer.executablePath()', async () => {
      (puppeteer.executablePath as jest.Mock).mockReturnValue(CHROMIUM_PATH);
      (fs.existsSync as jest.Mock).mockImplementation((p) => p === CHROMIUM_PATH);
      (fs.accessSync as jest.Mock).mockReturnValue(undefined);

      const path = await service.findSystemBrowser();
      expect(path).toBe(CHROMIUM_PATH);
    });

    it('should return null if no system browser is found', async () => {
      (puppeteer.executablePath as jest.Mock).mockReturnValue(null);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const path = await service.findSystemBrowser();
      expect(path).toBeNull();
    });
  });

  describe('installChromium', () => {
    it('should attempt to install chromium via API', async () => {
      (browsers.detectBrowserPlatform as jest.Mock).mockReturnValue('linux');
      (browsers.resolveBuildId as jest.Mock).mockResolvedValue('123456');
      (browsers.install as jest.Mock).mockResolvedValue({
        browser: 'chromium',
        buildId: '123456',
        executablePath: CHROMIUM_PATH,
      });

      const result = await service.installChromium();
      expect(result.success).toBe(true);
      expect(result.output).toContain('Installed chromium@123456');
    });
  });

  describe('ensureBrowser', () => {
    it('should return cached browser if found (Prioritize cached)', async () => {
       (browsers.getInstalledBrowsers as jest.Mock).mockResolvedValue([
        {
          browser: 'chromium',
          buildId: '123',
          platform: 'linux',
          executablePath: CHROMIUM_PATH,
        },
      ]);
      (fs.existsSync as jest.Mock).mockImplementation((p) => p === CHROMIUM_PATH);
      (fs.accessSync as jest.Mock).mockReturnValue(undefined);

      const path = await service.ensureBrowser();
      expect(path).toBe(CHROMIUM_PATH);
      expect(browsers.install).not.toHaveBeenCalled();
    });

    it('should install if nothing is found', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (browsers.getInstalledBrowsers as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([
        {
          browser: 'chromium',
          buildId: '123456',
          platform: 'linux',
          executablePath: CHROMIUM_PATH,
        },
      ]);
      (browsers.detectBrowserPlatform as jest.Mock).mockReturnValue('linux');
      (browsers.resolveBuildId as jest.Mock).mockResolvedValue('123456');
      (browsers.install as jest.Mock).mockResolvedValue({
        browser: 'chromium',
        buildId: '123456',
        executablePath: CHROMIUM_PATH,
      });

      const path = await service.ensureBrowser();
      expect(path).toBe(CHROMIUM_PATH);
      expect(browsers.install).toHaveBeenCalled();
    });
  });
});
