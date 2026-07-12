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
     * @brief Diagnostics data sent to the server
     */
    struct DiagnosticsPayload
    {
        float batteryVoltage = 0.0f;       // Volts
        float solarVoltage = 0.0f;         // Volts
        float internalTemperature = -127.0f; // Celsius (-127 = unavailable)
        int signalQuality = 0;             // CSQ
        unsigned long uptime = 0;          // Seconds
        const char *firmwareVersion = nullptr;
        uint32_t freeHeap = 0;    // Bytes
        uint32_t minFreeHeap = 0; // Bytes (lowest since boot)
        const char *resetReason = nullptr;
    };

    /**
     * @brief Send diagnostics data to the server
     *
     * @param stationId Station identifier
     * @param payload Diagnostics values to send
     * @return true if successful
     * @return false if failed
     */
    bool sendDiagnostics(const char *stationId, const DiagnosticsPayload &payload);

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
     * @brief Remote station configuration
     *
     * Initialize fields with the currently-active values before calling
     * fetchConfiguration() - only fields present (non-null) in the server
     * response are overwritten.
     */
    struct StationConfigData
    {
        unsigned long tempInterval = 0;       // ms
        unsigned long windSendInterval = 0;   // ms
        unsigned long windSampleInterval = 0; // ms
        unsigned long diagInterval = 0;       // ms
        unsigned long timeInterval = 0;       // ms
        unsigned long restartInterval = 0;    // seconds (0 = keep current)
        int sleepStartHour = -1;
        int sleepEndHour = -1;
        int otaHour = -1;
        int otaMinute = -1;
        int otaDuration = 0;             // minutes
        bool remoteOta = false;
        int utcOffsetMinutes = 0;        // Station-local offset from UTC
        int livestreamStartHour = -1;    // -1 = morning slow mode disabled
        float lowBatteryThreshold = 0.0f; // Volts; <= 0 disables the battery gate
    };

    /**
     * @brief Fetch configuration from the server
     *
     * @param stationId Station identifier
     * @param config In/out configuration; fields absent from the server
     *               response keep the values they were initialized with
     * @return true if successful
     * @return false if failed
     */
    bool fetchConfiguration(const char *stationId, StationConfigData &config);

    /**
     * @brief Checks if the HTTP client is currently in a backoff period.
     */
    bool isConnectionThrottled();

    /**
     * @brief Reset the backoff mechanism for safety purposes
     *
     * This method is used by the safety mechanisms to force a backoff reset
     * when the device has been offline for an extended period.
     */
    void resetBackoffForSafety();

    /**
     * @brief Send temperature data to the server
     *
     * @param stationId Station identifier
     * @param externalTemp External temperature in Celsius
     * @return true if successful
     * @return false if failed
     */
    bool sendTemperatureData(const char *stationId, float externalTemp);

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
