---
mode: agent
description: Guide for implementing new data points in the Aiolos Weather Station firmware
tools: ["semantic_search", "file_search", "read_file", "insert_edit_into_file", "replace_string_in_file"]
---
# Firmware Data Point Implementation Guide

## Goal
Create a complete implementation for a new data point to be collected and transmitted from the Aiolos Weather Station firmware to the backend server.

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

### Transmission Format
- Ensure the data point follows the established naming conventions
- Format the data appropriately for JSON transmission
- Add the new field to the appropriate JSON payload section
- Verify the data type is appropriate and efficient for transmission

## Constraints
- Follow existing code patterns and style
- Optimize for low power consumption
- Keep HTTP payloads compact and efficient
- Follow the modular architecture as described in the firmware documentation
- Ensure proper error handling if sensor readings fail