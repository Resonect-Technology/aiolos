-- AlterTable
ALTER TABLE "station_diagnostics" ADD COLUMN "firmware_version" TEXT;
ALTER TABLE "station_diagnostics" ADD COLUMN "free_heap" INTEGER;
ALTER TABLE "station_diagnostics" ADD COLUMN "min_free_heap" INTEGER;
ALTER TABLE "station_diagnostics" ADD COLUMN "reset_reason" TEXT;
