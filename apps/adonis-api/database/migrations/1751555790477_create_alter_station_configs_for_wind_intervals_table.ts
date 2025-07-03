import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'station_configs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('wind_interval')
      table.integer('wind_send_interval').nullable()
      table.integer('wind_sample_interval').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('wind_send_interval')
      table.dropColumn('wind_sample_interval')
      table.integer('wind_interval').nullable()
    })
  }
}