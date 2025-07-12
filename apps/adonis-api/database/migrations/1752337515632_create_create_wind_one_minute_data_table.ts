import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'wind_one_minute_data'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('station_id').notNullable()
      table.timestamp('interval_start').notNullable() // timestamp of beginning of the interval
      table.float('avg_wind_speed').notNullable() // average wind speed in m/s
      table.float('min_wind_speed').notNullable() // minimum wind speed in m/s
      table.float('max_wind_speed').notNullable() // maximum wind speed in m/s
      table.float('avg_wind_direction').notNullable() // average wind direction in degrees
      table.timestamps(true) // created_at and updated_at
      
      // Add indexes for efficient querying
      table.index('station_id')
      table.index('interval_start')
      table.index(['station_id', 'interval_start'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}