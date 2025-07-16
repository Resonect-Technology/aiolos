import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { windAggregationService } from '#services/wind_aggregation_service'

export default class Process10MinAggregation extends BaseCommand {
    static commandName = 'wind:process-10min'
    static description = 'Process 10-minute wind data aggregation'

    static options: CommandOptions = {
        startApp: true,
        allowUnknownFlags: false,
        staysAlive: false,
    }

    async run(): Promise<void> {
        this.logger.info('Starting 10-minute wind data aggregation...')

        try {
            // Process the current 10-minute aggregation
            await windAggregationService.process10MinuteAggregation()

            this.logger.success('10-minute wind data aggregation completed')
        } catch (error) {
            this.logger.error('Error processing 10-minute aggregation:', error)
            this.exitCode = 1
        }
    }
}
