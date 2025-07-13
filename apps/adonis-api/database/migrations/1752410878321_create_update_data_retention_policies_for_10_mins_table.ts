import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Add 10-minute wind data retention policy
    this.defer(async (db) => {
      await db.table('data_retention_policies').insert({
        data_type: 'wind_10min',
        retention_days: 1,
        is_active: true,
        description: '10-minute wind data retention - removed after hourly data created',
        created_at: new Date(),
        updated_at: new Date(),
      })
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.from('data_retention_policies')
        .where('data_type', 'wind_10min')
        .delete()
    })
  }
}