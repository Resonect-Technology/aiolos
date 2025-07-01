---
applyTo: '**'
---

# Aiolos Weather Station Firmware Documentation

## Overview

This document provides comprehensive documentation for the Aiolos Weather Station firmware. The firmware powers a solar/battery-operated weather station based on the LilyGO T-SIM7000G board (ESP32 + SIM7000G cellular modem). The station collects environmental data (temperature, wind speed/direction) and transmits it to a backend server using HTTP POST requests. The system is designed for remote deployment with power efficiency and reliability as key concerns.

The firmware represents a complete redesign of an older MQTT-based weather station firmware, transitioning to a simple HTTP protocol for improved compatibility and easier backend integration. This redesign emphasizes modularity, clear separation of concerns, and robust error handling to ensure the station can operate autonomously for extended periods in remote locations.

## Hardware Platform

- **Main Board**: LilyGO T-SIM7000G (ESP32 + SIM7000G modem)
  - ESP32 microcontroller with WiFi/BLE capabilities
  - SIM7000G cellular modem supporting 2G/NB-IoT connectivity
  - Solar charging circuit with battery management
  - Onboard voltage regulation and power management
  - GPIO pins for sensor connectivity

- **Sensors**:
  - 2× DS18B20 temperature sensors:
    - Internal temperature sensor (mounted inside enclosure)
    - External temperature sensor (weather-proofed for outdoor use)
    - Each on separate OneWire buses for reliability
  - Anemometer (wind speed via pulse counting)
    - Uses interrupt-driven approach to count pulses
    - Calibrated at 2.4 km/h per closure/second
  - Wind vane (direction via analog reading)
    - Maps analog readings to 16 compass directions
    - Calibrated with specific voltage ranges for each direction

- **Power System**:
  - Primary: Solar panel (4.4V-6V recommended)
  - Storage: 18650 lithium battery (>2500mAh recommended)
  - Voltage monitoring on both solar input and battery
  - Deep sleep capability for night-time power conservation

## Communication Architecture

- **Protocol**: HTTP over cellular connection
  - Simple, widely supported protocol for IoT/constrained devices
  - Uses HTTP POST requests to send JSON payloads to the backend
  - Backend is an AdonisJS REST API
  - Automatic network reconnection with backoff strategy
  - Explicit power management of cellular module
  - Time synchronization via cellular network

- **HTTP Client Library**: Custom HttpClient (firmware/core/HttpClient.cpp)
  - Designed for ESP32 with Arduino framework
  - Uses TinyGSM for modem control and network stack
  - Simple API for message creation and sending
  - Handles connection, retries, and error reporting

- **Data Format**: JSON payloads
  - Human-readable format for easier debugging and interoperability
  - Standardized field names and structure
  - Compact formatting to minimize payload size
  - Implemented using ArduinoJson library

- **Backend**: AdonisJS REST API
  - Receives and processes sensor data via HTTP endpoints
  - Provides configuration updates
  - Stores historical data
  - Implements endpoints for monitoring station status

## Note

All previous references to CoAP, UDP, or MQTT (including any CoAP proxy) have been replaced with HTTP POST for simplicity and compatibility with modern web backends.

## Key Features

1. **Environmental Monitoring**:
   - Internal and external temperature readings
     - DS18B20 digital temperature sensors
     - Configurable reading interval (default: 5 minutes)
     - Automatic error detection and reporting
     - Each sensor on separate OneWire bus for fault isolation
   - Wind speed and direction measurement
     - Interrupt-based pulse counting for anemometer
     - Debounced interrupt handling to prevent false counts
     - ADC readings for wind vane with direction mapping table
     - Configurable measurement frequency (default: 1 minute)
     - Wind speed calculated in both m/s and km/h
   - Regular transmission to backend server
     - Timestamped readings
     - Retained message semantics
     - Reliable delivery with retransmission

2. **Power Management**:
   - Deep sleep during night hours (22:00-09:00)
     - Time-based sleep schedule using RTC memory
     - Configurable sleep/wake hours
     - Proper modem shutdown before sleep
   - Battery voltage monitoring with low-power safeguards
     - ADC-based voltage measurement with calibration
     - Low battery threshold detection (default: 3.4V)
     - Extended sleep on low battery conditions
   - Solar voltage monitoring
     - ADC monitoring of solar panel input
     - Power availability tracking for dynamic transmission rates
   - GPS antenna explicitly disabled to save power
     - The SIM7000G's GPS functionality is never activated
     - GPS antenna power control pin kept LOW
   - Dynamic sensor reading frequency
     - Adjusts based on power availability
     - Prioritizes critical readings when power is limited

