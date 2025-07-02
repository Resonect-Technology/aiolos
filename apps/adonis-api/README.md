# AdonisJS API - Aiolos Project

This application serves as the backend API for the Aiolos live wind data monitoring system. It is built with AdonisJS and TypeScript.

## Key Features

-   **Real-time Data Streaming**: Utilizes Server-Sent Events (SSE) via `@adonisjs/transmit` to stream live wind data to connected clients.
-   **Data Ingestion**: Provides an endpoint (`/stations/:station_id/live/wind`) for ingesting wind speed and direction data from sensors or other sources.
-   **Mock Data Generation**: Includes endpoints for development and testing:
    -   `/stations/:station_id/live/wind/mock`: Sends a single mock wind data event.
    -   `/stations/:station_id/live/wind/mock/start`: Starts a 1-second interval stream of mock wind data with gradually changing values.
    -   `/stations/:station_id/live/wind/mock/stop`: Stops the mock data stream.
-   **Channel Authorization**: Configured to authorize client subscriptions to specific data channels (e.g., `wind/live/:station_id`).
-   **Database Integration**: Includes a migration for a `sensor_readings` table (further development can expand on data persistence).
-   **API Documentation**: Setup for OpenAPI/Swagger documentation (accessible via `/docs`).

## Technologies Used

