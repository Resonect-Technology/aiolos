import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class StationDiagnostic extends BaseModel {
    @column({ isPrimary: true })
    declare id: number

    @column()
    declare station_id: string

    @column()
    declare battery_voltage: number

    @column()
    declare solar_voltage: number

    @column()
    declare internal_temperature: number | null

    @column()
    declare signal_quality: number

    @column()
    declare uptime: number

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime
}
