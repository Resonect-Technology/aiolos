/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import app from '@adonisjs/core/services/app';
import router from '@adonisjs/core/services/router';
import transmit from '@adonisjs/transmit/services/main';
import AutoSwagger from 'adonis-autoswagger';

import swagger from '#config/swagger';
import { middleware } from '#start/kernel';

// Import controllers
const StationLiveController = () => import('#app/controllers/station_live_controller');
const StationDiagnosticsController = () =>
  import('#app/controllers/station_diagnostics_controller');
const StationConfigsController = () => import('#app/controllers/station_configs_controller');
const AdminSessionsController = () => import('#app/controllers/admin_sessions_controller');
const SystemConfigsController = () => import('#app/controllers/system_configs_controller');
const StationTemperatureController = () =>
  import('#app/controllers/station_temperature_controller');
const WindAggregatedController = () => import('#app/controllers/wind_aggregated_controller');
const WindAggregationController = () => import('#app/controllers/wind_aggregation_controller');
const WindDebugController = () => import('#app/controllers/wind_debug_controller');

/**
 * Home route
 */
router.get('/', async () => {
  return {
    hello: 'world',
  };
});

/**
 * Health check route for Docker healthcheck
 */
router.get('/healthcheck', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
});

/**
 * Documentation routes
 */
router
  .get('/swagger', async () => {
    return AutoSwagger.default.docs(router.toJSON(), swagger);
  })
  .as('docs.swagger');

router
  .get('/docs', async () => {
    return AutoSwagger.default.ui('/swagger', swagger);
  })
  .as('docs.ui');

/**
 * API Routes - All routes under /api prefix
 */
router
  .group(() => {
    /**
     * Admin session routes (password login -> encrypted cookie)
     */
    router
      .group(() => {
        router.post('/session', [AdminSessionsController, 'store']).as('session.store');
        router.get('/session', [AdminSessionsController, 'show']).as('session.show');
        router.delete('/session', [AdminSessionsController, 'destroy']).as('session.destroy');
      })
      .prefix('/admin')
      .as('admin');

    /**
     * System-wide configuration routes
     */
    router
      .group(() => {
        router.get('/', [SystemConfigsController, 'index']).as('index');
        router.get('/:key', [SystemConfigsController, 'get']).as('get');
        router
          .post('/:key', [SystemConfigsController, 'set'])
          .as('set')
          .use(middleware.adminAuth());
      })
      .prefix('/system/config')
      .as('system.config');

    /**
     * Wind aggregation management routes
     */
    router
      .group(() => {
        router
          .post('/10min/trigger', [WindAggregationController, 'trigger10MinAggregation'])
          .as('trigger10min');
        router
          .post('/10min/process-last-hour', [WindAggregationController, 'processLastHour'])
          .as('processLastHour');
        router
          .post('/10min/force-catchup', [WindAggregationController, 'forceCatchup'])
          .as('forceCatchup');
        router
          .post('/recalculate-tendencies', [WindAggregationController, 'recalculateTendencies'])
          .as('recalculateTendencies');
        router.get('/status', [WindAggregationController, 'status']).as('status');
      })
      .prefix('/wind/aggregation')
      .as('wind.aggregation')
      .use(middleware.adminAuth());

    /**
     * Wind debug routes (for development)
     */
    router
      .group(() => {
        router.get('/:station_id', [WindDebugController, 'debug']).as('debug');
        router
          .post('/:station_id/create-mock-data', [WindDebugController, 'createMockData'])
          .as('createMockData');
      })
      .prefix('/wind/debug')
      .as('wind.debug')
      .use(middleware.adminAuth());

    /**
     * Station API routes
     */
    router
      .group(() => {
        // Apply .as() to name routes for reverse routing

        // Temperature data endpoint for firmware
        router
          .post('/temperature', [StationTemperatureController, 'store'])
          .as('temperature.store')
          .use(middleware.stationAuth());
        router.get('/temperature', [StationTemperatureController, 'index']).as('temperature.index');
        router
          .get('/temperature/latest', [StationTemperatureController, 'latest'])
          .as('temperature.latest');
        router
          .get('/temperature/aggregated', [StationTemperatureController, 'aggregated'])
          .as('temperature.aggregated');

        // Station diagnostics endpoints
        router
          .post('/diagnostics', [StationDiagnosticsController, 'store'])
          .as('diagnostics.store')
          .use(middleware.stationAuth());
        router.get('/diagnostics', [StationDiagnosticsController, 'show']).as('diagnostics.show');
        router
          .get('/diagnostics/history', [StationDiagnosticsController, 'history'])
          .as('diagnostics.history');
        router
          .get('/diagnostics/aggregated', [StationDiagnosticsController, 'aggregated'])
          .as('diagnostics.aggregated');

        // Station configuration endpoints (includes all config and flags)
        router.get('/config', [StationConfigsController, 'show']).as('config.show');
        router
          .post('/config', [StationConfigsController, 'store'])
          .as('config.store')
          .use(middleware.adminAuth());

        // OTA confirmation endpoint - firmware calls this to confirm OTA mode started
        router
          .post('/ota-confirm', [StationConfigsController, 'confirmOta'])
          .as('ota.confirm')
          .use(middleware.stationAuth());

        // Wind data endpoint for firmware (maps to same controller as live/wind)
        router
          .post('/wind', [StationLiveController, 'wind'])
          .as('wind')
          .use(middleware.stationAuth());

        // Aggregated wind data endpoints
        router
          .group(() => {
            router.get('/', [WindAggregatedController, 'index']).as('index');
            router.get('/latest', [WindAggregatedController, 'latest']).as('latest');
            router.get('/converted', [WindAggregatedController, 'converted']).as('converted');
          })
          .prefix('/wind/aggregated')
          .as('wind.aggregated');

        // Live data routes group
        router
          .group(() => {
            // Live wind data ingestion endpoint for stations
            router
              .post('/wind', [StationLiveController, 'wind'])
              .as('live_wind')
              .use(middleware.stationAuth());

            // Mock data routes for development — not registered in production
            // (mock/start spawns a 1 Hz broadcast loop and pollutes aggregates)
            if (!app.inProduction) {
              router
                .group(() => {
                  router.post('/mock', [StationLiveController, 'mockWind']).as('mock');
                  router.post('/mock/start', [StationLiveController, 'startMockWind']).as('start');
                  router.post('/mock/stop', [StationLiveController, 'stopMockWind']).as('stop');
                })
                .prefix('/wind')
                .as('wind');
            }
          })
          .prefix('/live')
          .as('live');
      })
      .prefix('/stations/:station_id')
      .as('stations');
  })
  .prefix('/api')
  .as('api');

// Let Transmit register its routes
transmit.registerRoutes();
