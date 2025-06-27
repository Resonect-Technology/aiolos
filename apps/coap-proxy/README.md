# CoAP Proxy - Aiolos Project

This application acts as a CoAP (Constrained Application Protocol) proxy for the Aiolos project. It receives data from CoAP-enabled IoT devices or sensors and forwards it to the main AdonisJS backend API.

## Key Features

- **CoAP Server**: Listens for incoming CoAP messages from devices using the [`coap`](https://www.npmjs.com/package/coap) npm package.
- **Request Handling**: Defines routes to handle specific sensor data, such as temperature and wind data (e.g., `/sensor/temperature`, `/sensor/wind`, `/sensor/:sensorId/temperature`).
- **Data Forwarding**: Translates CoAP messages and forwards the relevant payload to the appropriate endpoint on the main AdonisJS API (e.g., to `/stations/:station_id/live/wind`).
- **API Description**: Includes OpenAPI specifications (`openapi.json`, `openapi.yaml`) for its own interface or the interface it interacts with.
- **Test Client**: Contains a `test-coap-client.js` for testing CoAP communication with the proxy.

## Purpose

In an IoT context, many sensors use lightweight protocols like CoAP due to resource constraints. This proxy serves as a bridge:

1. Sensors send data via CoAP to this proxy.
2. The proxy receives the CoAP data.
3. The proxy then makes an HTTP request to the main AdonisJS API (`adonis-api` service) to ingest this data.

## Technologies Used

- [Node.js](https://nodejs.org/)
- [`coap` npm package](https://www.npmjs.com/package/coap) for CoAP protocol support
- No HTTP endpoints are exposed by default (unless you add them)

## Directory Structure

```
coap-proxy/
├── openapi.json / openapi.yaml   # OpenAPI specs
├── package.json                 # Project metadata and scripts
├── src/
│   ├── index.js                 # Main entry point (CoAP server)
│   ├── routes.js                # Route definitions
│   └── routes/
│       └── sensor_data.js       # Example: sensor data handlers
├── test-coap-client.js          # Test client for CoAP
└── README.md
```

## Setup and Running

1. Navigate to the `apps/coap-proxy` directory.
2. Install dependencies: `pnpm install` (or `npm install`)
3. Configure environment variables if necessary (e.g., the target URL for the AdonisJS API):
   - Example: `ADONIS_API_URL=http://localhost:3333`
   - You can use a `.env` file or export variables in your shell.
4. Start the proxy server:
   - `node src/index.js` (or use the script defined in `package.json`, e.g., `pnpm start`)

## Scripts

Common scripts (see `package.json` for more):

- `start`: Start the CoAP proxy server
- `test`: Run tests (if present)

## Development Notes

- The `test-coap-client.js` can be used to simulate a CoAP device sending data to this proxy.
- Ensure the main AdonisJS API is running and accessible for the proxy to forward data.
- OpenAPI specs are provided for reference and integration.

---

## Adonis API Service

A RESTful backend for storing and exposing sensor data, built with [AdonisJS v6](https://adonisjs.com/).

- **Tech:** AdonisJS v6, SQLite (default), [adonis-autoswagger](https://github.com/ad-on-is/adonis-autoswagger)
- **OpenAPI:** Live docs at [http://localhost:3333/docs](http://localhost:3333/docs) (auto-generated from code comments)
- **Conventions:**
  - Controllers and models use PascalCase and live in `app/`
  - Use JSDoc comments for OpenAPI annotations
  - For production, use `node ace docs:generate` to generate a static OpenAPI file
- See [`apps/adonis-api/README.md`](../adonis-api/README.md) for full usage and conventions

---

For more, see code comments and OpenAPI docs.
