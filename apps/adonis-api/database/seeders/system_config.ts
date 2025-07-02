import { BaseSeeder } from '@adonisjs/lucid/seeders'
import SystemConfig from '#app/models/system_config'

export default class extends BaseSeeder {
    async run() {
        // Define the default system configurations
        const defaultConfigs = [
            {
                key: 'construction_mode',
                value: 'false'  // Set to 'false' by default
            },
            // Add other system-wide configurations here as needed
        ]

        // Create or update each configuration
        for (const config of defaultConfigs) {
            const existingConfig = await SystemConfig.query()
                .where('key', config.key)
                .first()

            if (existingConfig) {
                console.log(`Config '${config.key}' already exists, skipping...`)
                continue
            }

            await SystemConfig.create(config)
            console.log(`Created config: ${config.key} = ${config.value}`)
        }
    }
}
