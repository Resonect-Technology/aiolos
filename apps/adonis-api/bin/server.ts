/*
|--------------------------------------------------------------------------
| HTTP server entrypoint
|--------------------------------------------------------------------------
|
| The "server.ts" file is the entrypoint for starting the AdonisJS HTTP
| server. Either you can run this file directly or use the "serve"
| command to run this file and monitor file changes
|
*/

import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('../', import.meta.url)

/**
 * The importer is used to import files in context of the
 * application.
 */
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env')

      // Set up periodic cleanup for station data cache
      const { stationDataCache } = await import('#services/station_data_cache')

      // Set up wind aggregation service
      const { windAggregationService } = await import('#services/wind_aggregation_service')

      // Clean up old data every hour (1 hour = 60 * 60 * 1000 ms)
      const cleanupInterval = setInterval(
        () => {
          stationDataCache.clearOldData(1) // Remove data older than 1 hour
        },
        60 * 60 * 1000
      )

      // Clean up interval when app terminates
      app.terminating(() => {
        clearInterval(cleanupInterval)
        windAggregationService.stopFlushTimer()
      })
    })
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .httpServer()
  .start()
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })
