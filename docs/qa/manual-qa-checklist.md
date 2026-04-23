# Manual QA Checklist

Run this before every release. Check off each item. Any failure = block the release.

---

## Setup

- [ ] Backend services running locally (`pnpm dev` or docker-compose)
- [ ] Mobile app running in Expo Go or dev build on a physical/sim device
- [ ] Fresh test account available (or use register flow below)
- [ ] A second test account available (for cross-user isolation tests)

---

## 1. Registration & Login

### Happy path
- [ ] Open app → see "Preventia" login screen
- [ ] Tap "Don't have an account?" → see "Create Account" screen
- [ ] Register with valid email + password (8+ chars) + name → lands on onboarding
- [ ] Log out (if applicable) → log back in with same credentials → lands on Train tab
- [ ] Close and reopen app → auto-login, no credentials prompted (token hydration)

### Validation
- [ ] Register with invalid email → inline error shown
- [ ] Register with password < 8 chars → inline error shown
- [ ] Register with duplicate email → "Email already registered" error
- [ ] Login with wrong password → "Invalid credentials" error
- [ ] Login with unregistered email → error shown

### Edge cases
- [ ] Force-kill app mid-login → reopen → correct screen (not stuck on login)
- [ ] Login on a poor network → shows loading state, eventually fails gracefully (no white screen)
- [ ] Submit login form twice rapidly → does not duplicate requests or crash

---

## 2. Onboarding

- [ ] New user sees onboarding after registration (3 slides)
- [ ] "Continue" advances through slides 1 → 2 → 3
- [ ] "Back" returns to previous slide
- [ ] Slide 3 shows "Let's Begin" instead of "Continue"
- [ ] Tapping "Let's Begin" → navigates to Train tab, onboarding never shown again
- [ ] Existing user who completed onboarding → skips onboarding entirely on next login

---

## 3. Train Tab (Conversation with Pierre)

### New conversation
- [ ] First launch (no prior conversation): Pierre greets user automatically
- [ ] Greeting appears within ~5 seconds
- [ ] Streaming works — text appears progressively, not all at once
- [ ] Send a message → response streams in
- [ ] Exercise is delivered naturally in conversation (within first few messages)

### Resuming a conversation
- [ ] Navigate away and back → same conversation resumes
- [ ] Kill and reopen app → same conversation resumes
- [ ] Prior messages visible in correct order

### Exercise flow
- [ ] Exercise prompt appears from Pierre
- [ ] User responds → score banner appears (domain + feedback)
- [ ] After dismissing banner, next exercise is queued silently
- [ ] Multiple exercise cycles work in one session (not just first one)

### New conversation
- [ ] "New conversation" button starts fresh chat
- [ ] Fresh greeting from Pierre in new conversation

### Edge cases
- [ ] Send empty message → send button disabled, nothing happens
- [ ] Send while Pierre is still responding → input disabled during stream
- [ ] Network drops mid-stream → error shown, UI recovers (not stuck on spinner)
- [ ] Very long user message (>500 chars) → sends correctly

---

## 4. Solo Tab (Standalone Exercises)

- [ ] Tab loads → shows exercise name, domain, prompt
- [ ] Timer increments from 0s
- [ ] Submit button disabled when response field is empty
- [ ] Type response → Submit enabled → tap Submit → loading state shown
- [ ] Score result screen shows: percentage, domain, feedback
- [ ] "Next Exercise" → new exercise loads (different domain rotates)
- [ ] Score is reflected in History tab after completion

### Edge cases
- [ ] Submit with only whitespace → button should stay disabled
- [ ] Kill app mid-exercise → reopen → fresh exercise loaded (not broken state)
- [ ] Very long response (>2000 chars) → submits without crash

---

## 5. History Tab

### Stats section
- [ ] Streak shown correctly (0 for new user, increments day after exercise)
- [ ] Level label shown (Beginner for new user)
- [ ] Level progress bar visible
- [ ] Domain badges visible for all 6 domains (memory, attention, processing speed, executive function, language, visuospatial)
- [ ] Badges show correct tier: none (gray) until earned

### Trends section
- [ ] Bar charts appear for each domain after at least 1 exercise
- [ ] New user with no sessions: trends section shows empty/placeholder gracefully (no crash)

### Exercise history
- [ ] Completed exercises listed with domain, score, timestamp
- [ ] New user with no history: list empty, no crash
- [ ] Pull-to-refresh updates data

### Conversations
- [ ] Past conversations listed
- [ ] Tapping a conversation navigates to it (if implemented)

---

## 6. Token Refresh (Auth Resilience)

These require manual token manipulation or waiting for expiry (15 min access token).

- [ ] With an expired access token: making any API call → app auto-refreshes and retries transparently (no logout)
- [ ] With an expired refresh token: app clears auth and sends user to login screen
- [ ] Kill app, wait 15+ min, reopen → auto-refresh on hydrate, lands on correct screen

---

## 7. Cross-User Data Isolation

Using two test accounts logged in from separate devices/simulators:

- [ ] User A's exercises are not visible in User B's history
- [ ] User A's conversations are not visible to User B
- [ ] User A cannot submit a score to User B's exercise session (403 expected)

---

## 8. Performance & UI Polish

- [ ] App launches in < 3 seconds on a mid-range device
- [ ] Scrolling through long history list is smooth (no jank)
- [ ] Keyboard appears/dismisses correctly on all input screens (no content hidden)
- [ ] All text readable in both light OS and dark OS appearance (if both supported)
- [ ] Earth-tone color scheme consistent throughout (no blue/purple remnants)
- [ ] No layout overflow or text truncation in extreme font size settings

---

## 9. Backend Health

Run these against the local or staging environment:

```bash
curl http://localhost:3001/health   # {"status":"ok","service":"user-service"}
curl http://localhost:3002/health   # {"status":"ok","service":"conversation-service"}
curl http://localhost:3003/health   # {"status":"ok","service":"exercise-service"}
```

- [ ] All three return 200 with correct service name
- [ ] `GET /api/exercises/next` without auth → 401
- [ ] `GET /api/users/me` without auth → 401
- [ ] `POST /api/auth/login` with wrong credentials → 401
- [ ] `POST /api/auth/login` 11+ times in 15 min → 429 (rate limit)

---

## 10. Pre-Launch Final Checks

- [ ] All automated tests pass: `pnpm test` from repo root
- [ ] TypeScript compiles cleanly: `pnpm build` from repo root (no errors)
- [ ] No `.env` values or secrets committed to git
- [ ] App bundle ID is `com.preventia.app` in app.json
- [ ] All API base URLs use dynamic host derivation (no hardcoded IPs)
- [ ] Sentry DSN configured in production environment variables
- [ ] DB migrations applied in production (`drizzle-kit migrate` per service)
- [ ] Index migration `0001_add_exercise_sessions_indexes.sql` applied to exercise-service DB
