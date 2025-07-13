import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import TemperatureReading from './temperature_reading.js'
import StationConfig from './station_config.js'
import StationDiagnostic from './station_diagnostic.js'

export default class WeatherStation extends BaseModel {
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
   * @summary Station name
   */
  @column()
  declare name: string

  /**
   * @summary Station location
   */
  @column()
  declare location: string | null

  /**
   * @summary Station description
   */
  @column()
  declare description: string | null

  /**
   * @summary Whether the station is active
   */
  @column()
  declare isActive: boolean

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
  @hasMany(() => TemperatureReading, { foreignKey: 'stationId' })
  declare temperatureReadings: HasMany<typeof TemperatureReading>

  @hasMany(() => StationConfig, { foreignKey: 'stationId' })
  declare configs: HasMany<typeof StationConfig>

  @hasMany(() => StationDiagnostic, { foreignKey: 'stationId' })
  declare diagnostics: HasMany<typeof StationDiagnostic>
}