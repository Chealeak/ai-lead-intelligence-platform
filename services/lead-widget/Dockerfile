FROM node:22-bookworm-slim

WORKDIR /repo/services/lead-widget

COPY shared /repo/shared
COPY services/lead-widget/package.json services/lead-widget/package-lock.json ./
RUN npm ci --omit=dev

COPY services/lead-widget .

EXPOSE 3001

CMD ["node", "server.js"]
