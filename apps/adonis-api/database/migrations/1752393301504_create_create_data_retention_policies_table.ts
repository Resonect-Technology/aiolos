import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'data_retention_policies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('data_type').notNullable() // e.g., 'temperature', 'wind', 'diagnostics'
      table.integer('retention_days').notNullable()
      table.boolean('is_active').defaultTo(true)
      table.text('description').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Indexes
      table.index('data_type')
      table.index('is_active')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}