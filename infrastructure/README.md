# Infrastructure

Docker Compose setup for local development.

## Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| Postgres | `pgvector/pgvector:pg16` | 5432 | Primary database (with vector extension) |
| Redis | `redis:7-alpine` | 6379 | Caching and session management |

## Usage

```bash
# Start (from this directory)
docker-compose up

# Start in background
docker-compose up -d

# Stop
docker-compose down

# Stop and delete volumes (full reset)
docker-compose down -v
```

## Credentials

```
Host:     localhost:5432
Database: cogniguard
User:     cogniguard
Password: cogniguard
```

These match the `DATABASE_URL` default in `.env.example`.

## Init Script

`init-db.sql` runs automatically on first container start and enables the `pgvector` extension needed for message embeddings.
