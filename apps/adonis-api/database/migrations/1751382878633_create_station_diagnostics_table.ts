import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'station_diagnostics'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('station_id').notNullable()
      table.float('battery_voltage').notNullable()
      table.float('solar_voltage').notNullable()
      table.float('internal_temperature')
      table.integer('signal_quality').notNullable()
      table.bigInteger('uptime').notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}