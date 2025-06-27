# Aiolos Weather Station Firmware - HTTP Version

## Project Overview

This firmware powers a solar/battery-operated weather station based on the LilyGO T-SIM7000G board (ESP32 + SIM7000G cellular modem). The station collects environmental data (temperature, wind speed/direction) and transmits it to a backend server using HTTP POST requests. The system is designed for remote deployment with power efficiency and reliability as key concerns.

The project represents a complete redesign of an older MQTT-based weather station firmware, transitioning to a simple HTTP protocol for improved compatibility and easier backend integration. This redesign emphasizes modularity, clear separation of concerns, and robust error handling to ensure the station can operate autonomously for extended periods in remote locations.

## Communication Architecture

- **Protocol**: HTTP over cellular connection
  - Simple, widely supported protocol for IoT/constrained devices
  - Uses HTTP POST requests to send JSON payloads to the backend
  - Backend is an AdonisJS REST API
  - Automatic network reconnection with backoff strategy
  - Explicit power management of cellular module
  - Time synchronization via cellular network

- **Data Format**: JSON payloads
  - Human-readable format for easier debugging and interoperability
  - Standardized field names and structure
  - Compact formatting to minimize payload size
  - Implemented using ArduinoJson library

- **Connectivity**: 2G/NB-IoT cellular via SIM7000G modem
  - TinyGSM library for modem control
  - Automatic network reconnection with backoff strategy
  - Explicit power management of cellular module
  - Time synchronization via cellular network

- **Backend**: AdonisJS REST API
  - Receives and processes sensor data via HTTP endpoints
  - Provides configuration updates
  - Stores historical data
  - Implements endpoints for monitoring station status

## Key Features

- Environmental monitoring (temperature, wind speed/direction)
- Power management (deep sleep, battery/solar monitoring)
- Reliable HTTP data transmission
- OTA firmware updates via WiFi
- Modular, maintainable codebase

## Note

All previous references to CoAP, UDP, or MQTT have been replaced with HTTP for simplicity and compatibility with modern web backends.
