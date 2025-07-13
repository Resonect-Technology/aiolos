import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class DataRetentionPolicy extends BaseModel {
  /**
   * @summary Unique ID
   */
  @column({ isPrimary: true })
  declare id: number

  /**
   * @summary Data type (e.g., 'temperature', 'wind', 'diagnostics')
   */
  @column()
  declare dataType: string

  /**
   * @summary Retention period in days
   */
  @column()
  declare retentionDays: number

  /**
   * @summary Whether the policy is active
   */
  @column()
  declare isActive: boolean

  /**
   * @summary Policy description
   */
  @column()
  declare description: string | null

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