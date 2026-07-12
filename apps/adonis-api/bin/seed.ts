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

// Interval fields are MILLISECONDS (the firmware applies them raw);
// restartInterval alone is SECONDS (the firmware converts and clamps it).
const stationConfigDefaults = {
  tempInterval: 300000, // 5 minutes
  windSendInterval: 300000, // 5 minutes (averaged mode)
  windSampleInterval: 10000, // 10 seconds
  diagInterval: 300000, // 5 minutes
  timeInterval: 3600000, // 1 hour
  restartInterval: 604800, // 1 week (seconds)
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
    retentionDays: 180,
    isActive: true,
    description: 'Raw temperature readings retention for 6 months (hourly rollup kept forever)',
  },
  {
    dataType: 'wind_1min',
    retentionDays: 90,
    isActive: true,
    description: '1-minute wind aggregation retention for 3 months',
  },
  {
    dataType: 'wind_10min',
    retentionDays: 180,
    isActive: true,
    description: '10-minute wind aggregation retention for 6 months (hourly rollup kept forever)',
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

// One-time corrections for existing databases (seeds above only insert when
// the dataType is missing). With the hourly/daily rollups in place, raw
// temperature and 10-minute wind drop from 365 to 180 days; the rollup
// catch-up in bin/server.ts always runs before the cleanup, so history is
// downsampled before the tighter policy deletes it. The wind_10min "1 day"
// value is the original shipping bug, corrected here as well.
const retentionCorrections = [
  { dataType: 'temperature', fromDays: [365] },
  { dataType: 'wind_10min', fromDays: [1, 365] },
];
for (const correction of retentionCorrections) {
  const target = retentionPolicies.find((policy) => policy.dataType === correction.dataType)!;
  const outdated = await prisma.dataRetentionPolicy.findFirst({
    where: { dataType: correction.dataType, retentionDays: { in: correction.fromDays } },
  });
  if (outdated) {
    await prisma.dataRetentionPolicy.update({
      where: { id: outdated.id },
      data: { retentionDays: target.retentionDays, description: target.description },
    });
    console.log(
      `Corrected ${correction.dataType} retention policy from ${outdated.retentionDays} to ${target.retentionDays} days`,
    );
  }
}

console.log('Seeding completed');
await prisma.$disconnect();
