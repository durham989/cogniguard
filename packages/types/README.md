# @cogniguard/types

Shared TypeScript types used across all services and the mobile app.

## Usage

```typescript
import type { SomeType } from '@cogniguard/types';
```

This package must be built before services can import from it:

```bash
pnpm --filter @cogniguard/types build
# or, to watch for changes during development:
pnpm --filter @cogniguard/types dev
```

The compiled output goes to `dist/`. Services reference `dist/index.d.ts` for type declarations.
