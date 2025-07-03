/**
 * @file HttpClient.cpp
 * @brief Implementation of the HTTP client for the Aiolos Weather Station
 */

#include "HttpClient.h"
#include "Logger.h"
#include <ArduinoJson.h> // Use ArduinoJson for robust parsing

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
                                    unsigned long *restartInterval, int *sleepStartHour, int *sleepEndHour,
                                    int *otaHour, int *otaMinute, int *otaDuration, bool *remoteOta)
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
    String response = "";
    int statusCode = 0;
    bool success = false;

    while (_client->connected() && millis() - timeout < 10000L)
    {
        // Wait for data to be available
        while (_client->available())
        {
            char c = _client->read();
            response += c;
            timeout = millis();
        }
    }

    // Parse status code from response
    if (response.indexOf("HTTP/1.1 ") >= 0)
    {
        int statusStart = response.indexOf("HTTP/1.1 ") + 9;
        statusCode = response.substring(statusStart, statusStart + 3).toInt();
        Logger.debug(LOG_TAG_HTTP, "HTTP response status code: %d", statusCode);

        // Check if status code indicates success (2xx)
        success = (statusCode >= 200 && statusCode < 300);
    }

    // Extract response body (after headers)
    String responseBody = "";
    int bodyStart = response.indexOf("\r\n\r\n");
    if (bodyStart >= 0)
    {
        responseBody = response.substring(bodyStart + 4);
    }

    // Close connection
    _client->stop();
    Logger.debug(LOG_TAG_HTTP, "Connection closed");

    if (success && responseBody.length() > 0)
    {
        Logger.info(LOG_TAG_HTTP, "Configuration data received: %s", responseBody.c_str());

        // Use ArduinoJson for robust parsing
        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, responseBody);

        if (error)
        {
            Logger.error(LOG_TAG_HTTP, "Failed to parse JSON configuration: %s", error.c_str());
            return false;
        }

        // Safely extract values using the parsed JSON document
        // Use .is<T>() to check for existence and correct type
        if (!doc["temp_interval"].isNull())
        {
            *tempInterval = doc["temp_interval"].as<unsigned long>();
            Logger.info(LOG_TAG_HTTP, "Parsed temp_interval: %lu", *tempInterval);
        }

        if (!doc["wind_interval"].isNull())
        {
            *windInterval = doc["wind_interval"].as<unsigned long>();
            Logger.info(LOG_TAG_HTTP, "Parsed wind_interval: %lu", *windInterval);
        }

        if (!doc["diag_interval"].isNull())
        {
            *diagInterval = doc["diag_interval"].as<unsigned long>();
            Logger.info(LOG_TAG_HTTP, "Parsed diag_interval: %lu", *diagInterval);
        }

        if (timeInterval && !doc["time_interval"].isNull())
        {
            *timeInterval = doc["time_interval"].as<unsigned long>();
            Logger.info(LOG_TAG_HTTP, "Parsed time_interval: %lu", *timeInterval);
        }

        if (restartInterval && !doc["restart_interval"].isNull())
        {
            *restartInterval = doc["restart_interval"].as<unsigned long>();
            Logger.info(LOG_TAG_HTTP, "Parsed restart_interval: %lu", *restartInterval);
        }

        if (sleepStartHour && !doc["sleep_start_hour"].isNull())
        {
            *sleepStartHour = doc["sleep_start_hour"].as<int>();
            Logger.info(LOG_TAG_HTTP, "Parsed sleep_start_hour: %d", *sleepStartHour);
        }

        if (sleepEndHour && !doc["sleep_end_hour"].isNull())
        {
            *sleepEndHour = doc["sleep_end_hour"].as<int>();
            Logger.info(LOG_TAG_HTTP, "Parsed sleep_end_hour: %d", *sleepEndHour);
        }

        if (otaHour && !doc["ota_hour"].isNull())
        {
            *otaHour = doc["ota_hour"].as<int>();
            Logger.info(LOG_TAG_HTTP, "Parsed ota_hour: %d", *otaHour);
        }

        if (otaMinute && !doc["ota_minute"].isNull())
        {
            *otaMinute = doc["ota_minute"].as<int>();
            Logger.info(LOG_TAG_HTTP, "Parsed ota_minute: %d", *otaMinute);
        }

        if (otaDuration && !doc["ota_duration"].isNull())
        {
            *otaDuration = doc["ota_duration"].as<int>();
            Logger.info(LOG_TAG_HTTP, "Parsed ota_duration: %d", *otaDuration);
        }

        if (remoteOta && !doc["remote_ota"].isNull())
        {
            *remoteOta = doc["remote_ota"].as<bool>();
            Logger.info(LOG_TAG_HTTP, "Parsed remote_ota: %s", *remoteOta ? "true" : "false");
        }

        return true;
    }
    else
    {
        Logger.error(LOG_TAG_HTTP, "Failed to fetch configuration, status code: %d", statusCode);
        return false;
    }
}

