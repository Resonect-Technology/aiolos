import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'temperature_readings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('station_id').notNullable()
      table.float('temperature').notNullable()
      table.timestamp('reading_timestamp').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Foreign key to weather_stations
      table.foreign('station_id').references('station_id').inTable('weather_stations').onDelete('CASCADE')

      // Indexes for commonly queried fields
      table.index('station_id')
      table.index('reading_timestamp')
      table.index(['station_id', 'reading_timestamp'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}