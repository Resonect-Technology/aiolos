/**
 * @file DiagnosticsManager.h
 * @brief Manages system diagnostics collection and reporting
 *
 * Collects diagnostics data such as battery voltage, solar voltage,
 * signal quality, and system uptime, and sends it to the server.
 */

#pragma once

#include <Arduino.h>
#include "ModemManager.h"
#include "HttpClient.h"
#include "Logger.h"
#include "../utils/BatteryUtils.h"
#include "../utils/TemperatureSensor.h"

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
    bool init(ModemManager &modemManager, HttpClient &httpClient, unsigned long interval = 300000);

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
     * @return float Temperature in Celsius
     */
    float readInternalTemperature();

    /**
     * @brief Read the external temperature sensor
     *
     * @return float Temperature in Celsius
     */
    float readExternalTemperature();

private:
    ModemManager *_modemManager = nullptr;
    HttpClient *_httpClient = nullptr;
    bool _initialized = false;
    unsigned long _interval = 300000; // Default interval is 5 minutes
    TemperatureSensor _internalTempSensor;
    TemperatureSensor _externalTempSensor;

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
};

extern DiagnosticsManager diagnosticsManager;