3. **Reliability**:
   - Consider watchdog timer implementation
   - Robust reconnection logic for network issues
   - Error reporting via diagnostics messages
     - Detailed error codes and descriptions
     - Signal quality monitoring
     - System uptime tracking
     - Memory usage statistics

4. **Remote Management**:
   - Over-the-air (OTA) firmware updates via WiFi
     - ESP32's built-in OTA capabilities
     - Web interface for firmware upload
     - MD5 verification of firmware images
   - Scheduled update window when solar power is available
   - Remote-triggered update capability
   - Remote configuration commands
     - Update sensor reading frequencies
     - Modify sleep/wake schedule
     - Trigger system restart
     - Request immediate diagnostic report

## Software Architecture

### Project Structure

```
/src
  /config
    Config.h                    // All configuration parameters
  /core
    Logger.h/cpp                // Simple logging system
    ModemManager.h/cpp          // SIM7000G modem management
    HttpClient.h/cpp            // HTTP client for REST API
    OtaManager.h/cpp            // WiFi OTA updates
    PowerManager.h/cpp          // Battery/solar management
  /sensors
    TemperatureSensor.h/cpp     // Internal/external temp sensors
    WindSensor.h/cpp            // Anemometer and vane
  main.cpp                      // Main application logic
```

### Core Modules

1. **ModemManager**: 
   - Handles cellular modem initialization, power cycling, network and GPRS connections, and time synchronization
   - Implements power-efficient modem control sequences
   - Manages AT command communication with proper error handling
   - Monitors network status and signal quality
   - Provides network time for system synchronization
   - Handles network reconnection with exponential backoff
   - Disables unnecessary modem features (GPS, etc.)
   - Exposes a TinyGsmClient instance for HTTP communication

2. **HttpClient**: 
   - Manages HTTP communication for sensor data transmission
   - Implements message formatting and parsing
   - Handles connection, retries, and error reporting
   - Supports standard HTTP response codes and diagnostics
   - Processes incoming HTTP responses

3. **TemperatureSensor**: 
   - Controls both internal and external temperature sensors on separate buses
   - Handles sensor discovery and addressing
   - Implements reading with proper timing
   - Detects and reports sensor errors or disconnections
   - Provides JSON-formatted temperature readings
   - Supports sensor identification (internal vs external)
   - Handles unit conversion if needed

4. **WindSensor**: 
   - Manages anemometer with interrupt-based pulse counting
   - Implements debouncing for reliable pulse detection
   - Handles wind vane analog reading with proper scaling
   - Provides wind direction mapping with calibration table
   - Calculates wind speed with time normalization
   - Supports different units (m/s, km/h)
   - Formats readings as JSON data
   - Detects and reports sensor anomalies

5. **PowerManager**: 
   - Monitors battery and solar voltages with ADC calibration
   - Manages deep sleep cycles with RTC wake-up
   - Implements adaptive transmission rates based on power availability
   - Handles low-battery protection logic
   - Controls system power states
   - Manages watchdog timer configuration
   - Schedules periodic system restarts
   - Tracks power metrics for diagnostics

6. **OtaManager**: 
   - Handles WiFi initialization in AP mode
   - Implements web server for firmware uploads
   - Manages ArduinoOTA for IDE-based updates
   - Controls update window timing
   - Ensures proper security (password protection)
   - Handles firmware verification
   - Implements timeout-based WiFi shutdown
   - Reports update status and errors

7. **Logger**: 
   - Provides consistent logging across modules
   - Supports multiple verbosity levels
   - Implements conditional compilation for production builds
   - Handles serial output formatting
   - Optionally buffers messages for transmission to server
   - Timestamps log entries
   - Supports categorical logging (error, warning, info, debug)

### Main Operation Flow

1. **Startup Phase**:
   - Initialize serial communications (115200 baud)
   - Configure GPIO pins for LED, modem power, sensors
   - Setup hardware watchdog timer
   - Initialize logger with appropriate verbosity
   - Perform basic hardware self-test

2. **Network Connection**:
   - Power on cellular modem with correct timing sequence
   - Initialize AT command interface
   - Wait for network registration (with timeout)
   - Establish GPRS connection using configured APN
   - Synchronize system time from cellular network

3. **Power Management Check**:
   - Read battery and solar voltage levels
   - Check current time against sleep schedule
   - If night hours (22:00-09:00) or battery critically low:
     - Send sleep notification message
     - Properly shutdown modem
     - Configure deep sleep with timed wake-up
     - Enter ESP32 deep sleep mode

