/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import AutoSwagger from 'adonis-autoswagger'
import swagger from '#config/swagger'
import transmit from '@adonisjs/transmit/services/main'

// Import controllers
const SensorReadingsController = () => import('#app/SensorReadingsController')
const StationLiveController = () => import('#app/controllers/StationLiveController')
const StationDiagnosticsController = () => import('#app/controllers/StationDiagnosticsController')

/**
 * Home route
 */
router.get('/', async () => {
  return {
    hello: 'world',
  }
})

/**
 * Documentation routes
 */
router.get('/swagger', async () => {
  return AutoSwagger.default.docs(router.toJSON(), swagger)
}).as('docs.swagger')

router.get('/docs', async () => {
  return AutoSwagger.default.ui('/swagger', swagger)
}).as('docs.ui')

/**
 * Station API routes
 */
router.group(() => {
  // Apply .as() to name routes for reverse routing
  // Station readings routes (new format, replacing /sensors/:sensor_id/readings)
  router.get('/readings', [SensorReadingsController, 'index']).as('readings.index')
  router.get('/readings/:id', [SensorReadingsController, 'show']).as('readings.show')
  router.post('/readings', [SensorReadingsController, 'store']).as('readings.store')

  // Station diagnostics endpoints
  router.post('/diagnostics', [StationDiagnosticsController, 'store']).as('diagnostics.store')
  router.get('/diagnostics', [StationDiagnosticsController, 'show']).as('diagnostics.show')

  // Live data routes group
  router.group(() => {
    // Live wind data ingestion endpoint for stations
    router.post('/wind', [StationLiveController, 'wind']).as('wind')

    // Mock data routes for development
    router.group(() => {
      router.post('/mock', [StationLiveController, 'mockWind']).as('mock')
      router.post('/mock/start', [StationLiveController, 'startMockWind']).as('start')
      router.post('/mock/stop', [StationLiveController, 'stopMockWind']).as('stop')
    }).prefix('/wind').as('wind')
  }).prefix('/live').as('live')

}).prefix('/stations/:station_id').as('stations')

// Let Transmit register its own routes
transmit.registerRoutes()
