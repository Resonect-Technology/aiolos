# Aiolos Monorepo

**Live wind tracking platform for water sports, powered by custom IoT meteostations.**

- 🌐 [aiolos.resonect.cz](https://aiolos.resonect.cz/)

---

## Overview

Aiolos is a modern, scalable platform for collecting, storing, and serving real-time wind and weather data from custom-built IoT stations. The system is designed for reliability, extensibility, and developer-friendliness.

### Key Features
- **Live wind & weather data** for water sports and research
- **Custom hardware**: [Aiolos meteostation](https://github.com/Resonect-Technology/Aiolos-HW)
- **Modern backend**: AdonisJS REST API
- **OpenAPI/Swagger docs**: Auto-generated for the API
- **Monorepo**: Managed with [pnpm](https://pnpm.io/) and [Turborepo](https://turbo.build/)

---

![Aiolos Dashboard Screenshot](docs/screenshot-dashboard.png)

---

## Monorepo Structure

```
/
├── apps/
│   ├── adonis-api/      # RESTful backend API (AdonisJS v6)
│   └── react-frontend/  # User interface for live data (React, Vite)
├── firmware/            # ESP32/SIM7000G code for weather stations
├── hardware/            # 3D models and hardware specs
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md (this file)
```

- Each app has its own README with setup, usage, and API details.

---

## Apps

### Adonis API Service ([docs](apps/adonis-api/README.md))
- Stores and exposes sensor data (wind, temperature)
- RESTful, IoT-friendly routes: `/station/:station_id/readings`
- Direct HTTP endpoint for weather stations to submit data
- Auto-generated OpenAPI docs with [adonis-autoswagger](https://github.com/ad-on-is/adonis-autoswagger)

### React Frontend ([docs](apps/react-frontend/README.md))
- User interface built with React, Vite, and TypeScript.
- Displays live wind speed (with unit conversion) and direction using dynamic gauges and a compass.
- Connects to the Adonis API via Server-Sent Events (SSE) for real-time data.
- Provides controls for interacting with mock data streams from the backend.

### Firmware ([docs](firmware/README.md))
- Embedded code for the Aiolos meteostation hardware
- Written for Arduino-compatible microcontrollers (ESP32 + SIM7000G)
- Handles sensor readings, power management, and HTTP communication
- Includes configuration and usage guides for hardware setup

---

## Quickstart

From the repo root:
```sh
pnpm install
```

See each app's README for how to run, configure, and test the services.

---

## Contributing & Extending
- Add new sensors or data types by extending the API routes/models
- Use JSDoc comments for OpenAPI docs
- See code comments and each app's README for details

---