import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class WindOneMinuteDatum extends BaseModel {
  static table = 'wind_one_minute_data'

  /**
   * @summary Unique ID
   */
  @column({ isPrimary: true })
  declare id: number

  /**
   * @summary Station ID
   */
  @column()
  declare stationId: string

  /**
   * @summary Timestamp of beginning of the interval
   * @format(date-time)
   */
  @column.dateTime()
  declare intervalStart: DateTime

  /**
   * @summary Average wind speed in m/s
   */
  @column()
  declare avgWindSpeed: number

  /**
   * @summary Minimum wind speed in m/s
   */
  @column()
  declare minWindSpeed: number

  /**
   * @summary Maximum wind speed in m/s
   */
  @column()
  declare maxWindSpeed: number

  /**
   * @summary Average wind direction in degrees
   */
  @column()
  declare avgWindDirection: number

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