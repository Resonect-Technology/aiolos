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

private:
    ModemManager *_modemManager = nullptr;
    TinyGsmClient *_client = nullptr;
    const char *_serverHost = SERVER_HOST; // Server hostname from Config.h
    int _serverPort = SERVER_PORT;         // Server port from Config.h
};

extern HttpClient httpClient;