-   [AdonisJS](https://adonisjs.com/) v6
-   [TypeScript](https://www.typescriptlang.org/)
-   [@adonisjs/transmit](https://github.com/adonisjs/transmit) for SSE
-   [SQLite](https://www.sqlite.org/) with [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) driver
-   [Lucid ORM](https://lucid.adonisjs.com/) for database interactions
-   [adonis-autoswagger](https://github.com/Julien-R44/adonis-autoswagger) for OpenAPI documentation

## Setup and Running

1.  Navigate to the `apps/adonis-api` directory.
2.  Install dependencies: `pnpm install` (or `npm install`)
3.  Run database migrations: `node ace migration:run`
4.  Start the development server: `node ace serve --watch`

The API will typically run on `http://localhost:3333`.

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
- `GET /stations/:station_id/readings` — List all readings for a station (optionally filter by `type`)
- `GET /stations/:station_id/readings/:id` — Get a single reading for a station
- `POST /stations/:station_id/readings` — Create a new reading for a station

### Live Wind Data (SSE)
- **Subscribe to live wind speed and direction for a station using Server-Sent Events (SSE) via Transmit.**
- **Channel:** `wind/live/:station_id`
- **Endpoint:** `/__transmit/events` (SSE stream, managed by Transmit)
- See [@adonisjs/transmit docs](https://docs.adonisjs.com/guides/transmit/introduction) for client usage.

#### Example (React)
```js
import { Transmit } from '@adonisjs/transmit-client'
// Use the correct port (33891 in development, or your production port)
const transmit = new Transmit({ baseUrl: 'http://localhost:33891' })
const subscription = transmit.subscription('wind/live/station-001')
await subscription.create()
subscription.onMessage((data) => {
  // data: { wind_speed, wind_direction, timestamp }
  // Update your UI here
})
```

### Ingesting Live Wind Data (for IoT/CoAP Proxy)
- **Endpoint:** `POST /stations/:station_id/live/wind`
- **Body:** `{ wind_speed: number, wind_direction: number, timestamp?: string }`
- Broadcasts to SSE channel: `wind/live/:station_id`
- Use this endpoint to push new wind data from your IoT/CoAP proxy to all live subscribers.

#### Example (curl)
```sh
curl -X POST http://localhost:3333/stations/station-001/live/wind \
  -H 'Content-Type: application/json' \
  -d '{"wind_speed":5.2,"wind_direction":270}'
```

### Mocking Live Wind Data (Development Only)
- **Endpoint:** `POST /stations/:station_id/live/wind/mock`
- **Body:** Optionally provide `wind_speed`, `wind_direction`, `timestamp` (otherwise random values are used)
- Use this endpoint to simulate live wind data for frontend or SSE testing.

#### Example (curl)
```sh
curl -X POST http://localhost:33891/stations/station-001/live/wind/mock
```

#### Example (Postman - Setting up SSE)
1. **Create a GET request to:** `http://localhost:33891/__transmit/events?channels=wind/live/station-001`
2. **In Settings:** Enable "Event stream" option
3. **In a separate tab:** Send `POST http://localhost:33891/stations/station-001/live/wind/mock/start`
4. **Watch:** Events will appear in the response of the SSE request
5. **To stop:** Send `POST http://localhost:33891/stations/station-001/live/wind/mock/stop`

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

## Database Setup

### SQLite with better-sqlite3
This application uses SQLite as the database with the `better-sqlite3` driver for optimal performance on ARM64 (Raspberry Pi/EC2) and x86_64 architectures.

**Database Configuration:**
- **File location:** `/app/tmp/db.sqlite3` (in production Docker container)
- **Driver:** `better-sqlite3` for synchronous operations and better ARM64 support
- **Migrations:** Automatically run on container startup
- **Persistence:** Database file is stored on a Docker volume for data persistence

**Available Tables:**
- `sensor_readings` - Stores wind speed, temperature, and other sensor data
- `station_diagnostics` - System diagnostics and health monitoring
- `station_configs` - Configuration settings per station (including OTA update settings)
- `system_configs` - Global system configuration

### Migration Management
Migrations are automatically executed during container startup. The migration order has been carefully configured to ensure proper table creation:

1. `create_sensor_readings_table` - Basic sensor data storage
2. `create_station_diagnostics_table` - Diagnostic information
3. `create_station_configs_table` - Station configuration
4. `add_ota_fields_to_station_configs` - OTA update fields (added after table creation)
5. `create_system_configs_table` - System-wide settings

**Manual Migration Commands:**
```bash
# Run pending migrations
node ace migration:run

# Rollback last migration
node ace migration:rollback

# Check migration status
node ace migration:status
```

## Docker Deployment

### Production Container Setup
The application is containerized for reliable deployment on ARM64 (Raspberry Pi/EC2) and x86_64 architectures.

**Key Container Features:**
- **Base Image:** `node:22-slim` with native compilation support
- **Working Directory:** `/app` (app root), with build output in `/app/build/`
- **Database Path Resolution:** Symlink from `/app/build/tmp` → `/app/tmp` for proper AdonisJS path resolution
- **Volume Mount:** `/app/tmp` for SQLite database persistence
- **Health Check:** HTTP check on port 8080 (requires `/healthcheck` route)

**Directory Structure in Container:**
```
/app/
├── build/           # AdonisJS build output (compiled TypeScript)
│   ├── tmp/         # Symlink to /app/tmp
│   ├── bin/
│   │   └── server.js
│   ├── ace.js
│   └── ...
├── tmp/             # Database and temporary files (volume mounted)
│   └── db.sqlite3   # SQLite database file
├── node_modules/
└── package.json
```

**Startup Process:**
1. Create `/app/tmp` directory for database
2. Create symlink `/app/build/tmp` → `/app/tmp` for AdonisJS path resolution
3. Run database migrations from `/app/build/`
4. Start AdonisJS server from compiled build output

### Path Resolution Fix
**Issue:** AdonisJS when running from `/app/build/` considers that as the app root, so `app.tmpPath()` resolves to `/app/build/tmp/` instead of `/app/tmp/` where the volume is mounted.

**Solution:** The entrypoint script creates a symbolic link:
```bash
ln -sf /app/tmp /app/build/tmp
```

This ensures that:
- AdonisJS can find the database at the path it expects (`/app/build/tmp/db.sqlite3`)
- The actual database file is stored in the persistent volume (`/app/tmp/db.sqlite3`)
- Data persists across container restarts

### Building and Deployment
**GitHub Actions Pipeline:**
- Builds Docker images for ARM64 architecture only
- Pushes to Amazon ECR
- Deploys to EC2 instance via SSH
- Includes health checks and rollback capabilities

**Local Development:**
```bash
# Build image locally
docker build -t aiolos-backend -f apps/adonis-api/Dockerfile .

# Run with database persistence
docker run -d \
  --name aiolos-backend \
  -p 8080:8080 \
  -v aiolos_db:/app/tmp \
  aiolos-backend
```

### Troubleshooting
**Common Issues:**
1. **"Cannot open database because the directory does not exist"**
   - Fixed by ensuring proper path resolution and symlink creation
   - Database path must be accessible from AdonisJS runtime context

2. **Migration ordering errors**
   - Fixed by renaming migration files with proper timestamps
   - Table creation must happen before table alterations

3. **Container unhealthy status**
   - Usually caused by missing `/healthcheck` route or `wget` not being available
   - Check server logs for actual startup status
