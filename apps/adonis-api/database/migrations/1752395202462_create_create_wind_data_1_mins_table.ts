import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'wind_data_1min'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('station_id').notNullable()
      table.timestamp('timestamp').notNullable()
      table.decimal('avg_speed', 8, 2).notNullable()
      table.decimal('min_speed', 8, 2).notNullable()
      table.decimal('max_speed', 8, 2).notNullable()
      table.integer('dominant_direction').notNullable()
      table.integer('sample_count').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Create unique constraint to prevent duplicate entries
      table.unique(['station_id', 'timestamp'])
      
      // Add indexes for common queries
      table.index('station_id')
      table.index('timestamp')
      table.index(['station_id', 'timestamp'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}