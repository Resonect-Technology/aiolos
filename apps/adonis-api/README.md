# Adonis API (Meteostation Backend)

This is the backend API for the Aiolos meteostation, built with [AdonisJS v6](https://adonisjs.com/).

## Features
- Stores and exposes sensor data (wind, temperature) from IoT devices
- Uses SQLite by default (see `config/database.ts`)
- Fully auto-generated OpenAPI docs with [adonis-autoswagger](https://github.com/ad-on-is/adonis-autoswagger)
- RESTful endpoints for sensor readings

## Project Structure
```
apps/adonis-api/
├── app/
│   ├── SensorReadingsController.ts
│   ├── models/
│   │   └── SensorReading.ts
│   └── ...
├── config/
│   └── swagger.ts
├── database/
│   └── migrations/
├── start/
│   └── routes.ts
├── .env
└── ...
```

## Usage

### Install dependencies
From the monorepo root:
```sh
pnpm install
```

### Run migrations
```sh
cd apps/adonis-api
node ace migration:run
```

### Start the API server
```sh
pnpm --filter adonis-api run dev
```

### API Endpoints
- `GET /sensor-readings` — List all sensor readings (filter by `sensor_id` or `type`)
- `GET /sensor-readings/:id` — Get a single sensor reading
- `POST /sensor-readings` — Create a new sensor reading

### OpenAPI & Swagger UI
- Live docs: [http://localhost:3333/docs](http://localhost:3333/docs)
- Raw OpenAPI YAML: [http://localhost:3333/swagger](http://localhost:3333/swagger)
- Docs are auto-generated from controller/model comments using [adonis-autoswagger](https://github.com/ad-on-is/adonis-autoswagger)

### Example SensorReading JSON
```json
{
  "sensor_id": "station-001",
  "type": "wind",
  "temperature": null,
  "wind_speed": 5.2,
  "wind_direction": 270
}
```

## Conventions
- Controllers and models use PascalCase and live in `app/`
- Use JSDoc comments for OpenAPI annotations (see `SensorReadingsController.ts`)
- For production, use `node ace docs:generate` to generate a static OpenAPI file

---

For more, see code comments and [adonis-autoswagger docs](https://github.com/ad-on-is/adonis-autoswagger).
