---
name: israeli-bank-scrapers-guide
description: Provides a comprehensive overview and developer guide for the israeli-bank-scrapers library and its integration inside the MoneyUp codebase.
---

# Israeli Bank Scrapers Guide & Integration Logic

This skill provides full context on how the `israeli-bank-scrapers` library operates and how it is integrated into the MoneyUp server application.

---

## 1. Library Overview (`israeli-bank-scrapers`)

The `israeli-bank-scrapers` library is a Node.js scraper developed by `eshaham` that retrieves financial transactions and account details from Israeli banking and credit card sites using Puppeteer.

### Primary API Interface
- **Initialization**:
  ```typescript
  import { createScraper, CompanyTypes } from 'israeli-bank-scrapers';

  const scraper = createScraper({
    companyId: CompanyTypes.leumi, // Target bank/company ID
    startDate: new Date('2026-01-01'), // Earliest transaction date to fetch
    combineInstallments: false, // Whether to merge installments
    timeout: 90000, // Connection timeout in milliseconds
    showBrowser: false, // Set to true to view the Puppeteer UI (for debugging)
    verbose: false, // Logs puppeteer network / scraping steps
  });
  ```
- **Execution**:
  ```typescript
  // scraper.scrape takes the credentials required by the specific bank/card company
  const scrapeResult = await scraper.scrape(credentials);
  ```
- **Return Contract (`ScraperScrapingResult`)**:
  - **Success (`success: true`)**:
    ```typescript
    {
      success: true,
      accounts: [
        {
          accountNumber: string,
          balance?: number,
          txns: Array<{
            id?: string,
            date: string,          // ISO date
            processedDate: string, // ISO processed date
            amount: number,
            chargedAmount: number,
            description: string,
            memo?: string,
            originalCurrency?: string,
          }>
        }
      ]
    }
    ```
  - **Failure (`success: false`)**:
    ```typescript
    {
      success: false,
      errorType: string,    // Error code identifier (e.g. login, challenge, etc.)
      errorMessage: string, // Visual/descriptive error text
    }
    ```

---

## 2. Integration in MoneyUp (`apps/server/src/modules/scraper`)

MoneyUp structures its scraper module using a modular, service-oriented design pattern:

### A. Base Scraper (`scrapers/base.ts`)
All specific scraper modules extend `BaseScraper`. It handles common configurations:
- **Simulation**: If `SCRAPER_MODE` is `simulation`, it routes calls to `simulateScrape()` which bypasses browser initialization and returns mock data while firing fake progress updates.
- **Anti-Detection Mechanics (`getCommonScraperOptions`)**:
  - Sets a realistic `User-Agent`.
  - Masks headless footprints (deletes `navigator.webdriver`, configures mock plugins, device memory, and languages).
  - Listens to Puppeteer page `console` and `framenavigated` events for tracing security blocks or Cloudflare/WAF redirects.
- **Data Standardization (`normalizeAccounts`)**:
  - Maps the library's raw account and transaction response to MoneyUp’s unified types: `UnifiedAccount[]` and `UnifiedTransaction[]`.

### B. Scraper Service (`scraper.service.ts`)
Manages execution, active session states, credentials, and OTP validation:
- **Challenge/OTP Handling**:
  - For institutions requiring dual-factor authentication (SMS/OTP), an `otpCodeRetriever` callback is injected into the credentials object.
  - When the library encounters an OTP challenge, it fires this callback, updates the session status to `CHALLENGE_REQUIRED`, and awaits the user's input before continuing Puppeteer execution.
- **Error Sanitization**:
  - Translates scraper errors into standardized codes: `INVALID_CREDENTIALS`, `CHALLENGE_FAILED`, `BANK_UNAVAILABLE`, `SESSION_EXPIRED`, or `UNKNOWN_CONNECT_ERROR`.
  - Maps them to user-friendly Hebrew error messages for frontend rendering.

### C. Specific Scrapers
Implementations reside inside:
- `scrapers/banks/` (e.g., `leumi.ts`, `hapoalim.ts`, `yahav.ts`)
- `scrapers/credit/` (e.g., `max.ts`, `cal.ts`, `isracard.ts`)
They inherit standard parameters and define their matching `CompanyTypes` from the library.

---

## 3. Patched Library Package (`israeli-bank-scrapers-patched.tgz`)

To maintain maximum privacy and reliability, MoneyUp utilizes a modified, locally compiled version of the library instead of installing it directly from the public npm registry.

### Package Location and Reference
- **Location**: `/libs/israeli-bank-scrapers-patched.tgz`
- **Reference in Server Package**:
  In `apps/server/package.json`:
  ```json
  "dependencies": {
    "israeli-bank-scrapers": "file:../../libs/israeli-bank-scrapers-patched.tgz"
  }
  ```

### Key Enhancements & Developer Guidelines
1. **Privacy (No Telemetry)**: The patch removes any telemetry, metrics tracking, or data sharing to ensure all operations run strictly locally.
2. **Docker & Headless Optimization**: Contains fixes for browser launching and sandbox environments to guarantee the scrapers launch reliably inside headless Node contexts and containerized deployments.
3. **Dependency Protection**: 
   - **CRITICAL**: Never replace the local `file:../../libs/israeli-bank-scrapers-patched.tgz` dependency with standard npm version releases in any package configuration.
   - When modifying sync logic or scraping steps, make sure not to introduce logic that reinstates external logging/tracking.

