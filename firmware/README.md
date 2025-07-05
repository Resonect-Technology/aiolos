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

---

## Hardware Connections

| Component         | Pin Name          | ESP32 Pin | Notes                               |
| ----------------- | ----------------- | --------- | ----------------------------------- |
| Anemometer        | `ANEMOMETER_PIN`  | `GPIO33`  | Interrupt-capable pin for pulse counting |
| Wind Vane         | `WIND_VANE_PIN`   | `GPIO32`  | ADC pin for direction reading       |
| External Temp     | `TEMP_BUS_EXT`    | `GPIO13`  | OneWire bus for DS18B20             |
| Battery Sensing   | `ADC_BATTERY_PIN` | `GPIO35`  | ADC pin for voltage measurement     |
| Solar Sensing     | `ADC_SOLAR_PIN`   | `GPIO36`  | ADC pin for solar voltage measurement |
| Modem TX          | `PIN_TX`          | `GPIO27`  |                                     |
| Modem RX          | `PIN_RX`          | `GPIO26`  |                                     |
| Modem Power       | `PWR_PIN`         | `GPIO4`   |                                     |
| Modem DTR         | `PIN_DTR`         | `GPIO25`  | For modem sleep control             |
| Modem Reset       | `MODEM_RST_PIN`   | `GPIO5`   | For complete modem power off        |
| Status LED        | `LED_PIN`         | `GPIO12`  |                                     |

---

## Environment Configuration

The project uses a `secrets.ini` file (ignored by Git) to manage sensitive data and per-device settings.

### Setup

1.  **Copy the example file:**
    ```bash
    cp firmware/secrets.ini.example firmware/secrets.ini
    ```

2.  **Edit `firmware/secrets.ini`** with your specific values (APN, server host, etc.).

3.  **Build the project.** PlatformIO automatically injects these values into the build process. The firmware uses them via `CONFIG_*` macros, which are then assigned to the `DEFAULT_*` constants in `Config.h`.

---

## Project Status (July 2025)

The firmware is **production-ready** and has undergone comprehensive testing and optimization. All critical systems have been refactored for robustness and power efficiency.

#### Recent Improvements (v2.0)
- **Fixed Modem Power Management**: Resolved persistent modem restart issues with proper `powerOff()` implementation
- **Optimized HTTP Communication**: Lightweight POST methods for improved reliability
- **Enhanced Error Handling**: Comprehensive error recovery throughout all modules
- **Calibrated ADC Readings**: More accurate battery and solar voltage measurements
- **Robust Deep Sleep**: Simplified logic ensuring reliable wake-up behavior

#### Field Testing Ready
- **Long-term Stability**: Validated for continuous operation with periodic restarts
- **Power Efficiency**: Optimized for solar/battery operation with deep sleep
- **Network Reliability**: Connection throttling and graceful degradation
- **Data Integrity**: Comprehensive sensor validation and error reporting
