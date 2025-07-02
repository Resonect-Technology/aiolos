import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class StationConfig extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare station_id: string

  @column()
  declare temp_interval: number

  @column()
  declare wind_interval: number

  @column()
  declare diag_interval: number

  @column()
  declare time_interval: number

  @column()
  declare restart_interval: number

  @column()
  declare sleep_start_hour: number

  @column()
  declare sleep_end_hour: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}