/**
 * @file HttpClient.cpp
 * @brief Implementation of the HTTP client for sending data to the Aiolos backend
 *
 * Based on the TinyGSM HttpClient example for maximum reliability
 */

#include "HttpClient.h"
#include "Logger.h"

#define LOG_TAG_HTTP "HTTP"

// Global instance - defined at the end to ensure proper initialization order
AiolosHttpClient httpClient(modemManager);

AiolosHttpClient::AiolosHttpClient(ModemManager &modemManager)
    : _modemManager(modemManager),
      _modem(nullptr),
      _client(nullptr),
      _http(nullptr),
      _initialized(false),
      _host(""),
      _port(80)
{
}

bool AiolosHttpClient::init()
{
    if (_initialized)
    {
        return true;
    }

    // Get modem instance
    _modem = _modemManager.getModem();
    if (!_modem)
    {
        Logger.error(LOG_TAG_HTTP, "Failed to get modem instance");
        return false;
    }

    // Get client instance
    _client = _modemManager.getClient();
    if (!_client)
    {
        Logger.error(LOG_TAG_HTTP, "Failed to get client instance");
        return false;
    }

    // Extract host and port from API_BASE_URL
    // Parse the API_BASE_URL to extract host and port
    String url = API_BASE_URL;

    // Remove protocol if present
    int protocolEnd = url.indexOf("://");
    if (protocolEnd > 0)
    {
        url = url.substring(protocolEnd + 3);
    }

    // Extract port if specified
    int portStart = url.indexOf(':');
    if (portStart > 0)
    {
        int pathStart = url.indexOf('/', portStart);
        if (pathStart > 0)
        {
            _port = url.substring(portStart + 1, pathStart).toInt();
            _host = url.substring(0, portStart);
        }
        else
        {
            _port = url.substring(portStart + 1).toInt();
            _host = url.substring(0, portStart);
        }
    }
    else
    {
        // No port specified, use default
        int pathStart = url.indexOf('/');
        if (pathStart > 0)
        {
            _host = url.substring(0, pathStart);
        }
        else
        {
            _host = url;
        }

        // Set default port based on protocol
        if (String(API_BASE_URL).startsWith("https://"))
        {
            _port = 443;
        }
        else
        {
            _port = 80;
        }
    }

    // Create HTTP client (static to ensure it lives for the duration of the program)
    static HttpClient httpClient(*_client, _host.c_str(), _port);
    _http = &httpClient;

    Logger.info(LOG_TAG_HTTP, "HTTP client initialized with host: %s, port: %d", _host.c_str(), _port);
    _initialized = true;
    return true;
}

template <typename T>
bool AiolosHttpClient::sendPostRequest(const String &endpoint, const T &jsonDoc)
{
    if (!_initialized && !init())
    {
        Logger.error(LOG_TAG_HTTP, "HTTP client not initialized");
        return false;
    }

    // Check if network and GPRS are connected
    if (!_modemManager.isNetworkConnected())
    {
        Logger.warn(LOG_TAG_HTTP, "Network not connected, attempting to reconnect");
        if (!_modemManager.connectNetwork())
        {
            Logger.error(LOG_TAG_HTTP, "Failed to reconnect to network");
            return false;
        }
    }

    if (!_modemManager.isGprsConnected())
    {
        Logger.warn(LOG_TAG_HTTP, "GPRS not connected, attempting to reconnect");
        if (!_modemManager.connectGprs())
        {
            Logger.error(LOG_TAG_HTTP, "Failed to reconnect to GPRS");
            return false;
        }
    }

    // Serialize JSON to string
    String jsonStr;
    serializeJson(jsonDoc, jsonStr);

    Logger.info(LOG_TAG_HTTP, "Sending POST request to %s", endpoint.c_str());
    Logger.debug(LOG_TAG_HTTP, "Request body: %s", jsonStr.c_str());

    // Start the request
    _http->beginRequest();
    _http->post(endpoint);
    _http->sendHeader("Content-Type", "application/json");
    _http->sendHeader("Content-Length", jsonStr.length());
    _http->beginBody();
    _http->print(jsonStr);
    _http->endRequest();

    // Get the response
    int statusCode = _http->responseStatusCode();
    String responseBody = _http->responseBody();

    Logger.info(LOG_TAG_HTTP, "Response status code: %d", statusCode);

    if (statusCode >= 200 && statusCode < 300)
    {
        Logger.info(LOG_TAG_HTTP, "Request successful");
        return true;
    }
    else
    {
        Logger.error(LOG_TAG_HTTP, "Request failed with status code %d", statusCode);
        Logger.debug(LOG_TAG_HTTP, "Response body: %s", responseBody.c_str());
        return false;
    }
}

// Template instantiations
template bool AiolosHttpClient::sendPostRequest<StaticJsonDocument<256>>(const String &, const StaticJsonDocument<256> &);
template bool AiolosHttpClient::sendPostRequest<StaticJsonDocument<128>>(const String &, const StaticJsonDocument<128> &);

bool AiolosHttpClient::sendDiagnostics(float batteryVoltage, float solarVoltage, int signalQuality, float temperature, const String &errors)
{
    // Create JSON document
    StaticJsonDocument<256> doc;

    doc["battery_voltage"] = batteryVoltage;
    doc["solar_voltage"] = solarVoltage;
    doc["signal_quality"] = signalQuality;

    if (temperature != 0.0f)
    {
        doc["temperature"] = temperature;
    }

    if (errors.length() > 0)
    {
        doc["errors"] = errors;
    }

    // Add timestamp (if we have network time)
    int year, month, day, hour, minute, second;
    float timezone;
    if (_modemManager.getNetworkTime(&year, &month, &day, &hour, &minute, &second, &timezone))
    {
        char timestamp[24];
        sprintf(timestamp, "%04d-%02d-%02dT%02d:%02d:%02dZ", year, month, day, hour, minute, second);
        doc["timestamp"] = timestamp;
    }

    // Send to API
    return sendPostRequest("/stations/" STATION_ID "/diagnostics", doc);
}

bool AiolosHttpClient::sendWindData(float windSpeed, int windDirection)
{
    // Create JSON document
    StaticJsonDocument<128> doc;

    doc["wind_speed"] = windSpeed;
    doc["wind_direction"] = windDirection;

    // Send to API
    return sendPostRequest("/stations/" STATION_ID "/live/wind", doc);
}

bool AiolosHttpClient::sendTemperatureData(float temperature, const String &sensorId)
{
    // Create JSON document
    StaticJsonDocument<128> doc;

    doc["temperature"] = temperature;
    doc["sensor_id"] = sensorId;

    // Send to API
    return sendPostRequest("/stations/" STATION_ID "/readings", doc);
}
