import { BaseSeeder } from '@adonisjs/lucid/seeders'
import StationConfig from '#app/models/station_config'

export default class extends BaseSeeder {
  async run() {
    // Define station configurations
    const stationConfigs = [
      {
        stationId: 'vasiliki-001',
        tempInterval: 300, // 5 minutes
        windSendInterval: 300, // 5 minutes
        windSampleInterval: 60, // 1 minute
        diagInterval: 3600, // 1 hour
        timeInterval: 86400, // 1 day
        restartInterval: 604800, // 1 week
        sleepStartHour: 22, // 10 PM
        sleepEndHour: 6, // 6 AM
        otaHour: 3, // 3 AM
        otaMinute: 0,
        otaDuration: 30, // 30 minutes
        remoteOta: false,
      },
      {
        stationId: 'default',
        tempInterval: 300, // 5 minutes
        windSendInterval: 300, // 5 minutes
        windSampleInterval: 60, // 1 minute
        diagInterval: 3600, // 1 hour
        timeInterval: 86400, // 1 day
        restartInterval: 604800, // 1 week
        sleepStartHour: 22, // 10 PM
        sleepEndHour: 6, // 6 AM
        otaHour: 3, // 3 AM
        otaMinute: 0,
        otaDuration: 30, // 30 minutes
        remoteOta: false,
      },
    ]

    // Create station configurations using firstOrCreate to avoid duplicates
    for (const config of stationConfigs) {
      await StationConfig.firstOrCreate(
        { stationId: config.stationId },
        config
      )
      console.log(`Created/updated station config for ${config.stationId}`)
    }
  }
}
