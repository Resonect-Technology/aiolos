# Aiolos Monorepo

**Live wind tracking platform for water sports, powered by custom IoT meteostations.**

- 🌐 [aiolos.resonect.cz](https://aiolos.resonect.cz/)

---

## Overview

Aiolos is a modern, scalable platform for collecting, storing, and serving real-time wind and weather data from custom-built IoT stations. The system is designed for reliability, extensibility, and developer-friendliness.

### Key Features
- **Live wind & weather data** for water sports and research
- **Custom hardware**: [Aiolos meteostation](https://github.com/Resonect-Technology/Aiolos-HW)
- **Modular backend**: CoAP proxy (IoT bridge) + AdonisJS REST API
- **OpenAPI/Swagger docs**: Auto-generated for both proxy and API
- **Monorepo**: Managed with [pnpm](https://pnpm.io/) and [Turborepo](https://turbo.build/)

---

## Monorepo Structure

```
/
├── apps/
│   ├── coap-proxy/      # CoAP-to-HTTP proxy service (Node.js)
│   └── adonis-api/      # RESTful backend API (AdonisJS v6)
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md (this file)
```

- Each app has its own README with setup, usage, and API details.

---

## Apps

### CoAP Proxy Service ([docs](apps/coap-proxy/README.md))
- Receives CoAP messages from IoT sensors
- File-based routing, structured logging, OpenAPI docs
- Bridges sensors to the HTTP API (Adonis)

### Adonis API Service ([docs](apps/adonis-api/README.md))
- Stores and exposes sensor data (wind, temperature)
- RESTful, IoT-friendly routes: `/sensors/:sensor_id/readings`
- Auto-generated OpenAPI docs with [adonis-autoswagger](https://github.com/ad-on-is/adonis-autoswagger)

---

## Quickstart

From the repo root:
```sh
pnpm install
```

See each app's README for how to run, configure, and test the services.

---

## Contributing & Extending
- Add new sensors or data types by extending the proxy and API routes/models
- Use JSDoc comments for OpenAPI docs
- See code comments and each app's README for details

---