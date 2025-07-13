import { BaseSeeder } from '@adonisjs/lucid/seeders'
import StationConfig from '#app/models/station_config'
import WeatherStation from '#app/models/weather_station'

export default class extends BaseSeeder {
  async run() {
    // First create a default weather station
    const defaultStation = await WeatherStation.firstOrCreate(
      { stationId: 'default' },
      {
        stationId: 'default',
        name: 'Default Station',
        location: 'System Default',
        description: 'Default system configuration station',
        isActive: true,
      }
    )

    // Define the default station configuration
    const defaultConfig = {
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
    }

    // Check if default config already exists
    const existingConfig = await StationConfig.query().where('stationId', 'default').first()

    if (existingConfig) {
      console.log(`Default station config already exists, skipping...`)
      return
    }

    // Create the default configuration
    await StationConfig.create(defaultConfig)
    console.log(`Created default station configuration`)
  }
}
