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
bool HttpClient::sendDiagnostics(const char *stationId, float batteryVoltage, float solarVoltage, float internalTemp, int signalQuality, unsigned long uptime)
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
    char jsonBuffer[320];
    snprintf(jsonBuffer, sizeof(jsonBuffer),
             "{\"battery_voltage\":%.2f,\"solar_voltage\":%.2f,\"internal_temperature\":%.2f,\"signal_quality\":%d,\"uptime\":%lu}",
             batteryVoltage, solarVoltage, internalTemp, signalQuality, uptime);

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

/**
 * @brief Fetch configuration from the server
 */
bool HttpClient::fetchConfiguration(const char *stationId, unsigned long *tempInterval, unsigned long *windInterval,
                                    unsigned long *diagInterval, unsigned long *timeInterval,
                                    unsigned long *restartInterval, int *sleepStartHour, int *sleepEndHour)
{
    if (!_modemManager || !_client)
    {
        Logger.error(LOG_TAG_HTTP, "HTTP client not initialized");
        return false;
    }

    if (!_modemManager->isNetworkConnected() || !_modemManager->isGprsConnected())
    {
        Logger.error(LOG_TAG_HTTP, "Network not connected, cannot fetch configuration");
        return false;
    }

    Logger.info(LOG_TAG_HTTP, "Fetching configuration for station %s", stationId);

    // Build the URL path with the station ID
    char urlPath[64];
    snprintf(urlPath, sizeof(urlPath), "/stations/%s/config", stationId);

    // Connect to server
    Logger.debug(LOG_TAG_HTTP, "Connecting to %s:%d", _serverHost, _serverPort);
    if (!_client->connect(_serverHost, _serverPort))
    {
        Logger.error(LOG_TAG_HTTP, "Failed to connect to server");
        return false;
    }

    // Send HTTP GET request
    Logger.debug(LOG_TAG_HTTP, "Sending GET request to %s", urlPath);
    _client->print(F("GET "));
    _client->print(urlPath);
    _client->println(F(" HTTP/1.1"));

    // Request headers
    _client->print(F("Host: "));
    _client->println(_serverHost);
    _client->println(F("User-Agent: AiolosWeatherStation/1.0"));
    _client->println(F("Accept: application/json"));
    _client->println(F("Connection: close"));
    _client->println();

    // Wait for server response with timeout
    unsigned long timeout = millis();
    String responseBody = "";
    bool inBody = false;

    while (_client->connected() && millis() - timeout < 10000L)
    {
        // Wait for data to be available
        while (_client->available())
        {
            char c = _client->read();

            // Start collecting the body after headers (marked by an empty line)
            if (c == '\n' && !inBody)
            {
                if (_client->peek() == '\r')
                {
                    _client->read(); // consume the \r
                    if (_client->peek() == '\n')
                    {
                        _client->read(); // consume the \n
                        inBody = true;
                        Logger.debug(LOG_TAG_HTTP, "Found response body");
                    }
                }
            }
            else if (inBody)
            {
                responseBody += c;
            }

            timeout = millis();
        }
    }

    // Read and process response
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

    if (success && responseBody.length() > 0)
    {
        Logger.info(LOG_TAG_HTTP, "Configuration data received: %s", responseBody.c_str());

        // Very basic JSON parsing - this could be improved with ArduinoJson library
        // Looking for keys like "temp_interval", "wind_interval", "diag_interval"
        if (responseBody.indexOf("temp_interval") >= 0)
        {
            int startPos = responseBody.indexOf("temp_interval") + 15; // Length of "temp_interval" + 2 for ": "
            int endPos = responseBody.indexOf(",", startPos);
            if (endPos < 0)
                endPos = responseBody.indexOf("}", startPos);
            if (endPos > startPos)
            {
                String valueStr = responseBody.substring(startPos, endPos);
                valueStr.trim();
                *tempInterval = valueStr.toInt();
                Logger.info(LOG_TAG_HTTP, "Parsed temp_interval: %lu", *tempInterval);
            }
        }

        if (responseBody.indexOf("wind_interval") >= 0)
        {
            int startPos = responseBody.indexOf("wind_interval") + 15; // Length of "wind_interval" + 2 for ": "
            int endPos = responseBody.indexOf(",", startPos);
            if (endPos < 0)
                endPos = responseBody.indexOf("}", startPos);
            if (endPos > startPos)
            {
                String valueStr = responseBody.substring(startPos, endPos);
                valueStr.trim();
                *windInterval = valueStr.toInt();
                Logger.info(LOG_TAG_HTTP, "Parsed wind_interval: %lu", *windInterval);
            }
        }

        if (responseBody.indexOf("diag_interval") >= 0)
        {
            int startPos = responseBody.indexOf("diag_interval") + 15; // Length of "diag_interval" + 2 for ": "
            int endPos = responseBody.indexOf(",", startPos);
            if (endPos < 0)
                endPos = responseBody.indexOf("}", startPos);
            if (endPos > startPos)
            {
                String valueStr = responseBody.substring(startPos, endPos);
                valueStr.trim();
                *diagInterval = valueStr.toInt();
                Logger.info(LOG_TAG_HTTP, "Parsed diag_interval: %lu", *diagInterval);
            }
        }

        // Parse time_interval if pointer is provided
        if (timeInterval && responseBody.indexOf("time_interval") >= 0)
        {
            int startPos = responseBody.indexOf("time_interval") + 15; // Length of "time_interval" + 2 for ": "
            int endPos = responseBody.indexOf(",", startPos);
            if (endPos < 0)
                endPos = responseBody.indexOf("}", startPos);
            if (endPos > startPos)
            {
                String valueStr = responseBody.substring(startPos, endPos);
                valueStr.trim();
                *timeInterval = valueStr.toInt();
                Logger.info(LOG_TAG_HTTP, "Parsed time_interval: %lu", *timeInterval);
            }
        }

        // Parse restart_interval if pointer is provided
        if (restartInterval && responseBody.indexOf("restart_interval") >= 0)
        {
            int startPos = responseBody.indexOf("restart_interval") + 18; // Length of "restart_interval" + 2 for ": "
            int endPos = responseBody.indexOf(",", startPos);
            if (endPos < 0)
                endPos = responseBody.indexOf("}", startPos);
            if (endPos > startPos)
            {
                String valueStr = responseBody.substring(startPos, endPos);
                valueStr.trim();
                *restartInterval = valueStr.toInt();
                Logger.info(LOG_TAG_HTTP, "Parsed restart_interval: %lu", *restartInterval);
            }
        }

        // Parse sleep_start_hour if pointer is provided
        if (sleepStartHour && responseBody.indexOf("sleep_start_hour") >= 0)
        {
            int startPos = responseBody.indexOf("sleep_start_hour") + 18; // Length of "sleep_start_hour" + 2 for ": "
            int endPos = responseBody.indexOf(",", startPos);
            if (endPos < 0)
                endPos = responseBody.indexOf("}", startPos);
            if (endPos > startPos)
            {
                String valueStr = responseBody.substring(startPos, endPos);
                valueStr.trim();
                *sleepStartHour = valueStr.toInt();
                Logger.info(LOG_TAG_HTTP, "Parsed sleep_start_hour: %d", *sleepStartHour);
            }
        }

        // Parse sleep_end_hour if pointer is provided
        if (sleepEndHour && responseBody.indexOf("sleep_end_hour") >= 0)
        {
            int startPos = responseBody.indexOf("sleep_end_hour") + 16; // Length of "sleep_end_hour" + 2 for ": "
            int endPos = responseBody.indexOf(",", startPos);
            if (endPos < 0)
                endPos = responseBody.indexOf("}", startPos);
            if (endPos > startPos)
            {
                String valueStr = responseBody.substring(startPos, endPos);
                valueStr.trim();
                *sleepEndHour = valueStr.toInt();
                Logger.info(LOG_TAG_HTTP, "Parsed sleep_end_hour: %d", *sleepEndHour);
            }
        }

        return true;
    }
    else
    {
        Logger.error(LOG_TAG_HTTP, "Failed to fetch configuration, status code: %d", statusCode);
        return false;
    }
}
