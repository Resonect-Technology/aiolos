/**
 * @file HttpClient.cpp
 * @brief Implementation of the HTTP client for the Aiolos Weather Station
 */

#include "HttpClient.h"
#include "Logger.h"
#include <ArduinoJson.h> // Use ArduinoJson for robust parsing
#include "esp_task_wdt.h"

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

    // Initialize the ArduinoHttpClient
    _httpClient = new ArduinoHttpClient_t(*_client, _serverHost, _serverPort);
    if (!_httpClient)
    {
        Logger.error(LOG_TAG_HTTP, "Failed to create ArduinoHttpClient instance");
        return false;
    }
    // Set the connection timeout. This is important for cellular connections.
    _httpClient->setTimeout(30000L); // 30 seconds

    Logger.info(LOG_TAG_HTTP, "HTTP client initialized for server %s:%u", _serverHost, _serverPort);
    return true;
}

/**
 * @brief Performs the actual HTTP request and handles the response.
 * @param method The HTTP method ("GET" or "POST").
 * @param path The URL path for the request.
 * @param body The request body (for POST requests, can be nullptr for GET).
 * @param responseBody A String reference to store the response body.
 * @return The HTTP status code, or 0 on failure before sending.
 */
int HttpClient::_performRequest(const char *method, const char *path, const char *body, String &responseBody)
{
    if (this->isConnectionThrottled())
    {
        return 0; // Throttled, do not attempt
    }

    if (!_modemManager || !_httpClient)
    {
        Logger.error(LOG_TAG_HTTP, "HTTP client not initialized");
        return 0; // 0 as an error indicator
    }

    if (!_modemManager->isNetworkConnected() || !_modemManager->isGprsConnected())
    {
        Logger.error(LOG_TAG_HTTP, "Network not connected, cannot send request");
        return 0;
    }

    Logger.debug(LOG_TAG_HTTP, "Sending %s request to %s", method, path);

    // The ArduinoHttpClient library handles the entire request flow within the get() or post() call.
    // We don't need to use beginRequest/endRequest for these simple cases.
    int statusCode = 0;
    if (strcmp(method, "POST") == 0)
    {
        // For POST, we include the content type and body in the call.
        _httpClient->post(path, "application/json", body);
    }
    else
    {
        // For GET, it's simpler.
        _httpClient->get(path);
    }

    // After the request is sent, we can get the status and response.
    statusCode = _httpClient->responseStatusCode();
    responseBody = _httpClient->responseBody(); // Always get the body for logging

    Logger.debug(LOG_TAG_HTTP, "HTTP Status: %d", statusCode);
    if (responseBody.length() > 0)
    {
        Logger.debug(LOG_TAG_HTTP, "Response Body: %s", responseBody.c_str());
    }

    if (statusCode >= 200 && statusCode < 300)
    {
        _resetBackoff();
    }
    else
    {
        _handleHttpFailure();
        Logger.error(LOG_TAG_HTTP, "HTTP request failed with status code: %d", statusCode);
        if (responseBody.length() > 0)
        {
            Logger.error(LOG_TAG_HTTP, "Response: %s", responseBody.c_str());
        }
    }

    return statusCode;
}

/**
 * @brief Send diagnostics data to the server
 */
