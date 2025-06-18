# CoAP Proxy Service

A standalone Node.js service that bridges CoAP IoT sensors and the HTTP backend API.

- **Tech:** Node.js, [coap](https://www.npmjs.com/package/coap), [axios](https://www.npmjs.com/package/axios), [dotenv](https://www.npmjs.com/package/dotenv), [pino](https://www.npmjs.com/package/pino)
- **Config:** `.env` file in `apps/coap-proxy/` (see `.env.example`)
- **Logging:** Structured with pino
- **Routing:** File-based, extensible (see `src/routes/`)
- **OpenAPI:** Comments in route files, spec generated with [openapi-comment-parser](https://github.com/bee-travels/openapi-comment-parser)
- **Fault Tolerance:** Proxy does not crash if backend is unavailable; returns CoAP 5.02 error

### Example .env
```
COAP_PORT=5683
API_BASE_URL=http://localhost:3333/api
LOG_LEVEL=info
```

### Running the Proxy
From the repo root:
```sh
pnpm install
pnpm --filter coap-proxy run dev
```

### Testing the Proxy
A test script is provided to simulate real device messages:
```sh
pnpm exec node apps/coap-proxy/test-coap-client.js
```

### OpenAPI Documentation
- Route files are documented with JSDoc comments.
- Generate OpenAPI spec:
  ```sh
  npx openapi-comment-parser apps/coap-proxy/src openapi.json
  ```
- See `openapi.yaml` for base info. Header clearly states this is a CoAP-to-HTTP proxy for CoAP clients.

### Adding Routes
- Add new `.js` files in `src/routes/` (supports subdirectories, e.g., `src/routes/sensor/wind.js` → `/sensor/wind`)
- Document with JSDoc for OpenAPI

---

## Adonis API Service

A RESTful backend for storing and exposing sensor data, built with [AdonisJS v6](https://adonisjs.com/).

- **Tech:** AdonisJS v6, SQLite (default), [adonis-autoswagger](https://github.com/ad-on-is/adonis-autoswagger)
- **OpenAPI:** Live docs at [http://localhost:3333/docs](http://localhost:3333/docs) (auto-generated from code comments)
- **Conventions:**
  - Controllers and models use PascalCase and live in `app/`
  - Use JSDoc comments for OpenAPI annotations
  - For production, use `node ace docs:generate` to generate a static OpenAPI file
- See [`apps/adonis-api/README.md`](apps/adonis-api/README.md) for full usage and conventions

---

For more, see code comments and OpenAPI docs.
