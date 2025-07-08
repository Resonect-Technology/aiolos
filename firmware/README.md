# Aiolos Firmware v2.0

This document provides a comprehensive overview of the Aiolos Weather Station firmware, designed for the LilyGO T-SIM7000G module. It covers the system architecture, key features, and operational logic, intended for developers maintaining or extending the project.

## Core Architecture

The firmware is built on a modular architecture that separates concerns into distinct components, managed by the main application loop in `main.cpp`.

- **`main.cpp`**: The entry point and central orchestrator. It manages the main loop, initializes all modules, handles the device's state (active, sleep, OTA), and schedules all tasks.
- **`ModemManager`**: Encapsulates all logic for the SIM7000G modem, including power, network registration, GPRS connection, and sleep management.
- **`AiolosHttpClient`**: Manages all communication with the backend server, including sending sensor data and fetching remote configuration. It relies on `ModemManager` for an active connection.
- **`WindSensor`**: Handles all wind speed and direction measurements. It supports both instantaneous and long-term averaged readings.
- **`TemperatureSensor`**: Manages the DS18B20 external temperature sensor.
- **`BatteryUtils`**: Provides accurate, calibrated battery voltage readings.
- **`OtaManager`**: Manages both scheduled and remote-triggered Over-The-Air firmware updates via a Wi-Fi Access Point.
- **`DiagnosticsManager`**: Collects and sends device health data (battery, signal, uptime).
- **`Config.h`**: A central header for all default compile-time configurations.

---

## Key Features & Operational Logic

### 1. Power and Connection Management

The firmware implements robust power management optimized for field deployment with deep sleep functionality.

- **Deep Sleep Mode**: During inactive hours (defined by `DEFAULT_SLEEP_START_HOUR` and `DEFAULT_SLEEP_END_HOUR`), the ESP32 enters deep sleep with the modem completely powered off for maximum power savings.
- **`maintainConnection(bool active)`**: Core function for connection management.
  - During **active hours**, `maintainConnection(true)` ensures the modem is powered and GPRS connection is stable.
  - Before deep sleep, `maintainConnection(false)` gracefully disconnects GPRS.
  - **Critical Fix**: The `enterDeepSleepUntil()` function now calls `modemManager.powerOff()` to completely power off the modem (not just sleep) before entering deep sleep, ensuring reliable wake-up behavior.

### 2. Dual-Mode Wind Measurement

The wind sensor can operate in two distinct modes, determined by the `dynamicWindInterval` fetched from the remote configuration.

- **Livestream Mode** (`interval <= 5 seconds`):
  - Provides near real-time wind data.
  - Uses `getWindSpeed()` and `getWindDirection()` for instantaneous readings.
  - Ideal for active monitoring during the day.

- **Low-Power Averaged Mode** (`interval > 5 seconds`):
  - Designed for power efficiency and data accuracy over long periods.
  - Uses `startSamplingPeriod()` to begin a measurement window (e.g., 5 minutes).
  - Internally, it samples the wind every `WIND_AVERAGING_SAMPLE_INTERVAL_MS` (e.g., 10 seconds).
  - At the end of the period, `getAveragedWindData()` returns the final values.
  - **Direction Averaging**: Uses **vector averaging** for a mathematically correct mean direction, which prevents issues with the 0°/360° crossover.

### 3. Sensor Implementation & Optimizations

- **Wind Sensor**:
  - **Direction**: Uses **raw ADC values** mapped to calibrated direction headings. This is more robust than converting to voltage first.
  - **Speed**: Uses **hardware interrupts** for accurate, non-blocking counting of anemometer rotations.

- **Temperature Sensor (DS18B20)**:
  - Uses standard temperature reading with proper error handling for disconnected sensors.
  - Both internal (`TEMP_BUS_INT` - GPIO21) and external (`TEMP_BUS_EXT` - GPIO13) temperature sensors supported.
  - External sensor failures are handled gracefully with `-127.0°C` indicator values.

- **Battery Measurement**:
  - Uses the ESP32's `esp_adc_cal` library for **calibrated voltage readings** with hardware-specific compensation.
  - The `BATTERY_VOLTAGE_DIVIDER_RATIO` constant in `BatteryUtils.h` accounts for the T-SIM7000G's voltage divider circuit.
  - Also monitors solar panel voltage via `ADC_SOLAR_PIN` for comprehensive power system diagnostics.

### 4. Over-The-Air (OTA) Updates

The firmware supports two methods for remote updates, managed by `OtaManager` using the **ESP-WebOTA library**.

- **Scheduled OTA**: The device automatically enters OTA mode during a pre-configured daily window (`DEFAULT_OTA_HOUR`, `DEFAULT_OTA_MINUTE`). It will host a Wi-Fi AP (`Aiolos-Ota`) for a set duration.
- **Remote-Triggered OTA**: An update can be initiated on-demand by setting a flag on the backend server.
  - When the device fetches its configuration and sees the flag, it immediately enters OTA mode.
  - It then sends a confirmation to the server (`confirmOtaStarted`) to clear the flag, ensuring the OTA process only runs once per request.

