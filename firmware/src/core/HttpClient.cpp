/**
 * @file HttpClient.cpp
 * @brief Implementation of the HTTP client for the Aiolos Weather Station
 */

#include "HttpClient.h"
#include "Logger.h"

#define LOG_TAG_HTTP "HTTP"

// Global instance
HttpClient httpClient;

/**
 * @brief Initialize the HTTP client
 */
bool HttpClient::init(ModemManager &modemManager)
{
    _modemManager = &modemManager;
    _client = _modemManager->getClient();

    if (!_client)
    {
        Logger.error(LOG_TAG_HTTP, "Failed to get TinyGSM client");
        return false;
    }

    Logger.info(LOG_TAG_HTTP, "HTTP client initialized");
    return true;
}

/**
 * @brief Send diagnostics data to the server
 */
bool HttpClient::sendDiagnostics(const char *stationId, float batteryVoltage, float solarVoltage, int signalQuality, unsigned long uptime)
{
    if (!_modemManager || !_client)
    {
        Logger.error(LOG_TAG_HTTP, "HTTP client not initialized");
        return false;
    }

    if (!_modemManager->isNetworkConnected() || !_modemManager->isGprsConnected())
    {
        Logger.error(LOG_TAG_HTTP, "Network not connected, cannot send diagnostics");
        return false;
    }

    Logger.info(LOG_TAG_HTTP, "Sending diagnostics data for station %s", stationId);

    // Create JSON payload with diagnostic data
    char jsonBuffer[256];
    snprintf(jsonBuffer, sizeof(jsonBuffer),
             "{\"battery_voltage\":%.2f,\"solar_voltage\":%.2f,\"signal_quality\":%d,\"uptime\":%lu}",
             batteryVoltage, solarVoltage, signalQuality, uptime);

    // Calculate content length
    size_t contentLength = strlen(jsonBuffer);

    // Connect to server
    Logger.debug(LOG_TAG_HTTP, "Connecting to %s:%d", _serverHost, _serverPort);
    if (!_client->connect(_serverHost, _serverPort))
    {
        Logger.error(LOG_TAG_HTTP, "Failed to connect to server");
        return false;
    }

    // Build the URL path with the station ID
    char urlPath[64];
    snprintf(urlPath, sizeof(urlPath), "/stations/%s/diagnostics", stationId);

    // Send HTTP POST request
    Logger.debug(LOG_TAG_HTTP, "Sending POST request to %s", urlPath);
    _client->print(F("POST "));
    _client->print(urlPath);
    _client->println(F(" HTTP/1.1"));

    // Request headers
    _client->print(F("Host: "));
    _client->println(_serverHost);
    _client->println(F("User-Agent: AiolosWeatherStation/1.0"));
    _client->println(F("Content-Type: application/json"));
    _client->print(F("Content-Length: "));
    _client->println(contentLength);
    _client->println(F("Connection: close"));
    _client->println();

    // Request body
    _client->println(jsonBuffer);

    // Wait for server response with timeout
    unsigned long timeout = millis();
    while (_client->connected() && millis() - timeout < 10000L)
    {
        // Wait for data to be available
        while (_client->available())
        {
            char c = _client->read();
            // For debugging, you could print each character
            // Serial.print(c);
            timeout = millis();
        }
    }

    // Read and process response (basic response handling)
    int statusCode = 0;
    bool success = false;

    if (_client->find("HTTP/1.1 "))
    {
        statusCode = _client->parseInt();
        Logger.debug(LOG_TAG_HTTP, "HTTP response status code: %d", statusCode);

        // Check if status code indicates success (2xx)
        success = (statusCode >= 200 && statusCode < 300);
    }

    // Close connection
    _client->stop();
    Logger.debug(LOG_TAG_HTTP, "Connection closed");

    if (success)
    {
        Logger.info(LOG_TAG_HTTP, "Diagnostics data sent successfully");
        return true;
    }
    else
    {
        Logger.error(LOG_TAG_HTTP, "Failed to send diagnostics data, status code: %d", statusCode);
        return false;
    }
}
