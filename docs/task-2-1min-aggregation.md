# Task 2: 1-Minute Wind Data Aggregation System

## Problem Statement

Wind enthusiasts need to see 1-minute aggregated wind data to better understand wind patterns and trends. Currently, the system only provides individual raw readings, making it difficult to analyze wind behavior over time intervals.

**Prerequisites**: Task 1 (Database Architecture Redesign) must be completed first.

## Proposed Solution

Implement a real-time 1-minute wind data aggregation system that processes incoming raw wind data into 1-minute intervals, stores the aggregated data, and provides both API access and real-time frontend visualization.

**Important**: Read #file:be-database.instructions.md for detailed information about the database technologies, patterns, and constraints used in this project (SQLite, Lucid ORM, AdonisJS v6 patterns, etc.).

**Simplified Approach**: Instead of storing individual wind readings, we'll aggregate incoming data directly into 1-minute records. This keeps the database simple while still providing detailed wind analysis. Live streaming continues unchanged for real-time dashboard updates.

## Acceptance Criteria

### Database Schema

- [ ] Create `wind_data_1min` table with columns:
  - id (primary key)
  - station_id (foreign key to weather_stations)
  - timestamp (start of 1-minute interval)
  - avg_speed, min_speed, max_speed (simple decimal fields)
  - dominant_direction (most frequent direction during interval)
  - sample_count (number of readings received in this minute)
  - created_at, updated_at
- [ ] Add unique constraint on (station_id, timestamp) to prevent duplicates
- [ ] Add basic indexes on station_id and timestamp

### Real-Time Aggregation Service

- [ ] Create simple `WindAggregationService` that processes incoming wind data in real-time
- [ ] Maintain in-memory buckets for current minute intervals per station
- [ ] Calculate dominant direction as most frequently occurring direction
- [ ] At minute boundary (XX:XX:59 → XX:XX+1:00), save completed aggregate to database
- [ ] Clear memory bucket after saving
- [ ] Handle system restart gracefully (lose current partial minute, start fresh)

### API Endpoints

- [ ] `GET /api/stations/:station_id/wind/aggregated?interval=1min&date=YYYY-MM-DD`
  - Returns 1-minute aggregates for specified date (up to 1440 records)
  - Defaults to current date if no date specified
- [ ] Simple response format with basic error handling
- [ ] Support for common unit conversions (m/s, km/h, knots)

### Frontend Visualization

- [ ] Create `WindData1MinTable` component displaying:
  - Time (HH:MM format)
  - Average Speed (with unit selector: m/s, km/h, knots)
  - Min Speed, Max Speed (same units)
  - Dominant Direction (degrees + cardinal direction like "270° W")
  - Sample Count (number of readings received)
- [ ] Date picker to select which day's data to view
- [ ] Real-time updates when new 1-minute aggregates are created
- [ ] Basic loading and empty states
- [ ] Simple, responsive design

### Real-Time Features

- [ ] SSE broadcasting when new 1-minute aggregates are created
- [ ] Frontend subscribes to real-time updates
- [ ] Doesn't interfere with existing real-time raw wind data streams
- [ ] Simple connection handling

### Data Retention

- [ ] Daily cleanup service removes previous day's 1-minute data
- [ ] Simple automated cleanup with basic logging
- [ ] Configurable retention period (default: 1 day)
- [ ] Manual cleanup trigger for testing

### Integration Requirements

- [ ] Works with existing wind data ingestion endpoints
- [ ] Aggregation triggered by existing `/stations/:station_id/wind` endpoint
- [ ] No changes required to firmware (maintains API compatibility)
- [ ] Live streaming continues unchanged (real-time dashboard updates)
- [ ] All existing functionality remains unchanged

## Component Impact

- [x] Backend (AdonisJS) - New aggregation service, API endpoints, database table
- [x] Frontend (React/Vite) - New table component, real-time integration
- [ ] Firmware (ESP32) - No changes (uses existing endpoints)
- [ ] Infrastructure (Docker/Terraform) - Possible memory adjustments for aggregation

