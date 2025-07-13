import { BaseSeeder } from '@adonisjs/lucid/seeders'
import WeatherStation from '#models/weather_station'
import DataRetentionPolicy from '#models/data_retention_policy'

export default class extends BaseSeeder {
  async run() {
    // Create sample weather stations
    const stations = [
      {
        stationId: 'station-001',
        name: 'Main Weather Station',
        location: 'City Center',
        description: 'Primary weather monitoring station in the city center',
        isActive: true,
      },
      {
        stationId: 'station-002',
        name: 'Harbor Station',
        location: 'Harbor District',
        description: 'Weather station monitoring harbor conditions',
        isActive: true,
      },
      {
        stationId: 'test-station-firmware',
        name: 'Test Station',
        location: 'Test Environment',
        description: 'Test station for firmware development and testing',
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
        retentionDays: 90,
        isActive: true,
        description: 'Wind data retention for 3 months',
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