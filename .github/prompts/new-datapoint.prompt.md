---
mode: agent
description: Guide for implementing new data points across firmware and backend
tools: ["semantic_search", "file_search", "read_file", "insert_edit_into_file", "replace_string_in_file"]
---
# New Data Point Implementation Guide

## Goal
Create a complete implementation for a new data point to be transmitted from the Aiolos Weather Station firmware to the backend server, including proper handling on both sides.

## Requirements

### Firmware Side (ESP32/SIM7000G)
- Add the necessary sensor code in the firmware `src/sensors/` directory
- Update data structures in appropriate files
- Implement the collection logic with proper error handling
- Add the data point to the JSON payload in the HTTP client
- Ensure proper power management during data collection
- Add any necessary calibration or conversion functions
- Document configuration parameters in `Config.h`
- Implement proper validation before transmission

### Backend Side (AdonisJS API)
- Create or update the appropriate model in `apps/adonis-api/app/models/`
- Update database schema/migrations if needed
- Implement the controller endpoint in `apps/adonis-api/app/controllers/`
- Add data validation for the incoming data point
- Update the API documentation/OpenAPI spec
- Implement proper error handling
- Add the new data point to the live data stream if applicable

### Integration
- Ensure consistent data types and naming between firmware and backend
- Verify payload size is appropriate for cellular transmission
- Test the complete flow from sensor to database to frontend
- Document the new data point in appropriate documentation files

## Constraints
- Follow existing code patterns and style
- Optimize for low power consumption on the firmware side
- Ensure backward compatibility with existing data
- Keep HTTP payloads compact and efficient
- Follow the modular architecture as described in the firmware documentation