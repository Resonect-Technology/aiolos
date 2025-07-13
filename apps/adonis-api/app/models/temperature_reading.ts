import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import WeatherStation from './weather_station.js'

export default class TemperatureReading extends BaseModel {
  /**
   * @summary Unique ID
   */
  @column({ isPrimary: true })
  declare id: number

  /**
   * @summary Station ID (external identifier)
   */
  @column()
  declare stationId: string

  /**
   * @summary Temperature value in Celsius
   */
  @column()
  declare temperature: number

  /**
   * @summary Reading timestamp
   * @format(date-time)
   */
  @column.dateTime()
  declare readingTimestamp: DateTime

  /**
   * @summary Creation timestamp
   * @format(date-time)
   */
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  /**
   * @summary Update timestamp
   * @format(date-time)
   */
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Relationships
   */
  @belongsTo(() => WeatherStation, { foreignKey: 'stationId' })
  declare station: BelongsTo<typeof WeatherStation>
}