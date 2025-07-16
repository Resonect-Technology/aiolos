import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import { windAggregationService } from '#services/wind_aggregation_service'

export default class Backfill10MinAggregation extends BaseCommand {
    static commandName = 'wind:backfill-10min'
    static description = 'Backfill 10-minute wind data aggregation from existing 1-minute data'

    static options: CommandOptions = {
        startApp: true,
        allowUnknownFlags: false,
        staysAlive: false,
    }

    async run(): Promise<void> {
        this.logger.info('Starting backfill of 10-minute wind data aggregation...')

        try {
            // Backfill last 24 hours of 10-minute intervals
            const now = DateTime.now()
            const startTime = now.minus({ hours: 24 })

            // Calculate all 10-minute intervals in the last 24 hours
            const intervals: DateTime[] = []
            let currentInterval = this.get10MinuteIntervalStart(startTime)

            while (currentInterval <= now.minus({ minutes: 10 })) {
                intervals.push(currentInterval)
                currentInterval = currentInterval.plus({ minutes: 10 })
            }

            this.logger.info(`Processing ${intervals.length} 10-minute intervals...`)

            let processed = 0
            for (const interval of intervals) {
                try {
                    await windAggregationService.process10MinuteAggregationForInterval(interval)
                    processed++

                    if (processed % 10 === 0) {
                        this.logger.info(`Processed ${processed}/${intervals.length} intervals...`)
                    }
                } catch (error) {
                    this.logger.warning(`Failed to process interval ${interval.toISO()}: ${error.message}`)
                }
            }

            this.logger.success(`Backfill completed. Processed ${processed}/${intervals.length} intervals`)
        } catch (error) {
            this.logger.error('Error during backfill:', error)
            this.exitCode = 1
        }
    }

    /**
     * Get the start of the 10-minute interval for a given timestamp
     */
    private get10MinuteIntervalStart(timestamp: DateTime): DateTime {
        const minute = Math.floor(timestamp.minute / 10) * 10
        return timestamp.startOf('minute').set({ minute })
    }
}
