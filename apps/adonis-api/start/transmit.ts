import transmit from '@adonisjs/transmit/services/main'
import type { HttpContext } from '@adonisjs/core/http'
import { stationDataCache } from '#app/services/station_data_cache'

// Authorize all clients for wind/live/:sensor_id and send cached data on first connection
transmit.authorize<{ sensor_id: string }>(
  'wind/live/:sensor_id',
  async (_ctx: HttpContext, params: { sensor_id: string }) => {
    const stationId = params.sensor_id

    // Authorization logic (currently allowing all)
    const isAuthorized = true

    if (isAuthorized) {
      // Send cached wind data immediately when client first subscribes
      const cachedWindData = stationDataCache.getWindData(stationId)
      if (cachedWindData) {
        // Send cached data immediately after authorization
        // Use setTimeout to ensure the subscription is established first
        setTimeout(async () => {
          await transmit.broadcast(`wind/live/${stationId}`, {
            ...cachedWindData,
            _cached: true, // Flag to indicate this is cached data
          })
        }, 100)
      }
    }

    return isAuthorized
  }
)

// Authorize diagnostics channel and send cached data
transmit.authorize<{ station_id: string }>(
  'station/diagnostics/:station_id',
  async (_ctx: HttpContext, params: { station_id: string }) => {
    const stationId = params.station_id

    // Authorization logic (currently allowing all)
    const isAuthorized = true

    if (isAuthorized) {
      // Send cached diagnostics data immediately when client first subscribes
      const cachedDiagnosticsData = stationDataCache.getDiagnosticsData(stationId)
      if (cachedDiagnosticsData) {
        setTimeout(async () => {
          await transmit.broadcast(`station/diagnostics/${stationId}`, {
            ...cachedDiagnosticsData,
            _cached: true,
          })
        }, 100)
      }
    }

    return isAuthorized
  }
)

// Authorize temperature channel and send cached data
transmit.authorize<{ sensor_id: string }>(
  'temperature/live/:sensor_id',
  async (_ctx: HttpContext, params: { sensor_id: string }) => {
    const stationId = params.sensor_id

    // Authorization logic (currently allowing all)
    const isAuthorized = true

    if (isAuthorized) {
      // Send cached temperature data immediately when client first subscribes
      const cachedTemperatureData = stationDataCache.getTemperatureData(stationId)
      if (cachedTemperatureData) {
        setTimeout(async () => {
          await transmit.broadcast(`temperature/live/${stationId}`, {
            ...cachedTemperatureData,
            _cached: true, // Flag to indicate this is cached data
          })
        }, 100)
      }
    }

    return isAuthorized
  }
)
