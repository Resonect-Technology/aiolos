# Task 4: Hourly Wind Data Aggregation System

## Problem Statement

As a wind lover, I want to see hourly wind data that is permanently archived, so that I can compare day-to-day wind patterns and analyze long-term wind trends. After implementing 1-minute and 10-minute wind data aggregation, users need hourly aggregated data as the foundation for historical analysis and comparison.

**Prerequisites**:

- Task 1 (Database Architecture Redesign) must be completed
- Task 2 (1-Minute Wind Data Aggregation) must be completed
- Task 3 (10-Minute Wind Data Aggregation) must be completed

## Proposed Solution

Implement hourly wind data aggregation by processing existing 10-minute data into hourly intervals. This data serves as the permanent historical archive and foundation for day-to-day wind pattern comparison.

**Important**: Read #file:be-database.instructions.md for detailed information about the database technologies, patterns, and constraints used in this project.

**Hierarchical Archive Approach**: Create hourly aggregates from 10-minute data. This becomes the permanent historical record that enables long-term wind analysis, seasonal comparisons, and day-to-day pattern recognition.

## Acceptance Criteria

### Database Schema

- [ ] Create `wind_data_hourly` table with columns:
  - id (primary key)
  - station_id (foreign key to weather_stations)
  - timestamp (start of hourly interval)
  - avg_speed, min_speed, max_speed (decimal fields)
  - dominant_direction (most frequent direction during hour - "četnost")
  - tendency (enum: 'increasing', 'decreasing', 'stable') - compares current avg with previous hour
  - gust_speed (maximum of max_speeds from 10-minute data)
  - calm_periods (count of 10-min intervals with avg < 1 m/s)
  - created_at, updated_at
- [ ] Add unique constraint on (station_id, timestamp) to prevent duplicates
- [ ] Add basic indexes on station_id and timestamp
- [ ] **NO retention policy** - hourly data is permanently archived for historical analysis

### Aggregation Service Enhancement

- [ ] Create hourly aggregation process that runs at the top of each hour (XX:00)
- [ ] Aggregate from existing `wind_data_10min` table (6 consecutive 10-minute records)
- [ ] Calculate enhanced statistics:
  - avg_speed: weighted average of 10-minute averages
  - min_speed: minimum of 10-minute minimums
  - max_speed: maximum of 10-minute maximums
  - gust_speed: highest max_speed from any 10-minute interval
  - dominant_direction: most frequent direction from 10-minute data ("četnost")
  - calm_periods: count intervals where avg_speed < 1.0 m/s
- [ ] Calculate tendency by comparing current hourly average with previous hourly average
- [ ] Handle missing 10-minute data gracefully (partial aggregates if needed)
- [ ] Trigger cleanup of 10-minute data after successful hourly aggregation

### API Endpoints

- [ ] `GET /api/stations/:station_id/wind/aggregated?interval=hourly&date=YYYY-MM-DD`
  - Returns hourly aggregates for specified date (24 records)
  - Defaults to current date if no date specified
- [ ] `GET /api/stations/:station_id/wind/aggregated?interval=hourly&from=YYYY-MM-DD&to=YYYY-MM-DD`
  - Returns hourly data for date range (for day-to-day comparison)
  - Maximum 31 days per request
- [ ] Include all fields (tendency, gust_speed, calm_periods) in response
- [ ] Simple response format with basic error handling
- [ ] Support for common unit conversions (m/s, km/h, knots)

### Frontend Enhancement

- [ ] Create `WindDataHourlyTable` component displaying:
  - Time (HH:00 format)
  - Average Speed (with unit selector)
  - Min/Max Speed (same units)
  - Gust Speed (same units)
  - Dominant Direction (degrees + cardinal direction)
  - Tendency (visual indicator: ↗️ increasing, ↘️ decreasing, ➡️ stable)
  - Calm Periods (count of calm 10-min intervals)
- [ ] Date range picker for historical analysis (up to 31 days)
- [ ] Real-time updates when new hourly aggregates are created
- [ ] Day-to-day comparison view (same hour across multiple days)
- [ ] Basic loading and empty states
- [ ] Export functionality for historical data analysis

### Real-Time Features

- [ ] SSE broadcasting when new hourly aggregates are created
- [ ] Frontend subscribes to real-time updates
- [ ] Include all enhanced fields in real-time updates
- [ ] Simple connection handling

### Data Retention Enhancement

- [ ] **Permanent retention**: Hourly data is NEVER deleted automatically
- [ ] After successful hourly aggregation, trigger cleanup of previous day's 10-minute data
- [ ] Enhanced logging for data lifecycle (10-min cleanup triggered by hourly success)
- [ ] Manual export functionality for long-term data backup

## Technical Implementation Details

### Hierarchical Aggregation Logic

