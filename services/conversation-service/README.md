# Conversation Service

Manages AI conversation sessions with Pierre (the Claude-powered companion). Runs on port 3002.

## Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/conversations` | List user's conversations |
| POST | `/conversations` | Start a new conversation |
| GET | `/conversations/latest` | Get the most recent active conversation |
| GET | `/conversations/:id/messages` | Get messages for a conversation |
| POST | `/conversations/:id/messages` | Send a message, get Pierre's response |

## Development

```bash
pnpm dev         # Start with hot reload
pnpm test        # Run tests
pnpm db:migrate  # Apply Drizzle migrations
pnpm build       # Compile TypeScript
```

Reads environment from `../../.env` (repo root). Requires `ANTHROPIC_API_KEY`.
