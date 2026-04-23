FROM node:20-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace manifests
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY services/user-service/package.json ./services/user-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/types ./packages/types
COPY services/user-service ./services/user-service

# Build shared types
RUN pnpm --filter @cogniguard/types build

# Build service
RUN pnpm --filter @cogniguard/user-service build

EXPOSE 3001
CMD ["node", "services/user-service/dist/index.js"]
