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
docker compose up --build -d
docker compose exec backend composer install
```

API: http://localhost:8080/