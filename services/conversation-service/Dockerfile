FROM node:20-alpine AS base
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY services/conversation-service/package.json ./services/conversation-service/

RUN pnpm install --frozen-lockfile

COPY packages/types ./packages/types
COPY services/conversation-service ./services/conversation-service

RUN pnpm --filter @cogniguard/types build
RUN pnpm --filter @cogniguard/conversation-service build

EXPOSE 3002
CMD ["node", "services/conversation-service/dist/index.js"]