/**
 * @brief Send wind data to the server
 */
bool HttpClient::sendWindData(const char *stationId, float windSpeed, float windDirection)
{
    if (!_modemManager || !_client)
    {
        Logger.error(LOG_TAG_HTTP, "HTTP client not initialized");
        return false;
    }

    if (!_modemManager->isNetworkConnected() || !_modemManager->isGprsConnected())
    {
        Logger.error(LOG_TAG_HTTP, "Network not connected, cannot send wind data");
        return false;
    }

    Logger.info(LOG_TAG_HTTP, "Sending wind data for station %s", stationId);

    // Create JSON payload with wind data
    char jsonBuffer[128];
    snprintf(jsonBuffer, sizeof(jsonBuffer),
             "{\"wind_speed\":%.2f,\"wind_direction\":%.1f}",
             windSpeed, windDirection);

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
    snprintf(urlPath, sizeof(urlPath), "/stations/%s/wind", stationId);

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
    String response = "";

    while (_client->connected() && millis() - timeout < 10000L)
    {
        // Wait for data to be available
        while (_client->available())
        {
            char c = _client->read();
            response += c;
            timeout = millis();
        }
    }

    // Parse status code from response
    int statusCode = 0;
    bool success = false;

    if (response.indexOf("HTTP/1.1 ") >= 0)
    {
        int statusStart = response.indexOf("HTTP/1.1 ") + 9;
        statusCode = response.substring(statusStart, statusStart + 3).toInt();
        Logger.debug(LOG_TAG_HTTP, "HTTP response status code: %d", statusCode);

        // Check if status code indicates success (2xx)
        success = (statusCode >= 200 && statusCode < 300);
    }

    // Close connection
    _client->stop();
    Logger.debug(LOG_TAG_HTTP, "Connection closed");

    if (success)
    {
        Logger.info(LOG_TAG_HTTP, "Wind data sent successfully");
        return true;
    }
    else
    {
        Logger.error(LOG_TAG_HTTP, "Failed to send wind data, status code: %d", statusCode);
        return false;
    }
}

/**
 * @brief Send temperature data to the server
 */
bool HttpClient::sendTemperatureData(const char *stationId, float internalTemp, float externalTemp)
{
    if (!_modemManager || !_client)
    {
        Logger.error(LOG_TAG_HTTP, "HTTP client not initialized");
        return false;
    }

    if (!_modemManager->isNetworkConnected() || !_modemManager->isGprsConnected())
    {
        Logger.error(LOG_TAG_HTTP, "Network not connected, cannot send temperature data");
        return false;
    }

    Logger.info(LOG_TAG_HTTP, "Sending temperature data for station %s", stationId);

    // Create JSON payload with only external temperature data (internal temp is sent in diagnostics)
    char jsonBuffer[256];
    snprintf(jsonBuffer, sizeof(jsonBuffer),
             "{\"temperature\":%.2f}",
             externalTemp);

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
    snprintf(urlPath, sizeof(urlPath), "/stations/%s/temperature", stationId);

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
            timeout = millis();
        }
    }

    // Parse status code from response
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
        Logger.info(LOG_TAG_HTTP, "Temperature data sent successfully");
        return true;
    }
    else
    {
        Logger.error(LOG_TAG_HTTP, "Failed to send temperature data, status code: %d", statusCode);
        return false;
    }
}
