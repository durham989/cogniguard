# E2E Tests (Maestro)

Maestro runs real flows against the app on a simulator or device. No mocking — it drives the actual UI.

## Install

```bash
brew install maestro
```

## Prerequisites

1. **Build the app** — Maestro needs a native build (not Expo Go for full fidelity):
   ```bash
   # Local iOS simulator build via EAS
   eas build --platform ios --profile development --local
   # Then install on simulator
   xcrun simctl install booted /path/to/build.app
   ```
   Or for quick testing during development, Expo Go works for most flows.

2. **Start backend services**:
   ```bash
   docker-compose up -d  # from repo root
   ```

3. **Start the simulator** (iOS):
   ```bash
   open -a Simulator
   ```

## Running Tests

```bash
# Run all flows in sequence
maestro test .maestro/

# Run a single flow
maestro test .maestro/07-full-user-journey.yaml

# Run with a specific device
maestro test --device "iPhone 15" .maestro/

# Watch mode (re-runs on file change)
maestro test --watch .maestro/
```

## Flows

| File | What it tests |
|------|--------------|
| `01-register.yaml` | New user registration form + validation |
| `02-onboarding.yaml` | All 3 onboarding slides, "Let's Begin" |
| `03-login.yaml` | Login happy path + wrong password + invalid email |
| `04-train-conversation.yaml` | Pierre greeting, sending messages |
| `05-solo-exercise.yaml` | Load exercise, submit response, view score, next exercise |
| `06-history.yaml` | History tab loads without crash, stats visible |
| `07-full-user-journey.yaml` | Register → Onboard → Solo exercise → History (golden path) |

## Viewing Screenshots

Maestro saves screenshots to `~/.maestro/tests/<timestamp>/`. View them after a run to see exactly what state the UI was in at each step.

## CI Integration

Add to your CI pipeline (GitHub Actions example):

```yaml
- name: Install Maestro
  run: |
    curl -Ls "https://get.maestro.mobile.dev" | bash
    echo "$HOME/.maestro/bin" >> $GITHUB_PATH

- name: Run E2E tests
  run: maestro test .maestro/07-full-user-journey.yaml
```

## Debugging Failures

```bash
# Print what Maestro sees on screen right now
maestro hierarchy

# Record a flow interactively
maestro studio
```