#### Developer Notes for OTA
- **Library Used**: The firmware uses the [ESP-WebOTA library](https://github.com/scottchiefbaker/ESP-WebOTA) for reliable OTA functionality.
- **File Upload**: Upload the `firmware.bin` file generated by PlatformIO (located at `.pio/build/aiolos-esp32dev/firmware.bin` for production or `.pio/build/aiolos-esp32dev-debug/firmware.bin` for debug builds).
- **Two-Layer Security**:
  - **WiFi Access**: Connect using `OTA_SSID` and `OTA_PASSWORD` (for WiFi connection)
  - **OTA Authentication**: Login using username `admin` and `OTA_UPDATE_PASSWORD` (for firmware upload)
- **Access Method**: 
  1. Connect to the WiFi AP (SSID from `OTA_SSID` with password from `OTA_PASSWORD`)
  2. Navigate to `http://192.168.4.1/update` in a web browser
  3. Enter credentials when prompted: username `admin`, password from `OTA_UPDATE_PASSWORD`
  4. Upload the `.bin` file through the web interface
- **Authentication**: Uses HTTP digest authentication for secure access to the OTA interface.
- **Debug Mode**: In debug builds, OTA mode will activate even with low battery voltage for development convenience.

#### Debug Mode Features

When compiled with `DEBUG_MODE=1` flag, the firmware enables several development-friendly features:

- **Sleep Disabled**: Deep sleep functionality is completely disabled to allow continuous monitoring and debugging
- **Enhanced Logging**: Log level increased to DEBUG (level 4) showing detailed operational information vs. production WARN level (level 2)
- **Low Battery OTA Override**: OTA updates are allowed even when battery voltage is below the minimum threshold (3.8V), useful when developing via USB power
- **Development Build Identification**: Startup logs clearly indicate debug mode is active
- **Continuous Operation**: Device remains active 24/7 without entering power-saving sleep cycles

**Note**: Debug mode should never be used in field deployments as it prevents power-saving sleep and may drain the battery quickly.

### 5. Configuration System

The firmware uses a flexible, three-tiered configuration system.

1.  **`secrets.ini`**: For per-device secrets that should not be in version control (APN, Wi-Fi passwords, etc.). See "Environment Configuration" below.
2.  **`Config.h`**: Contains the default fallback values for all operational parameters (e.g., `DEFAULT_WIND_INTERVAL`). These are used if the device cannot reach the server.
3.  **Remote Configuration**: At runtime, the device periodically fetches a JSON configuration from the backend server using `AiolosHttpClient.fetchConfiguration()`. These values override the defaults, allowing for dynamic adjustment of reporting intervals, sleep times, and other parameters without reflashing the firmware.

### 6. System Reliability & Watchdog Management

The firmware implements comprehensive system reliability measures to ensure stable long-term operation.

- **Watchdog Timer**: 120-second timeout to detect and recover from system hangs
- **Strategic Disabling**: Watchdog is temporarily disabled during long operations (modem initialization, OTA updates, connectivity tests)
- **Periodic Restarts**: Configurable automatic restarts (default 6 hours) to maintain system health
- **Error Recovery**: Graceful handling of modem, network, and sensor failures with appropriate fallbacks
- **Non-Blocking Operations**: All potentially blocking operations converted to timer-based alternatives
- **System Responsiveness**: Sensors and core functions continue operating during connection issues

### 7. Advanced Safety Mechanisms

The firmware implements multiple layers of safety mechanisms to ensure the device never remains offline indefinitely, providing robust field deployment reliability.

#### Offline Safety Protection

The system continuously monitors its connectivity status and implements progressive recovery measures:

- **Connection State Monitoring**: Device is considered "online" when both GPRS is connected AND HTTP client is not in backoff/throttled state
- **Offline Time Tracking**: Automatically tracks when the device first goes offline and monitors total offline duration
- **Progressive Recovery**: Multiple safety mechanisms with increasing severity to restore connectivity

#### Three-Tier Safety System

**1. Backoff Reset Timer (30 minutes)**
- Automatically resets HTTP exponential backoff every 30 minutes while offline
- Clears connection failure counters to allow fresh connection attempts
- Exits emergency recovery mode to resume normal operation
- Prevents devices from staying in prolonged backoff states

**2. Maximum Offline Time Protection (1 hour)**
- Forces complete system restart if device remains offline for 1 hour
- Logs comprehensive diagnostics before restart (connection failures, recovery mode status, HTTP throttle state)
- Ensures no weather station stays offline indefinitely due to software bugs or network issues
- Provides ultimate fallback for field deployments

**3. Periodic Status Monitoring**
- Logs offline status every 5 minutes with countdown to restart
- Tracks offline time progression for debugging and analysis
- Provides visibility into connection recovery attempts

#### Safety Configuration

All safety timing constants are centrally defined in `Config.h`:

```cpp
#define MAX_CONNECTION_FAILURES 10           // Emergency recovery trigger
#define CONNECTION_FAILURE_RESET_TIME 600000 // 10 minutes failure counter reset
#define EMERGENCY_RECOVERY_DURATION 600000   // 10 minutes recovery period
#define MAX_OFFLINE_TIME 3600000             // 1 hour maximum offline before restart
#define BACKOFF_RESET_INTERVAL 1800000       // 30 minutes backoff reset interval
```

#### Field Deployment Benefits

- **Zero Infinite Outages**: Guaranteed device recovery within 1 hour maximum
- **Progressive Recovery**: Multiple attempts before drastic measures
- **Non-Blocking Operation**: Sensors continue operating during connection issues
- **Comprehensive Logging**: Full diagnostic information for troubleshooting
- **Remote Monitoring**: Offline status visible in logs for proactive intervention

---
