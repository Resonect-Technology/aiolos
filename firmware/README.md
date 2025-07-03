# Aiolos Firmware v2.0

This document provides a comprehensive overview of the Aiolos Weather Station firmware, designed for the LilyGO T-SIM7000G module. It covers the system architecture, key features, and operational logic, intended for developers maintaining or extending the project.

## Core Architecture

The firmware is built on a modular architecture that separates concerns into distinct components, managed by the main application loop in `main.cpp`.

- **`main.cpp`**: The entry point and central orchestrator. It manages the main loop, initializes all modules, handles the device's state (active, sleep, OTA), and schedules all tasks.
- **`ModemManager`**: Encapsulates all logic for the SIM7000G modem, including power, network registration, GPRS connection, and sleep management.
- **`HttpClient`**: Manages all communication with the backend server, including sending sensor data and fetching remote configuration. It relies on `ModemManager` for an active connection.
- **`WindSensor`**: Handles all wind speed and direction measurements. It supports both instantaneous and long-term averaged readings.
- **`TemperatureSensor`**: Manages the DS18B20 external temperature sensor.
- **`BatteryUtils`**: Provides accurate, calibrated battery voltage readings.
- **`OtaManager`**: Manages both scheduled and remote-triggered Over-The-Air firmware updates via a Wi-Fi Access Point.
- **`DiagnosticsManager`**: Collects and sends device health data (battery, signal, uptime).
- **`Config.h`**: A central header for all default compile-time configurations.

---

## Key Features & Operational Logic

### 1. Power and Connection Management

To ensure reliability and conserve power for long-term field deployment, the firmware uses a smart connection management strategy.

- **Active vs. Inactive Hours**: The device operates in two main states based on the time of day, defined by `DEFAULT_SLEEP_START_HOUR` and `DEFAULT_SLEEP_END_HOUR`.
- **`maintainConnection(bool active)`**: This is the core function for power management.
  - During **active hours**, `maintainConnection(true)` is called, which ensures the modem is powered on and the GPRS connection is active and stable. All data transmission occurs during this time.
  - Before entering sleep, `maintainConnection(false)` is called, which gracefully disconnects GPRS and puts the modem into a low-power sleep state.
- **Deep Sleep**: During inactive (night) hours, the ESP32 enters deep sleep to minimize power consumption, waking up at the configured start of active hours.

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
  - To prevent the main loop from freezing during temperature conversions (which can take up to 750ms), the sensor's resolution is set to **9-bit**. This provides a fast, **~94ms non-blocking reading** with a precision of 0.5°C, which is more than sufficient for this application.

- **Battery Measurement**:
  - Uses the ESP32's `esp_adc_cal` library for **calibrated voltage readings**. This corrects for the non-linear behavior of the ESP32's ADC, providing much higher accuracy across the full charge cycle.
  - The `BATTERY_VOLTAGE_DIVIDER_RATIO` constant in `BatteryUtils.h` can be fine-tuned with a multimeter for per-device calibration.

### 4. Over-The-Air (OTA) Updates

The firmware supports two methods for remote updates, managed by `OtaManager`.

- **Scheduled OTA**: The device automatically enters OTA mode during a pre-configured daily window (`DEFAULT_OTA_HOUR`, `DEFAULT_OTA_MINUTE`). It will host a Wi-Fi AP (`Aiolos-Ota`) for a set duration.
- **Remote-Triggered OTA**: An update can be initiated on-demand by setting a flag on the backend server.
  - When the device fetches its configuration and sees the flag, it immediately enters OTA mode.
  - It then sends a confirmation to the server (`confirmOtaStarted`) to clear the flag, ensuring the OTA process only runs once per request.

### 5. Configuration System

The firmware uses a flexible, three-tiered configuration system.

1.  **`secrets.ini`**: For per-device secrets that should not be in version control (APN, Wi-Fi passwords, etc.). See "Environment Configuration" below.
2.  **`Config.h`**: Contains the default fallback values for all operational parameters (e.g., `DEFAULT_WIND_INTERVAL`). These are used if the device cannot reach the server.
3.  **Remote Configuration**: At runtime, the device periodically fetches a JSON configuration from the backend server. These values override the defaults, allowing for dynamic adjustment of reporting intervals, sleep times, and other parameters without reflashing the firmware.

---

## Hardware Connections

| Component         | Pin Name          | ESP32 Pin | Notes                               |
| ----------------- | ----------------- | --------- | ----------------------------------- |
| Anemometer        | `ANEMOMETER_PIN`  | `GPIO33`  | Interrupt-capable pin for pulse counting |
| Wind Vane         | `WIND_VANE_PIN`   | `GPIO32`  | ADC pin for direction reading       |
| External Temp     | `TEMP_BUS_EXT`    | `GPIO19`  | OneWire bus for DS18B20             |
| Battery Sensing   | `ADC_BATTERY_PIN` | `GPIO35`  | ADC pin for voltage measurement     |
| Modem TX          | `PIN_TX`          | `GPIO27`  |                                     |
| Modem RX          | `PIN_RX`          | `GPIO26`  |                                     |
| Modem Power       | `PWR_PIN`         | `GPIO4`   |                                     |
| Modem DTR         | `PIN_DTR`         | `GPIO25`  | For modem sleep control             |
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

The firmware is considered feature-complete and stable for field testing. All major systems have been refactored for robustness and power efficiency.

#### Next Steps
- **Field Testing**: Deploy the station in a real-world environment to validate long-term stability, battery life, and data accuracy.
- **Calibration**: Fine-tune the `BATTERY_VOLTAGE_DIVIDER_RATIO` and the wind vane's ADC-to-direction map if necessary.
- **Monitoring**: Monitor data from the backend to ensure consistency and reliability.
