-- AlterTable
ALTER TABLE "station_configs" ADD COLUMN "livestream_start_hour" INTEGER;
ALTER TABLE "station_configs" ADD COLUMN "low_battery_threshold" REAL;
ALTER TABLE "station_configs" ADD COLUMN "utc_offset_minutes" INTEGER;
