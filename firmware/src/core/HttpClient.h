/**
 * @file HttpClient.h
 * @brief HTTP client for sending data to the Aiolos backend
 *
 * This class implements a simple HTTP client that can send JSON data
 * to the Aiolos backend server using the SIM7000G cellular modem.
 * Implementation is based on the TinyGSM HttpClient example.
 */

#pragma once

// These defines should go before including TinyGSM
#define TINY_GSM_MODEM_SIM7000
#define TINY_GSM_USE_GPRS true
#define TINY_GSM_USE_WIFI false

#include <Arduino.h>
#include <TinyGsmClient.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>
#include "../config/Config.h"
#include "ModemManager.h"

class AiolosHttpClient
{
public:
    /**
     * @brief Construct a new AiolosHttpClient object
     *
     * @param modemManager Reference to the ModemManager instance
     */
    AiolosHttpClient(ModemManager &modemManager);

    /**
     * @brief Initialize the HTTP client
     * This must be called after the modem is initialized and connected
     *
     * @return true if initialization was successful
     * @return false if initialization failed
     */
    bool init();

    /**
     * @brief Send diagnostics data to the backend
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
    TinyGsm *_modem;
    TinyGsmClient *_client;
    HttpClient *_http;
    bool _initialized;

    // Server details extracted from API_BASE_URL
    String _host;
    int _port;

    /**
     * @brief Send a POST request with JSON data
     *
     * @param endpoint API endpoint to send the request to
     * @param jsonDoc JSON document to send
     * @return true if request was successful
     * @return false if request failed
     */
    template <typename T>
    bool sendPostRequest(const String &endpoint, const T &jsonDoc);
};

// Global instance
extern AiolosHttpClient httpClient;
