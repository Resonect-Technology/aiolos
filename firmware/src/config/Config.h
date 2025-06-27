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
#define LOG_LEVEL 3 // 0=NONE, 1=ERROR, 2=WARN, 3=INFO, 4=DEBUG, 5=VERBOSE

// Board pins
#define PIN_DTR 25
#define PIN_TX 27
#define PIN_RX 26
#define PWR_PIN 4
#define LED_PIN 12
#define ANEMOMETER_PIN 14  // Interrupt pin for anemometer
#define WIND_VANE_PIN 2    // ADC pin for wind vane
#define TEMP_BUS_INT 13    // OneWire bus for internal temperature sensor
#define TEMP_BUS_EXT 15    // OneWire bus for external temperature sensor
#define ADC_BATTERY_PIN 35 // ADC pin for battery voltage
#define ADC_SOLAR_PIN 36   // ADC pin for solar panel voltage

// Network settings
#define APN "simbase"
#define GPRS_USER ""
#define GPRS_PASS ""
#define UART_BAUD 115200

// OTA settings
#define OTA_HOUR 10     // Hour of day (24h format) to enable OTA mode
#define OTA_DURATION 15 // Minutes to keep WiFi active for OTA
#define OTA_SSID "Aiolos-Weather-OTA"
#define OTA_PASSWORD "weather-update"

// Power management
#define LOW_BATTERY_THRESHOLD 3.4 // Volts
#define SLEEP_START_HOUR 22       // Hour to enter sleep (24h format)
#define SLEEP_END_HOUR 9          // Hour to wake from sleep (24h format)
#define RESTART_INTERVAL 21600    // Seconds between automatic restarts (6 hours)

// Sensor timing
#define TEMP_INTERVAL 300000        // Temperature reading interval (ms) - 5 minutes
#define WIND_INTERVAL 60000         // Wind reading interval (ms) - 1 minute
#define DIAG_INTERVAL 300000        // Diagnostics interval (ms) - 5 minutes
#define TIME_UPDATE_INTERVAL 300000 // Time sync interval (ms) - 5 minutes

// Watchdog settings
#define WDT_TIMEOUT 30000 // Watchdog timeout in ms (30 seconds)
// Define this to enable temporary watchdog disabling during modem operations
#define DISABLE_WDT_FOR_MODEM

// Device identification
#define DEVICE_ID "Aiolos-Vasiliki"
#define FIRMWARE_VERSION "2.0.0"
