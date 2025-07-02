import { BaseSeeder } from '@adonisjs/lucid/seeders'
import StationConfig from '#app/models/station_config'

export default class extends BaseSeeder {
    async run() {
        // Define the default station configuration
        // This will be used when no specific configuration exists for a station
        const defaultConfig = {
            station_id: 'default',
            temp_interval: 300,  // 5 minutes
            wind_interval: 300,  // 5 minutes
            diag_interval: 3600, // 1 hour
            time_interval: 86400, // 1 day
            restart_interval: 604800, // 1 week
            sleep_start_hour: 22, // 10 PM
            sleep_end_hour: 6,   // 6 AM
            ota_hour: 3,        // 3 AM
            ota_minute: 0,
            ota_duration: 30,   // 30 minutes
            remote_ota: false
        }

        // Check if default config already exists
        const existingConfig = await StationConfig.query()
            .where('station_id', 'default')
            .first()

        if (existingConfig) {
            console.log(`Default station config already exists, skipping...`)
            return
        }

        // Create the default configuration
        await StationConfig.create(defaultConfig)
        console.log(`Created default station configuration`)
    }
}
