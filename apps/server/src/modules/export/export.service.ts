import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as puppeteer from 'puppeteer';
import { ChromiumService } from '../chromium/chromium.service';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly browserService: ChromiumService) {}

  async saveFile(
    content: string,
    filename: string,
    extension: string,
  ): Promise<{ success: boolean; filepath?: string; aborted?: boolean; error?: string }> {
    try {
      // 1. Show native file picker dialog
      const dialogResult = await this.openDialog(filename, extension);

      if (dialogResult.aborted) {
        this.logger.log(`User aborted exporting ${extension.toUpperCase()}`);
        return { success: true, aborted: true };
      }

      let filepath = dialogResult.filepath;

      if (!filepath) {
        // Fallback to Downloads directory
        const downloadsDir = path.join(os.homedir(), 'Downloads');
        try {
          await fs.mkdir(downloadsDir, { recursive: true });
          
          // Generate a unique filename in Downloads directory to avoid overwriting
          let targetPath = path.join(downloadsDir, `${filename}.${extension}`);
          let counter = 1;
          while (true) {
            try {
              await fs.access(targetPath);
              targetPath = path.join(downloadsDir, `${filename} (${counter}).${extension}`);
              counter++;
            } catch {
              break; // File does not exist, safe to write
            }
          }
          filepath = targetPath;
          this.logger.log(`Using Downloads folder fallback: ${filepath}`);
        } catch (fallbackErr: any) {
          this.logger.warn(`Downloads fallback failed: ${fallbackErr.message}, requesting client fallback`);
          return { success: false, error: 'Dialog not supported' };
        }
      }

      // 2. Compile HTML content to PDF buffer if required
      let fileData: string | Buffer = content;
      if (extension.toLowerCase() === 'pdf') {
        fileData = await this.renderHtmlToPdf(content);
      }

      // 3. Save buffer or string
      if (extension.toLowerCase() === 'pdf') {
        await fs.writeFile(filepath, fileData);
      } else {
        await fs.writeFile(filepath, fileData as string, 'utf8');
      }

      this.logger.log(`Exported ${extension.toUpperCase()} saved to: ${filepath}`);

      return {
        success: true,
        filepath: filepath,
      };
    } catch (err: any) {
      this.logger.error(`Failed to export file: ${err.message}`, err.stack);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  private async openDialog(filename: string, extension: string): Promise<{ filepath?: string; aborted?: boolean }> {
    const platform = os.platform();
    // In production on Windows, avoid spawning a GUI dialog from a windowless service
    if (platform === 'win32' && process.env.NODE_ENV === 'production') {
      this.logger.log('Windows production environment detected: bypassing SaveFileDialog and using Downloads folder fallback.');
      return {};
    }

    if (platform === 'win32') {
      return this.showWindowsDialog(filename, extension);
    } else if (platform === 'darwin') {
      return this.showMacDialog(filename);
    } else {
      return this.showLinuxDialog(filename);
    }
  }

  private async renderHtmlToPdf(html: string): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;
    try {
      this.logger.log('Starting Puppeteer for PDF generation...');
      
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="he" dir="rtl">
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background-color: white !important;
              color: black !important;
            }
          </style>
        </head>
        <body class="bg-white p-6">
          ${html}
        </body>
        </html>
      `;

      const executablePath = await this.browserService.ensureBrowser();
      const launchOptions: any = {
        headless: true,
        args: this.browserService.getCommonBrowserArgs(),
      };
      if (executablePath) {
        launchOptions.executablePath = executablePath;
      }

      browser = await puppeteer.launch(launchOptions);

      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: 'load' });
      await page.waitForFunction(() => (window as any).tailwind !== undefined, { timeout: 3000 }).catch(() => {});
      // Allow dynamic styles generating from DOM classes to compile fully
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      await page.emulateMediaType('print');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1.5cm',
          right: '1.5cm',
          bottom: '1.5cm',
          left: '1.5cm',
        },
      });

      await browser.close();
      return Buffer.from(pdfBuffer);
    } catch (err: any) {
      if (browser) {
        try {
          await browser.close();
        } catch {}
      }
      throw err;
    }
  }

  private showWindowsDialog(defaultName: string, extension: string): Promise<{ filepath?: string; aborted?: boolean }> {
    return new Promise((resolve) => {
      const escapedName = defaultName.replace(/"/g, '`"');
      
      let filter = 'All Files (*.*)|*.*';
      switch (extension.toLowerCase()) {
        case 'pdf': filter = 'PDF Files (*.pdf)|*.pdf'; break;
        case 'csv': filter = 'CSV Files (*.csv)|*.csv'; break;
        case 'json': filter = 'JSON Files (*.json)|*.json'; break;
        case 'xlsx': filter = 'Excel Files (*.xlsx)|*.xlsx'; break;
      }

      const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.SaveFileDialog
$dialog.Filter = "${filter}"
$dialog.FileName = "${escapedName}"
$dialog.Title = "Save Export File"
$dialog.ShowHelp = $true
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  Write-Output $dialog.FileName
} else {
  Write-Output "ABORTED"
}
`.trim();

      const buffer = Buffer.from(psScript, 'utf16le');
      const encoded = buffer.toString('base64');

      // Set a 4-second timeout to prevent powershell from hanging indefinitely in non-interactive environments
      exec(`powershell -NoProfile -STA -EncodedCommand ${encoded}`, { timeout: 4000 }, (error, stdout) => {
        if (error) {
          if (error.signal === 'SIGTERM') {
            this.logger.warn('Windows SaveFileDialog timed out (possibly running in a windowless process)');
          } else {
            this.logger.warn(`Windows SaveFileDialog error: ${error.message}`);
          }
          resolve({});
        } else {
          const res = stdout.trim();
          if (res === 'ABORTED') {
            resolve({ aborted: true });
          } else if (res) {
            resolve({ filepath: res });
          } else {
            resolve({ aborted: true });
          }
        }
      });
    });
  }

  private showMacDialog(defaultName: string): Promise<{ filepath?: string; aborted?: boolean }> {
    return new Promise((resolve) => {
      const escapedName = defaultName.replace(/"/g, '\\"');
      const appleScript = `
tell application "System Events"
  activate
  try
    set proposedFile to choose file name with prompt "Save Export File:" default name "${escapedName}"
    POSIX path of proposedFile
  on error
    ""
  end try
end tell
`.trim();

      exec(`osascript -e '${appleScript.replace(/\n/g, ' ')}'`, (error, stdout) => {
        if (error) {
          if (error.message.includes('number -128') || error.message.includes('User canceled')) {
            resolve({ aborted: true });
          } else {
            this.logger.warn(`macOS choose file name error: ${error.message}`);
            resolve({});
          }
        } else {
          const res = stdout.trim();
          if (res) {
            resolve({ filepath: res });
          } else {
            resolve({ aborted: true });
          }
        }
      });
    });
  }

  private showLinuxDialog(defaultName: string): Promise<{ filepath?: string; aborted?: boolean }> {
    return new Promise((resolve) => {
      const escapedName = defaultName.replace(/"/g, '\\"');
      
      exec(`zenity --file-selection --save --confirm-overwrite --filename="${escapedName}" --title="Save Export File"`, (error, stdout) => {
        if (!error) {
          const res = stdout.trim();
          if (res) {
            resolve({ filepath: res });
          } else {
            resolve({ aborted: true });
          }
          return;
        }

        if (error.code === 1) {
          resolve({ aborted: true });
          return;
        }

        exec(`kdialog --getsavefilename . "${escapedName}" --title "Save Export File"`, (errorK, stdoutK) => {
          if (!errorK) {
            const res = stdoutK.trim();
            if (res) {
              resolve({ filepath: res });
            } else {
              resolve({ aborted: true });
            }
            return;
          }

          if (errorK.code === 1) {
            resolve({ aborted: true });
          } else {
            resolve({});
          }
        });
      });
    });
  }
}
