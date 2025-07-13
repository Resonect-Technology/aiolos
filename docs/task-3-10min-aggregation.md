# Task 3: 10-Minute Wind Data Aggregation System

## Problem Statement

As a wind lover, I want to see 10-minute wind data, so that I can better see what the wind is doing. After implementing 1-minute wind data aggregation, users need 10-minute aggregated data for broader wind pattern analysis and trend identification.

**Prerequisites**:

- Task 1 (Database Architecture Redesign) must be completed
- Task 2 (1-Minute Wind Data Aggregation) must be completed

## Proposed Solution

Implement 10-minute wind data aggregation by processing existing 1-minute data into 10-minute intervals. Add wind tendency analysis to show if wind is increasing or decreasing compared to previous intervals.

**Important**: Read #file:be-database.instructions.md for detailed information about the database technologies, patterns, and constraints used in this project.

**Simple & Hierarchical Approach**: Create 10-minute aggregates from existing 1-minute data. This is efficient and ensures data consistency. Add tendency indicators to help wind enthusiasts understand wind patterns and trends.

## Acceptance Criteria

### Database Schema

- [ ] Create `wind_data_10min` table with columns:
  - id (primary key)
  - station_id (foreign key to weather_stations)
  - timestamp (start of 10-minute interval)
  - avg_speed, min_speed, max_speed (decimal fields)
  - dominant_direction (most frequent direction during interval - "četnost")
  - tendency (enum: 'increasing', 'decreasing', 'stable') - compares current avg with previous interval
  - created_at, updated_at
- [ ] Add unique constraint on (station_id, timestamp) to prevent duplicates
- [ ] Add basic indexes on station_id and timestamp
- [ ] Update `data_retention_policies` with 10-minute retention (default: 1 day, removed after hourly data created)

### Aggregation Service Enhancement

- [ ] Create simple aggregation process that runs every 10 minutes
- [ ] Aggregate from existing `wind_data_1min` table (10 consecutive 1-minute records)
- [ ] Calculate statistics:
  - avg_speed: weighted average of 1-minute averages
  - min_speed: minimum of 1-minute minimums
  - max_speed: maximum of 1-minute maximums
  - dominant_direction: most frequent direction from 1-minute data ("četnost")
- [ ] Calculate tendency by comparing current 10-min average with previous 10-min average:
  - 'increasing': current avg > previous avg (with threshold, e.g., +0.5 m/s)
  - 'decreasing': current avg < previous avg (with threshold, e.g., -0.5 m/s)
  - 'stable': within threshold range
- [ ] Handle missing 1-minute data gracefully (partial aggregates if needed)

### API Endpoints

- [ ] `GET /api/stations/:station_id/wind/aggregated?interval=10min&date=YYYY-MM-DD`
  - Returns 10-minute aggregates for specified date (up to 144 records)
  - Defaults to current date if no date specified
- [ ] Include tendency information in response
- [ ] Simple response format with basic error handling
- [ ] Support for common unit conversions (m/s, km/h, knots)

### Frontend Enhancement

- [ ] Create `WindData10MinTable` component displaying:
  - Time (HH:MM format)
  - Average Speed (with unit selector: m/s, km/h, knots)
  - Min Speed, Max Speed (same units)
  - Dominant Direction (degrees + cardinal direction like "270° W")
  - Tendency (visual indicator: ↗️ increasing, ↘️ decreasing, ➡️ stable)
- [ ] Date picker to select which day's data to view
- [ ] Real-time updates when new 10-minute aggregates are created
- [ ] Basic loading and empty states
- [ ] Simple, responsive design

### Real-Time Features

- [ ] SSE broadcasting when new 10-minute aggregates are created
- [ ] Frontend subscribes to real-time updates
- [ ] Include tendency information in real-time updates
- [ ] Simple connection handling

### Data Retention Enhancement

- [ ] Daily cleanup service removes 10-minute data at end of day after hourly data is created successfully
- [ ] Simple automated cleanup with basic logging
- [ ] Configurable retention period (default: 1 day)
- [ ] Manual cleanup trigger for testing

## Technical Implementation Details

### Hierarchical Aggregation Logic

