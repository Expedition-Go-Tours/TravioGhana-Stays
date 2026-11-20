# TravioGhana-Stays

The Travio Ghana **Stays** supplier dashboard — property listings, bookings,
availability, rates, offers, payouts, reviews and analytics for accommodation
suppliers.

Extracted from the Travio Ghana supplier portal (`TravioGhana-Supplier`), which
also hosts the Experiences (tours) workspace. This repo ships the Stays
workspace only.

## Stack

| Layer | Choice |
|---|---|
| Build | Vite 8 · TypeScript 6 |
| UI | React 19 · Tailwind CSS 4 |
| Routing | React Router 7 |
| Data | TanStack Query 5 · Axios |
| State | Zustand 5 |
| Icons | Phosphor (`@phosphor-icons/react`), single barrel at `src/features/stays/icons` |
| Charts | Recharts |
| Maps | MapLibre GL |
| Tests | Vitest + Testing Library · Playwright (E2E) |

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

**No backend or credentials are required.** Development defaults to
`VITE_STAYS_DATA_SOURCE=mock`, which serves the bundled dataset in
`src/features/stays/mock` and seeds a demo owner session
(`src/lib/mockSession.ts`). The app lands on `/stays`.

To run against the live supplier API instead:

```bash
cp .env.example .env.local
# set VITE_STAYS_DATA_SOURCE=api and fill the VITE_* keys you need
```

## Scripts

```bash
npm run dev            # dev server
npm run build          # typecheck + production build
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run test           # vitest (watch)
npm run test:unit      # vitest run
npm run test:coverage  # coverage report
npm run test:e2e       # playwright
npm run test:all       # lint + typecheck + unit tests
```

## Structure

```
src/
├─ app/            router, providers, root layout
├─ components/
│  ├─ layout/      AppShell, Sidebar, Header, SearchDropdown
│  ├─ forms/       inputs, date picker, phone input
│  ├─ shared/      guards, image, skeleton, error boundary
│  └─ ui/          Radix primitives (select, dropdown, modal)
├─ config/         env, navigation, page access, team roles
├─ contexts/       team-role provider
├─ features/
│  ├─ stays/       the workspace: pages, builder steps, mock data, API
│  ├─ auth/        sign-in, OAuth callback
│  └─ settings/    shared settings components (hours, socials, roles)
├─ lib/            axios, error handling, maps, images, mock session
├─ stores/         auth, sidebar, workspace, offer builder
└─ test/           vitest setup and MSW mocks
```

## Data layer

Every Stays page reads through `src/features/stays/api.ts`, which switches on
`config.stays.dataSource`:

- `mock` → `src/features/stays/mock/store.ts` (the same function-for-function
  contract as the live API);
- `api` → `GET /stays/supplier/**` on the supplier backend.

Pages never know which one is active. Switching is a config change, not a code
change.

## TypeScript migration status

The codebase was ported from JavaScript. All source files are now `.ts`/`.tsx`
and `npm run typecheck` runs in `build`.

Files still carrying `// @ts-nocheck` are annotated as a **migration marker**:
their props and data shapes have not been typed yet. To find them:

```bash
grep -rl "@ts-nocheck" src
```

Ratchet rule: a file that gets touched earns its types and loses the directive.
New files must be fully typed — do not add new `@ts-nocheck`.

## Design system

Visual language follows `DESIGN-coinbase.md` structurally — editorial type
scale, 24px cards, pill CTAs, hairline elevation, mono numerals — while keeping
the Travio Ghana green as the single action colour. Tokens live in
`src/index.css` under `@theme`.

## Conventions

- Icons: import from `@/features/stays/icons` only. ESLint blocks direct
  `@phosphor-icons/react` imports outside the barrel.
- Pages: leave layout to `PageContainer`; opt out only with `handle.bleed`.
- Access: every route is declared in `src/config/pageAccess.ts`; the sidebar,
  search and route guard all read the same map.
- Secrets: `VITE_*` values ship to the browser. `.env.local` is gitignored;
  never commit real credentials.
