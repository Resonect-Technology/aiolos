import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    // Run system config seeder first
    const { default: SystemConfigSeeder } = await import('./system_config.js')
    await new SystemConfigSeeder(this.client).run()

    // Run weather station seeder before station config
    const { default: WeatherStationSeeder } = await import('./weather_station_seeder.js')
    await new WeatherStationSeeder(this.client).run()

    // Run station config seeder
    const { default: StationConfigSeeder } = await import('./station_config.js')
    await new StationConfigSeeder(this.client).run()
  }
}
