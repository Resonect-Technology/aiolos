# React Frontend — Aiolos dashboard

The Aiolos wind dashboard: React 19 + Vite 8 + Tailwind 4 (shadcn/ui). It shows
live wind speed (m/s, km/h, knots, Beaufort), a direction compass, and a wind
rose, plus temperature and station diagnostics. Live wind arrives over SSE
(`@adonisjs/transmit-client`); temperature and diagnostics come from the REST
API.

## Running

From the repo root (`pnpm dev` runs the whole stack):

```sh
pnpm dev        # dashboard on :5173, proxies /api and SSE to the API on :8080
pnpm --filter react-frontend build
```

There is no test suite yet — verify changes with `build` and by exercising the
dashboard in the browser. Lint is **oxlint**, formatting is **oxfmt**
(`pnpm lint` / `pnpm format`); never re-introduce ESLint or Prettier.

## Structure

Routes: `/` (landing), `/dashboard` (live wind), `/admin` (password-protected
station config + live diagnostics). Components follow atomic design under
`src/components/` (`atoms/` → `molecules/` → `organisms/` → `pages/`), with SSE
state in `providers/wind-data-provider.tsx` and wind unit/color helpers in
`lib/wind-utils.ts`.

Data is **camelCase** end to end (`windSpeed`, `windDirection`,
`batteryVoltage`) to match the API.
