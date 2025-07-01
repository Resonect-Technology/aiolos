import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'station_configs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('station_id', 255).notNullable().index()

      // Configuration values
      table.integer('temp_interval').nullable()
      table.integer('wind_interval').nullable()
      table.integer('diag_interval').nullable()
      table.integer('time_interval').nullable()
      table.integer('restart_interval').nullable()
      table.integer('sleep_start_hour').nullable()
      table.integer('sleep_end_hour').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}