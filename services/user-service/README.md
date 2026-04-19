# User Service

Handles authentication, user profiles, and consent management. Runs on port 3001.

## Routes

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | Exchange refresh token for new token pair |
| POST | `/auth/logout` | Invalidate refresh token |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | Get current user profile |
| PATCH | `/users/me` | Update current user profile |
| POST | `/users/me/complete-onboarding` | Mark onboarding complete |

## Database Schema

- `users` — account credentials and profile
- `refresh_tokens` — active refresh token store
- `consents` — per-user data consent flags
- `cognitive_profiles` — baseline cognitive domain data

## Development

```bash
pnpm dev       # Start with hot reload
pnpm test      # Run tests (mocha/chai/sinon/supertest)
pnpm db:migrate  # Apply Drizzle migrations
pnpm build     # Compile TypeScript
```

Reads environment from `../../.env` (repo root).