4. **OTA Check**:
   - If current time matches OTA window (default 10:00 AM)
   - And battery level is sufficient
   - Then:
     - Initialize WiFi in AP mode
     - Start web server for firmware updates
     - Enable ArduinoOTA
     - Set timeout for automatic WiFi shutdown

5. **Sensor Initialization**:
   - Configure temperature sensors on separate buses
   - Setup anemometer interrupt with debouncing
   - Configure ADC for wind vane and voltage readings
   - Initialize any other sensors

6. **Main Loop Operation**:
   - Reset watchdog timer
   - Process any incoming HTTP messages
   - Check network connectivity and reconnect if needed
   - Read sensors at their configured intervals:
     - Temperature readings (every 5 minutes)
     - Wind readings (every 1 minute, configurable)
     - Battery/solar voltage (every 5 minutes)
     - Signal strength (every 5 minutes)
   - Transmit readings via HTTP to server
   - Implement short delay (100ms) between iterations

7. **Error Handling**:
   - Detect and report sensor failures
   - Manage network disconnections
   - Handle modem errors with appropriate recovery
   - Track and limit reconnection attempts
   - Implement fallback behaviors for critical failures

8. **Power-saving Strategies**:
   - Adjust transmission frequency based on power availability
   - Disable unused peripherals
   - Optimize loop delays
   - Ensure efficient modem power management
   - Use deep sleep when appropriate

## Data Formats

### Temperature Message
```json
{
  "temperature": 25.4,
  "sensor": "internal",  // or "external"
  "timestamp": 1624610000,
  "battery": 3.95,  // Optional, can be included for power tracking
  "error": null  // null or error code/message if reading failed
}
```

### Wind Message
```json
{
  "speed": 4.2,  // Wind speed in m/s
  "speed_kmh": 15.12,  // Optional conversion to km/h
  "direction": 270.5,  // Direction in degrees (0-360, 0=North)
  "compass": "W",  // Optional cardinal direction
  "timestamp": 1624610000,
  "samples": 42  // Number of anemometer pulses counted
}
```

### Diagnostics Message
```json
{
  "battery_voltage": 3.8,
  "solar_voltage": 5.2,
  "signal_quality": -67,  // dBm signal strength
  "network_operator": "Vodafone",  // Optional carrier name
  "uptime": 3600,  // Seconds since last restart
  "timestamp": 1624610000,
  "free_memory": 45280,  // Free heap memory in bytes
  "reset_reason": 1,  // ESP32 reset reason code
  "errors": []  // Array of recent error codes/messages
}
```

### System Status Message
```json
{
  "status": "active",  // "active", "sleeping", "updating", etc.
  "firmware_version": "1.0.0",
  "last_reset": 1624600000,
  "config": {
    "temp_interval": 300,  // Seconds
    "wind_interval": 60,   // Seconds
    "sleep_start": 22,     // Hour (24h format)
    "sleep_end": 9,        // Hour (24h format)
    "ota_hour": 10         // Hour for OTA window
  },
  "timestamp": 1624610000
}
```

### Error Message
```json
{
  "error": true,
  "code": 1001,
  "message": "Failed to read external temperature sensor",
  "module": "TemperatureSensor",
  "timestamp": 1624610000,
  "recoverable": true
}
```

## Development Approach

- **Reliability First**: The system prioritizes reliable operation over feature richness
  - Robust error handling with recovery mechanisms
  - Graceful degradation when components fail
  - Conservative power management
  - Hardware watchdog and periodic restart safeguards

- **Modular Architecture**: Clean separation of concerns for easier maintenance
  - Each module has well-defined responsibilities
  - Minimal interdependencies between components
  - Consistent interface patterns
  - Unit-testable where possible

- **Power Efficiency**: Designed for solar/battery operation
  - Smart sleep scheduling based on time and power availability
  - Adaptive behavior based on battery levels
  - Efficient use of cellular connectivity
  - Explicit control of power-hungry components

- **Configurable Design**: Easy to adjust without code changes
  - Centralized configuration in Config.h
  - Remote configuration capabilities
  - Well-documented parameters
  - Sensible defaults with override capability

- **Maintainable Code**: Focus on readability and consistency
  - Consistent naming conventions
  - Comprehensive inline documentation
  - Clear error reporting
  - Logging at appropriate levels

- **Upgrade Path**: Support for future enhancements
  - OTA update capability
  - Modular design allows component replacement
  - Clearly defined data structures
  - Version tracking and migration support

