import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class SensorReading extends BaseModel {
  /**
   * @summary Unique ID
   */
  @column({ isPrimary: true })
  declare id: number

  /**
   * @summary Sensor ID
   */
  @column()
  declare sensorId: string

  /**
   * @summary Reading type
   * @enum(wind, temperature)
   */
  @column()
  declare type: 'wind' | 'temperature'

  /**
   * @summary Temperature value (nullable)
   */
  @column()
  declare temperature: number | null

  /**
   * @summary Wind speed (nullable)
   */
  @column()
  declare windSpeed: number | null

  /**
   * @summary Wind direction (nullable)
   */
  @column()
  declare windDirection: number | null

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
}
