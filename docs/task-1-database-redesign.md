# Task 1: Database Architecture Redesign for Aiolos Weather System

## Problem Statement

The current Aiolos database lacks proper architecture for a weather monitoring system. It has mixed data types in single tables, no station registry, missing relationships, and poor indexing for time-series data. This creates performance issues and makes it difficult to implement features like data aggregation and retention policies.

## Proposed Solution

Redesign the database with a proper normalized structure that separates concerns, establishes clear relationships, and optimizes for time-series weather data workloads.

**Important**: Read #file:be-database.instructions.md for detailed information about the database technologies, patterns, and constraints used in this project (SQLite, Lucid ORM, AdonisJS v6 patterns, ARM64 support, etc.).

## Acceptance Criteria

### Core Infrastructure

- [ ] Create `weather_stations` table as central station registry with basic metadata (station_id, name, location)
- [ ] Create separate `temperature_readings` table for temperature data (station_id, temperature, timestamp)
- [ ] Add foreign key relationships between tables
- [ ] Add basic indexes on commonly queried fields (station_id, timestamp)
- [ ] Add simple data validation constraints (non-negative temperatures)

### Data Migration

- [ ] Create clean database schema with new table structure
- [ ] Remove old `sensor_readings` table completely
- [ ] Create sample weather station records for development/testing
- [ ] Add database constraints and foreign keys from the start
- [ ] Create database seeders for development data

### Enhanced Configuration Tables

- [ ] Update `station_configs` table with foreign key to `weather_stations`
- [ ] Update `station_diagnostics` table with foreign key to `weather_stations`
- [ ] Add basic indexes on frequently used fields

### Data Retention Framework

- [ ] Create `data_retention_policies` table for basic cleanup configuration
- [ ] Implement simple cleanup service framework
- [ ] Add basic logging for cleanup operations

### API Compatibility

- [ ] Ensure ALL existing API endpoints continue working unchanged
- [ ] Update models to use new table structure while maintaining same interfaces
- [ ] Verify firmware endpoints (`/stations/:id/wind`, `/stations/:id/temperature`) work identically
- [ ] Run existing API tests to confirm no breaking changes

### Performance Optimization

- [ ] Add basic indexes on commonly queried fields:
  - station_id on all tables
  - timestamp on temperature_readings table
  - frequently used lookup fields
- [ ] Use standard SQLite performance practices
- [ ] Keep queries simple and efficient

## Component Impact

- [x] Backend (AdonisJS) - Major database changes, model updates
- [ ] Frontend (React/Vite) - No changes (same API interface)
- [ ] Firmware (ESP32) - No changes (API compatibility maintained)
- [ ] Infrastructure (Docker/Terraform) - Possible database resource adjustments

## Constraints

- **API Compatibility**: CRITICAL - All existing endpoints must work identically (firmware is deployed)
- **Fresh Start**: No existing data preservation required - clean database setup
- **Simple & Effective**: Focus on clean, maintainable database structure over complex optimization
- **Easy Deployment**: Single deployment process with new schema

## Testing Approach

- [ ] Unit tests for new models and basic relationships
- [ ] API compatibility tests (existing test suite with new models)
- [ ] Basic integration tests for new database structure
- [ ] Simple end-to-end tests with sample data

## Files to Create/Modify

### Database Migrations

```
database/migrations/
├── xxxx_create_weather_stations_table.ts
├── xxxx_create_temperature_readings_table.ts
├── xxxx_create_data_retention_policies_table.ts
├── xxxx_update_station_configs_table.ts
├── xxxx_update_station_diagnostics_table.ts
└── xxxx_drop_sensor_readings_table.ts
```

### Models

```
app/models/
├── weather_station.ts (new)
├── temperature_reading.ts (new)
├── data_retention_policy.ts (new)
├── station_config.ts (updated with relationships)
├── station_diagnostic.ts (updated with relationships)
└── sensor_reading.ts (remove completely)
```

### Services

```
app/services/
├── data_cleanup_service.ts (basic cleanup framework)
├── station_data_cache_service.ts (updated for new models)
└── database_seeder_service.ts (sample data generation)
```

### Controllers (Updated for new models)

```
app/controllers/
├── station_live_controller.ts (updated for direct aggregation, no raw storage)
├── station_temperature_controller.ts (use new temperature_readings model)
├── station_diagnostics_controller.ts (updated relationships)
└── station_configs_controller.ts (updated relationships)
```

## Deployment Strategy

### Simple Fresh Start Approach

1. **Prepare New Schema**: Create all new migrations and models
2. **Test Locally**: Verify API compatibility with new models and fresh database
3. **Deploy**: Single deployment with database reset and new schema
4. **Seed Data**: Create sample weather stations and test data
5. **Verify**: Run API tests and monitor functionality

### Deployment Steps

1. Run `node ace migration:rollback --to=0` (reset database)
2. Run `node ace migration:run` (apply new schema)
3. Run `node ace db:seed` (create sample data)
4. Restart application with new models
5. Verify all endpoints work correctly

## Success Criteria

- [ ] All existing API tests pass without modification
- [ ] Clean, simple database schema with clear relationships
- [ ] Database structure is easy to understand and work with
- [ ] New structure supports future features (aggregation, etc.)
- [ ] Sample data available for development and testing
- [ ] Straightforward deployment process

## Risk Mitigation

- [ ] Test complete deployment process in local environment
- [ ] Verify API compatibility with fresh database
- [ ] Document rollback to previous version if needed
- [ ] Monitor application startup and basic functionality
- [ ] Keep deployment process simple and repeatable

## Future Readiness

This architecture will support:

- Time-based data aggregation (1min, 10min, hourly)
- Multiple sensor types and station configurations
- Advanced analytics and reporting features
- Multi-station data analysis
- Efficient data retention policies

## Notes

- This task focuses ONLY on database architecture - no aggregation features yet
- API interfaces remain identical to ensure firmware compatibility
- All configuration and diagnostic features continue working
- Wind data will be handled via direct aggregation (no raw storage) in Task 2
- Temperature data still uses traditional storage model
- Foundation for Task 2: 1-minute wind data aggregation
- Foundation for Task 3: 10-minute wind data aggregation
