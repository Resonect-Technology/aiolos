import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';

import WeatherStation from './weather_station.js';

export default class StationConfig extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare stationId: string;

  @column()
  declare tempInterval: number;

  @column()
  declare windSendInterval: number;

  @column()
  declare windSampleInterval: number;

  @column()
  declare diagInterval: number;

  @column()
  declare timeInterval: number;

  @column()
  declare restartInterval: number;

  @column()
  declare sleepStartHour: number;

  @column()
  declare sleepEndHour: number;

  @column()
  declare otaHour: number;

  @column()
  declare otaMinute: number;

  @column()
  declare otaDuration: number;

  @column()
  declare remoteOta: boolean;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  /**
   * Relationships
   */
  @belongsTo(() => WeatherStation, { foreignKey: 'stationId' })
  declare station: BelongsTo<typeof WeatherStation>;
}
