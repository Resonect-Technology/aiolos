/**
 * @file DiagnosticsManager.h
 * @brief Manages system diagnostics collection and reporting
 *
 * Collects diagnostics data such as battery voltage, solar voltage,
 * signal quality, and system uptime, and sends it to the server.
 *
 * IMPORTANT: This class creates its own temperature sensor instances.
 * To avoid conflicts with main loop temperature sensors, use the
 * shared temperature reading methods or refactor to use dependency injection.
 */

#pragma once

#include <Arduino.h>
#include "ModemManager.h"
#include "utils/TemperatureSensor.h"
#include "utils/BatteryUtils.h"
#include "core/AiolosHttpClient.h" // Use the new HTTP client

// Forward declarations
class ModemManager;

class DiagnosticsManager
{
public:
    /**
     * @brief Initialize the DiagnosticsManager
     *
     * @param modemManager Reference to the ModemManager instance
     * @param httpClient Reference to the HttpClient instance
     * @param interval Initial sending interval in milliseconds
     * @return true if initialization successful
     * @return false if initialization failed
     */
    bool init(ModemManager &modemManager, AiolosHttpClient &httpClient, unsigned long interval = 300000);

    /**
     * @brief Send current diagnostics data to the server
     *
     * Collects and sends system diagnostics data including battery voltage,
     * solar voltage, signal quality, internal temperature, and uptime.
     *
     * @return true if successful
     * @return false if failed
     */
    bool sendDiagnostics();

    /**
     * @brief Send diagnostics with external temperature readings
     *
     * This version accepts external temperature readings to avoid sensor conflicts.
     * Use this when temperature sensors are managed elsewhere in the system.
     *
     * @param internalTemp Internal temperature in Celsius (use -127.0 if unavailable)
     * @param externalTemp External temperature in Celsius (use -127.0 if unavailable)
     * @return true if successful
     * @return false if failed
     */
    bool sendDiagnostics(float internalTemp, float externalTemp);

    /**
     * @brief Set the diagnostics sending interval
     *
     * @param interval New interval in milliseconds
     */
    void setInterval(unsigned long interval);

    /**
     * @brief Get the current diagnostics sending interval
     *
     * @return unsigned long Current interval in milliseconds
     */
    unsigned long getInterval() const { return _interval; }

    /**
     * @brief Read the internal temperature sensor
     *
     * WARNING: This creates a separate temperature sensor instance.
     * Use with caution if other parts of the system also read temperature.
     *
     * @return float Temperature in Celsius
     */
    float readInternalTemperature();

    /**
     * @brief Read the external temperature sensor
     *
     * WARNING: This creates a separate temperature sensor instance.
     * Use with caution if other parts of the system also read temperature.
     *
     * @return float Temperature in Celsius
     */
    float readExternalTemperature();

    /**
     * @brief Get system uptime in seconds
     *
     * @return unsigned long Uptime in seconds
     */
    unsigned long getSystemUptime() const;

    /**
     * @brief Check if initialization was successful
     *
     * @return true if initialized
     * @return false if not initialized
     */
    bool isInitialized() const { return _initialized; }

private:
    ModemManager *_modemManager = nullptr;
    AiolosHttpClient *_httpClient = nullptr;
    unsigned long _interval = 0;
    bool _initialized = false;
    TemperatureSensor _internalTempSensor;
    TemperatureSensor _externalTempSensor;
    bool _internalTempAvailable = false;
    bool _externalTempAvailable = false;

    // Solar voltage calibration - can be updated via remote config
    float _solarVoltageCalibration = 2.0f;

    /**
     * @brief Read the battery voltage from ADC
     *
     * @return float Battery voltage in volts
     */
    float readBatteryVoltage();

    /**
     * @brief Read the solar panel voltage from ADC
     *
     * @return float Solar panel voltage in volts
     */
    float readSolarVoltage();

    /**
     * @brief Configure ADC for solar voltage reading
     *
     * Only configures if not already configured to avoid repeated calls.
     */
    void configureSolarAdc();

    /**
     * @brief Internal method to send diagnostics data
     *
     * @param internalTemp Internal temperature in Celsius
     * @param externalTemp External temperature in Celsius
     * @return true if successful
     * @return false if failed
     */
    bool sendDiagnosticsInternal(float internalTemp, float externalTemp);
};

extern DiagnosticsManager diagnosticsManager;
