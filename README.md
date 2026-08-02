> ⚠️ **Note:** This project is currently under development.

# AI Lead Intelligence Platform

AI-powered system for lead qualification, pricing estimation and CRM automation.

## Architecture

WordPress → Symfony API → Node AI Orchestrator → RAG → HubSpot

## Features
- AI chat lead qualification
- RAG-based project matching
- Automatic lead scoring
- CRM integration (HubSpot)
- Proposal generation (PDF)

## Tech Stack
- Symfony (backend core)
- Node.js (AI orchestration)
- PostgreSQL
- Redis
- pgvector / OpenSearch
- Docker

## Architecture Diagram


## How it works


## Demo


## Local setup

From the `infra/` directory:

```bash
cd infra
cp .env.example .env
# Replace every placeholder secret in .env (use `openssl rand -hex 32`).
docker compose up --build -d
docker compose exec backend composer install
docker compose exec backend php bin/console doctrine:migrations:migrate --no-interaction
```

Backend API: http://localhost:8080/

Widget demo: http://localhost:3001/demo

PostgreSQL and the AI orchestrator are available only on the private Docker
network. For non-Docker development, copy each service's `.env.example` to its
uncommitted local env file and use the same `INTERNAL_SERVICE_SECRET` in Symfony
the widget BFF, and the orchestrator.

## Security model

- `POST /api/conversations` is anonymous. It returns a random UUIDv4
  `conversationId`; possession of that opaque identifier authorizes reading and
  posting to that conversation. Internal numeric conversation IDs are never
  returned by conversation APIs.
- Public conversation creation/messages and one-shot lead analysis are rate
  limited. A rejected request returns HTTP 429 and `Retry-After`.
- Project-reference reads/searches require
  `X-Internal-Service-Secret`. Creating a reference requires
  `Authorization: Bearer <ADMIN_API_KEY>`.
- Symfony-to-orchestrator and orchestrator-to-Symfony calls use
  `INTERNAL_SERVICE_SECRET`. Empty credentials fail closed. Use independent,
  randomly generated values in production and rotate them through your secret
  manager; never commit `infra/.env` or service `.env.local` files.
- The public BFF does not trust forwarded client-IP headers by default. If it is
  deployed behind a proxy, set `WIDGET_TRUSTED_PROXIES` to only that proxy's
  exact IP/CIDR. Nginx replaces forwarded headers before Symfony uses them; if
  another proxy is added there, explicitly add only its range to
  `TRUSTED_PROXIES`.

Example administrative request:

```bash
curl -X POST http://localhost:8080/api/project-references \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Example","description":"Example project"}'
```