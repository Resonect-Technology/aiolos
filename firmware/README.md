# Aiolos Firmware

## Using USB Devices with WSL and PlatformIO

If you are developing firmware using PlatformIO in VS Code on Windows Subsystem for Linux (WSL), and you want to use USB devices (such as serial programmers or modems), you need to use `usbipd` to attach USB devices to your WSL environment.

### Attaching USB Devices

1. **List available USB devices:**
   ```bash
   usbipd wsl list
   ```
   This will show all USB devices that can be attached to WSL.

2. **Attach the device:**
   Find the `BUSID` of your device from the list, then run:
   ```bash
   usbipd wsl attach --busid <BUSID>
   ```
   Replace `<BUSID>` with the correct value (e.g., `1-2`).

### Persistence Limitation

**Note:** If you unplug and replug your USB device, it will not be automatically re-attached to WSL. You must repeat the `usbipd wsl attach` command each time you reconnect the device. This is a current limitation of `usbipd` and WSL.

#### Workaround
- You can create a simple script to re-attach the device when needed.
- Some advanced users set up automation on Windows to detect device changes and run the attach command, but this requires extra setup.

### Troubleshooting
- If your device does not show up in WSL after replugging, repeat the attach steps above.
- Make sure you have the latest version of `usbipd-win` installed on Windows.
- For more information, see the [usbipd-win documentation](https://github.com/dorssel/usbipd-win).

## Modem Implementation (LilyGO T-SIM7000G)

The Aiolos Weather Station uses a LilyGO T-SIM7000G module (ESP32 + SIM7000G cellular modem) for connectivity. The firmware follows best practices for robust cellular communication:

### Key Features

- **Reliable Power Sequence**: Proper initialization of the SIM7000G modem with correct timing for power-on sequence
- **Error Resilience**: System continues operation even if modem/SIM errors occur
- **Network Connection**: Automatic connection to cellular network and GPRS with retry mechanisms
- **HTTP Communication**: Direct HTTP POST requests to the Adonis backend API

- **Power Management**: Sleep mode support for power conservation with proper wake-up sequence
- **SIM Detection**: Multiple methods to detect SIM card presence (CPIN, CCID, TinyGSM)

### Configuration

- APN: "simbase" - Used for cellular data connection
- Baud Rate: 115200
- Hardware Pins:
  - PIN_DTR: 25
  - PIN_TX: 27
  - PIN_RX: 26
  - PWR_PIN: 4

### Modem Initialization Process

1. Initialize hardware (serial port, pins)
2. Power on the modem with correct pulse timing
3. Test AT command response
4. Check SIM card status
5. Connect to network and GPRS

### Power Management

The modem supports sleep mode for power conservation:

- DTR pin control for sleep/wake
- Software commands for power management
- Support for wake-up after ESP32 deep sleep

### Troubleshooting

- If the modem doesn't respond, try a power cycle
- Check signal quality using diagnostic functions
- Verify SIM card is properly inserted
- Ensure the correct APN is configured for your cellular provider
- Test HTTP connectivity with the test request function

### HTTP API Communication

The firmware communicates with the backend using simple HTTP POST requests:

- Endpoints follow the pattern: `/station/{stationId}/{resourceType}`
- JSON payloads for structured data transmission
- Support for sending diagnostic data, wind readings, and temperature values
- Automatic retries on connection failures

## Wind Measurement System

The Aiolos Weather Station includes a comprehensive wind measurement system that accurately measures both wind direction and wind speed:

### Wind Direction Sensor (Wind Vane)

- **Operating Principle**: Uses a resistor network with a rotating magnet to create voltage variations based on wind direction
- **Resolution**: 16 distinct directions (22.5° increments) covering full 360° range
- **Hardware Interface**: Analog input connected to ESP32 ADC (pin GPIO2)
- **Voltage Range**: 0V to 3.3V corresponding to different wind directions
- **Reading Method**: ADC reading converted to voltage, then matched against calibrated lookup table
- **Calibration**: Precise resistance-to-voltage-to-direction lookup table for accurate readings

### Wind Speed Sensor (Anemometer)

- **Operating Principle**: Reed switch sends pulses as the anemometer cups rotate
- **Hardware Interface**: Digital input with interrupt for pulse counting (pin GPIO14)
- **Calibration**: 1Hz (one rotation per second) = 0.447 m/s wind speed
- **Debounce Protection**: 10ms software debounce to prevent false readings
- **Measurement Period**: Wind speed averaged over configurable interval (default 1 minute)

### Implementation Details

- Sampling rate configurable via `WIND_INTERVAL` in Config.h
- Dedicated `WindSensor` class separates wind measurement logic from main application
- Interrupt-driven anemometer readings for accurate pulse counting
- Direct ADC value mapping for wind direction based on calibrated thresholds
- Comprehensive logging of wind measurements

### Hardware Connections

- Wind vane connects to `WIND_VANE_PIN` (GPIO2, ADC2_CH2)
- Anemometer connects to `ANEMOMETER_PIN` (GPIO14, interrupt-capable pin)
- Both sensors operate at 3.3V for compatibility with ESP32

### Current Implementation Status

As of June 27, 2025, the wind measurement system has been updated with the following improvements:

#### Completed:
- ✅ Aligned pin assignments with the original working implementation (GPIO2 for wind vane, GPIO14 for anemometer)
- ✅ Implemented direct ADC value mapping for wind direction using calibrated thresholds from proven code
- ✅ Added wind direction adjustment (subtracting 90° with proper wrap-around) for correct compass alignment
- ✅ Configured ADC with proper resolution (12-bit) and attenuation for accurate readings
- ✅ Fixed ADC_ATTEN_DB_11 deprecation warning by using ADC_ATTEN_DB_12
- ✅ Added robust wind speed calculation based on pulse counting and time measurement
- ✅ Implemented debounce protection for anemometer readings
- ✅ Added optional calibration mode for testing and diagnostics
- ✅ Enhanced debug logging for troubleshooting

#### Next Steps:
- Continue testing to verify wind direction accuracy across all 16 positions
- Fine-tune ADC thresholds if needed based on field testing
- Consider adding smoothing/averaging for more stable readings in variable conditions
- Integrate with HTTP API for data transmission to backend
- Implement power optimization to reduce consumption during measurements

The current implementation combines the reliability of the proven direction calculation from the original code with the more modular and maintainable structure of the new code.

### Recommended Operational Settings

The wind measurement system supports configurable sampling and reporting intervals for different operational modes:

#### Live Mode (Daytime/High Activity)
- **Wind Sampling Interval**: 30 seconds
- **Wind Reporting Interval**: 2 minutes
- **Temperature Reporting**: 5 minutes
- **Diagnostics Reporting**: 5 minutes
- **Use Case**: Active monitoring periods when real-time data is important

#### Power-Saving Mode (Nighttime/Low Activity)
- **Wind Sampling Interval**: 2 minutes
- **Wind Reporting Interval**: 10 minutes
- **Temperature Reporting**: 15 minutes
- **Diagnostics Reporting**: 15 minutes
- **Use Case**: Extended battery operation during low-activity periods

#### Configuration Methods
- **Local Configuration**: Set via `Config.h` constants
- **Remote Configuration**: Configurable via HTTP API endpoint `/stations/{stationId}/configuration`
- **Runtime Adjustment**: Sampling intervals can be updated without firmware reflashing

#### Backend Integration
- Wind data sent to `/stations/{stationId}/wind` endpoint
- Configuration fetched from `/stations/{stationId}/configuration`
- Support for dynamic interval adjustment based on weather conditions or time of day

## Diagnostics System

The Aiolos Weather Station includes a comprehensive diagnostics system that monitors the health and status of the device:

### Diagnostics Data Collected

- **Battery Voltage**: Current battery level in volts (3.5V-4.2V range)
- **Solar Panel Voltage**: Solar input voltage in volts (4.4V-6V range)
- **Signal Quality**: Cellular signal strength in dBm
- **System Uptime**: Time since last boot in seconds

### Sending Frequency

- Diagnostics data is sent at configurable intervals (default: 5 minutes)
- The interval can be adjusted in code via the DiagnosticsManager
- Initial value is set in `Config.h` as `DIAG_INTERVAL`

### Implementation Details

- ADC readings are averaged over multiple samples for accuracy
- Voltage readings include calibration factors for hardware-specific adjustments
- USB power detection to warn when battery readings may be inaccurate
- Dedicated DiagnosticsManager class separates concerns from main application logic

### Data Format

Diagnostics data is sent as a JSON payload to `/stations/{stationId}/diagnostics`:

```json
{
  "battery_voltage": 4.1,
  "solar_voltage": 5.2,
  "signal_quality": -67,
  "uptime": 3600,
  "timestamp": "2025-06-27T14:30:00Z"
}
```

The timestamp is added by the server if not provided by the device.

## Environment Configuration

The Aiolos firmware uses PlatformIO's build system to manage environment-specific configurations and sensitive values. Rather than hardcoding sensitive information in source files, we use a `firmware/secrets.ini` file that is excluded from version control.

### Setup

1. Copy the example file to create your own secrets file:
   ```bash
   cp firmware/secrets.ini.example firmware/secrets.ini
   ```

2. Edit `firmware/secrets.ini` with your specific configuration values:
   ```ini
   [secrets]
   APN = "your_apn_here"
   GPRS_USER = "your_username"
   GPRS_PASS = "your_password"
   OTA_SSID = "your_ota_ssid"
   OTA_PASSWORD = "your_secure_password"
   # ... and other values
   ```

3. Build the project normally with PlatformIO - it will automatically incorporate your secret values.

### How It Works

- The main `platformio.ini` includes the `secrets.ini` file using the `extra_configs` directive
- Values from `secrets.ini` are passed to the compiler via `-D` flags in `build_flags`
- The `Config.h` file has fallback definitions for when environment values aren't provided

### Environment-Specific Builds

You can create different environment configurations for development, testing, and production:

```ini
[env:development]
# Development-specific configuration
platform = espressif32
# ... other settings
build_flags =
    # ... other flags
    -DCONFIG_SERVER_HOST=\"dev.example.com\"

[env:production]
# Production-specific configuration
platform = espressif32
# ... other settings
build_flags =
    # ... other flags
    -DCONFIG_SERVER_HOST=\"prod.example.com\"
```

To build for a specific environment:
```bash
pio run -e production
```

### Security Notes

- The `secrets.ini` file should NEVER be committed to version control
- Ensure it's listed in `.gitignore`
- For production deployments, consider using PlatformIO's encrypted storage or CI/CD secrets management
