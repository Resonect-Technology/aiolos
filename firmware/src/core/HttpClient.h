/**
 * @file HttpClient.h
 * @brief Handles HTTP requests to the server
 *
 * Provides functionality to send sensor readings and diagnostics
 * data to the Aiolos backend server.
 */

#pragma once

#include <Arduino.h>
#include "ModemManager.h"
#include "../config/Config.h"

class HttpClient
{
public:
    /**
     * @brief Initialize the HTTP client
     *
     * @param modemManager Reference to the ModemManager instance
     * @return true if initialization successful
     * @return false if initialization failed
     */
    bool init(ModemManager &modemManager);

    /**
     * @brief Send diagnostics data to the server
     *
     * @param stationId Station identifier
     * @param batteryVoltage Battery voltage in volts
     * @param solarVoltage Solar panel voltage in volts
     * @param internalTemp Internal temperature in Celsius
     * @param signalQuality Signal quality in dBm
     * @param uptime System uptime in seconds
     * @return true if successful
     * @return false if failed
     */
    bool sendDiagnostics(const char *stationId, float batteryVoltage, float solarVoltage, float internalTemp, int signalQuality, unsigned long uptime);

    /**
     * @brief Send wind data to the server
     *
     * @param stationId Station identifier
     * @param windSpeed Wind speed in m/s
     * @param windDirection Wind direction in degrees (0-360)
     * @return true if successful
     * @return false if failed
     */
    bool sendWindData(const char *stationId, float windSpeed, float windDirection);

    /**
     * @brief Fetch configuration from the server
     *
     * @param stationId Station identifier
     * @param tempInterval Pointer to store retrieved temperature interval
     * @param windInterval Pointer to store retrieved wind interval
     * @param diagInterval Pointer to store retrieved diagnostics interval
     * @param timeInterval Pointer to store retrieved time sync interval
     * @param restartInterval Pointer to store retrieved restart interval
     * @param sleepStartHour Pointer to store retrieved sleep start hour
     * @param sleepEndHour Pointer to store retrieved sleep end hour
     * @param otaHour Pointer to store retrieved OTA hour
     * @param otaMinute Pointer to store retrieved OTA minute
     * @param otaDuration Pointer to store retrieved OTA duration in minutes
     * @param remoteOta Pointer to store retrieved remote OTA flag
     * @return true if successful
     * @return false if failed
     */
    bool fetchConfiguration(const char *stationId, unsigned long *tempInterval, unsigned long *windInterval,
                            unsigned long *diagInterval, unsigned long *timeInterval = nullptr,
                            unsigned long *restartInterval = nullptr, int *sleepStartHour = nullptr,
                            int *sleepEndHour = nullptr, int *otaHour = nullptr,
                            int *otaMinute = nullptr, int *otaDuration = nullptr, bool *remoteOta = nullptr);

    /**
     * @brief Send temperature data to the server
     *
     * @param stationId Station identifier
     * @param internalTemp Internal temperature in Celsius (kept for backward compatibility)
     * @param externalTemp External temperature in Celsius
     * @return true if successful
     * @return false if failed
     */
    bool sendTemperatureData(const char *stationId, float internalTemp, float externalTemp);

    // Remote OTA flag is now handled through the fetchConfiguration method

private:
    ModemManager *_modemManager = nullptr;
    TinyGsmClient *_client = nullptr;
    const char *_serverHost = SERVER_HOST; // Server hostname from Config.h
    int _serverPort = SERVER_PORT;         // Server port from Config.h
};

extern HttpClient httpClient;
