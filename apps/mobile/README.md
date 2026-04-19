# Mobile App

Expo/React Native app for Preventia. Built with Expo Router (file-based navigation) and a warm earth-tone design system.

## Screens

| Route | Tab | Description |
|-------|-----|-------------|
| `/(tabs)/` | Conversations | Chat with Pierre (AI companion) |
| `/(tabs)/solo` | Solo | Standalone exercise mode with timer |
| `/(tabs)/history` | History | Stats, domain badges, past sessions and conversations |
| `/about` | — | Science content and research citations |
| `/auth/login` | — | Login screen |
| `/auth/register` | — | Registration screen |
| `/onboarding` | — | Post-registration profile setup |

## Key Files

- `lib/api.ts` — Typed fetch wrapper for all backend service calls
- `lib/colors.ts` — Earth-tone color constants
- `store/auth.store.ts` — Zustand auth state (JWT tokens, user)
- `components/MessageBubble.tsx` — Chat message UI
- `components/ExerciseResultBanner.tsx` — Post-exercise score display

## Color System

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#1d1b14` | Screen background |
| Card | `#252219` | Card/surface background |
| Accent | `#c4805a` | Terracotta — primary actions, user bubbles |
| Text primary | `#ede5d0` | Parchment — body text |
| Text secondary | `#9a9080` | Labels, metadata |
| Score high | `#7a9e7a` | Sage — good scores |
| Score mid | `#c8a84a` | Amber — average scores |
| Score low | `#b05848` | Brick — low scores |

## API URL Configuration

The app reads `extra.apiUrl` from `app.json` to build service URLs. For local development, set this to your Mac's local IP (not `localhost`):

```json
"extra": {
  "apiUrl": "http://192.168.x.x"
}
```

Get your IP: `ipconfig getifaddr en0`. Restart the Expo server after changing `app.json`.

## Development

```bash
pnpm start    # Start Expo dev server
pnpm test     # Run Jest tests
```

Press `i` in the Expo terminal for iOS Simulator, `a` for Android.
