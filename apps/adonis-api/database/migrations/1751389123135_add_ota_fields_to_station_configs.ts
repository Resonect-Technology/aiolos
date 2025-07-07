import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'station_configs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('ota_hour').nullable()
      table.integer('ota_minute').nullable()
      table.integer('ota_duration').nullable()
      table.boolean('remote_ota').defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('ota_hour')
      table.dropColumn('ota_minute')
      table.dropColumn('ota_duration')
      table.dropColumn('remote_ota')
    })
  }
}
