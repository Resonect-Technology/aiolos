/**
 * @file Config.h
 * @brief Configuration parameters for the Aiolos Weather Station
 *
 * Contains all configurable parameters for the weather station operation.
 * This includes network settings, hardware pins, timing parameters,
 * and operational thresholds.
 */

#pragma once

// Debug and logging
#define DEBUG_ENABLED true
#define LOG_LEVEL 4 // 0=NONE, 1=ERROR, 2=WARN, 3=INFO, 4=DEBUG, 5=VERBOSE

// Board pins
#define PIN_DTR 25
#define PIN_TX 27
#define PIN_RX 26
#define PWR_PIN 4
#define LED_PIN 12
#define ANEMOMETER_PIN 33  // GPIO33 for anemometer (was 14)
#define WIND_VANE_PIN 32   // GPIO32 for wind vane (ADC1_CH4) (was 2)
#define TEMP_BUS_INT 18    // OneWire bus for internal temperature sensor (was 13)
#define TEMP_BUS_EXT 19    // OneWire bus for external temperature sensor (was 15)
#define ADC_BATTERY_PIN 35 // ADC pin for battery voltage
#define ADC_SOLAR_PIN 36   // ADC pin for solar panel voltage

// Network settings
#ifdef CONFIG_APN
#define APN CONFIG_APN
#else
#define APN "apn"
#endif

#ifdef CONFIG_GPRS_USER
#define GPRS_USER CONFIG_GPRS_USER
#else
#define GPRS_USER ""
#endif

#ifdef CONFIG_GPRS_PASS
#define GPRS_PASS CONFIG_GPRS_PASS
#else
#define GPRS_PASS ""
#endif

#define UART_BAUD 115200

// Server settings are now defined at the end of the file with Kconfig support

// --- Default Timing and Scheduling --- //
// These values are used as fallbacks if remote configuration is unavailable.

// OTA settings
#ifdef CONFIG_OTA_HOUR
#define DEFAULT_OTA_HOUR CONFIG_OTA_HOUR
#else
#define DEFAULT_OTA_HOUR 10 // Hour of day (24h format) to enable OTA mode
#endif

#ifdef CONFIG_OTA_MINUTE
#define DEFAULT_OTA_MINUTE CONFIG_OTA_MINUTE
#else
#define DEFAULT_OTA_MINUTE 0 // Minute to enable OTA mode
#endif

#ifdef CONFIG_OTA_DURATION
#define DEFAULT_OTA_DURATION CONFIG_OTA_DURATION
#else
#define DEFAULT_OTA_DURATION 15 // Minutes to keep WiFi active for OTA
#endif

#ifdef CONFIG_OTA_SSID
#define OTA_SSID CONFIG_OTA_SSID
#else
#define OTA_SSID "Aiolos-Ota"
#endif

#ifdef CONFIG_OTA_PASSWORD
#define OTA_PASSWORD CONFIG_OTA_PASSWORD
#else
#define OTA_PASSWORD "password"
#endif

#ifdef CONFIG_OTA_MIN_BATTERY_VOLTAGE
#define OTA_MIN_BATTERY_VOLTAGE CONFIG_OTA_MIN_BATTERY_VOLTAGE
#else
#define OTA_MIN_BATTERY_VOLTAGE 3.6 // Minimum battery voltage for OTA updates
#endif

// Remote OTA activation
#define REMOTE_OTA_DURATION 15           // Minutes to keep WiFi active for remote-triggered OTA
#define REMOTE_OTA_FLAG_KEY "remote_ota" // Key for remote OTA flag in configuration

// Power management
#define LOW_BATTERY_THRESHOLD 3.4 // Volts

#ifdef CONFIG_SLEEP_START_HOUR
#define DEFAULT_SLEEP_START_HOUR CONFIG_SLEEP_START_HOUR
#else
#define DEFAULT_SLEEP_START_HOUR 22 // Hour to enter sleep (24h format)
#endif

#ifdef CONFIG_SLEEP_END_HOUR
#define DEFAULT_SLEEP_END_HOUR CONFIG_SLEEP_END_HOUR
#else
#define DEFAULT_SLEEP_END_HOUR 9 // Hour to wake from sleep (24h format)
#endif

#ifdef CONFIG_RESTART_INTERVAL
#define DEFAULT_RESTART_INTERVAL CONFIG_RESTART_INTERVAL
#else
#define DEFAULT_RESTART_INTERVAL 21600 // Seconds between automatic restarts (6 hours)
#endif

// Default sensor and update intervals (in milliseconds)
#define DEFAULT_TEMP_INTERVAL 300000          // Default temperature reading interval (ms) - 5 minutes
#define DEFAULT_WIND_INTERVAL 1000            // Default wind reading interval (ms) - 1 second
#define DEFAULT_DIAG_INTERVAL 300000          // Default diagnostics interval (ms) - 5 minutes
#define DEFAULT_TIME_UPDATE_INTERVAL 3600000  // Default time sync interval (ms) - 1 hour
#define DEFAULT_CONFIG_UPDATE_INTERVAL 300000 // Default remote configuration update interval (ms) - 5 minutes

// Wind sensor specific settings
#define WIND_AVERAGING_SAMPLE_INTERVAL_MS 10000 // (10s) Interval for samples within a larger averaging period

// Watchdog settings
#define WDT_TIMEOUT 120000 // Watchdog timeout in ms (120 seconds), was 30000
// Define this to enable temporary watchdog disabling during modem operations
#define DISABLE_WDT_FOR_MODEM

// Device identification
#ifdef CONFIG_DEVICE_ID
#define DEVICE_ID CONFIG_DEVICE_ID
#else
#define DEVICE_ID "Aiolos"
#endif
#define FIRMWARE_VERSION "2.0.0"

// Server settings
#ifdef CONFIG_SERVER_HOST
#define SERVER_ADDRESS CONFIG_SERVER_HOST
#else
#define SERVER_ADDRESS "aiolos.resonect.cz"
#endif

#ifdef CONFIG_SERVER_PORT
#define SERVER_PORT (uint16_t)CONFIG_SERVER_PORT
#else
#define SERVER_PORT (uint16_t)80
#endif
