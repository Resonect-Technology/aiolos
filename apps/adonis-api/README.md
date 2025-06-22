# Adonis API (Meteostation Backend)

This is the backend API for the Aiolos meteostation, built with [AdonisJS v6](https://adonisjs.com/).

## Features
- Stores and exposes sensor data (wind, temperature) from IoT devices
- Uses SQLite by default (see `config/database.ts`)
- Fully auto-generated OpenAPI docs with [adonis-autoswagger](https://github.com/ad-on-is/adonis-autoswagger)
- RESTful endpoints for sensor readings
- **Live wind data streaming via Server-Sent Events (SSE) with [Transmit](https://docs.adonisjs.com/guides/transmit/introduction)**
- **Development tooling for mocking wind data streams**

## Project Structure
```
apps/adonis-api/
├── app/
│   ├── controllers/
│   │   ├── EventStreamController.ts    # SSE event stream handling
│   │   ├── StationLiveController.ts    # Live wind data & mock features
│   │   ├── SubscribeController.ts      # Channel subscription
│   │   └── SensorReadingsController.ts # REST API for stored readings
│   ├── models/
│   │   └── SensorReading.ts
│   └── ...
├── config/
│   ├── transmit.ts                     # SSE/Transmit configuration
│   └── swagger.ts
├── start/
│   ├── transmit.ts                     # Channel authorization
│   └── routes.ts                       # All API routes
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

### Live Wind Data Streaming (SSE)

The API provides real-time wind data streaming using Server-Sent Events (SSE) via AdonisJS Transmit. This enables clients to receive live updates of wind speed and direction for specific stations without polling.

#### SSE Connection Details
- **Channel Format:** `wind/live/:station_id` (e.g., `wind/live/station-001`)
- **SSE Endpoint:** `GET /__transmit/events?channels=wind/live/:station_id`
- **Data Format:** `{ wind_speed: number, wind_direction: number, timestamp: string }`

#### Client Integration Options

##### React Client Example
```js
import { Transmit } from '@adonisjs/transmit-client'

// Use the correct port (33891 in development, or your production port)
const transmit = new Transmit({ baseUrl: 'http://localhost:33891' })

// Connect to a specific station's wind data
const subscription = transmit.subscription('wind/live/station-001')
await subscription.create()

// Handle incoming wind data
subscription.onMessage((data) => {
  console.log('New wind data:', data)
  // data: { wind_speed, wind_direction, timestamp }
  // Update your UI here (e.g., wind direction indicator, speed gauge)
})

// Clean up when component unmounts
return () => subscription.close()
```

##### Vanilla JavaScript Example
```js
// Connect to SSE stream
const eventSource = new EventSource('http://localhost:33891/__transmit/events?channels=wind/live/station-001')

// Listen for messages
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data)
  console.log('New wind data:', data.data) // Note the nested data structure
  // Update UI with data.data.wind_speed, data.data.wind_direction, etc.
})

// Handle connection events
eventSource.addEventListener('open', () => console.log('SSE connection opened'))
eventSource.addEventListener('error', () => console.log('SSE connection error'))

// Close connection when done
// eventSource.close()
```

#### Testing with Postman
1. **Create a GET request to:** `http://localhost:33891/__transmit/events?channels=wind/live/station-001`
2. **Headers:** Set `Accept: text/event-stream`
3. **In Settings tab:** Enable "Event stream" option under "Response Type"
4. **Send the request:** You should see a connection established message
5. **In a separate tab:** Trigger mock data (see below)
6. **Observe:** Live wind data will appear in the response area as it arrives

### Ingesting Live Wind Data

#### For IoT Devices / CoAP Proxy
- **Endpoint:** `POST /stations/:station_id/live/wind`
- **Body:** `{ wind_speed: number, wind_direction: number, timestamp?: string }`
- Broadcasts to SSE channel: `wind/live/:station_id`
- Use this endpoint to push new wind data from your IoT devices or CoAP proxy to all live subscribers.

```sh
# Example using curl
curl -X POST http://localhost:33891/stations/station-001/live/wind \
  -H 'Content-Type: application/json' \
  -d '{"wind_speed":5.2,"wind_direction":270}'
```

### Mock Data Features (Development Only)

For development and testing, the API includes several endpoints to simulate live wind data:

#### 1. Send Single Mock Event
- **Endpoint:** `POST /stations/:station_id/live/wind/mock`
- **Body:** Optionally provide `wind_speed`, `wind_direction`, `timestamp` (random values used if not provided)
- **Response:** The generated/provided data that was broadcast

```sh
# Example: Send single random wind data event
curl -X POST http://localhost:33891/stations/station-001/live/wind/mock
```

#### 2. Start Continuous Mock Data (1s interval)
- **Endpoint:** `POST /stations/:station_id/live/wind/mock/start`
- **Description:** Starts a background process that sends random wind data every second
- **Response:** Confirmation message

```sh
# Example: Start 1-second interval mock data
curl -X POST http://localhost:33891/stations/station-001/live/wind/mock/start
```

#### 3. Stop Continuous Mock Data
- **Endpoint:** `POST /stations/:station_id/live/wind/mock/stop`
- **Description:** Stops the interval-based mock data for the specified station
- **Response:** Confirmation message

```sh
# Example: Stop mock data interval
curl -X POST http://localhost:33891/stations/station-001/live/wind/mock/stop
```
5. **To stop:** Send `POST http://localhost:33891/stations/station-001/live/wind/mock/stop`

### OpenAPI & Swagger UI
- Live docs: [http://localhost:33891/docs](http://localhost:33891/docs)
- Raw OpenAPI YAML: [http://localhost:33891/swagger](http://localhost:33891/swagger)
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