```typescript
// Hourly aggregation from 10-minute data:
// 1. At top of hour (XX:00), query last 6 records from wind_data_10min
// 2. Calculate hourly statistics:
//    - avg_speed = weighted average of 10-min averages
//    - min_speed = minimum of 10-min minimums
//    - max_speed = maximum of 10-min maximums
//    - gust_speed = maximum of 10-min max_speeds (highest gust)
//    - dominant_direction = most frequent direction ("četnost")
//    - calm_periods = count where 10-min avg_speed < 1.0 m/s
// 3. Calculate tendency (same logic as 10-minute)
// 4. Save to wind_data_hourly table
// 5. Trigger cleanup of yesterday's 10-minute data
// 6. Broadcast via SSE
```

### Enhanced Statistics

```typescript
// Gust tracking:
// - gust_speed = Math.max(...tenMinuteRecords.map(r => r.max_speed))
// - Provides peak wind speed during the hour

// Calm period analysis:
// - calm_periods = tenMinuteRecords.filter(r => r.avg_speed < 1.0).length
// - Helps identify wind consistency vs gustiness
```

### Data Lifecycle Management

```typescript
// Complete data lifecycle:
// Raw Wind → 1-min (1 day) → 10-min (1 day) → Hourly (PERMANENT)
//
// Cleanup trigger:
// 1. Hourly aggregation succeeds
// 2. Cleanup yesterday's 10-minute data
// 3. Keep 1-minute data for today only
// 4. Archive hourly data permanently
```

## Component Impact

- [x] Backend (AdonisJS) - Enhanced aggregation service, permanent table, extended API
- [x] Frontend (React/Vite) - Historical analysis components, date range pickers
- [ ] Firmware (ESP32) - No changes
- [x] Infrastructure (Docker/Terraform) - Monitor long-term storage growth

## Constraints

- **Permanent Archive**: Hourly data is never automatically deleted
- **Historical Analysis**: Must support day-to-day and seasonal comparisons
- **Data Consistency**: Hourly data must be mathematically consistent with 10-minute data
- **Storage Growth**: Monitor disk usage as hourly data accumulates permanently
- **API Performance**: Efficient queries for date ranges up to 31 days

## Testing Approach

- [ ] Unit tests for hourly aggregation logic and enhanced statistics
- [ ] Integration tests for complete data lifecycle (1-min → 10-min → hourly)
- [ ] API tests for new endpoints and date range queries
- [ ] Frontend tests for historical analysis components
- [ ] Data consistency verification across all aggregation levels
- [ ] Long-term storage and performance testing

## Files to Create/Modify

### Backend

```
database/migrations/
├── xxxx_create_wind_data_hourly_table.ts
└── xxxx_update_data_retention_policies.ts

app/models/
└── wind_data_hourly.ts

app/services/
├── wind_aggregation_service.ts (enhance for hourly intervals)
└── data_cleanup_service.ts (enhance cleanup triggers)

app/controllers/
└── wind_aggregated_controller.ts (enhance for hourly support and date ranges)

start/
└── transmit.ts (enhance SSE for hourly data)
```

### Frontend

```
src/components/
├── WindDataHourlyTable.tsx (new)
├── DateRangeSelector.tsx (new)
├── DayToDayComparison.tsx (new)
└── WindDataExport.tsx (enhance for historical data)

src/hooks/
├── useWindHourlyData.ts (new)
└── useHistoricalComparison.ts (new)

src/types/
└── wind-aggregated.ts (enhance with hourly types)
```

### Testing

```
apps/bruno-api-control/
├── Get hourly wind aggregates.bru (new)
├── Get hourly date range.bru (new)
└── Historical wind analysis.bru (new)

tests/
├── functional/wind_hourly_aggregation.spec.ts (new)
├── unit/data_lifecycle.spec.ts (new)
└── integration/historical_analysis.spec.ts (new)
```

## Success Metrics

- [ ] Hourly aggregation works reliably from 10-minute data
- [ ] Enhanced statistics (gusts, calm periods) provide valuable insights
- [ ] API supports efficient historical data queries
- [ ] Frontend enables meaningful day-to-day wind pattern comparison
- [ ] Data lifecycle management works automatically (cleanup after hourly success)
- [ ] Long-term storage scales properly for permanent retention
- [ ] Export functionality supports historical analysis workflows

## Long-term Benefits

- **Historical Trends**: Compare same hour across days/weeks/months
- **Seasonal Analysis**: Identify seasonal wind patterns
- **Climate Monitoring**: Long-term wind behavior analysis
- **Planning**: Historical data for activity planning
- **Research**: Foundation for meteorological research
- **Backup Archive**: Permanent record even if short-term data is lost

## Dependencies

- **Prerequisite**: Task 1 (Database Architecture) completed
- **Prerequisite**: Task 2 (1-minute aggregation) completed
- **Prerequisite**: Task 3 (10-minute aggregation) completed and working reliably
- Existing: `wind_data_10min` table with reliable data
- Existing: Data cleanup service framework

## Notes

- Hourly data becomes the **permanent historical foundation**
- Enhanced statistics (gusts, calm periods) provide deeper wind analysis
- Cleanup of 10-minute data triggered by successful hourly aggregation
- Date range queries enable powerful day-to-day comparisons
- Export functionality supports long-term analysis and backup
- Storage monitoring important due to permanent retention
- Foundation for future seasonal analysis and climate monitoring features