## Implementation Timeline

1. **Phase 1: Core Infrastructure**
   - Setup project structure and PlatformIO configuration
   - Implement Config.h with all parameters
   - Create Logger module with different verbosity levels
   - Develop ModemManager for SIM7000G control
   - Implement basic network connectivity
   - Test basic modem operation and connectivity

2. **Phase 2: Sensor Implementation**
   - Develop TemperatureSensor module for both sensors
   - Implement WindSensor for anemometer and wind vane
   - Create ADC calibration for battery and solar monitoring
   - Test sensor readings and data formatting
   - Implement interrupt handling with debouncing
   - Validate sensor accuracy and reliability

3. **Phase 3: HTTP Integration**
   - Implement HttpClient for HTTP communication
   - Create message formatting functions
   - Setup REST API endpoints
   - Implement HTTP error handling
   - Test connectivity with backend server
   - Validate data transmission reliability

4. **Phase 4: Power Management and OTA**
   - Implement PowerManager with sleep/wake logic
   - Add battery monitoring and protection
   - Create adaptive transmission rate logic
   - Develop OtaManager with WiFi AP mode
   - Implement web interface for firmware updates
   - Add ArduinoOTA support
   - Test power consumption in different modes
   - Validate deep sleep and wake functionality

5. **Phase 5: Integration, Testing, and Documentation**
   - Integrate all modules in main application
   - Implement comprehensive error handling
   - Add system diagnostics and reporting
   - Conduct extensive field testing
   - Optimize power consumption
   - Create detailed README and documentation
   - Develop deployment and maintenance guides
   - Finalize configuration for production

## Technical Details

### Hardware Pinout

| Function | Pin | Notes |
|----------|-----|-------|
| Modem TX | 27 | Connected to ESP32 RX |
| Modem RX | 26 | Connected to ESP32 TX |
| Modem Power | 4 | Active LOW for power on sequence |
| Modem DTR | 25 | Data Terminal Ready |
| Modem Reset | NC | Not connected/not used |
| LED | 12 | Onboard blue LED |
| Anemometer | 14 | Interrupt-driven with internal pull-up |
| Wind Vane | 2 | Analog input (ADC2_CH2) |
| Internal Temp | 13 | OneWire bus for internal DS18B20 |
| External Temp | 15 | OneWire bus for external DS18B20 |
| Battery ADC | 35 | Analog input for battery voltage |
| Solar ADC | 36 | Analog input for solar panel voltage |

### Power Management Details

- **Battery Protection**:
  - Low voltage cutoff: 3.4V (configurable)
  - Extended sleep below threshold
  - Shutdown of non-essential functions
  
- **Solar Charging**:
  - Onboard charge controller (CN3065)
  - Input voltage range: 4.4V-6V
  - Maximum charging current: 500mA
  
- **Power States**:
  - Active: ~120mA average (with modem active)
  - Idle: ~20mA (modem in sleep mode)
  - Deep Sleep: <1mA (ESP32 in deep sleep, modem off)
  
- **Expected Battery Life**:
  - 18650 (3000mAh): 125+ hours in idle mode
  - With default sleep schedule: 5-7 days without solar
  - Indefinite with adequate solar charging

### Memory Usage

- **Flash**: ~1.2MB with all features enabled
- **RAM**: ~50KB typical runtime usage
- **RTC Memory**: Used for preserving state during deep sleep

### Modem Configuration

- **SIM7000G Settings**:
  - Network mode: 2G/NB-IoT (configured by AT commands)
  - GPS: Disabled to save power
  - Power saving mode: Enabled when not transmitting
  - TCP buffer size: Optimized for CoAP packets
  
- **AT Command Sequences**:
  - Power on/off sequences implemented precisely to spec
  - Network registration parameters configured for reliability
  - Error recovery sequences for common failure modes

### Bootup Sequence

1. Initialize hardware and peripherals
2. Power on modem with specific timing sequence
3. Connect to cellular network
4. Synchronize time from network
5. Check sleep criteria (time/battery)
6. Initialize sensors
7. Enter main operation loop

### Performance Considerations

- **Timing**:
  - Loop cycle: ~100ms typical
  - Sensor read time: 1-2s (temperature sensors require conversion time)
  - Network transmission: 2-5s per message
  - OTA update: 2-5 minutes typical

- **Memory Management**:
  - Static allocation preferred where possible
  - JSON buffer sizes optimized for typical payloads
  - Heap fragmentation minimized by design