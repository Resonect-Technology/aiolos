# Aiolos Weather Station - AI Coding Agent Instructions

## Project Overview

Aiolos is a complete IoT weather monitoring system with custom ESP32 hardware, AdonisJS backend, and React frontend. The system streams live wind data from remote weather stations via cellular to a web dashboard using Server-Sent Events (SSE).

## Architecture & Data Flow

- **Hardware**: ESP32 + SIM7000G cellular modem with wind/temperature sensors
- **Firmware**: C++ Arduino framework, sends HTTP POST to backend at `/stations/:station_id/wind`
- **Backend**: AdonisJS v6 REST API with `@adonisjs/transmit` for SSE streaming
- **Frontend**: React/Vite with real-time SSE connection via `@adonisjs/transmit-client`
- **Deployment**: Docker Compose with Caddy reverse proxy on AWS

## Project Structure

```
/
├── apps/
│   ├── adonis-api/         # AdonisJS v6 REST API backend
│   ├── bruno-api-control/  # Bruno API client for testing/configuration
│   └── react-frontend/     # React/Vite dashboard with SSE
├── firmware/               # ESP32 C++ code for weather stations
├── hardware/               # 3D models and hardware specifications
├── infra/                  # Docker Compose, Terraform, deployment configs
├── docs/                   # Project documentation and screenshots
├── .github/
│   └── workflows/          # GitHub Actions and Copilot setup
├── package.json            # Root package.json for monorepo
├── pnpm-workspace.yaml     # pnpm workspace configuration
└── turbo.json              # Turborepo build configuration
```

## Key Development Patterns

### Monorepo Structure

- **Install dependencies**: Use `pnpm install` from root for entire monorepo
- **Development workflow**: Use `pnpm dev` with Turbo to start all services concurrently
- **Individual development**: Each app can be developed independently in its own directory
- **Package management**: pnpm workspaces with shared dependencies and build caching

### Commit Convention

- **Conventional Commits**: Follow the [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/)
- **Format**: `<type>[optional scope]: <description>`
- **Types**: feat, fix, docs, style, refactor, test, chore, ci, build, perf
- **Scopes**: firmware, backend, frontend, infra, docs (component-specific changes)
- **Examples**: `feat(firmware): add wind direction calibration`, `fix(backend): resolve SSE connection timeout`

### Backend (AdonisJS) Patterns

- **AdonisJS v6**: Use only AdonisJS v6 with official documentation at https://docs.adonisjs.com/guides/preface/introduction
- **API Compatibility**: Be careful with backend API changes - firmware is already deployed and relies on existing endpoints
- **API Testing**: Maintain existing API tests to ensure compatibility - these tests should not be changed
- **Controllers**: RESTful endpoints in `app/controllers/` with IoT-friendly routes
- **Real-time**: Use `transmit.broadcast()` for SSE data streaming to frontend clients
- **Data caching**: Shared `stationDataCache` service for latest readings and state management
- **API docs**: Auto-generated OpenAPI via `adonis-autoswagger` at `/docs`
- **Middleware**: Custom authentication and validation for IoT device endpoints
- **Models**: Lucid ORM for database operations with proper relationships

### Frontend (React) Patterns

- **UI Components**: Use Tailwind CSS and shadcn/ui components - prefer premade shadcn components wherever possible
- **Real-time SSE**: Connect to backend channels using `@adonisjs/transmit-client`
- **Wind visualization**: Custom gauge and compass components with D3.js for data display
- **Multi-unit support**: Dynamic unit conversion between m/s, km/h, knots, Beaufort scale
- **Mock data controls**: Development endpoints for testing real-time features
- **Component structure**: Modular React components with TypeScript and Tailwind CSS
- **State management**: Context providers for global state and real-time data handling

### Firmware (ESP32) Patterns

- **Modular C++**: Separate managers for modem, HTTP client, sensors, OTA updates
- **Power management**: Deep sleep cycles with complete cellular modem power-off
- **HTTP communication**: JSON payloads to backend REST API, not CoAP/MQTT protocols
- **Configuration**: `secrets.ini` for sensitive values, `Config.h` for compile-time defaults
- **Build system**: PlatformIO with environment-based configuration and secrets injection
- **Error handling**: Graceful degradation when cellular connectivity is unavailable
- **Sensor abstraction**: Clean interfaces for temperature, wind speed, and direction sensors

## Critical Commands

### Database Operations

- **Run migrations**: Execute from adonis-api directory using AdonisJS Ace commands
- **Create migrations**: Use Ace migration generator for new database schema changes

### Firmware Development

- **Build and upload**: PlatformIO commands for ESP32 deployment
- **Debug monitoring**: Serial output monitoring for development debugging
- **Environment builds**: Different build configurations for debug vs production

### Infrastructure Deployment

- **AWS deployment**: Terraform-based infrastructure as code
- **Local development**: Docker Compose for complete local stack
- **Production deployment**: Containerized deployment with health checks

## Data Flow Integration Points

### Hardware → Backend

- Firmware sends POST to `/stations/:station_id/wind` with JSON payload
- Backend validates and broadcasts via SSE to frontend clients
- Use Bruno API client (`apps/bruno-api/`) for testing endpoints

### Backend → Frontend

- SSE channels: `wind/live/:station_id` for real-time data
- Frontend subscribes using `transmit.subscription()` from transmit-client
- Mock data endpoints for development: `/stations/:station_id/live/wind/mock/start`

### Configuration Management

- Remote config via `/stations/:station_id/config` endpoint
- Firmware fetches configuration periodically
- System-wide settings via `/api/system/config/:key`

## Common Gotchas

1. **Secrets Management**: Keep `firmware/secrets.ini` and `secrets.ini.example` in sync
2. **SSE Connections**: Frontend must handle reconnection when backend restarts
3. **ARM64 Deployment**: All Docker images use `linux/arm64` platform for AWS Graviton
4. **Cellular Power**: Firmware completely powers off modem before deep sleep, not just sleep mode
5. **Time Zones**: Backend uses UTC, frontend handles local time display

## Testing & Development

- Use Bruno API client for backend endpoint testing
- Frontend mock controls for simulating real-time data
- Firmware debug build environment for serial monitoring
- Health checks in Docker Compose for production monitoring
