---
applyTo: "apps/adonis-api/database/**,apps/adonis-api/app/models/**,apps/adonis-api/config/database.*"
---

# Aiolos Backend Database Instructions

## Database Technology Stack

- **Database**: SQLite (both development and production)
- **Driver**: better-sqlite3 for synchronous operations and ARM64 support
- **ORM**: Lucid ORM (AdonisJS v6 built-in)
- **Migration System**: AdonisJS migrations with versioning
- **Query Builder**: Knex.js (underlying Lucid ORM)

## Official Documentation

All database operations should follow AdonisJS v6 patterns as documented here:

- **Main DB Documentation**: https://docs.adonisjs.com/guides/database/introduction
- **Lucid ORM Guide**: https://docs.adonisjs.com/guides/models/introduction
- **Migrations**: https://docs.adonisjs.com/guides/database/migrations
- **Seeders**: https://docs.adonisjs.com/guides/database/seeders

## Database Schema Overview

The database schema is actively evolving and will be updated soon. Current tables include sensor readings, station diagnostics, station configurations, and system configurations. For the most up-to-date table structure, refer to the migration files in `apps/adonis-api/database/migrations/`.

### Key Schema Patterns

- **Sensor data**: Time-series data with station_id and timestamps
- **Configuration data**: Station-specific and system-wide settings
- **Diagnostic data**: Health monitoring and system status
- **JSON field naming**: API uses camelCase, database columns use snake_case

## Migration Guidelines

### Creating Migrations

```bash
# From apps/adonis-api/ directory
node ace make:migration create_table_name
```

### Migration Patterns

- **Always use timestamps**: Include `created_at` and `updated_at`
- **Foreign key constraints**: Properly reference related tables
- **Indexes**: Add indexes for frequently queried columns
- **Data types**: Use SQLite-compatible data types, ensure cross-platform compatibility

### Migration Safety

- **Never modify existing migrations** that have been deployed
- **Always create new migrations** for schema changes
- **Test migrations** thoroughly in development before deployment
- **Consider data migration** when changing existing table structures

## Model Guidelines

### Model Structure

- **Extend BaseModel**: All models should extend Lucid's BaseModel
- **Relationships**: Define proper relationships between models
- **Serialization**: Configure JSON serialization for API responses
- **Validation**: Use built-in validation or custom validators

### Naming Conventions

- **Table names**: Snake_case, plural (e.g., `sensor_readings`, `station_configs`)
- **Column names**: Snake_case (e.g., `station_id`, `created_at`)
- **Model names**: PascalCase, singular (e.g., `SensorReading`, `StationConfig`)
- **Foreign keys**: `{table_singular}_id` format
- **JSON API fields**: camelCase in API, snake_case in database (Lucid ORM handles mapping)

## Query Patterns

### IoT-Optimized Queries

- **Time-based queries**: Efficient timestamp indexing and range queries
- **Latest readings**: Optimized queries for real-time dashboard data
- **Aggregations**: Time-series data aggregation for historical analysis
- **Pagination**: Proper pagination for large datasets

### Performance Considerations

- **Eager loading**: Use `preload()` to avoid N+1 queries
- **Select specific columns**: Don't select \* when not needed
- **Database indexes**: Ensure proper indexing for query patterns
- **Connection pooling**: Configure appropriate pool sizes

## Real-time Data Integration

### Station Data Cache

- **In-memory caching**: Latest readings cached for dashboard performance
- **Cache invalidation**: Automatic cache updates on new readings
- **SSE integration**: Database changes trigger real-time broadcasts

### Data Flow

1. **Firmware POST** → Database insertion
2. **Database trigger** → Cache update
3. **Cache change** → SSE broadcast to frontend
4. **Frontend update** → Real-time dashboard display

## Production Database Setup

### SQLite Configuration

- **File location**: `/app/tmp/db.sqlite3` (in production Docker container)
- **Driver**: `better-sqlite3` for synchronous operations and ARM64 support
- **Persistence**: Database file stored on Docker volume for data persistence
- **Performance**: Optimized for ARM64 (Raspberry Pi/EC2) and x86_64 architectures

### Container Path Resolution

- **Symlink setup**: `/app/build/tmp` → `/app/tmp` for AdonisJS path resolution
- **Volume mount**: `/app/tmp` persists database across container restarts
- **Migration execution**: Automatic on container startup

### Local Development Setup

```bash
# Run pending migrations
node ace migration:run

# Reset database (development only)
node ace migration:rollback --batch=0
node ace migration:run

# Seed test data
node ace db:seed
```

## Data Validation

### Input Validation

- **Model validation**: Use Lucid model hooks for data validation
- **API validation**: Validate data before database insertion
- **Type safety**: Ensure proper data types for sensor readings
- **Range checking**: Validate sensor values are within expected ranges

### Data Integrity

- **Foreign key constraints**: Maintain referential integrity
- **Unique constraints**: Prevent duplicate readings where appropriate
- **Check constraints**: Validate data ranges at database level
- **Transactions**: Use transactions for multi-table operations

## Testing Database Operations

### Test Database

- **Separate test database**: Isolated testing environment
- **Database factories**: Generate test data using factories
- **Transaction rollback**: Use database transactions in tests
- **Seed data**: Consistent test data setup

### Testing Patterns

- **Model tests**: Test model relationships and validations
- **Migration tests**: Verify migrations work correctly
- **Integration tests**: Test database operations with API endpoints
- **Performance tests**: Ensure query performance meets requirements

## API Compatibility Considerations

### Critical Database Constraints

- **Firmware endpoints**: Existing API endpoints rely on current schema
- **Backward compatibility**: Schema changes must not break firmware (firmware cannot be easily updated)
- **API tests**: Database changes must pass existing firmware endpoint tests
- **camelCase API contract**: Maintain camelCase field names in API responses (database uses snake_case)

### Schema Evolution Strategy

1. **Additive changes**: Add new columns/tables without breaking existing firmware endpoints
2. **Migration scripts**: Provide data migration for schema changes
3. **Firmware compatibility**: Never change existing API field names or data types
4. **Protected endpoints**: Wind, temperature, diagnostics, config, and OTA endpoints are firmware-critical

### Firmware-Critical Tests

- **File**: `tests/functional/firmware_endpoints.spec.ts`
- **Purpose**: Validates exact JSON contract with deployed firmware
- **Never modify**: These tests protect deployed weather stations from API changes
- **Always run**: Before any database or API changes

## Common Database Operations

### Station Management

- **Station registration**: Add new weather stations
- **Configuration updates**: Modify station operating parameters
- **Status tracking**: Monitor station health and connectivity

### Reading Storage

- **Bulk inserts**: Efficiently store multiple sensor readings
- **Time-series queries**: Query readings by time ranges
- **Data aggregation**: Calculate averages, trends, and statistics
- **Data cleanup**: Archive or remove old readings

### System Configuration

- **Dynamic configuration**: Runtime configuration changes
- **Feature flags**: Enable/disable features via database
- **Operational parameters**: Store system-wide settings

## Error Handling

### Database Errors

- **Connection errors**: Handle database connectivity issues
- **Constraint violations**: Graceful handling of validation errors
- **Transaction failures**: Proper rollback and error reporting
- **Performance issues**: Monitor and handle slow queries

### Logging and Monitoring

- **Query logging**: Log slow or problematic queries
- **Error tracking**: Track database-related errors
- **Performance monitoring**: Monitor database performance metrics
- **Health checks**: Database connectivity health checks
