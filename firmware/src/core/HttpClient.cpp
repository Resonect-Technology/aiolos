/**
 * @file HttpClient.cpp
 * @brief Implementation of the HTTP client for the Aiolos Weather Station
 */

#include "HttpClient.h"
#include "Logger.h"
#include <ArduinoJson.h> // Use ArduinoJson for robust parsing
#include "esp_task_wdt.h"
#include <vector>

#define LOG_TAG_HTTP "HTTP"

// Global instance
HttpClient httpClient;

// --- Backoff Mechanism Implementation ---

/**
 * @brief Handles the logic for a failed HTTP request, incrementing the backoff timer.
 */
void HttpClient::_handleHttpFailure()
{
    _lastAttemptTime = millis();
    if (_failedAttempts < 255)
    { // Prevent overflow
        _failedAttempts++;
    }

    // Exponential backoff: 5s, 10s, 20s, 40s, ... up to the max
    // Use 1UL to ensure unsigned long math, cap shift to avoid huge numbers quickly
    _backoffDelay = BASE_BACKOFF_DELAY_MS * (1UL << min(_failedAttempts - 1, 10));

    if (_backoffDelay > MAX_BACKOFF_DELAY_MS)
    {
        _backoffDelay = MAX_BACKOFF_DELAY_MS;
    }

    Logger.warn(LOG_TAG_HTTP, "HTTP request failed. Attempt #%u. Backing off for %lu ms.", _failedAttempts, _backoffDelay);
}

/**
 * @brief Resets the backoff state after a successful request.
 */
void HttpClient::_resetBackoff()
{
    if (_failedAttempts > 0)
    {
        Logger.info(LOG_TAG_HTTP, "HTTP request successful. Resetting backoff.");
        _failedAttempts = 0;
        _backoffDelay = 0;
    }
}

/**
 * @brief Checks if the HTTP client is currently in a backoff period.
 */
