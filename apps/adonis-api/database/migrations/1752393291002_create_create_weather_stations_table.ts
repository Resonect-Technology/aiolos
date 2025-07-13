import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'weather_stations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('station_id').notNullable().unique()
      table.string('name').notNullable()
      table.string('location').nullable()
      table.string('description').nullable()
      table.boolean('is_active').defaultTo(true)
      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Indexes for commonly queried fields
      table.index('station_id')
      table.index('is_active')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}