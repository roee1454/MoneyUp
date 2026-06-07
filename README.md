# MoneyUp 💰

> A self-hosted, AI-powered personal finance dashboard that securely scrapes your Israeli bank and credit card accounts, categorizes your spending, and gives you actionable insights — all running locally on your own machine.

---

## Features

- **Bank & Credit Card Sync** — Securely fetch transactions via [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers).
- **Periodical Summary** — Real-time tracking of income vs. expenses, segmented by source.
- **Smart AI Categorization** — Automatic classification of spending into logical buckets (Food, Fuel, etc.).
- **AI Financial Advisor** — Integrated chat with support for OpenAI, Claude, and Gemini for tailored advice.
- **Privacy First** — Local SQLite storage with **AES-256-GCM** encryption. No data leaves your machine.
- **Modern UI** — Fast, RTL-supported Hebrew interface with robust Dark/Light mode via `next-themes`.

---

## Quick Showcase

Here is a preview of the MoneyUp interface in action:

### 📊 Financial Dashboard
*Real-time charts tracking your income vs. expenses, transaction tables, and automatic smart classification of Israeli banking entities.*

<video src="./docs/media/dashboard.mp4" width="100%" controls></video>

### 🤖 AI Financial Agents & Conversations
*Chat with your customized local or cloud AI models (supporting GPT-4o, Claude, Gemini, or Ollama) to analyze your spending habits.*

<video src="./docs/media/agent.mp4" width="100%" controls></video>

### ⚙️ Bank Scrapers & Security Settings
*Easily connect your Israeli bank and credit card accounts securely using client-side AES-256 encryption.*

<video src="./docs/media/settings.mp4" width="100%" controls></video>

---

## Supported Institutions

<sub>*Status of currently implemented scrapers and planned integrations.*</sub>

| <small>Banks</small> | <small>Status</small> | <small>Credit Cards</small> | <small>Status</small> |
|:---|:---|:---|:---|
| <small>בנק הפועלים (Hapoalim)</small> | <small>Enabled</small> | <small>MAX (מקס)</small> | <small>Enabled</small> |
| <small>בנק לאומי (Leumi)</small> | <small>Enabled</small> | <small>ישראכרט (Isracard)</small> | <small>Enabled</small> |
| <small>בנק יהב</small> | <small>Enabled</small> | <small>כאל (Cal)</small> | <small>Enabled</small> |

---

## Architecture

MoneyUp is structured as a **pnpm monorepo** managed by **Turborepo** with a modular NestJS monolith backend and a React (Vite) frontend:

```
apps/
  server/         ← NestJS Modular Monolith server (compiled via SWC, port 3000)
  web/            ← React + Vite web client (RTL, port 5173)
  desktop/        ← Tauri desktop client (Coming soon)

packages/
  common/         ← Shared utilities, exception filters, interceptors, and model definitions
  types/          ← Shared TypeScript interfaces, schemas, and Zod validators
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

## Quick start

### Docker (Reccomended!)

```bash
git clone https://github.com/roee1454/MoneyUp
cd MoneyUp
cp .env.example .env # Optional for default .env configuration.
docker compose -f infra/compose.yml up
```

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
The backend server will be at **http://localhost:3000**

---

## Terms of Service & Disclaimer

> [!IMPORTANT]
> **By using MoneyUp, you acknowledge and agree to the following:**

- **MIT License** — Open source software provided "as is" without warranty or liability.
- **Local Only** — All credentials and financial data are stored encrypted **only** on your machine.
- **Third-Party Scraping** — You are responsible for ensuring automated access complies with your bank's TOS.
- **Patched Library** — Ships with a locally patched `israeli-bank-scrapers` build for enhanced features. No telemetry. You are free to inspect the patch (diff against the original release).
- **AI Providers** — Using AI features sends summarized (non-credential) transaction data to your chosen provider.

---

## Security Disclaimer

> [!WARNING]
> **Providing your financial account credentials to any software is not risk-free.**
> 
> While I do my absolute best to protect your credentials through local encryption, I take no responsibility for any possible damages. If you choose to use this tool, I strongly suggest you ask your financial institution for credentials for a user that has **read-only access** to the relevant account. Using restricted credentials significantly reduces your potential risk.

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
