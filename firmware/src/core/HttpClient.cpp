/**
 * @file HttpClient.cpp
 * @brief Implementation of the HTTP client for sending data to the Aiolos backend
 */

#include "HttpClient.h"
#include "Logger.h"
#include "ModemManager.h"
#include <TinyGsmClient.h>

#define LOG_TAG_HTTP "HTTP"

// Global instance
HttpClient httpClient(modemManager);

HttpClient::HttpClient(ModemManager &modemManager) : _modemManager(modemManager)
{
    _client = _modemManager.getClient();
}

bool HttpClient::ensureConnected()
{
    // Check if network and GPRS are connected
    if (!_modemManager.isNetworkConnected() || !_modemManager.isGprsConnected())
    {
        Logger.warn(LOG_TAG_HTTP, "Network or GPRS not connected, attempting to reconnect");

        // Try to reconnect to network
        if (!_modemManager.connectNetwork() || !_modemManager.connectGprs())
        {
            Logger.error(LOG_TAG_HTTP, "Failed to reconnect to network");
            return false;
        }
    }
    return true;
}

bool HttpClient::sendHttpPost(const String &endpoint, const JsonVariant &jsonDoc)
{
    if (!ensureConnected())
    {
        return false;
    }

    // Serialize JSON to a string
    String jsonStr;
    serializeJson(jsonDoc, jsonStr);

    // Calculate content length
    size_t contentLength = jsonStr.length();

    // Construct the full URL
    String url = String(API_BASE_URL) + endpoint;

    // Extract host and path from URL
    String host, path;
    int colonPos = url.indexOf("://");
    if (colonPos > 0)
    {
        host = url.substring(colonPos + 3);
    }
    else
    {
        host = url;
    }

    int pathPos = host.indexOf('/');
    if (pathPos > 0)
    {
        path = host.substring(pathPos);
        host = host.substring(0, pathPos);
    }
    else
    {
        path = "/";
    }

    // Extract port if specified
    int port = 80; // Default HTTP port
    int portPos = host.indexOf(':');
    if (portPos > 0)
    {
        port = host.substring(portPos + 1).toInt();
        host = host.substring(0, portPos);
    }

    Logger.info(LOG_TAG_HTTP, "Connecting to %s:%d", host.c_str(), port);

    // Connect to server
    if (!_client->connect(host.c_str(), port))
    {
        Logger.error(LOG_TAG_HTTP, "Connection failed");
        return false;
    }

    Logger.info(LOG_TAG_HTTP, "Connected to server");

    // Send HTTP request
    _client->print(F("POST "));
    _client->print(path);
    _client->println(F(" HTTP/1.1"));
    _client->print(F("Host: "));
    _client->println(host);
    _client->println(F("Connection: close"));
    _client->println(F("Content-Type: application/json"));
    _client->print(F("Content-Length: "));
    _client->println(contentLength);
    _client->println();
    _client->println(jsonStr);

    Logger.debug(LOG_TAG_HTTP, "Sent HTTP request:");
    Logger.debug(LOG_TAG_HTTP, "POST %s HTTP/1.1", path.c_str());
    Logger.debug(LOG_TAG_HTTP, "Host: %s", host.c_str());
    Logger.debug(LOG_TAG_HTTP, "Content-Length: %d", contentLength);
    Logger.debug(LOG_TAG_HTTP, "Body: %s", jsonStr.c_str());

    // Wait for server response
    unsigned long timeout = millis() + HTTP_TIMEOUT;
    while (_client->connected() && millis() < timeout)
    {
        String line = _client->readStringUntil('\n');
        if (line.startsWith("HTTP/1.1") || line.startsWith("HTTP/1.0"))
        {
            int statusCode = line.substring(9, 12).toInt();
            if (statusCode >= 200 && statusCode < 300)
            {
                Logger.info(LOG_TAG_HTTP, "HTTP request successful (status %d)", statusCode);
            }
            else
            {
                Logger.error(LOG_TAG_HTTP, "HTTP request failed (status %d)", statusCode);
                _client->stop();
                return false;
            }
        }
        if (line == "\r")
        {
            break; // Empty line indicates end of headers
        }
    }

    // Read response body if needed
    // For most cases, we don't need to process the response
    while (_client->available() && millis() < timeout)
    {
        _client->read();
    }

    // Close connection
    _client->stop();
    Logger.info(LOG_TAG_HTTP, "Connection closed");

    return true;
}

bool HttpClient::sendDiagnostics(float batteryVoltage, float solarVoltage, int signalQuality, float temperature, const String &errors)
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
    return sendHttpPost("/stations/" STATION_ID "/diagnostics", doc);
}

bool HttpClient::sendWindData(float windSpeed, int windDirection)
{
    // Create JSON document
    StaticJsonDocument<128> doc;

    doc["wind_speed"] = windSpeed;
    doc["wind_direction"] = windDirection;

    // Send to API
    return sendHttpPost("/stations/" STATION_ID "/live/wind", doc);
}

bool HttpClient::sendTemperatureData(float temperature, const String &sensorId)
{
    // Create JSON document
    StaticJsonDocument<128> doc;

    doc["temperature"] = temperature;
    doc["sensor_id"] = sensorId;

    // Construct endpoint with sensor type
    String endpoint = "/stations/" STATION_ID "/readings";

    // Send to API
    return sendHttpPost(endpoint, doc);
}
