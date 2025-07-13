import { BaseSeeder } from '@adonisjs/lucid/seeders'
import WeatherStation from '#models/weather_station'
import DataRetentionPolicy from '#models/data_retention_policy'

export default class extends BaseSeeder {
  async run() {
    // Create weather stations
    const stations = [
      {
        stationId: 'vasiliki-001',
        name: 'Vasiliki Weather Station',
        location: 'Vasiliki, Greece',
        description: 'Main weather station in Vasiliki for wind monitoring',
        isActive: true,
      },
      {
        stationId: 'test-station-firmware',
        name: 'Test Station',
        location: 'Test Environment',
        description: 'Test station for firmware development and testing',
        isActive: true,
      },
      {
        stationId: 'default',
        name: 'Default Station',
        location: 'System Default',
        description: 'Default system configuration station',
        isActive: true,
      },
    ]

    // Use firstOrCreate to avoid duplicate key errors
    for (const station of stations) {
      await WeatherStation.firstOrCreate(
        { stationId: station.stationId },
        station
      )
    }

    // Create default data retention policies
    const policies = [
      {
        dataType: 'temperature',
        retentionDays: 365,
        isActive: true,
        description: 'Temperature readings retention for 1 year',
      },
      {
        dataType: 'wind',
        retentionDays: 180,
        isActive: true,
        description: 'Wind data retention for 6 months',
      },
      {
        dataType: 'wind_1min',
        retentionDays: 90,
        isActive: true,
        description: '1-minute wind aggregation retention for 3 months',
      },
      {
        dataType: 'diagnostics',
        retentionDays: 180,
        isActive: true,
        description: 'Diagnostics data retention for 6 months',
      },
    ]

    // Use firstOrCreate to avoid duplicate key errors
    for (const policy of policies) {
      await DataRetentionPolicy.firstOrCreate(
        { dataType: policy.dataType },
        policy
      )
    }
  }
}