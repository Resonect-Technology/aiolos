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

import '@poppinss/ts-exec';
import 'reflect-metadata';
import { Ignitor, prettyPrintError } from '@adonisjs/core';

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('../', import.meta.url);

/**
 * The importer is used to import files in context of the
 * application.
 */
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href);
  }
  return import(filePath);
};

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env');

      // The stationAuth middleware is deliberately fail-open when the key is
      // unset — surface which mode we're in so it's never a silent surprise
      console.log(
        process.env.STATION_API_KEY
          ? 'Station ingest auth: ENFORCED (X-API-Key required)'
          : 'Station ingest auth: OPEN (STATION_API_KEY not set)',
      );

      // Set up periodic cleanup for station data cache
      const { stationDataCache } = await import('#services/station_data_cache');

      // Set up wind aggregation service
      const { windAggregationService } = await import('#services/wind_aggregation_service');

      // Set up DB retention cleanup
      const { dataCleanupService } = await import('#services/data_cleanup_service');

      // Clean up old data every hour (1 hour = 60 * 60 * 1000 ms)
      const cleanupInterval = setInterval(
        () => {
          stationDataCache.clearOldData(1); // Remove data older than 1 hour
        },
        60 * 60 * 1000,
      );

      // DB retention cleanup: once shortly after boot, then every 6 hours
      const retentionBootTimeout = setTimeout(() => {
        dataCleanupService.runAllCleanups().catch((error) => {
          console.error('Error running data retention cleanup:', error);
        });
      }, 30 * 1000);
      const retentionInterval = setInterval(
        () => {
          dataCleanupService.runAllCleanups().catch((error) => {
            console.error('Error running data retention cleanup:', error);
          });
        },
        6 * 60 * 60 * 1000,
      );

      // Set up 10-minute aggregation timer
      // Calculate delay to align with 10-minute boundaries (00:00, 00:10, 00:20, etc.)
      const now = new Date();
      const currentMinute = now.getMinutes();
      const currentSecond = now.getSeconds();
      const currentMs = now.getMilliseconds();

      // Calculate minutes until next 10-minute boundary
      const nextBoundaryMinute = Math.ceil(currentMinute / 10) * 10;
      const minutesUntilBoundary = nextBoundaryMinute - currentMinute;
      const secondsUntilBoundary = minutesUntilBoundary * 60 - currentSecond;
      const initialDelay = secondsUntilBoundary * 1000 - currentMs;

      console.log(
        `Setting up 10-minute aggregation timer. Next run in ${Math.round(initialDelay / 1000)} seconds`,
      );

      // Set up the initial timeout to align with 10-minute boundaries
      const initialTimeout = setTimeout(
        async () => {
          try {
            await windAggregationService.process10MinuteAggregation();
          } catch (error) {
            console.error('Error in initial 10-minute aggregation:', error);
          }

          // Now set up the regular interval
          const aggregationInterval = setInterval(
            async () => {
              try {
                await windAggregationService.process10MinuteAggregation();
              } catch (error) {
                console.error('Error in 10-minute aggregation:', error);
              }
            },
            10 * 60 * 1000, // 10 minutes in milliseconds
          );

          // Store reference for cleanup
          app.terminating(() => {
            clearInterval(aggregationInterval);
          });
        },
        initialDelay > 0 ? initialDelay : 10 * 60 * 1000,
      ); // If we're past the boundary, wait for next one

      // Also process any missing intervals on startup
      setTimeout(async () => {
        try {
          console.log('Processing any missing 10-minute intervals on startup...');
          await windAggregationService.processRecentMissingIntervals();
        } catch (error) {
          console.error('Error processing missing intervals on startup:', error);
        }
      }, 5000); // Wait 5 seconds after startup

      // Clean up intervals when app terminates
      app.terminating(async () => {
        clearInterval(cleanupInterval);
        clearTimeout(initialTimeout);
        clearTimeout(retentionBootTimeout);
        clearInterval(retentionInterval);
        windAggregationService.stopFlushTimer();
        // Persist the in-flight minute instead of dropping it on shutdown
        await windAggregationService.forceFlushBuckets();
      });
    });
    app.listen('SIGTERM', () => app.terminate());
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate());
  })
  .httpServer()
  .start()
  .catch((error) => {
    process.exitCode = 1;
    prettyPrintError(error);
  });