bool HttpClient::sendDiagnostics(const char *stationId, float batteryVoltage, float solarVoltage, float internalTemp, int signalQuality, unsigned long uptime)
{
    Logger.info(LOG_TAG_HTTP, "Sending diagnostics data for station %s", stationId);

    // Create JSON payload using ArduinoJson
    JsonDocument doc;
    doc["battery_voltage"] = batteryVoltage;
    doc["solar_voltage"] = solarVoltage;
    doc["internal_temperature"] = internalTemp;
    doc["signal_quality"] = signalQuality;
    doc["uptime"] = uptime;

    String jsonBuffer;
    serializeJson(doc, jsonBuffer);

    // Build the URL path
    char urlPath[64];
    snprintf(urlPath, sizeof(urlPath), "/api/stations/%s/diagnostics", stationId);

    String responseBody;
    int statusCode = _performRequest("POST", urlPath, jsonBuffer.c_str(), responseBody);

    if (statusCode >= 200 && statusCode < 300)
    {
        Logger.info(LOG_TAG_HTTP, "Diagnostics data sent successfully");
        return true;
    }
    else
    {
        Logger.error(LOG_TAG_HTTP, "Failed to send diagnostics data.");
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
    Logger.info(LOG_TAG_HTTP, "Fetching configuration for station %s", stationId);

    // Build the URL path with the station ID
    char urlPath[64];
    snprintf(urlPath, sizeof(urlPath), "/api/stations/%s/config", stationId);

    String responseBody;
    int statusCode = _performRequest("GET", urlPath, nullptr, responseBody);

    if (statusCode >= 200 && statusCode < 300)
    {
        Logger.info(LOG_TAG_HTTP, "Configuration data received.");

        // Use ArduinoJson for robust parsing
        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, responseBody);

        if (error)
        {
            Logger.error(LOG_TAG_HTTP, "Failed to parse JSON configuration: %s", error.c_str());
            _handleHttpFailure(); // Treat parsing error as a failure for backoff
            return false;
        }

        // Safely extract values using the parsed JSON document
        if (!doc["temp_interval"].isNull())
        {
            *tempInterval = doc["temp_interval"].as<unsigned long>();
        }
        if (!doc["wind_interval"].isNull())
        {
            *windInterval = doc["wind_interval"].as<unsigned long>();
        }
        if (!doc["diag_interval"].isNull())
        {
            *diagInterval = doc["diag_interval"].as<unsigned long>();
        }
        if (timeInterval && !doc["time_interval"].isNull())
        {
            *timeInterval = doc["time_interval"].as<unsigned long>();
        }
        if (restartInterval && !doc["restart_interval"].isNull())
        {
            *restartInterval = doc["restart_interval"].as<unsigned long>();
        }
        if (sleepStartHour && !doc["sleep_start_hour"].isNull())
        {
            *sleepStartHour = doc["sleep_start_hour"].as<int>();
        }
        if (sleepEndHour && !doc["sleep_end_hour"].isNull())
        {
            *sleepEndHour = doc["sleep_end_hour"].as<int>();
        }
        if (otaHour && !doc["ota_hour"].isNull())
        {
            *otaHour = doc["ota_hour"].as<int>();
        }
        if (otaMinute && !doc["ota_minute"].isNull())
        {
            *otaMinute = doc["ota_minute"].as<int>();
        }
        if (otaDuration && !doc["ota_duration"].isNull())
        {
            *otaDuration = doc["ota_duration"].as<int>();
        }
        if (remoteOta && !doc["remote_ota"].isNull())
        {
            *remoteOta = doc["remote_ota"].as<bool>();
        }

        return true;
    }
    else
    {
        Logger.error(LOG_TAG_HTTP, "Failed to fetch configuration.");
        return false;
    }
}

/**
 * @brief Send wind data to the server
 */
bool HttpClient::sendWindData(const char *stationId, float windSpeed, float windDirection)
{
    Logger.info(LOG_TAG_HTTP, "Sending wind data for station %s", stationId);

    // Create JSON payload using ArduinoJson
    JsonDocument doc;
    doc["wind_speed"] = windSpeed;
    doc["wind_direction"] = windDirection;

    String jsonBuffer;
    serializeJson(doc, jsonBuffer);

    // Build the URL path
    char urlPath[64];
    snprintf(urlPath, sizeof(urlPath), "/api/stations/%s/wind", stationId);

    String responseBody;
    int statusCode = _performRequest("POST", urlPath, jsonBuffer.c_str(), responseBody);

    if (statusCode >= 200 && statusCode < 300)
    {
        Logger.info(LOG_TAG_HTTP, "Wind data sent successfully");
        return true;
    }
    else
    {
        Logger.error(LOG_TAG_HTTP, "Failed to send wind data.");
        return false;
    }
}

/**
 * @brief Send temperature data to the server
 */
bool HttpClient::sendTemperatureData(const char *stationId, float internalTemp, float externalTemp)
{
    Logger.info(LOG_TAG_HTTP, "Sending temperature data for station %s", stationId);

    // Create JSON payload using ArduinoJson
    JsonDocument doc;
    doc["temperature"] = externalTemp;

    String jsonBuffer;
    serializeJson(doc, jsonBuffer);

    // Build the URL path
    char urlPath[64];
    snprintf(urlPath, sizeof(urlPath), "/api/stations/%s/temperature", stationId);

    String responseBody;
    int statusCode = _performRequest("POST", urlPath, jsonBuffer.c_str(), responseBody);

    if (statusCode >= 200 && statusCode < 300)
    {
        Logger.info(LOG_TAG_HTTP, "Temperature data sent successfully");
        return true;
    }
    else
    {
        Logger.error(LOG_TAG_HTTP, "Failed to send temperature data.");
        return false;
    }
}

/**
 * @brief Confirms to the server that OTA has been initiated
 */
bool HttpClient::confirmOtaStarted(const char *stationId)
{
    Logger.info(LOG_TAG_HTTP, "Confirming OTA start for station %s", stationId);

    // Build the URL path
    char urlPath[64];
    snprintf(urlPath, sizeof(urlPath), "/api/stations/%s/ota-confirm", stationId);

    String responseBody;
    int statusCode = _performRequest("POST", urlPath, nullptr, responseBody);

    if (statusCode >= 200 && statusCode < 300)
    {
        Logger.info(LOG_TAG_HTTP, "OTA start confirmed successfully (status: %d)", statusCode);
        return true;
    }
    else
    {
        Logger.error(LOG_TAG_HTTP, "Failed to confirm OTA start (status: %d)", statusCode);
        return false;
    }
}
