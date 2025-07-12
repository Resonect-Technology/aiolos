# Aiolos Weather Station - AI Coding Agent Instructions

## Project Overview

Aiolos is a complete IoT weather monitoring system with custom ESP32 hardware, AdonisJS backend, and React frontend. The system streams live wind data from remote weather stations via cellular to a web dashboard using Server-Sent Events (SSE).

## Architecture & Data Flow

- **Hardware**: ESP32 + SIM7000G cellular modem with wind/temperature sensors
- **Firmware**: C++ Arduino framework, sends HTTP POST to backend at `/stations/:station_id/wind`
- **Backend**: AdonisJS v6 REST API with `@adonisjs/transmit` for SSE streaming
- **Frontend**: React/Vite with real-time SSE connection via `@adonisjs/transmit-client`
- **Deployment**: Docker Compose with Caddy reverse proxy on AWS

## Key Development Patterns

### Monorepo Structure

```bash
# Install dependencies for entire monorepo
pnpm install

# Run all services in development
pnpm dev  # Uses turbo to start all apps

# Individual app development
cd apps/adonis-api && node ace serve --watch
cd apps/react-frontend && pnpm dev
```

### Backend (AdonisJS) Patterns

- **Controllers**: RESTful endpoints in `app/controllers/` with IoT-friendly routes
- **Real-time**: Use `transmit.broadcast()` for SSE data streaming
- **Data caching**: Shared `stationDataCache` service for latest readings
- **API docs**: Auto-generated OpenAPI via `adonis-autoswagger` at `/docs`

Example controller pattern:

```typescript
// Receives data from firmware and broadcasts to frontend
async wind({ params, request }: HttpContext) {
  const { windSpeed, windDirection } = request.only(['windSpeed', 'windDirection'])
  stationDataCache.setWindData(station_id, data)
  transmit.broadcast(`wind/live/${station_id}`, data)
}
```

### Frontend (React) Patterns

- **Real-time SSE**: Connect to backend channels using `@adonisjs/transmit-client`
- **Wind visualization**: Custom gauge and compass components with D3.js
- **Multi-unit support**: Switch between m/s, km/h, knots, Beaufort scale
- **Mock data controls**: Development endpoints for testing real-time features

### Firmware (ESP32) Patterns

- **Modular C++**: Separate managers for modem, HTTP client, sensors, OTA
- **Power management**: Deep sleep cycles with cellular modem power-off
- **HTTP communication**: JSON payloads to backend, not CoAP/MQTT
- **Configuration**: `secrets.ini` for sensitive values, `Config.h` for defaults
- **Build system**: PlatformIO with secrets injection via `platformio.ini`

## Critical Commands

### Database Operations

```bash
# Run migrations (from adonis-api/)
node ace migration:run

# Create new migration
node ace make:migration create_table_name
```

### Firmware Development

```bash
# Build and upload firmware
pio run --target upload

# Monitor serial output
pio device monitor

# Build with debug flags
pio run -e aiolos-esp32dev-debug
```

### Infrastructure Deployment

```bash
# Deploy to AWS (from infra/)
AWS_PROFILE=resonect-prod terraform apply

# Local development stack
docker-compose -f docker-compose.dev.yml up

# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

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
