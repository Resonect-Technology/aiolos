-- Normalize legacy knex-written datetime text ("YYYY-MM-DD HH:MM:SS") to the
-- ISO-8601 UTC form Prisma writes ("YYYY-MM-DDTHH:MM:SS.000Z").
-- Legacy rows are UTC (production always ran with TZ=UTC). Without this,
-- lexicographic range queries (WHERE col >= '...T...Z') silently skip every
-- legacy row because ' ' sorts before 'T'.
-- Any value containing a space is legacy; already-ISO values are untouched.

UPDATE "weather_stations" SET "created_at" = replace("created_at", ' ', 'T') || CASE WHEN "created_at" LIKE '%.%' THEN 'Z' ELSE '.000Z' END WHERE "created_at" LIKE '% %';
UPDATE "weather_stations" SET "updated_at" = replace("updated_at", ' ', 'T') || CASE WHEN "updated_at" LIKE '%.%' THEN 'Z' ELSE '.000Z' END WHERE "updated_at" LIKE '% %';

UPDATE "station_configs" SET "created_at" = replace("created_at", ' ', 'T') || CASE WHEN "created_at" LIKE '%.%' THEN 'Z' ELSE '.000Z' END WHERE "created_at" LIKE '% %';
UPDATE "station_configs" SET "updated_at" = replace("updated_at", ' ', 'T') || CASE WHEN "updated_at" LIKE '%.%' THEN 'Z' ELSE '.000Z' END WHERE "updated_at" LIKE '% %';

UPDATE "station_diagnostics" SET "created_at" = replace("created_at", ' ', 'T') || CASE WHEN "created_at" LIKE '%.%' THEN 'Z' ELSE '.000Z' END WHERE "created_at" LIKE '% %';
UPDATE "station_diagnostics" SET "updated_at" = replace("updated_at", ' ', 'T') || CASE WHEN "updated_at" LIKE '%.%' THEN 'Z' ELSE '.000Z' END WHERE "updated_at" LIKE '% %';

UPDATE "system_configs" SET "created_at" = replace("created_at", ' ', 'T') || CASE WHEN "created_at" LIKE '%.%' THEN 'Z' ELSE '.000Z' END WHERE "created_at" LIKE '% %';
UPDATE "system_configs" SET "updated_at" = replace("updated_at", ' ', 'T') || CASE WHEN "updated_at" LIKE '%.%' THEN 'Z' ELSE '.000Z' END WHERE "updated_at" LIKE '% %';

UPDATE "temperature_readings" SET "reading_timestamp" = replace("reading_timestamp", ' ', 'T') || CASE WHEN "reading_timestamp" LIKE '%.%' THEN 'Z' ELSE '.000Z' END WHERE "reading_timestamp" LIKE '% %';
UPDATE "temperature_readings" SET "created_at" = replace("created_at", ' ', 'T') || CASE WHEN "created_at" LIKE '%.%' THEN 'Z' ELSE '.000Z' END WHERE "created_at" LIKE '% %';
UPDATE "temperature_readings" SET "updated_at" = replace("updated_at", ' ', 'T') || CASE WHEN "updated_at" LIKE '%.%' THEN 'Z' ELSE '.000Z' END WHERE "updated_at" LIKE '% %';

UPDATE "data_retention_policies" SET "created_at" = replace("created_at", ' ', 'T') || CASE WHEN "created_at" LIKE '%.%' THEN 'Z' ELSE '.000Z' END WHERE "created_at" LIKE '% %';
UPDATE "data_retention_policies" SET "updated_at" = replace("updated_at", ' ', 'T') || CASE WHEN "updated_at" LIKE '%.%' THEN 'Z' ELSE '.000Z' END WHERE "updated_at" LIKE '% %';

UPDATE "wind_data_1min" SET "created_at" = replace("created_at", ' ', 'T') || CASE WHEN "created_at" LIKE '%.%' THEN 'Z' ELSE '.000Z' END WHERE "created_at" LIKE '% %';
UPDATE "wind_data_1min" SET "updated_at" = replace("updated_at", ' ', 'T') || CASE WHEN "updated_at" LIKE '%.%' THEN 'Z' ELSE '.000Z' END WHERE "updated_at" LIKE '% %';

UPDATE "wind_data_10min" SET "created_at" = replace("created_at", ' ', 'T') || CASE WHEN "created_at" LIKE '%.%' THEN 'Z' ELSE '.000Z' END WHERE "created_at" LIKE '% %';
UPDATE "wind_data_10min" SET "updated_at" = replace("updated_at", ' ', 'T') || CASE WHEN "updated_at" LIKE '%.%' THEN 'Z' ELSE '.000Z' END WHERE "updated_at" LIKE '% %';
