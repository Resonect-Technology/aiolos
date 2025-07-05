/**
 * @file AiolosHttpClient.cpp
 * @brief Implementation of the HTTP client for the Aiolos Weather Station
 */

#include "AiolosHttpClient.h"
#include "Logger.h"
#include <ArduinoJson.h> // Use ArduinoJson for robust parsing
#include "esp_task_wdt.h"
#include "core/ModemManager.h"

#define LOG_TAG_HTTP "HTTP"

// Global instance
AiolosHttpClient httpClient;

AiolosHttpClient::AiolosHttpClient()
{
    // Constructor is intentionally empty. Initialization is done in init().
}

AiolosHttpClient::~AiolosHttpClient()
{
    // Clean up the dynamically allocated client
    delete _arduinoClient;
}

// --- Backoff Mechanism Implementation ---

/**
 * @brief Handles the logic for a failed HTTP request, incrementing the backoff timer.
 */
void AiolosHttpClient::_handleHttpFailure()
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
void AiolosHttpClient::_resetBackoff()
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
bool AiolosHttpClient::isConnectionThrottled()
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
bool AiolosHttpClient::init(ModemManager &modemManager, const char *serverAddress, uint16_t serverPort)
{
    _modemManager = &modemManager;
    _serverAddress = serverAddress;
    _serverPort = serverPort;

    _client = _modemManager->getClient();

    if (!_client)
    {
        Logger.error(LOG_TAG_HTTP, "Failed to get TinyGSM client");
        return false;
    }

    // Initialize the ArduinoHttpClient as a pointer
    _arduinoClient = new HttpClient(*_client, _serverAddress, _serverPort);

    // Set the connection timeout. This is important for cellular connections.
    _arduinoClient->setTimeout(30000L); // 30 seconds

    Logger.info(LOG_TAG_HTTP, "HTTP client initialized for server %s:%u", _serverAddress, _serverPort);
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
int AiolosHttpClient::_performRequest(const char *method, const char *path, const char *body, String &responseBody)
{
    if (this->isConnectionThrottled())
    {
        return 0; // Throttled, do not attempt
    }

    if (!_modemManager)
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

    int err = 0;
    if (strcmp(method, "POST") == 0)
    {
        const char *requestBody = (body != nullptr) ? body : "";
        err = _arduinoClient->post(path, "application/json", requestBody);
    }
    else
    {
        err = _arduinoClient->get(path);
    }

    if (err != 0)
    {
        Logger.error(LOG_TAG_HTTP, "HTTP request failed to connect, error: %d", err);
        _handleHttpFailure();
        _arduinoClient->stop(); // Ensure the client is stopped on failure
        return err;             // Return the error code from the library
    }

    int statusCode = _arduinoClient->responseStatusCode();
    Logger.debug(LOG_TAG_HTTP, "HTTP Status: %d", statusCode);

    // Skip response headers to get to the body
    if (_arduinoClient->skipResponseHeaders() < 0)
    {
        Logger.error(LOG_TAG_HTTP, "Failed to skip response headers");
        _handleHttpFailure();
        _arduinoClient->stop();
        return 0; // Indicate failure
    }

    // Get the content length from the headers
    int contentLength = _arduinoClient->contentLength();
    if (contentLength == 0 || contentLength == -1)
    {
        Logger.warn(LOG_TAG_HTTP, "Content-Length is 0 or not specified. Reading until timeout.");
    }

    // Read the response body with a timeout
    responseBody = ""; // Clear the string

    unsigned long lastRead = millis();
    const unsigned long readTimeout = 5000; // 5 seconds timeout

    while (_arduinoClient->connected() && (millis() - lastRead < readTimeout))
    {
        while (_arduinoClient->available())
        {
            char c = _arduinoClient->read();
            responseBody += c;
            lastRead = millis(); // Reset timeout timer with each byte received
        }
    }

    // It's important to stop the client after each request to close the connection
    _arduinoClient->stop();

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
        // If the status code is not successful, handle the failure.
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
 * @brief Performs a lightweight HTTP POST request without reading response body.
 * Optimized for high-frequency data sending where only status code matters.
 * @param path The URL path for the request.
 * @param body The request body.
 * @return The HTTP status code, or 0 on failure.
 */
int AiolosHttpClient::_performLightweightPost(const char *path, const char *body)
{
    if (this->isConnectionThrottled())
    {
        return 0; // Throttled, do not attempt
    }

    if (!_modemManager)
    {
        Logger.error(LOG_TAG_HTTP, "HTTP client not initialized");
        return 0;
    }

    if (!_modemManager->isNetworkConnected() || !_modemManager->isGprsConnected())
    {
        Logger.error(LOG_TAG_HTTP, "Network not connected, cannot send request");
        return 0;
    }

    Logger.debug(LOG_TAG_HTTP, "Sending lightweight POST request to %s", path);

    const char *requestBody = (body != nullptr) ? body : "";
    int err = _arduinoClient->post(path, "application/json", requestBody);

    if (err != 0)
    {
        Logger.error(LOG_TAG_HTTP, "HTTP request failed to connect, error: %d", err);
        _handleHttpFailure();
        _arduinoClient->stop();
        return err;
    }

    int statusCode = _arduinoClient->responseStatusCode();
    Logger.debug(LOG_TAG_HTTP, "HTTP Status: %d", statusCode);

    // Skip response headers but don't read the body - we don't need it
    _arduinoClient->skipResponseHeaders();

    // Important: stop the client immediately to close the connection
    _arduinoClient->stop();

    if (statusCode >= 200 && statusCode < 300)
    {
        _resetBackoff();
    }
    else
    {
        _handleHttpFailure();
        Logger.error(LOG_TAG_HTTP, "HTTP request failed with status code: %d", statusCode);
    }

    return statusCode;
}

/**
 * @brief Send diagnostics data to the server
 */
bool AiolosHttpClient::sendDiagnostics(const char *stationId, float batteryVoltage, float solarVoltage, float internalTemp, int signalQuality, unsigned long uptime)
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
bool AiolosHttpClient::fetchConfiguration(const char *stationId, unsigned long *tempInterval, unsigned long *windInterval,
                                          unsigned long *windSampleInterval, unsigned long *diagInterval, unsigned long *timeInterval,
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

        // Use a JsonDocument with enough capacity for the configuration data
        JsonDocument doc;
        Logger.debug(LOG_TAG_HTTP, "About to parse JSON with length: %d", responseBody.length());
        DeserializationError error = deserializeJson(doc, responseBody);

        if (error)
        {
            Logger.error(LOG_TAG_HTTP, "Failed to parse JSON configuration: %s", error.c_str());
            Logger.error(LOG_TAG_HTTP, "JSON was: %s", responseBody.c_str());
            _handleHttpFailure(); // Treat parsing error as a failure for backoff
            return false;
        }

        Logger.debug(LOG_TAG_HTTP, "JSON parsed successfully");

        // Safely extract values using the parsed JSON document
        if (!doc["tempInterval"].isNull())
        {
            unsigned long value = doc["tempInterval"].as<unsigned long>();
            Logger.debug(LOG_TAG_HTTP, "tempInterval from JSON: %lu", value);
            *tempInterval = value;
        }
        if (!doc["windSendInterval"].isNull())
        {
            unsigned long value = doc["windSendInterval"].as<unsigned long>();
            Logger.debug(LOG_TAG_HTTP, "windSendInterval from JSON: %lu", value);
            *windInterval = value;
        }
        if (windSampleInterval && !doc["windSampleInterval"].isNull())
        {
            unsigned long value = doc["windSampleInterval"].as<unsigned long>();
            Logger.debug(LOG_TAG_HTTP, "windSampleInterval from JSON: %lu", value);
            *windSampleInterval = value;
        }
        if (!doc["diagInterval"].isNull())
        {
            unsigned long value = doc["diagInterval"].as<unsigned long>();
            Logger.debug(LOG_TAG_HTTP, "diagInterval from JSON: %lu", value);
            *diagInterval = value;
        }
        if (timeInterval && !doc["timeInterval"].isNull())
        {
            *timeInterval = doc["timeInterval"].as<unsigned long>();
        }
        if (restartInterval && !doc["restartInterval"].isNull())
        {
            *restartInterval = doc["restartInterval"].as<unsigned long>();
        }
        if (sleepStartHour && !doc["sleepStartHour"].isNull())
        {
            *sleepStartHour = doc["sleepStartHour"].as<int>();
        }
        if (sleepEndHour && !doc["sleepEndHour"].isNull())
        {
            *sleepEndHour = doc["sleepEndHour"].as<int>();
        }
        if (otaHour && !doc["otaHour"].isNull())
        {
            *otaHour = doc["otaHour"].as<int>();
        }
        if (otaMinute && !doc["otaMinute"].isNull())
        {
            *otaMinute = doc["otaMinute"].as<int>();
        }
        if (otaDuration && !doc["otaDuration"].isNull())
        {
            *otaDuration = doc["otaDuration"].as<int>();
        }
        if (remoteOta && !doc["remoteOta"].isNull())
        {
            *remoteOta = doc["remoteOta"].as<bool>();
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
 * @brief Send wind data to the server (optimized for high-frequency sending)
 */
bool AiolosHttpClient::sendWindData(const char *stationId, float windSpeed, float windDirection)
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

    // Use lightweight POST method that doesn't read response body for speed
    int statusCode = _performLightweightPost(urlPath, jsonBuffer.c_str());

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
 * @brief Send temperature data to the server (optimized for high-frequency sending)
 */
bool AiolosHttpClient::sendTemperatureData(const char *stationId, float internalTemp, float externalTemp)
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

    // Use lightweight POST method that doesn't read response body for speed
    int statusCode = _performLightweightPost(urlPath, jsonBuffer.c_str());

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
bool AiolosHttpClient::confirmOtaStarted(const char *stationId)
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