```typescript
// Simple aggregation from 1-minute data:
// 1. Every 10 minutes, query last 10 records from wind_data_1min
// 2. Calculate 10-minute statistics:
//    - avg_speed = weighted average of 1-min averages
//    - min_speed = minimum of 1-min minimums
//    - max_speed = maximum of 1-min maximums
//    - dominant_direction = most frequent direction ("četnost")
// 3. Calculate tendency:
//    - Get previous 10-min record for same station
//    - Compare current avg_speed with previous avg_speed
//    - Set tendency based on threshold (e.g., ±0.5 m/s)
// 4. Save to wind_data_10min table
// 5. Broadcast via SSE
```

### Tendency Calculation Algorithm

```typescript
// Simple tendency logic:
const threshold = 0.5; // m/s
const currentAvg = newRecord.avg_speed;
const previousAvg = previousRecord?.avg_speed;

if (!previousAvg) {
  tendency = "stable"; // First record
} else if (currentAvg > previousAvg + threshold) {
  tendency = "increasing";
} else if (currentAvg < previousAvg - threshold) {
  tendency = "decreasing";
} else {
  tendency = "stable";
}
```

### Direction Aggregation ("Četnost")

```typescript
// Most frequent direction from 1-minute records:
// 1. Collect all dominant_direction values from 10 x 1-minute records
// 2. Count frequency of each direction
// 3. Return most frequent direction
// 4. Handle ties by choosing first occurrence
```

## Component Impact

- [x] Backend (AdonisJS) - New aggregation service, table, API endpoints
- [x] Frontend (React/Vite) - New table component with tendency indicators
- [ ] Firmware (ESP32) - No changes
- [ ] Infrastructure (Docker/Terraform) - Monitor storage (minimal impact)

## Constraints

- **Simple & Effective**: Focus on straightforward hierarchical aggregation
- **Depends on 1-minute data**: Requires Task 2 to be working properly
- **API Compatibility**: No changes to existing firmware endpoints
- **Tendency Accuracy**: Simple threshold-based approach, can be refined later
- **Data Consistency**: 10-minute data should be mathematically consistent with 1-minute data

## Testing Approach

- [ ] Unit tests for 10-minute aggregation logic and tendency calculation
- [ ] Integration tests for hierarchical aggregation from 1-minute data
- [ ] API tests for new endpoints
- [ ] Frontend tests for table component with tendency indicators
- [ ] Data consistency verification (10-min vs 1-min data)
- [ ] Simple end-to-end tests

## Files to Create/Modify

### Backend

```
database/migrations/
├── xxxx_create_wind_data_10min_table.ts
└── xxxx_update_data_retention_policies.ts

app/models/
└── wind_data_10min.ts

app/services/
├── wind_aggregation_service.ts (enhance for multiple intervals)
└── data_cleanup_service.ts (add 10min cleanup)

app/controllers/
└── wind_aggregated_controller.ts (enhance for 10min support)

start/
└── transmit.ts (enhance SSE for 10min data)
```

### Frontend

```
src/components/
├── WindData10MinTable.tsx (new)
└── TendencyIndicator.tsx (new component for visual tendency display)

src/hooks/
└── useWind10MinData.ts (new)

src/types/
└── wind-aggregated.ts (enhance with tendency types)
```

### Testing

```
apps/bruno-api-control/
├── Get 10min wind aggregates.bru (new)
└── Compare aggregation intervals.bru (new)

tests/
├── functional/wind_10min_aggregation.spec.ts (new)
├── unit/aggregation_strategy_comparison.spec.ts (new)
└── integration/multi_interval_aggregation.spec.ts (new)
```

## Success Metrics

- [ ] 10-minute aggregation works reliably from 1-minute data
- [ ] Tendency calculation provides meaningful wind trend information
- [ ] API returns 10-minute data efficiently with tendency indicators
- [ ] Frontend displays tendency visually (arrows/colors)
- [ ] Data cleanup works properly (removed after hourly data creation)
- [ ] Simple, maintainable codebase
- [ ] No impact on existing 1-minute aggregation

## Dependencies

- **Prerequisite**: Task 1 (Database Architecture) completed
- **Prerequisite**: Task 2 (1-minute aggregation) completed and working reliably
- Existing: `wind_data_1min` table with reliable data
- Existing: SSE infrastructure from previous tasks

## Notes

- Builds directly on patterns from Task 2 (hierarchical approach)
- Uses "četnost" (frequency) approach for wind direction
- Tendency feature adds valuable insight for wind enthusiasts
- Simple threshold-based tendency calculation (can be enhanced later)
- Data lifecycle: 1-min → 10-min → hourly → cleanup
- Focus on simple, effective implementation over complex optimization
