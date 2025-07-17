import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'wind_data_10min'

    async up() {
        // Add timezone support to existing timestamp columns
        this.schema.alterTable(this.tableName, (table) => {
            // SQLite doesn't have native timezone support, but we can store as ISO strings
            // We'll change the column to store ISO timestamp strings for universal compatibility
            table.dropColumn('timestamp')
        })

        this.schema.alterTable(this.tableName, (table) => {
            // Use string column to store ISO timestamp for universal compatibility
            table.string('timestamp').notNullable().index()
        })

        // Also update the unique constraint
        this.schema.alterTable(this.tableName, (table) => {
            table.dropUnique(['station_id', 'timestamp'])
        })

        this.schema.alterTable(this.tableName, (table) => {
            table.unique(['station_id', 'timestamp'])
        })
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('timestamp')
            table.dropUnique(['station_id', 'timestamp'])
        })

        this.schema.alterTable(this.tableName, (table) => {
            table.timestamp('timestamp').notNullable().index()
            table.unique(['station_id', 'timestamp'])
        })
    }
}