bool HttpClient::isConnectionThrottled()
{
    if (_failedAttempts == 0)
    {
        return false; // No failures, not throttled
    }

    unsigned long elapsedTime = millis() - _lastAttemptTime;
    if (elapsedTime < _backoffDelay)
    {
        // To avoid spamming the log, we could log this less frequently,
        // but for now, this is useful for debugging.
        Logger.debug(LOG_TAG_HTTP, "Connection is throttled. Time remaining: %lu ms", _backoffDelay - elapsedTime);
        return true;
    }

    return false;
}

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
    if (!_client->connect(_serverHost, _serverPort, 15000L)) // 15-second timeout
    {
        Logger.error(LOG_TAG_HTTP, "Failed to connect to server");
        return false;
    }

    // Build the URL path with the station ID
    char urlPath[64];
    snprintf(urlPath, sizeof(urlPath), "/api/stations/%s/diagnostics", stationId);

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
    _client->println(F("Connection: keep-alive"));
    _client->println();

    // Request body
    _client->println(jsonBuffer);

    // Wait for server response with timeout
    unsigned long timeout = millis();
    while (_client->connected() && millis() - timeout < 15000L)
    {
        esp_task_wdt_reset(); // Reset watchdog
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

    // Close connection only if the request failed, to allow for keep-alive
    if (!success)
    {
        _client->stop();
        Logger.debug(LOG_TAG_HTTP, "Connection closed due to error");
    }

    if (success)
    {
        _resetBackoff(); // Success, reset backoff
        Logger.info(LOG_TAG_HTTP, "Diagnostics data sent successfully");
        return true;
    }
    else
    {
        _handleHttpFailure(); // Failure, trigger backoff
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
    snprintf(urlPath, sizeof(urlPath), "/api/stations/%s/config", stationId);

    // Connect to server
    Logger.debug(LOG_TAG_HTTP, "Connecting to %s:%d", _serverHost, _serverPort);
    if (!_client->connect(_serverHost, _serverPort, 15000L)) // 15-second timeout
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
    _client->println(F("Connection: keep-alive"));
    _client->println();

    // Wait for the start of the response headers with a timeout
    unsigned long timeout = millis();
    while (_client->connected() && !_client->available() && millis() - timeout < 15000L)
    {
        esp_task_wdt_reset(); // Reset watchdog
        delay(10);
    }

    int statusCode = 0;
    bool success = false;
    long contentLength = 0;

    // Check if we have a response before trying to parse
    if (_client->available())
    {
        // Find and parse the status line
        if (_client->find("HTTP/1.1 "))
        {
            statusCode = _client->parseInt();
            Logger.debug(LOG_TAG_HTTP, "HTTP response status code: %d", statusCode);
            success = (statusCode >= 200 && statusCode < 300);
        }

        // If successful, find Content-Length to know exactly how much to read.
        if (success && _client->find("Content-Length: "))
        {
            contentLength = _client->parseInt();
        }
        else if (success)
        {
            Logger.error(LOG_TAG_HTTP, "Could not find Content-Length header. Cannot proceed.");
            success = false; // We need this header to reliably read the body.
        }

        // Find the start of the body (the blank line after headers)
        if (success && _client->find("\r\n\r\n"))
        {
            if (contentLength > 0 && contentLength < 2048) // Sanity check on length
            {
                // Use a std::vector for safer, automatic memory management.
                std::vector<char> responseBuffer(contentLength);

                // Read exactly contentLength bytes into the buffer.
                size_t bytesRead = _client->readBytes(responseBuffer.data(), contentLength);

                if (bytesRead == contentLength)
                {
                    // The data is now in responseBuffer.data() with length bytesRead.
                    // No need for null termination if we pass the buffer and its size to deserializeJson.
                    _resetBackoff(); // Success, reset backoff
                    Logger.info(LOG_TAG_HTTP, "Configuration data received (%d bytes).", bytesRead);
                    // For debugging, let's print the buffer carefully
                    // Logger.debug(LOG_TAG_HTTP, "Body: %.*s", bytesRead, responseBuffer.data());

                    JsonDocument doc;
                    // Use the buffer directly for parsing
                    DeserializationError error = deserializeJson(doc, responseBuffer.data(), bytesRead);

                    if (error)
                    {
                        Logger.error(LOG_TAG_HTTP, "Failed to parse JSON configuration: %s", error.c_str());
                        success = false;
                    }
                    else
                    {
                        // Safely extract values
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
                    }
                }
                else
                {
                    Logger.error(LOG_TAG_HTTP, "Failed to read full response body. Expected %ld, got %d.", contentLength, bytesRead);
                    success = false;
                }
            }
            else
            {
                Logger.error(LOG_TAG_HTTP, "Received invalid or empty content length: %ld", contentLength);
                success = false;
            }
        }
        else if (success)
        {
            // This case handles a successful status code but malformed headers.
            Logger.error(LOG_TAG_HTTP, "Received successful status code but could not find response body delimiter.");
            success = false;
        }
    }
    else
    {
        Logger.error(LOG_TAG_HTTP, "HTTP request timed out waiting for headers.");
        success = false;
    }

    // Close connection only if the request failed, to allow for keep-alive
    if (!success)
    {
        _handleHttpFailure(); // Failure, trigger backoff
        _client->stop();
        Logger.debug(LOG_TAG_HTTP, "Connection closed due to error");
        Logger.error(LOG_TAG_HTTP, "Failed to fetch configuration, status code: %d", statusCode);
    }

    return success;
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
    if (!_client->connect(_serverHost, _serverPort, 15000L)) // 15-second timeout
    {
        Logger.error(LOG_TAG_HTTP, "Failed to connect to server");
        return false;
    }

    // Build the URL path with the station ID
    char urlPath[64];
    snprintf(urlPath, sizeof(urlPath), "/api/stations/%s/wind", stationId);

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
    _client->println(F("Connection: keep-alive"));
    _client->println();

    // Request body
    _client->println(jsonBuffer);

    // Wait for server response with timeout
    unsigned long timeout = millis();
    String response = "";

    while (_client->connected() && millis() - timeout < 15000L)
    {
        esp_task_wdt_reset(); // Reset watchdog
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

    // Close connection only if the request failed, to allow for keep-alive
    if (!success)
    {
        _client->stop();
        Logger.debug(LOG_TAG_HTTP, "Connection closed due to error");
    }

    if (success)
    {
        _resetBackoff(); // Success, reset backoff
        Logger.info(LOG_TAG_HTTP, "Wind data sent successfully");
        return true;
    }
    else
    {
        _handleHttpFailure(); // Failure, trigger backoff
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
    if (!_client->connect(_serverHost, _serverPort, 15000L)) // 15-second timeout
    {
        Logger.error(LOG_TAG_HTTP, "Failed to connect to server");
        return false;
    }

    // Build the URL path with the station ID
    char urlPath[64];
    snprintf(urlPath, sizeof(urlPath), "/api/stations/%s/temperature", stationId);

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
    _client->println(F("Connection: keep-alive"));
    _client->println();

    // Request body
    _client->println(jsonBuffer);

    // Wait for server response with timeout
    unsigned long timeout = millis();
    while (_client->connected() && millis() - timeout < 15000L)
    {
        esp_task_wdt_reset(); // Reset watchdog
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

    // Close connection only if the request failed, to allow for keep-alive
    if (!success)
    {
        _client->stop();
        Logger.debug(LOG_TAG_HTTP, "Connection closed due to error");
    }

    if (success)
    {
        _resetBackoff(); // Success, reset backoff
        Logger.info(LOG_TAG_HTTP, "Temperature data sent successfully");
        return true;
    }
    else
    {
        _handleHttpFailure(); // Failure, trigger backoff
        Logger.error(LOG_TAG_HTTP, "Failed to send temperature data, status code: %d", statusCode);
        return false;
    }
}

/**
 * @brief Confirms to the server that OTA has been initiated
 */
bool HttpClient::confirmOtaStarted(const char *stationId)
{
    if (!_modemManager || !_client)
    {
        Logger.error(LOG_TAG_HTTP, "HTTP client not initialized");
        return false;
    }

    if (!_modemManager->isGprsConnected())
    {
        Logger.warn(LOG_TAG_HTTP, "GPRS not connected, cannot confirm OTA start");
        return false;
    }

    Logger.info(LOG_TAG_HTTP, "Confirming OTA start for station %s", stationId);

    // Connect to server
    if (!_client->connect(_serverHost, _serverPort, 15000L)) // 15-second timeout
    {
        Logger.error(LOG_TAG_HTTP, "Failed to connect to server for OTA confirmation");
        return false;
    }

    // Build the URL path
    char urlPath[64];
    snprintf(urlPath, sizeof(urlPath), "/api/stations/%s/ota-confirm", stationId);

    // Send HTTP POST request
    _client->print(F("POST "));
    _client->print(urlPath);
    _client->println(F(" HTTP/1.1"));
    _client->print(F("Host: "));
    _client->println(_serverHost);
    _client->println(F("User-Agent: AiolosWeatherStation/1.0"));
    _client->println(F("Connection: keep-alive"));
    _client->println(); // End of headers

    // Wait for server response
    unsigned long timeout = millis();
    while (_client->connected() && millis() - timeout < 5000L)
    {
        esp_task_wdt_reset(); // Reset watchdog
        if (_client->available())
        {
            break; // Response received
        }
    }

    // Read status code
    int statusCode = 0;
    if (_client->find("HTTP/1.1 "))
    {
        statusCode = _client->parseInt();
    }

    bool success = (statusCode >= 200 && statusCode < 300);

    // Stop client only if there was an error
    if (!success)
    {
        _client->stop();
    }

    if (success)
    {
        _resetBackoff(); // Success, reset backoff
        Logger.info(LOG_TAG_HTTP, "OTA start confirmed successfully (status: %d)", statusCode);
        return true;
    }
    else
    {
        _handleHttpFailure(); // Failure, trigger backoff
        Logger.error(LOG_TAG_HTTP, "Failed to confirm OTA start (status: %d)", statusCode);
        return false;
    }
}

void HttpClient::sendMockWindData(float windSpeed, float windDirection, float batteryVoltage)
{
    if (!_modemManager || !_client)
    {
        Logger.error(LOG_TAG_HTTP, "HTTP client not initialized");
        return;
    }

    if (!_modemManager->isNetworkConnected() || !_modemManager->isGprsConnected())
    {
        Logger.error(LOG_TAG_HTTP, "Network not connected, cannot send mock wind data");
        return;
    }

    Logger.info(LOG_TAG_HTTP, "Sending mock wind data");

    // Create JSON payload with mock wind data
    char jsonBuffer[128];
    snprintf(jsonBuffer, sizeof(jsonBuffer),
             "{\"wind_speed\":%.2f,\"wind_direction\":%.1f,\"battery_voltage\":%.2f}",
             windSpeed, windDirection, batteryVoltage);

    // Calculate content length
    size_t contentLength = strlen(jsonBuffer);

    // Connect to server
    Logger.debug(LOG_TAG_HTTP, "Connecting to %s:%d", _serverHost, _serverPort);
    if (!_client->connect(_serverHost, _serverPort, 15000L)) // 15-second timeout
    {
        Logger.error(LOG_TAG_HTTP, "Failed to connect to server");
        return;
    }

    // Build the URL path for mock data
    char urlPath[64];
    snprintf(urlPath, sizeof(urlPath), "/api/stations/mock/wind");

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
    _client->println(F("Connection: keep-alive"));
    _client->println();

    // Request body
    _client->println(jsonBuffer);

    // Wait for server response with timeout
    unsigned long timeout = millis();
    String response = "";

    while (_client->connected() && millis() - timeout < 15000L)
    {
        esp_task_wdt_reset(); // Reset watchdog
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

    // Close connection only if the request failed, to allow for keep-alive
    if (!success)
    {
        _client->stop();
        Logger.debug(LOG_TAG_HTTP, "Connection closed due to error");
    }

    if (success)
    {
        _resetBackoff(); // Success, reset backoff
        Logger.info(LOG_TAG_HTTP, "Mock wind data sent successfully");
    }
    else
    {
        _handleHttpFailure(); // Failure, trigger backoff
        Logger.error(LOG_TAG_HTTP, "Failed to send mock wind data, status code: %d", statusCode);
    }

    // After handling the response, stop the client to free up resources.
    _client->stop();
}
