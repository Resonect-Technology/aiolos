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
#define ANEMOMETER_PIN 14  // GPIO14 for anemometer (matched with old code)
#define WIND_VANE_PIN 2    // GPIO2 for wind vane (ADC2_CH2) (matched with old code)
#define TEMP_BUS_INT 13    // OneWire bus for internal temperature sensor
#define TEMP_BUS_EXT 15    // OneWire bus for external temperature sensor
#define ADC_BATTERY_PIN 35 // ADC pin for battery voltage
#define ADC_SOLAR_PIN 36   // ADC pin for solar panel voltage

// Network settings
#ifdef CONFIG_APN
#define APN CONFIG_APN
#else
#define APN "simbase"
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

// OTA settings
#ifdef CONFIG_OTA_HOUR
#define OTA_HOUR CONFIG_OTA_HOUR
#else
#define OTA_HOUR 10 // Hour of day (24h format) to enable OTA mode
#endif

#ifdef CONFIG_OTA_DURATION
#define OTA_DURATION CONFIG_OTA_DURATION
#else
#define OTA_DURATION 15 // Minutes to keep WiFi active for OTA
#endif

#ifdef CONFIG_OTA_SSID
#define OTA_SSID CONFIG_OTA_SSID
#else
#define OTA_SSID "Aiolos-Weather-OTA"
#endif

#ifdef CONFIG_OTA_PASSWORD
#define OTA_PASSWORD CONFIG_OTA_PASSWORD
#else
#define OTA_PASSWORD "weather-update"
#endif

// Power management
#define LOW_BATTERY_THRESHOLD 3.4 // Volts

#ifdef CONFIG_SLEEP_START_HOUR
#define SLEEP_START_HOUR CONFIG_SLEEP_START_HOUR
#else
#define SLEEP_START_HOUR 22 // Hour to enter sleep (24h format)
#endif

#ifdef CONFIG_SLEEP_END_HOUR
#define SLEEP_END_HOUR CONFIG_SLEEP_END_HOUR
#else
#define SLEEP_END_HOUR 9 // Hour to wake from sleep (24h format)
#endif

#define RESTART_INTERVAL 21600 // Seconds between automatic restarts (6 hours)

// Sensor timing
#define TEMP_INTERVAL 300000        // Temperature reading interval (ms) - 5 minutes
#define WIND_INTERVAL 1000          // Wind reading interval (ms) - 1 second
#define DIAG_INTERVAL 300000        // Diagnostics interval (ms) - 5 minutes
#define TIME_UPDATE_INTERVAL 300000 // Time sync interval (ms) - 5 minutes

// Watchdog settings
#define WDT_TIMEOUT 30000 // Watchdog timeout in ms (30 seconds)
// Define this to enable temporary watchdog disabling during modem operations
#define DISABLE_WDT_FOR_MODEM

// Device identification
#ifdef CONFIG_DEVICE_ID
#define DEVICE_ID CONFIG_DEVICE_ID
#else
#define DEVICE_ID "Aiolos-Vasiliki"
#endif
#define FIRMWARE_VERSION "2.0.0"

// Server settings
#ifdef CONFIG_SERVER_HOST
#define SERVER_HOST CONFIG_SERVER_HOST
#else
#define SERVER_HOST "3.79.164.51"
#endif

#ifdef CONFIG_SERVER_PORT
#define SERVER_PORT CONFIG_SERVER_PORT
#else
#define SERVER_PORT 80
#endif
