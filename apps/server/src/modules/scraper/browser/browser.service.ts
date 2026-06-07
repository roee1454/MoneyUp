import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as puppeteer from 'puppeteer';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import {
  Browser,
  BrowserPlatform,
  install,
  getInstalledBrowsers,
  resolveBuildId,
  detectBrowserPlatform,
} from '@puppeteer/browsers';

@Injectable()
export class BrowserService {
  constructor(private readonly configService: ConfigService) {}

  private getBrowserCacheDir(): string {
    return (
      process.env.PUPPETEER_CACHE_DIR ||
      path.join(os.homedir(), '.cache', 'puppeteer')
    );
  }

  getCommonBrowserArgs(): string[] {
    const configuredArgs = this.configService.get<string>(
      'SCRAPER_BROWSER_ARGS',
    );
    const args = configuredArgs
      ? configuredArgs
          .split(',')
          .map((arg) => arg.trim())
          .filter(Boolean)
      : process.env.CI === 'true'
        ? ['--no-sandbox', '--disable-setuid-sandbox']
        : [];

    // Auto-inject Linux sandbox flags to prevent crashes on many distros (Ubuntu 23.10+, etc.)
    if (process.platform === 'linux') {
      const linuxFlags = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ];
      // Only use disable-dev-shm-usage if we aren't sure about shm size.
      // In Docker with shm_size: 1gb, it's better to use /dev/shm.
      const useDevShm =
        this.configService.get<string>('SCRAPER_USE_DEV_SHM') === 'true';
      if (!useDevShm) {
        linuxFlags.push('--disable-dev-shm-usage');
      }

      for (const flag of linuxFlags) {
        if (!args.includes(flag)) {
          args.push(flag);
        }
      }
    } else if (
      !args.includes('--disable-blink-features=AutomationControlled')
    ) {
      args.push('--disable-blink-features=AutomationControlled');
    }

    // Add aggressive memory-saving flags
    const memoryFlags = [
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
      '--disable-default-apps',
      '--mute-audio',
      '--no-default-browser-check',
      '--autoplay-policy=user-gesture-required',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-notifications',
      '--disable-print-preview',
      '--disable-gpu',
    ];

    for (const flag of memoryFlags) {
      if (!args.includes(flag)) {
        args.push(flag);
      }
    }

