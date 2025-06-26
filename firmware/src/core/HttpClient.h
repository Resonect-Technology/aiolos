/**
 * @file HttpClient.h
 * @brief HTTP client for sending data to the Aiolos backend
 *
 * This class implements a simple HTTP client that can send JSON data
 * to the Aiolos backend server using the SIM7000G cellular modem.
 */

#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include "../config/Config.h"

// Forward declarations
class ModemManager;
class TinyGsmClient;

class HttpClient
{
public:
    /**
     * @brief Construct a new HttpClient object
     *
     * @param modemManager Reference to the ModemManager instance
     */
    HttpClient(ModemManager &modemManager);

    /**
     * @brief Send a diagnostics message to the backend
     *
     * @param batteryVoltage Current battery voltage
     * @param solarVoltage Current solar panel voltage
     * @param signalQuality Cellular signal quality in dBm
     * @param temperature Optional temperature reading
     * @param errors Array of error messages (optional)
     * @return true if the message was sent successfully
     * @return false if sending failed
     */
    bool sendDiagnostics(
        float batteryVoltage,
        float solarVoltage,
        int signalQuality,
        float temperature = 0.0f,
        const String &errors = "");

    /**
     * @brief Send wind data to the backend
     *
     * @param windSpeed Wind speed in m/s
     * @param windDirection Wind direction in degrees (0-359)
     * @return true if the message was sent successfully
     * @return false if sending failed
     */
    bool sendWindData(float windSpeed, int windDirection);

    /**
     * @brief Send temperature data to the backend
     *
     * @param temperature Temperature in degrees Celsius
     * @param sensorId Identifier for the temperature sensor (e.g., "internal" or "external")
     * @return true if the message was sent successfully
     * @return false if sending failed
     */
    bool sendTemperatureData(float temperature, const String &sensorId);

private:
    ModemManager &_modemManager;
    TinyGsmClient *_client;

    /**
     * @brief Send an HTTP POST request with JSON data
     *
     * @param endpoint The API endpoint to send the request to
     * @param jsonDoc The JSON document to send
     * @return true if the request was successful
     * @return false if the request failed
     */
    bool sendHttpPost(const String &endpoint, const JsonVariant &jsonDoc);

    /**
     * @brief Check if we're connected and reconnect if necessary
     *
     * @return true if connected
     * @return false if connection failed
     */
    bool ensureConnected();
};

// Global instance
extern HttpClient httpClient;

// Global instance
extern HttpClient httpClient;
