# MoneyUp

Gateway + internal NestJS microservices.

## Local Run

Run each service in separate terminals:

```bash
pnpm start ai-service
pnpm start scraper-service
pnpm start gateway
```

Gateway routes:

- `GET http://localhost:3000/ai`
- `GET http://localhost:3000/scraper`

## Docker Compose

From repo root:

```bash
docker compose -f infra/compose.yml up
```
