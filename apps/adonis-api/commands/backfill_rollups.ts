import { BaseCommand, flags } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';

import { rollupService } from '#services/rollup_service';

export default class BackfillRollups extends BaseCommand {
  static commandName = 'rollup:backfill';
  static description =
    'Backfill hourly temperature/wind and daily diagnostics rollups from existing data';

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: false,
  };

  @flags.number({ description: 'How many days to look back (default: 7)' })
  declare days?: number;

  async run(): Promise<void> {
    this.logger.info(
      `Starting rollup backfill (lookback: ${this.days ?? 7} days; empty tables backfill from the oldest data)...`,
    );

    try {
      await rollupService.catchUp(this.days ? { lookbackDays: this.days } : undefined);
      this.logger.success('Rollup backfill completed');
    } catch (error) {
      this.logger.error('Error during rollup backfill:');
      this.logger.error(error);
      this.exitCode = 1;
    }
  }
}
