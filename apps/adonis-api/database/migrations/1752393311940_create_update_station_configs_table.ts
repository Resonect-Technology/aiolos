import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'station_configs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Add foreign key constraint to weather_stations
      table.foreign('station_id').references('station_id').inTable('weather_stations').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Remove foreign key constraint
      table.dropForeign(['station_id'])
    })
  }
}