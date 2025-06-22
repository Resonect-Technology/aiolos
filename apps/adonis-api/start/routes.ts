/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
const SensorReadingsController = () => import('#app/SensorReadingsController')
const StationLiveController = () => import('#app/controllers/StationLiveController')
const EventStreamController = () => import('#app/controllers/EventStreamController')
const SubscribeController = () => import('#app/controllers/SubscribeController')
const UnsubscribeController = () => import('#app/controllers/UnsubscribeController')
import AutoSwagger from 'adonis-autoswagger'
import swagger from '#config/swagger'
import transmit from '@adonisjs/transmit/services/main'

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

// Station readings routes (new format, replacing /sensors/:sensor_id/readings)
router.get('/stations/:station_id/readings', [SensorReadingsController, 'index'])
router.get('/stations/:station_id/readings/:id', [SensorReadingsController, 'show'])
router.post('/stations/:station_id/readings', [SensorReadingsController, 'store'])

// Live wind data ingestion endpoint for stations
router.post('/stations/:station_id/live/wind', [StationLiveController, 'wind'])
// Mock live wind data endpoint for development
router.post('/stations/:station_id/live/wind/mock', [StationLiveController, 'mockWind'])
// Start/stop 1s interval mock wind data endpoints for development
router.post('/stations/:station_id/live/wind/mock/start', [StationLiveController, 'startMockWind'])
router.post('/stations/:station_id/live/wind/mock/stop', [StationLiveController, 'stopMockWind'])

router.get('/swagger', async () => {
  return AutoSwagger.default.docs(router.toJSON(), swagger)
})

router.get('/docs', async () => {
  return AutoSwagger.default.ui('/swagger', swagger)
})

// Register custom Transmit routes with our PascalCase controllers
router.get('/__transmit/events', [EventStreamController, 'handle'])
router.post('/__transmit/subscriptions', [SubscribeController, 'handle'])
router.delete('/__transmit/subscriptions/:id', [UnsubscribeController, 'handle'])