    return args;
  }

  private detectPlatform(): BrowserPlatform {
    const platform = detectBrowserPlatform();
    if (!platform) {
      // Fallback to linux if detection fails (common for CI/Docker)
      return BrowserPlatform.LINUX;
    }
    return platform;
  }

  async findSystemBrowser(): Promise<string | null> {
    const checkPaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      process.env.SCRAPER_CHROMIUM_EXECUTABLE_PATH,
    ];

    // Try default puppeteer resolution (covers bundled browser)
    try {
      const defaultPath = puppeteer.executablePath();
      if (defaultPath) checkPaths.push(defaultPath);
    } catch (e) {
      // Ignore
    }

    // Platform specific common paths
    const platform = os.platform();
    if (platform === 'linux') {
      checkPaths.push(
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/snap/bin/chromium',
      );
    } else if (platform === 'win32') {
      const programFiles = [
        process.env.PROGRAMFILES,
        process.env['PROGRAMFILES(X86)'],
      ];
      for (const pf of programFiles) {
        if (!pf) continue;
        checkPaths.push(
          path.join(pf, 'Google/Chrome/Application/chrome.exe'),
          path.join(pf, 'Microsoft/Edge/Application/msedge.exe'),
        );
      }
    } else if (platform === 'darwin') {
      checkPaths.push(
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      );
    }

    for (const p of checkPaths) {
      if (!p) continue;
      try {
        if (fs.existsSync(p)) {
          // Check if executable
          fs.accessSync(p, fs.constants.X_OK);
          return p;
        }
      } catch (e) {
        // Not accessible or not executable
      }
    }

    return null;
  }

  async ensureBrowser(): Promise<string | null> {
    console.log('[BrowserService] Ensuring browser is available...');

    // 1. Try Puppeteer cache (Prioritize UI-installed or cached browsers)
    const detection = await this.detectChromium();
    if (detection.success && detection.path) {
      console.log(
        `[BrowserService] Found cached browser: ${detection.path} (${detection.version})`,
      );
      return detection.path;
    }

    // 2. Try system browser
    const systemPath = await this.findSystemBrowser();
    if (systemPath) {
      console.log(`[BrowserService] Found system browser: ${systemPath}`);
      return systemPath;
    }

    // 3. Install minimal Chromium
    console.log(
      '[BrowserService] No browser found. Installing minimal Chromium...',
    );
    const installResult = await this.installChromium();
    if (installResult.success && installResult.output) {
      // Re-detect to get the actual path
      const reDetect = await this.detectChromium();
      if (reDetect.success && reDetect.path) {
        console.log(
          `[BrowserService] Browser installed successfully to: ${reDetect.path}`,
        );
        return reDetect.path;
      }
    }

    console.error(
      '[BrowserService] Failed to ensure browser availability:',
      installResult.error,
    );
    return null;
  }

  async detectChromium(): Promise<{
    path: string | null;
    version: string | null;
    success: boolean;
    availableBrowsers: Array<{
      name: string;
      version: string;
      platform: string;
      installed: boolean;
      path: string | null;
    }>;
  }> {
    try {
      const cacheDir = this.getBrowserCacheDir();
      const installed = await getInstalledBrowsers({ cacheDir });

      const browsers = installed.map((b) => ({
        name: b.browser,
        version: b.buildId,
        platform: b.platform,
        installed: true,
        path: b.executablePath,
      }));

      // Find the latest Chromium or Chrome in cache
      const preferred =
        browsers
          .filter((b) => b.name === Browser.CHROMIUM)
          .sort((a, b) =>
            b.version.localeCompare(a.version, undefined, { numeric: true }),
          )[0] ||
        browsers
          .filter((b) => b.name === Browser.CHROME)
          .sort((a, b) =>
            b.version.localeCompare(a.version, undefined, { numeric: true }),
          )[0];

      if (preferred) {
        return {
          path: preferred.path,
          version: `${preferred.name}@${preferred.version}`,
          success: true,
          availableBrowsers: browsers,
        };
      }

      return {
        path: null,
        version: null,
        success: false,
        availableBrowsers: browsers,
      };
    } catch (e) {
      console.error('[BrowserService] Detection failed:', e);
      return {
        path: null,
        version: null,
        success: false,
        availableBrowsers: [],
      };
    }
  }

  async installChromium(): Promise<{
    success: boolean;
    error?: string;
    output?: string;
  }> {
    try {
      const cacheDir = this.getBrowserCacheDir();
      const platform = this.detectPlatform();
      const buildId = await resolveBuildId(
        Browser.CHROMIUM,
        platform,
        'latest',
      );

      console.log(
        `[BrowserService] Installing ${Browser.CHROMIUM} build ${buildId} for ${platform}...`,
      );

      const installed = await install({
        browser: Browser.CHROMIUM,
        buildId,
        cacheDir,
        platform,
      });

      return {
        success: true,
        output: `Installed ${installed.browser}@${installed.buildId} to ${installed.executablePath}`,
      };
    } catch (err: any) {
      console.error('[BrowserService] Failed to install Chromium:', err);
      return {
        success: false,
        error: err?.message || 'Failed to install browser via API',
      };
    }
  }

  installChromiumStream(): Observable<{
    type: 'log' | 'progress' | 'done' | 'error';
    message?: string;
    progress?: number;
    error?: string;
  }> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const cacheDir = this.getBrowserCacheDir();
          const platform = this.detectPlatform();
          const buildId = await resolveBuildId(
            Browser.CHROMIUM,
            platform,
            'latest',
          );

          subscriber.next({
            type: 'log',
            message: `Starting installation of ${Browser.CHROMIUM} build ${buildId} for ${platform}...`,
          });

          await install({
            browser: Browser.CHROMIUM,
            buildId,
            cacheDir,
            platform,
            downloadProgressCallback: (downloaded, total) => {
              const progress = Math.round((downloaded / total) * 100);
              subscriber.next({ type: 'progress', progress });
            },
          });

          subscriber.next({
            type: 'done',
            message: 'Installation completed successfully',
          });
          subscriber.complete();
        } catch (err: any) {
          subscriber.next({
            type: 'error',
            error: err?.message || 'Installation failed',
          });
          subscriber.complete();
        }
      })();
    });
  }
}
