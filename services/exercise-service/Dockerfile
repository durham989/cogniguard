FROM node:20-alpine AS base
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY services/exercise-service/package.json ./services/exercise-service/

RUN pnpm install --frozen-lockfile

COPY packages/types ./packages/types
COPY services/exercise-service ./services/exercise-service

RUN pnpm --filter @cogniguard/types build
RUN pnpm --filter @cogniguard/exercise-service build

EXPOSE 3003
CMD ["node", "services/exercise-service/dist/index.js"]
