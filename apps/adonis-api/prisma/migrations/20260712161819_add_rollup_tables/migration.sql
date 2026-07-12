-- CreateTable
CREATE TABLE "wind_data_hourly" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "station_id" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "avg_speed" REAL NOT NULL,
    "min_speed" REAL NOT NULL,
    "max_speed" REAL NOT NULL,
    "gust_speed" REAL,
    "dominant_direction" INTEGER NOT NULL,
    "interval_count" INTEGER NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME
);

-- CreateTable
CREATE TABLE "temperature_hourly" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "station_id" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "avg_temperature" REAL NOT NULL,
    "min_temperature" REAL NOT NULL,
    "max_temperature" REAL NOT NULL,
    "sample_count" INTEGER NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME
);

-- CreateTable
CREATE TABLE "station_diagnostics_daily" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "station_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "battery_min" REAL NOT NULL,
    "battery_avg" REAL NOT NULL,
    "battery_max" REAL NOT NULL,
    "solar_min" REAL NOT NULL,
    "solar_avg" REAL NOT NULL,
    "solar_max" REAL NOT NULL,
    "signal_quality_avg" REAL NOT NULL,
    "internal_temp_min" REAL,
    "internal_temp_avg" REAL,
    "internal_temp_max" REAL,
    "sample_count" INTEGER NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME
);

-- CreateIndex
CREATE INDEX "wind_data_hourly_station_id_idx" ON "wind_data_hourly"("station_id");

-- CreateIndex
CREATE INDEX "wind_data_hourly_timestamp_idx" ON "wind_data_hourly"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "wind_data_hourly_station_id_timestamp_key" ON "wind_data_hourly"("station_id", "timestamp");

-- CreateIndex
CREATE INDEX "temperature_hourly_station_id_idx" ON "temperature_hourly"("station_id");

-- CreateIndex
CREATE INDEX "temperature_hourly_timestamp_idx" ON "temperature_hourly"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "temperature_hourly_station_id_timestamp_key" ON "temperature_hourly"("station_id", "timestamp");

-- CreateIndex
CREATE INDEX "station_diagnostics_daily_station_id_idx" ON "station_diagnostics_daily"("station_id");

-- CreateIndex
CREATE INDEX "station_diagnostics_daily_date_idx" ON "station_diagnostics_daily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "station_diagnostics_daily_station_id_date_key" ON "station_diagnostics_daily"("station_id", "date");
