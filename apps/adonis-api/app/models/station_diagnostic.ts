import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import WeatherStation from './weather_station.js'

export default class StationDiagnostic extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare stationId: string

  @column()
  declare batteryVoltage: number

  @column()
  declare solarVoltage: number

  @column()
  declare internalTemperature: number | null

  @column()
  declare signalQuality: number

  @column()
  declare uptime: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Relationships
   */
  @belongsTo(() => WeatherStation, { foreignKey: 'stationId' })
  declare station: BelongsTo<typeof WeatherStation>
}
