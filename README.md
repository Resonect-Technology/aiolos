# Aiolos Monorepo

**Live wind tracking platform for water sports, powered by custom IoT
meteostations.**

- 🌐 [aiolos.resonect.cz](https://aiolos.resonect.cz/)

---

## Overview

Aiolos is a modern, scalable platform for collecting, storing, and serving
real-time wind and weather data from custom-built IoT stations. The system is
designed for reliability, extensibility, and developer-friendliness.

### Key Features

- **Live wind & weather data** for water sports and research
- **Custom hardware**:
  [Aiolos meteostation](https://github.com/Resonect-Technology/Aiolos-HW)
- **Remote administration**: Built-in `/admin` section for station config and
  monitoring
- **Modern backend**: AdonisJS 7 REST API with Prisma 7 on SQLite
- **OpenAPI/Swagger docs**: Auto-generated for the API
- **Monorepo**: Managed with [pnpm](https://pnpm.io/) and
  [Turborepo](https://turbo.build/)
- **Production infra as code**:
  [See infra/README.md for AWS/Terraform/Docker Compose setup](infra/README.md)

---

![Aiolos Dashboard Screenshot](docs/screenshot-dashboard.png)

---

## Monorepo Structure

```
/
├── apps/
│   ├── adonis-api/          # RESTful backend API (AdonisJS v7 + Prisma/SQLite)
│   └── react-frontend/      # User interface for live data (React 19, Vite 8)
├── packages/
│   └── typescript-config/   # Shared tsconfig presets (@repo/typescript-config)
├── firmware/            # ESP32/SIM7000G code for weather stations (PlatformIO)
├── hardware/            # 3D models and hardware specs
├── infra/               # Terraform + Docker Compose production setup
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md (this file)
```

- Each app has its own README with setup, usage, and API details.

---

## Apps

### Adonis API Service ([docs](apps/adonis-api/README.md))

- Stores and exposes sensor data (wind, temperature, diagnostics)
- Fixed HTTP routes the field stations POST to (e.g.
  `POST /api/stations/:station_id/wind`, `/temperature`, `/diagnostics`,
  `GET /api/stations/:station_id/config`)
- Live wind streamed to the dashboard over SSE (`@adonisjs/transmit`)
- Auto-generated OpenAPI docs at `/docs`
  ([adonis-autoswagger](https://github.com/ad-on-is/adonis-autoswagger))

### React Frontend ([docs](apps/react-frontend/README.md))

- React 19 + Vite 8 + Tailwind 4 (shadcn/ui) dashboard.
- Live wind speed (m/s, km/h, knots, Beaufort), direction compass, and wind
  rose, plus temperature and station diagnostics.
- Live wind over Server-Sent Events (SSE); temperature/diagnostics over REST.
- Password-protected `/admin` section for station config and monitoring.

### Firmware ([docs](firmware/README.md))

- Embedded code for the Aiolos meteostation hardware
- Written for Arduino-compatible microcontrollers (ESP32 + SIM7000G)
- Handles sensor readings, power management, and HTTP communication
- Includes configuration and usage guides for hardware setup

---

## Quickstart

Node 24 (`nvm use`) and pnpm 11 (`corepack enable`), then from the repo root:

```sh
pnpm install
pnpm dev          # API on :8080 + dashboard on :5173
pnpm test         # backend Japa suite
pnpm lint && pnpm check-types && pnpm format:check
```

With [go-task](https://taskfile.dev) installed, `task --list` shows the same
commands plus database and firmware helpers (`task setup`, `task check`,
`task dev:start`, `task firmware:build`, …).

See each app's README (and CLAUDE.md for AI agents) for details.

---

## Contributing & Extending

- Add new sensors or data types by extending the API routes/models
- Use JSDoc comments for OpenAPI docs
- See code comments and each app's README for details

---

## License

This project is licensed under the GNU Affero General Public License v3.0
(AGPL-3.0). See the [LICENSE](LICENSE) file for details.

[![AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

---

## AI-assisted development

This project is developed with [Claude Code](https://claude.com/claude-code).
Guidance for AI agents — and a fast onboarding for humans — lives in
[`CLAUDE.md`](CLAUDE.md), the path-scoped rules under
[`.claude/rules/`](.claude/rules), and a `CLAUDE.md` in each
app/`firmware`/`infra` directory. VS Code recommends the `anthropic.claude-code`
extension (see `.vscode/extensions.json`).

---
