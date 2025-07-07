import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

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
}
