# MoneyUp 💰

> A self-hosted, AI-powered personal finance dashboard that securely scrapes your Israeli bank and credit card accounts, categorizes your spending, and gives you actionable insights — all running locally on your own machine.

---

## Features

### Available Now

| Feature | Description |
|---|---|
| ***Bank & Credit Card Sync*** | Powered by [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers) |
| ***Monthly Financial Summary*** | Live income and expense totals, calculated separately per source type (bank vs. credit card) |
| ***Spending Categories*** | AI-gated widget that categorizes credit card expenses into Food, Clothing, Entertainment, Fuel/Transport, Supermarket, and Subscriptions |
| ***AI Agent Integration*** | Connect your own AI provider API key (e.g. OpenAI, Gemini) for smart financial advice |
| ***Secure Local Storage*** | All credentials are encrypted at rest using **AES-256-GCM** inside a local SQLite database — nothing leaves your machine |
| ***Multi-User Auth*** | JWT-based authentication with session management |
| ***Dark / Light Mode*** | Full theme support with RTL Hebrew UI |

---

## Supported Institutions

> The list below reflects what banks & credit card companies the app currently supports.

### Banks

| Institution | Status |
|---|---|
| בנק הפועלים (Bank Hapoalim) | Enabled |
| בנק לאומי (Bank Leumi) | Coming soon |
| One Zero | Coming soon |

And more in the future.

### Credit Card Companies

| Institution | Status |
|---|---|
| MAX (מקס) | Enabled |
| ישראכרט (Isracard) | Enabled |

---

## Architecture

MoneyUp is a **pnpm monorepo** with a NestJS microservices backend and a React (Vite) web client:

```
apps/
  gateway/        ← HTTP API gateway (port 3000)
  auth/           ← JWT auth microservice
  scraper/        ← Bank scraper microservice
  ai/             ← AI provider microservice
  users/          ← User profile microservice

clients/
  web/            ← React + Vite web app (port 5173)
  desktop/        ← (future)
  mobile/         ← (future)
```

---

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 10.24 (`npm install -g pnpm`)
- **Chromium / Chrome** — required by the bank scraper (Puppeteer). Install via your package manager:
  ```bash
  # Debian / Ubuntu
  sudo apt install chromium-browser
  ```
- A supported Israeli bank or credit card account (see [Supported Institutions](#supported-institutions))
- An AI provider API key (OpenAI, Gemini, etc.) for the AI features

---

## Installation

```bash
# 1. Clone the repo
git clone https://github.com/your-username/MoneyUp.git
cd MoneyUp

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and fill in your JWT_SECRET and any other required values

# 4. Start everything (backend services + web client)
pnpm dev
```

The web app will be available at **http://localhost:5173**  
The API gateway will be at **http://localhost:3000**

### Docker

```bash
docker compose -f infra/compose.yml up
```

---

## Terms of Service & Legal Notice

> [!IMPORTANT]
> **By using MoneyUp you agree to the following:**

1. **Self-hosted & Local Only** — MoneyUp runs entirely on your own machine. Your banking credentials are encrypted and stored **only** in your local SQLite database. No credentials, transactions, or personal data are ever transmitted to any third-party server by this application.

2. **Third-Party Scraping** — MoneyUp uses the open-source [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers) library to access your financial data by automating a browser session. This means it logs in to your bank's website on your behalf using your credentials. **Use of automated access to your bank's website may be subject to your bank's Terms of Service.** You are solely responsible for ensuring that your use complies with your financial institution's terms.

3. **Patched Library** — MoneyUp ships a locally patched build of `israeli-bank-scrapers`, located at `libs/israeli-bank-scrapers-patched.tgz`. This patch was authored by the MoneyUp maintainer solely to implement additional features and handle edge cases not covered by the upstream release (e.g. adding transaction fields, handling captcha challenges, security auditing, etc.). **The patch contains no malicious code, no telemetry, and no data exfiltration of any kind.** You are free to inspect the patch by extracting the archive and diffing it against the official upstream release.

4. **No Warranty** — MoneyUp is provided "as is", without warranty of any kind. The authors are not liable for any financial loss, data loss, or account restrictions that may result from its use.

5. **AI Providers** — If you configure an AI provider (e.g. OpenAI), a summary of your transaction data will be sent to that provider's API. Review your chosen provider's privacy policy before enabling this feature.

6. **Open Source** — MoneyUp is licensed under the **MIT License**. You are free to use, modify, and distribute it within the terms of that license.

---

## Contributing

Contributions are welcome. Here's how to get started:

1. **Fork** the repository and create a feature branch: `git checkout -b feature/my-feature`
2. **Install** dependencies with `pnpm install`
3. **Run** the dev environment with `pnpm dev`
4. Make your changes and ensure the code lints: `pnpm lint`
5. **Submit a Pull Request** describing your changes

### Code Style
- TypeScript strict mode throughout
- NestJS conventions for backend services
- React + Vite for the web client
- Hebrew RTL UI — all user-facing strings should be in Hebrew

### Reporting Issues
Please open a GitHub Issue with a clear description of the bug or feature request. For security vulnerabilities, please **do not** open a public issue — contact the maintainer directly.

---

<p align="center">Built with care for the Israeli developer community</p>
