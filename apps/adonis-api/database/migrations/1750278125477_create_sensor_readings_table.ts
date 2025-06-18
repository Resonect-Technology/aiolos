import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sensor_readings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('sensor_id').notNullable()
      table.enum('type', ['wind', 'temperature']).notNullable()
      table.float('temperature') // nullable, only for temperature readings
      table.float('wind_speed') // nullable, only for wind readings (m/s)
      table.float('wind_direction') // nullable, only for wind readings (degrees)
      table.timestamps(true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}