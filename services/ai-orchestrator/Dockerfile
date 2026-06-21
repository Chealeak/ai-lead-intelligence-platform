FROM node:22-bookworm-slim

WORKDIR /repo/services/ai-orchestrator

COPY shared /repo/shared
COPY services/ai-orchestrator/package.json services/ai-orchestrator/package-lock.json ./
RUN npm ci --omit=dev

COPY services/ai-orchestrator .

EXPOSE 3000

CMD ["node", "server.js"]
