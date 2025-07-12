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
const StationLiveController = () => import('#app/controllers/station_live_controller')
const StationDiagnosticsController = () => import('#app/controllers/station_diagnostics_controller')
const StationConfigsController = () => import('#app/controllers/station_configs_controller')
const SystemConfigsController = () => import('#app/controllers/system_configs_controller')
const StationTemperatureController = () => import('#app/controllers/station_temperature_controller')
const WindOneMinutesController = () => import('#app/controllers/wind_one_minutes_controller')

/**
 * Home route
 */
router.get('/', async () => {
  return {
    hello: 'world',
  }
})

/**
 * Health check route for Docker healthcheck
 */
router.get('/healthcheck', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  }
})

/**
 * Documentation routes
 */
router
  .get('/swagger', async () => {
    return AutoSwagger.default.docs(router.toJSON(), swagger)
  })
  .as('docs.swagger')

router
  .get('/docs', async () => {
    return AutoSwagger.default.ui('/swagger', swagger)
  })
  .as('docs.ui')

/**
 * API Routes - All routes under /api prefix
 */
router
  .group(() => {
    /**
     * System-wide configuration routes
     */
    router
      .group(() => {
        router.get('/', [SystemConfigsController, 'index']).as('index')
        router.get('/:key', [SystemConfigsController, 'get']).as('get')
        router.post('/:key', [SystemConfigsController, 'set']).as('set')
      })
      .prefix('/system/config')
      .as('system.config')

    /**
     * Station API routes
     */
    router
      .group(() => {
        // Apply .as() to name routes for reverse routing

        // Temperature data endpoint for firmware
        router.post('/temperature', [StationTemperatureController, 'store']).as('temperature.store')
        router.get('/temperature', [StationTemperatureController, 'index']).as('temperature.index')
        router
          .get('/temperature/latest', [StationTemperatureController, 'latest'])
          .as('temperature.latest')

        // Station diagnostics endpoints
        router.post('/diagnostics', [StationDiagnosticsController, 'store']).as('diagnostics.store')
        router.get('/diagnostics', [StationDiagnosticsController, 'show']).as('diagnostics.show')

        // Station configuration endpoints (includes all config and flags)
        router.get('/config', [StationConfigsController, 'show']).as('config.show')
        router.post('/config', [StationConfigsController, 'store']).as('config.store')

        // OTA confirmation endpoint - firmware calls this to confirm OTA mode started
        router.post('/ota-confirm', [StationConfigsController, 'confirmOta']).as('ota.confirm')

        // Wind data endpoint for firmware (maps to same controller as live/wind)
        router.post('/wind', [StationLiveController, 'wind']).as('wind')

        // 1-minute wind data endpoints
        router.get('/wind/one-minute', [WindOneMinutesController, 'index']).as('wind.one_minute')
        router.get('/wind/one-minute/latest', [WindOneMinutesController, 'latest']).as('wind.one_minute.latest')

        // Live data routes group
        router
          .group(() => {
            // Live wind data ingestion endpoint for stations
            router.post('/wind', [StationLiveController, 'wind']).as('live_wind')

            // Mock data routes for development
            router
              .group(() => {
                router.post('/mock', [StationLiveController, 'mockWind']).as('mock')
                router.post('/mock/start', [StationLiveController, 'startMockWind']).as('start')
                router.post('/mock/stop', [StationLiveController, 'stopMockWind']).as('stop')
              })
              .prefix('/wind')
              .as('wind')
          })
          .prefix('/live')
          .as('live')
      })
      .prefix('/stations/:station_id')
      .as('stations')
  })
  .prefix('/api')
  .as('api')

// Let Transmit register its routes
transmit.registerRoutes()