## Technical Implementation Details

### Aggregation Logic

```typescript
// Simplified aggregation flow:
// 1. Raw wind data arrives at existing endpoint
// 2. Update current minute bucket in memory:
//    - Update min/max/sum for speed calculations
//    - Track direction frequency for dominant direction
//    - Increment sample count
// 3. Continue live streaming to frontend (unchanged)
// 4. At minute boundary:
//    - Calculate final statistics
//    - Save to wind_data_1min table
//    - Broadcast aggregate via SSE
//    - Clear memory bucket
// 5. NO raw data storage - only aggregated data persists
```

### Direction Aggregation Algorithm

```typescript
// Simple approach for wind direction:
// - Track frequency of each direction (0-359°)
// - Dominant = most frequent direction during the minute
// - Keep it simple - no complex circular math needed initially
```

### Memory Management

- Keep only current minute buckets in memory
- Maximum memory: ~1KB per active station
- Automatic cleanup of completed buckets

## Constraints

- **Simple & Effective**: Focus on straightforward aggregation without over-engineering
- **API Compatibility**: No changes to existing firmware endpoints
- **Memory Efficient**: Only store current minute buckets in memory
- **Real-time**: Live streaming continues unchanged, aggregates update in real-time
- **No Raw Storage**: Only store aggregated data, not individual readings

## Testing Approach

- [ ] Unit tests for basic aggregation logic
- [ ] Integration tests for aggregation service
- [ ] API tests for new endpoints
- [ ] Frontend tests for table component
- [ ] Simple end-to-end tests

## Files to Create/Modify

### Backend

```
database/migrations/
└── xxxx_create_wind_data_1min_table.ts

app/models/
└── wind_data_1min.ts

app/services/
├── wind_aggregation_service.ts (new)
└── data_cleanup_service.ts (enhance with 1min cleanup)

app/controllers/
├── wind_aggregated_controller.ts (new)
└── station_live_controller.ts (integrate aggregation trigger)

start/
├── routes.ts (add aggregated data endpoints)
└── transmit.ts (add aggregated data SSE channel)
```

### Frontend

```
src/components/
├── WindData1MinTable.tsx (new)
└── DatePicker.tsx (new or enhance existing)

src/hooks/
└── useWindAggregatedData.ts (new)

src/types/
└── wind-aggregated.ts (new)

src/pages/ or relevant dashboard components
└── [integrate new table component]
```

### Testing & Development

```
apps/bruno-api-control/
├── Get 1min wind aggregates.bru (new)
└── Test aggregation endpoints.bru (new)

database/seeders/
└── wind_aggregated_data_seeder.ts (new)

tests/
├── functional/wind_aggregation.spec.ts (new)
├── unit/wind_aggregation_service.spec.ts (new)
└── unit/direction_calculation.spec.ts (new)
```

## Success Metrics

- [ ] Aggregation works reliably without impacting existing functionality
- [ ] API returns 1-minute data efficiently
- [ ] Memory usage stays low and stable
- [ ] Frontend updates show new aggregates in real-time
- [ ] Simple, maintainable codebase
- [ ] No impact on existing wind data processing

## Future Extensibility

This implementation should support easy addition of:

- 10-minute aggregation (Task 3)
- Hourly aggregation
- Additional wind statistics (gusts, lulls, direction changes)
- Other weather parameter aggregation

## Dependencies

- **Prerequisite**: Task 1 (Database Architecture Redesign) must be completed
- New table: `weather_stations` from Task 1 (for foreign key relationship)
- **Note**: We're NOT using `wind_readings` table - direct aggregation approach instead

## Notes

- This task builds directly on the new database architecture from Task 1
- Focus is specifically on 1-minute wind data aggregation
- 10-minute aggregation will be a separate task (Task 3) using similar patterns
- All existing functionality must continue working unchanged
