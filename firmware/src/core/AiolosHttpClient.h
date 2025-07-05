/**
 * @file AiolosHttpClient.h
 * @brief Handles HTTP requests to the server
 *
 * Provides functionality to send sensor readings and diagnostics
 * data to the Aiolos backend server.
 */

#define TINY_GSM_MODEM_SIM7000

#pragma once

#include <Arduino.h>
#include <ArduinoHttpClient.h>
#include <TinyGsmClient.h>

// Forward declarations
class ModemManager;

class AiolosHttpClient
{
public:
    AiolosHttpClient();  // Constructor
    ~AiolosHttpClient(); // Destructor to clean up the client

    /**
     * @brief Initialize the HTTP client
     *
     * @param modemManager Reference to the ModemManager instance
     * @param serverAddress The address of the server to connect to.
     * @param serverPort The port of the server to connect to.
     * @return true if initialization successful
     * @return false if initialization failed
     */
    bool init(ModemManager &modemManager, const char *serverAddress, uint16_t serverPort);

    /**
     * @brief Send diagnostics data to the server
     *
     * @param stationId Station identifier
     * @param batteryVoltage Battery voltage in volts
     * @param solarVoltage Solar panel voltage in volts
     * @param internalTemp Internal temperature in Celsius
     * @param signalQuality Signal quality in dBm
     * @param uptime System uptime in seconds
     * @return true if successful
     * @return false if failed
     */
    bool sendDiagnostics(const char *stationId, float batteryVoltage, float solarVoltage, float internalTemp, int signalQuality, unsigned long uptime);

    /**
     * @brief Send wind data to the server
     *
     * @param stationId Station identifier
     * @param windSpeed Wind speed in m/s
     * @param windDirection Wind direction in degrees (0-360)
     * @return true if successful
     * @return false if failed
     */
    bool sendWindData(const char *stationId, float windSpeed, float windDirection);

    /**
     * @brief Fetch configuration from the server
     *
     * @param stationId Station identifier
     * @param tempInterval Pointer to store retrieved temperature interval
     * @param windInterval Pointer to store retrieved wind interval
     * @param diagInterval Pointer to store retrieved diagnostics interval
     * @param timeInterval Pointer to store retrieved time sync interval
     * @param restartInterval Pointer to store retrieved restart interval
     * @param sleepStartHour Pointer to store retrieved sleep start hour
     * @param sleepEndHour Pointer to store retrieved sleep end hour
     * @param otaHour Pointer to store retrieved OTA hour
     * @param otaMinute Pointer to store retrieved OTA minute
     * @param otaDuration Pointer to store retrieved OTA duration in minutes
     * @param remoteOta Pointer to store retrieved remote OTA flag
     * @return true if successful
     * @return false if failed
     */
    bool fetchConfiguration(const char *stationId, unsigned long *tempInterval, unsigned long *windInterval,
                            unsigned long *windSampleInterval, unsigned long *diagInterval, unsigned long *timeInterval = nullptr,
                            unsigned long *restartInterval = nullptr, int *sleepStartHour = nullptr,
                            int *sleepEndHour = nullptr, int *otaHour = nullptr,
                            int *otaMinute = nullptr, int *otaDuration = nullptr, bool *remoteOta = nullptr);

    /**
     * @brief Checks if the HTTP client is currently in a backoff period.
     */
    bool isConnectionThrottled();

    /**
     * @brief Send temperature data to the server
     *
     * @param stationId Station identifier
     * @param internalTemp Internal temperature in Celsius (kept for backward compatibility)
     * @param externalTemp External temperature in Celsius
     * @return true if successful
     * @return false if failed
     */
    bool sendTemperatureData(const char *stationId, float internalTemp, float externalTemp);

    /**
     * @brief Confirms to the server that OTA has been initiated
     *
     * This tells the server to clear the remote OTA flag for this device.
     *
     * @param stationId Station identifier
     * @return true if successful
     * @return false if failed
     */
    bool confirmOtaStarted(const char *stationId);

    /**
     * @brief Get the local IP address of the device
     *
     * @return String containing the local IP address
     */
    String getLocalIP();

private:
    // Response buffer size for the HTTP client
    static const int RESPONSE_BUFFER_SIZE = 1024;

    // URL path buffer size
    static const size_t URL_PATH_SIZE = 64;

    // Backoff constants
    static const unsigned long BASE_BACKOFF_DELAY_MS = 5000;  // 5 seconds
    static const unsigned long MAX_BACKOFF_DELAY_MS = 300000; // 5 minutes

    // Arduino HTTP Client instance (as a pointer)
    HttpClient *_arduinoClient = nullptr;

    // Server details
    const char *_serverAddress;
    uint16_t _serverPort;

    // Modem and network client
    ModemManager *_modemManager = nullptr;
    TinyGsmClient *_client = nullptr;

    // Backoff mechanism state
    unsigned long _backoffDelay = 0;
    unsigned long _lastAttemptTime = 0;
    uint8_t _failedAttempts = 0;

    void _handleHttpFailure();
    void _resetBackoff();
    int _performRequest(const char *method, const char *path, const char *body, String &responseBody);
    int _performLightweightPost(const char *path, const char *body);
};

extern AiolosHttpClient httpClient;
