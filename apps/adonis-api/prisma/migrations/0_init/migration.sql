-- CreateTable
CREATE TABLE "weather_stations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "station_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME
);

-- CreateTable
CREATE TABLE "station_configs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "station_id" TEXT NOT NULL,
    "temp_interval" INTEGER,
    "diag_interval" INTEGER,
    "time_interval" INTEGER,
    "restart_interval" INTEGER,
    "sleep_start_hour" INTEGER,
    "sleep_end_hour" INTEGER,
    "ota_hour" INTEGER,
    "ota_minute" INTEGER,
    "ota_duration" INTEGER,
    "remote_ota" BOOLEAN DEFAULT false,
    "wind_send_interval" INTEGER,
    "wind_sample_interval" INTEGER,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME,
    CONSTRAINT "station_configs_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "weather_stations" ("station_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "station_diagnostics" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "station_id" TEXT NOT NULL,
    "battery_voltage" REAL NOT NULL,
    "solar_voltage" REAL NOT NULL,
    "internal_temperature" REAL,
    "signal_quality" INTEGER NOT NULL,
    "uptime" INTEGER NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME,
    CONSTRAINT "station_diagnostics_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "weather_stations" ("station_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME
);

-- CreateTable
CREATE TABLE "temperature_readings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "station_id" TEXT NOT NULL,
    "temperature" REAL NOT NULL,
    "reading_timestamp" DATETIME NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME,
    CONSTRAINT "temperature_readings_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "weather_stations" ("station_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "data_retention_policies" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "data_type" TEXT NOT NULL,
    "retention_days" INTEGER NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "description" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME
);

-- CreateTable
CREATE TABLE "wind_data_1min" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "station_id" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "avg_speed" REAL NOT NULL,
    "min_speed" REAL NOT NULL,
    "max_speed" REAL NOT NULL,
    "dominant_direction" INTEGER NOT NULL,
    "sample_count" INTEGER NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME
);

-- CreateTable
CREATE TABLE "wind_data_10min" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "station_id" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "avg_speed" REAL NOT NULL,
    "min_speed" REAL NOT NULL,
    "max_speed" REAL NOT NULL,
    "dominant_direction" INTEGER NOT NULL,
    "tendency" TEXT NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "weather_stations_station_id_key" ON "weather_stations"("station_id");

-- CreateIndex
CREATE INDEX "weather_stations_station_id_idx" ON "weather_stations"("station_id");

-- CreateIndex
CREATE INDEX "weather_stations_is_active_idx" ON "weather_stations"("is_active");

-- CreateIndex
CREATE INDEX "station_configs_station_id_idx" ON "station_configs"("station_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- CreateIndex
CREATE INDEX "temperature_readings_station_id_idx" ON "temperature_readings"("station_id");

-- CreateIndex
CREATE INDEX "temperature_readings_reading_timestamp_idx" ON "temperature_readings"("reading_timestamp");

-- CreateIndex
CREATE INDEX "temperature_readings_station_id_reading_timestamp_idx" ON "temperature_readings"("station_id", "reading_timestamp");

-- CreateIndex
CREATE INDEX "data_retention_policies_data_type_idx" ON "data_retention_policies"("data_type");

-- CreateIndex
CREATE INDEX "data_retention_policies_is_active_idx" ON "data_retention_policies"("is_active");

-- CreateIndex
CREATE INDEX "wind_data_1min_station_id_idx" ON "wind_data_1min"("station_id");

-- CreateIndex
CREATE INDEX "wind_data_1min_timestamp_idx" ON "wind_data_1min"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "wind_data_1min_station_id_timestamp_key" ON "wind_data_1min"("station_id", "timestamp");

-- CreateIndex
CREATE INDEX "wind_data_10min_station_id_idx" ON "wind_data_10min"("station_id");

-- CreateIndex
CREATE INDEX "wind_data_10min_timestamp_idx" ON "wind_data_10min"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "wind_data_10min_station_id_timestamp_key" ON "wind_data_10min"("station_id", "timestamp");

