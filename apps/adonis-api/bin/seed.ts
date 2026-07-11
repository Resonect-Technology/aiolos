/*
|--------------------------------------------------------------------------
| Database seeder
|--------------------------------------------------------------------------
|
| Idempotent seeds for the default stations, configs and retention policies.
| Runs on every container start (entrypoint.sh) as well as manually via
| `pnpm seed` — every operation must therefore be an upsert / insert-if-missing.
|
| Standalone script: does not boot AdonisJS. The Prisma client resolves the
| database from DATABASE_URL (or the tmp/db.sqlite3 fallback).
|
*/

import { prisma } from '#services/prisma';

const stations = [
  {
    stationId: 'vasiliki-001',
    name: 'Vasiliki Weather Station',
    location: 'Vasiliki, Greece',
    description: 'Main weather station in Vasiliki for wind monitoring',
    isActive: true,
  },
  {
    stationId: 'test-station-firmware',
    name: 'Test Station',
    location: 'Test Environment',
    description: 'Test station for firmware development and testing',
    isActive: true,
  },
  {
    stationId: 'default',
    name: 'Default Station',
    location: 'System Default',
    description: 'Default system configuration station',
    isActive: true,
  },
];

const stationConfigDefaults = {
  tempInterval: 300, // 5 minutes
  windSendInterval: 300, // 5 minutes
  windSampleInterval: 60, // 1 minute
  diagInterval: 3600, // 1 hour
  timeInterval: 86400, // 1 day
  restartInterval: 604800, // 1 week
  sleepStartHour: 22, // 10 PM
  sleepEndHour: 6, // 6 AM
  otaHour: 3, // 3 AM
  otaMinute: 0,
  otaDuration: 30, // 30 minutes
  remoteOta: false,
};

const stationConfigs = [
  { stationId: 'vasiliki-001', ...stationConfigDefaults },
  { stationId: 'default', ...stationConfigDefaults },
];

const systemConfigs = [{ key: 'construction_mode', value: 'false' }];

const retentionPolicies = [
  {
    dataType: 'temperature',
    retentionDays: 365,
    isActive: true,
    description: 'Temperature readings retention for 1 year',
  },
  {
    dataType: 'wind',
    retentionDays: 180,
    isActive: true,
    description: 'Wind data retention for 6 months',
  },
  {
    dataType: 'wind_1min',
    retentionDays: 90,
    isActive: true,
    description: '1-minute wind aggregation retention for 3 months',
  },
  {
    dataType: 'wind_10min',
    retentionDays: 1,
    isActive: true,
    description: '10-minute wind data retention - removed after hourly data created',
  },
  {
    dataType: 'diagnostics',
    retentionDays: 180,
    isActive: true,
    description: 'Diagnostics data retention for 6 months',
  },
];

// System configs first (matches the old seeder order)
for (const config of systemConfigs) {
  await prisma.systemConfig.upsert({
    where: { key: config.key },
    update: {},
    create: config,
  });
}

// Stations before their configs (FK)
for (const station of stations) {
  await prisma.weatherStation.upsert({
    where: { stationId: station.stationId },
    update: {},
    create: station,
  });
}

// station_configs has no unique key on stationId (config history is append-only),
// so emulate firstOrCreate: only seed when the station has no config yet.
for (const config of stationConfigs) {
  const existing = await prisma.stationConfig.findFirst({
    where: { stationId: config.stationId },
  });
  if (!existing) {
    await prisma.stationConfig.create({ data: config });
    console.log(`Created station config for ${config.stationId}`);
  }
}

// data_retention_policies has no unique key on dataType either
for (const policy of retentionPolicies) {
  const existing = await prisma.dataRetentionPolicy.findFirst({
    where: { dataType: policy.dataType },
  });
  if (!existing) {
    await prisma.dataRetentionPolicy.create({ data: policy });
    console.log(`Created retention policy for ${policy.dataType}`);
  }
}

console.log('Seeding completed');
await prisma.$disconnect();
