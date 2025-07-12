/**
 * @file main.cpp
 * @brief Main application for the Aiolos Weather Station
 *
 * This is the entry point for the Aiolos Weather Station.
 * It initializes all components and manages the main operation loop.
 *
 * @version 1.0.0
 * @date 2025-06-25
 */

#include <Arduino.h>
#include <esp_task_wdt.h>
#include <math.h> // For isnan()
#include "config/Config.h"
#include "core/Logger.h"
#include "core/ModemManager.h"
#include "core/AiolosHttpClient.h"
#include "core/DiagnosticsManager.h"
#include "core/OtaManager.h"
#include "utils/TemperatureSensor.h"
#include "utils/BatteryUtils.h" // For calibrated battery readings
#include "sensors/WindSensor.h"
#include <WiFi.h>

// Global variables
unsigned long lastTimeUpdate = 0;
unsigned long lastDiagnosticsUpdate = 0;
unsigned long lastWindUpdate = 0;
unsigned long lastTemperatureUpdate = 0;
unsigned long lastConfigUpdate = 0;
unsigned long lastWindDataSendTime = 0;
unsigned long lastHeartbeatTime = 0;
unsigned long lastConfigFetchTime = 0;
int currentHour = 0, currentMinute = 0, currentSecond = 0;
unsigned long lastNetworkTimeUpdate = 0; // Track when we last got network time
bool otaActive = false;
unsigned long lastOtaCheck = 0;
bool isSamplingWind = false; // For wind data averaging

// Emergency connection failure tracking
unsigned long lastConnectionFailureTime = 0;
int connectionFailureCount = 0;

// Emergency recovery non-blocking state
bool emergencyRecoveryMode = false;
unsigned long emergencyRecoveryStartTime = 0;

// Additional safety mechanisms - Maximum offline time protection
unsigned long firstOfflineTime = 0;     // When we first went offline
bool hasBeenOnlineRecently = false;     // Track if we've had a successful connection
unsigned long lastBackoffResetTime = 0; // Track when we last reset the backoff

// Non-blocking temperature reading state
bool tempConversionStarted = false;
unsigned long tempConversionStartTime = 0;

// Dynamic interval settings, initialized with defaults from Config.h
unsigned long dynamicTempInterval = DEFAULT_TEMP_INTERVAL;
unsigned long dynamicWindInterval = DEFAULT_WIND_INTERVAL;
unsigned long dynamicWindSampleInterval = WIND_AVERAGING_SAMPLE_INTERVAL_MS;
unsigned long dynamicDiagInterval = DEFAULT_DIAG_INTERVAL;
unsigned long dynamicTimeInterval = DEFAULT_TIME_UPDATE_INTERVAL;
int dynamicSleepStartHour = DEFAULT_SLEEP_START_HOUR;
int dynamicSleepEndHour = DEFAULT_SLEEP_END_HOUR;
int dynamicOtaHour = DEFAULT_OTA_HOUR;
int dynamicOtaMinute = DEFAULT_OTA_MINUTE;
int dynamicOtaDuration = DEFAULT_OTA_DURATION;

// Calibration mode - can be enabled via build flags
#ifdef CALIBRATION_MODE
const bool CALIBRATION_ENABLED = true;
#else
const bool CALIBRATION_ENABLED = false;
#endif

#ifdef CALIBRATION_DURATION
const unsigned long CALIBRATION_TIME = CALIBRATION_DURATION;
#else
const unsigned long CALIBRATION_TIME = 30000; // 30 seconds default
#endif

// Function prototypes
void setupWatchdog();
void resetWatchdog();
bool isSleepTime();
void enterDeepSleepUntil(int hour, int minute);
void testModemConnectivity();
bool checkAndInitOta();
bool checkAndInitRemoteOta();
void handleRemoteConfiguration();                                               // New function to handle remote config
void handleOfflineSafetyMechanisms(unsigned long currentMillis, bool isOnline); // New safety function

// Sensor instances
TemperatureSensor externalTempSensor;

/**
 * @brief Initial setup function
 *
 * Initializes all components and prepares the system for operation.
 */
void setup()
{
    // Initialize logger
    Logger.init();
    Logger.info(LOG_TAG_SYSTEM, "=== AIOLOS WEATHER STATION STARTUP ===");
    Logger.info(LOG_TAG_SYSTEM, "Firmware version: " FIRMWARE_VERSION);
    Logger.info(LOG_TAG_SYSTEM, "Boot reason: %s", esp_reset_reason() == ESP_RST_DEEPSLEEP ? "DEEP_SLEEP_WAKEUP" : "OTHER");

    // Show compile-time flags
#ifdef DEBUG_MODE
    Logger.info(LOG_TAG_SYSTEM, "Build mode: DEBUG_MODE enabled");
#else
    Logger.info(LOG_TAG_SYSTEM, "Build mode: PRODUCTION (sleep enabled)");
#endif

#ifdef CALIBRATION_MODE
    Logger.info(LOG_TAG_SYSTEM, "Calibration mode: ENABLED");
#else
    Logger.info(LOG_TAG_SYSTEM, "Calibration mode: DISABLED");
#endif
    Logger.info(LOG_TAG_SYSTEM, "=======================================");

    // Initialize battery reading utility
    BatteryUtils::init();

    // Set up LED
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, HIGH);

    // Initialize watchdog but disable it during modem initialization
    setupWatchdog();
    Logger.debug(LOG_TAG_SYSTEM, "Temporarily disabling watchdog for modem initialization");
    esp_task_wdt_deinit();

    // Initialize modem and network
    if (!modemManager.init())
    {
        Logger.error(LOG_TAG_SYSTEM, "Failed to initialize modem. Restarting...");
        delay(5000);
        ESP.restart();
        return;
    }

    // Establish initial network and GPRS connection
    Logger.info(LOG_TAG_SYSTEM, "Establishing initial connection...");
    modemManager.maintainConnection(true);

    // Re-enable watchdog after modem initialization
    Logger.debug(LOG_TAG_SYSTEM, "Re-enabling watchdog after modem initialization");
    setupWatchdog();

    // Initialize safety mechanism state
    hasBeenOnlineRecently = false; // Start assuming we're offline
    firstOfflineTime = 0;
    lastBackoffResetTime = millis();

    // Run modem connectivity test
    testModemConnectivity();

    // Get network time
    int year, month, day;
    float timezone;
    bool networkTimeObtained = false;
    if (modemManager.getNetworkTime(&year, &month, &day, &currentHour, &currentMinute, &currentSecond, &timezone))
    {
        // Update logger with real time
        Logger.setRealTime(currentHour, currentMinute, currentSecond);

        // Record when we got network time
        lastNetworkTimeUpdate = millis();

        Logger.info(LOG_TAG_SYSTEM, "Network time obtained: %04d-%02d-%02d %02d:%02d:%02d (TZ: %.1f)",
                    year, month, day, currentHour, currentMinute, currentSecond, timezone);
        Logger.info(LOG_TAG_SYSTEM, "Sleep window: %02d:00 to %02d:00 (current: %02d:%02d)",
                    dynamicSleepStartHour, dynamicSleepEndHour, currentHour, currentMinute);
        networkTimeObtained = true;
    }
    else
    {
        Logger.warn(LOG_TAG_SYSTEM, "Failed to get network time - sleep check will be skipped during setup");
    }

    // Only check sleep time if we successfully obtained network time
    if (networkTimeObtained)
    {
        bool sleepTimeCheck = isSleepTime();
        Logger.info(LOG_TAG_SYSTEM, "Sleep check: isSleepTime()=%s, currentHour=%d, sleepStart=%d, sleepEnd=%d",
                    sleepTimeCheck ? "true" : "false", currentHour, dynamicSleepStartHour, dynamicSleepEndHour);
#ifdef DEBUG_MODE
        Logger.info(LOG_TAG_SYSTEM, "DEBUG_MODE is enabled - sleep is disabled for debugging");
#endif

        if (sleepTimeCheck)
        {
            Logger.info(LOG_TAG_SYSTEM, "It's sleep time. Entering deep sleep...");
            enterDeepSleepUntil(dynamicSleepEndHour, 0);
            return;
        }
    }
    else
    {
        Logger.info(LOG_TAG_SYSTEM, "Skipping initial sleep check due to failed network time retrieval");
    }

    // Initialize HTTP client
    if (!httpClient.init(modemManager, SERVER_ADDRESS, SERVER_PORT))
    {
        Logger.error(LOG_TAG_SYSTEM, "Failed to initialize HTTP client. Continuing without HTTP...");
    }
    else
    {
        // Initialize diagnostics manager with interval from config
        diagnosticsManager.init(modemManager, httpClient, dynamicDiagInterval);

        // Only proceed with network operations if GPRS is connected and not in backoff
        if (modemManager.isGprsConnected() && !httpClient.isConnectionThrottled())
        {
            // Send initial diagnostics data with minimal temperature reading
            float internalTemp = diagnosticsManager.readInternalTemperature();
            float externalTemp = externalTempSensor.readTemperature();
            if (externalTemp == DEVICE_DISCONNECTED_C)
            {
                externalTemp = -127.0f;
            }
            diagnosticsManager.sendDiagnostics(internalTemp, externalTemp);

            // Initialize configuration update time
            lastConfigUpdate = millis();

            // Fetch initial configuration
            handleRemoteConfiguration();

            // Check for sleep time again after initial config fetch (in case config changed sleep window)
            bool postConfigSleepCheck = isSleepTime();
            Logger.info(LOG_TAG_SYSTEM, "Post-config sleep check: isSleepTime()=%s, currentHour=%d, sleepWindow=%02d:00-%02d:00",
                        postConfigSleepCheck ? "true" : "false", currentHour, dynamicSleepStartHour, dynamicSleepEndHour);

            if (postConfigSleepCheck)
            {
                Logger.info(LOG_TAG_SYSTEM, "Sleep time detected after initial config fetch. Entering deep sleep...");
                enterDeepSleepUntil(dynamicSleepEndHour, 0);
                return;
            }
        }
        else
        {
            Logger.warn(LOG_TAG_SYSTEM, "Connection is throttled. Skipping initial diagnostics and config fetch.");
        }
    }

    // Initialize wind sensor
    if (windSensor.init(ANEMOMETER_PIN, WIND_VANE_PIN))
    {
        Logger.info(LOG_TAG_SYSTEM, "Wind sensor initialized successfully");

        // Set the interval for taking samples during an averaging period
        windSensor.setSampleInterval(dynamicWindSampleInterval);

        // Run calibration if enabled
        if (CALIBRATION_ENABLED)
        {
            Logger.info(LOG_TAG_SYSTEM, "Starting wind vane calibration mode");
            // Temporarily disable watchdog during calibration
            esp_task_wdt_deinit();
            windSensor.calibrateWindVane(CALIBRATION_TIME);
            // Re-enable watchdog after calibration
            setupWatchdog();
        }

        // Just print a single wind reading at initialization
        windSensor.printWindReading();

        // Start initial wind sampling period
        windSensor.startSamplingPeriod();
    }
    else
    {
        Logger.error(LOG_TAG_SYSTEM, "Failed to initialize wind sensor");
    }

    // Initialize external temperature sensor
    if (externalTempSensor.init(TEMP_BUS_EXT, "External"))
    {
        Logger.info(LOG_TAG_SYSTEM, "External temperature sensor initialized successfully");
        // Use blocking read during initialization for immediate feedback
        float temp = externalTempSensor.readTemperature();
        if (temp != DEVICE_DISCONNECTED_C)
        {
            Logger.info(LOG_TAG_SYSTEM, "Initial external temperature: %.2f°C", temp);
        }
        else
        {
            Logger.warn(LOG_TAG_SYSTEM, "Could not read from external temperature sensor");
        }
    }
    else
    {
        Logger.warn(LOG_TAG_SYSTEM, "Failed to initialize external temperature sensor (optional)");
    }

    // Check if it's OTA time
    checkAndInitOta();

    Logger.info(LOG_TAG_SYSTEM, "Setup complete");
}

/**
 * @brief Main program loop
 *
 * This function runs repeatedly after setup() completes.
 */
void loop()
{
    // Reset watchdog
    resetWatchdog();

    // Get current time
    unsigned long currentMillis = millis();

    // Check for uptime-based restart (4 hours of continuous operation)
    if (currentMillis >= UPTIME_RESTART_INTERVAL)
    {
        Logger.info(LOG_TAG_SYSTEM, "Uptime restart: Device has been running for %.1f hours, restarting for maintenance",
                    currentMillis / 3600000.0);
        delay(1000); // Give time for log to be sent
        ESP.restart();
        return; // This line won't be reached, but good practice
    }

    // Handle OTA if active (non-blocking)
    if (otaActive)
    {
        if (!otaManager.handle())
        {
            // OTA has timed out or ended
            otaActive = false;
            Logger.info(LOG_TAG_SYSTEM, "OTA mode ended");
        }
        // Continue with normal operations even during OTA
        // This allows sensors, modem, and other systems to keep working
    }

    // Check for OTA window periodically (every minute)
    if (currentMillis - lastOtaCheck >= 60000)
    {
        lastOtaCheck = currentMillis;
        checkAndInitOta();
    }

    // Update time from network periodically
    if (currentMillis - lastTimeUpdate >= dynamicTimeInterval)
    {
        lastTimeUpdate = currentMillis;

        int year, month, day;
        float timezone;
        if (modemManager.getNetworkTime(&year, &month, &day, &currentHour, &currentMinute, &currentSecond, &timezone))
        {
            // Update logger with real time
            Logger.setRealTime(currentHour, currentMinute, currentSecond);

            // Record when we got network time
            lastNetworkTimeUpdate = millis();

            Logger.info(LOG_TAG_SYSTEM, "Time updated: %04d-%02d-%02d %02d:%02d:%02d (TZ: %.1f)",
                        year, month, day, currentHour, currentMinute, currentSecond, timezone);
        }
        else
        {
            Logger.warn(LOG_TAG_SYSTEM, "Failed to update time from network");
        }

        // Check if it's sleep time
        bool sleepTimeCheck = isSleepTime();
        Logger.debug(LOG_TAG_SYSTEM, "Periodic sleep check: isSleepTime()=%s, currentHour=%d",
                     sleepTimeCheck ? "true" : "false", currentHour);

        if (sleepTimeCheck)
        {
            Logger.info(LOG_TAG_SYSTEM, "It's sleep time. Entering deep sleep...");
            enterDeepSleepUntil(dynamicSleepEndHour, 0);
            return;
        }
    }

    // EMERGENCY: Check for catastrophic connection failure loop
    // (currentMillis already declared above)

    // Reset connection failure counter if enough time has passed
    if (currentMillis - lastConnectionFailureTime > CONNECTION_FAILURE_RESET_TIME)
    {
        if (connectionFailureCount > 0)
        {
            Logger.info(LOG_TAG_SYSTEM, "Resetting connection failure count after %lu ms",
                        currentMillis - lastConnectionFailureTime);
            connectionFailureCount = 0;
        }
    }

    // Check if we've had too many connection failures recently
    if (connectionFailureCount >= MAX_CONNECTION_FAILURES)
    {
        if (!emergencyRecoveryMode)
        {
            Logger.error(LOG_TAG_SYSTEM, "EMERGENCY: Too many connection failures (%d), entering recovery mode",
                         connectionFailureCount);
            emergencyRecoveryMode = true;
            emergencyRecoveryStartTime = currentMillis;

            // Force modem reset
            if (modemManager.needsReset())
            {
                Logger.warn(LOG_TAG_SYSTEM, "EMERGENCY: Attempting modem reset");
                if (modemManager.resetModem())
                {
                    Logger.info(LOG_TAG_SYSTEM, "EMERGENCY: Modem reset successful, clearing failure count");
                    connectionFailureCount = 0;
                    emergencyRecoveryMode = false;
                }
                else
                {
                    Logger.error(LOG_TAG_SYSTEM, "EMERGENCY: Modem reset failed, entering non-blocking backoff");
                }
            }
        }

        // Non-blocking emergency recovery
        if (emergencyRecoveryMode)
        {
            if (currentMillis - emergencyRecoveryStartTime >= EMERGENCY_RECOVERY_DURATION)
            {
                Logger.info(LOG_TAG_SYSTEM, "EMERGENCY: Recovery period ended, clearing failure count");
                connectionFailureCount = 0;
                emergencyRecoveryMode = false;
            }
            else
            {
                // Skip connection attempts during recovery, but don't block
                Logger.debug(LOG_TAG_SYSTEM, "EMERGENCY: In recovery mode, skipping connection attempts");
                return; // Skip this loop iteration without blocking
            }
        }
    }

    // Maintain the connection, ensuring GPRS is active for data transmission.
    bool connectionSuccess = false;
    if (modemManager.isGprsConnected())
    {
        connectionSuccess = true;
    }
    else
    {
        // Only try to maintain connection if not in failure state
        if (connectionFailureCount < MAX_CONNECTION_FAILURES)
        {
            modemManager.maintainConnection(true);
            connectionSuccess = modemManager.isGprsConnected();
        }
    }

    // Track connection failures
    if (!connectionSuccess && connectionFailureCount < MAX_CONNECTION_FAILURES)
    {
        connectionFailureCount++;
        lastConnectionFailureTime = currentMillis;
        Logger.warn(LOG_TAG_SYSTEM, "Connection failure #%d recorded", connectionFailureCount);

        // If we've reached the limit, log it
        if (connectionFailureCount >= MAX_CONNECTION_FAILURES)
        {
            Logger.error(LOG_TAG_SYSTEM, "EMERGENCY: Connection failure limit reached, will trigger recovery next loop");
        }
    }
    else if (connectionSuccess && connectionFailureCount > 0)
    {
        Logger.info(LOG_TAG_SYSTEM, "Connection restored after %d failures", connectionFailureCount);
        connectionFailureCount = 0; // Reset on successful connection
    }

    // SAFETY MECHANISMS: Handle offline safety checks
    // A device is considered "online" if GPRS is connected AND not in HTTP backoff
    bool isOnline = connectionSuccess && !httpClient.isConnectionThrottled();
    handleOfflineSafetyMechanisms(currentMillis, isOnline);

    // Only proceed with network operations if GPRS is connected and not in backoff
    if (connectionSuccess && !httpClient.isConnectionThrottled())
    {
        // Send diagnostics data periodically
        if (currentMillis - lastDiagnosticsUpdate >= dynamicDiagInterval)
        {
            lastDiagnosticsUpdate = currentMillis;

            // Get temperature readings from main loop sensors to avoid conflicts
            float internalTemp = -127.0f; // Default to "no reading"
            float externalTemp = -127.0f; // Default to "no reading"

            // Try to get current temperature readings without blocking
            if (tempConversionStarted)
            {
                // If conversion is in progress, try to get non-blocking result
                externalTemp = externalTempSensor.getTemperatureNonBlocking();
                if (isnan(externalTemp))
                {
                    externalTemp = -127.0f; // Conversion still in progress
                }
            }
            else
            {
                // No conversion in progress, use last known values or start new reading
                externalTemp = externalTempSensor.readTemperature();
                if (externalTemp == DEVICE_DISCONNECTED_C)
                {
                    externalTemp = -127.0f;
                }
            }

            // Get internal temperature (this uses a different bus, so should be safe)
            internalTemp = diagnosticsManager.readInternalTemperature();

            // Send diagnostics with temperature readings to avoid sensor conflicts
            diagnosticsManager.sendDiagnostics(internalTemp, externalTemp);
        }

        // Fetch remote configuration periodically
        if (currentMillis - lastConfigUpdate >= DEFAULT_CONFIG_UPDATE_INTERVAL)
        {
            lastConfigUpdate = currentMillis;
            handleRemoteConfiguration();
        }

        // --- Wind Data Task (Dual Mode: Livestream vs. Averaged) ---
        const unsigned long LIVESTREAM_THRESHOLD_MS = 5000;

        if (dynamicWindInterval <= LIVESTREAM_THRESHOLD_MS)
        {
            // --- LIVESTREAM MODE ---
            if (currentMillis - lastWindUpdate >= dynamicWindInterval)
            {
                lastWindUpdate = currentMillis;

                // Get instantaneous wind data
                float windSpeed = windSensor.getWindSpeed();
                float windDirection = windSensor.getWindDirection();

                Logger.info(LOG_TAG_SYSTEM, "Livestream Wind: %.1f m/s at %.0f°", windSpeed, windDirection);

                // Send wind data to server
                if (httpClient.sendWindData(DEVICE_ID, windSpeed, windDirection))
                {
                    Logger.info(LOG_TAG_SYSTEM, "Livestream wind data sent successfully");
                }
                else
                {
                    Logger.warn(LOG_TAG_SYSTEM, "Failed to send livestream wind data");
                }
            }
        }
        else
        {
            // --- LOW-POWER AVERAGED MODE ---
            if (!isSamplingWind)
            {
                // Start a new sampling period if one isn't running
                Logger.info(LOG_TAG_SYSTEM, "Starting %lu-second wind sampling period.", dynamicWindInterval / 1000);
                windSensor.startSamplingPeriod();
                isSamplingWind = true;
            }

            // Check if the sampling period is complete.
            // getAveragedWindData is non-blocking and returns true only when data is ready.
            float avgSpeed, avgDirection;
            if (windSensor.getAveragedWindData(dynamicWindInterval, avgSpeed, avgDirection))
            {
                Logger.info(LOG_TAG_SYSTEM, "Averaged Wind: %.1f m/s at %.0f°", avgSpeed, avgDirection);

                // Send the averaged data to the server
                if (httpClient.sendWindData(DEVICE_ID, avgSpeed, avgDirection))
                {
                    Logger.info(LOG_TAG_SYSTEM, "Averaged wind data sent successfully");
                }
                else
                {
                    Logger.warn(LOG_TAG_SYSTEM, "Failed to send averaged wind data");
                }

                // Reset the flag to start a new sampling period on the next cycle
                isSamplingWind = false;
            }
        }

        // Measure and send temperature data periodically
        if (currentMillis - lastTemperatureUpdate >= dynamicTempInterval)
        {
            // Check if we need to start a new temperature conversion
            if (!tempConversionStarted)
            {
                // Start non-blocking temperature conversion
                if (externalTempSensor.startConversion())
                {
                    tempConversionStarted = true;
                    tempConversionStartTime = currentMillis;
                    Logger.debug(LOG_TAG_SYSTEM, "Started external temperature conversion");
                }
                else
                {
                    // Fallback to blocking read if non-blocking fails
                    Logger.warn(LOG_TAG_SYSTEM, "Non-blocking temperature conversion failed, using blocking read");
                    float externalTemp = externalTempSensor.readTemperature();

                    // Get internal temperature from diagnostics manager
                    float internalTemp = diagnosticsManager.readInternalTemperature();

                    if (externalTemp == DEVICE_DISCONNECTED_C)
                    {
                        externalTemp = -127.0; // Use -127 as an indicator of no reading
                        Logger.warn(LOG_TAG_SYSTEM, "Failed to read external temperature");
                    }

                    Logger.info(LOG_TAG_SYSTEM, "Temperature readings - Internal: %.2f°C, External: %.2f°C",
                                internalTemp, externalTemp);

                    // Send external temperature data to server (internal temp is sent in diagnostics)
                    if (httpClient.sendTemperatureData(DEVICE_ID, internalTemp, externalTemp))
                    {
                        Logger.info(LOG_TAG_SYSTEM, "Temperature data sent successfully");
                    }
                    else
                    {
                        Logger.warn(LOG_TAG_SYSTEM, "Failed to send temperature data");
                    }

                    lastTemperatureUpdate = currentMillis;
                }
            }
        }

        // Check if temperature conversion is complete
        if (tempConversionStarted)
        {
            float externalTemp = externalTempSensor.getTemperatureNonBlocking();

            if (!isnan(externalTemp))
            {
                // Conversion is complete
                tempConversionStarted = false;
                lastTemperatureUpdate = currentMillis;

                // Get internal temperature from diagnostics manager
                float internalTemp = diagnosticsManager.readInternalTemperature();

                if (externalTemp == DEVICE_DISCONNECTED_C)
                {
                    externalTemp = -127.0; // Use -127 as an indicator of no reading
                    Logger.warn(LOG_TAG_SYSTEM, "Failed to read external temperature");
                }

                Logger.info(LOG_TAG_SYSTEM, "Temperature readings - Internal: %.2f°C, External: %.2f°C",
                            internalTemp, externalTemp);

                // Send external temperature data to server (internal temp is sent in diagnostics)
                if (httpClient.sendTemperatureData(DEVICE_ID, internalTemp, externalTemp))
                {
                    Logger.info(LOG_TAG_SYSTEM, "Temperature data sent successfully");
                }
                else
                {
                    Logger.warn(LOG_TAG_SYSTEM, "Failed to send temperature data");
                }
            }
            else if (currentMillis - tempConversionStartTime > 200)
            {
                // Timeout after 200ms (should only take ~100ms)
                Logger.warn(LOG_TAG_SYSTEM, "Temperature conversion timeout, resetting");
                tempConversionStarted = false;
            }
        }
    }
    else
    {
        // Optional: Log that we are skipping network operations.
        // Note: This might become noisy if the connection is down for a long time.
        // Consider adding a flag to log this only once per disconnection.
        // For now, we'll keep it simple.
    }

    // Small delay to prevent excessive looping
    delay(100);
}

/**
 * @brief Handle offline safety mechanisms
 *
 * Implements three critical safety mechanisms:
 * 1. Maximum Total Offline Time - Force restart after 1 hour offline
 * 2. Backoff Reset Timer - Reset HTTP backoff every 30 minutes
 * 3. Emergency Full System Restart - Complete restart after extended offline time
 *
 * @param currentMillis Current time in milliseconds
 * @param isOnline Whether the device is currently online (GPRS connected and not throttled)
 */
void handleOfflineSafetyMechanisms(unsigned long currentMillis, bool isOnline)
{
    // Track online/offline state changes
    if (isOnline)
    {
        if (!hasBeenOnlineRecently)
        {
            // We just came back online
            Logger.info(LOG_TAG_SYSTEM, "SAFETY: Device back online, resetting offline tracking");
            hasBeenOnlineRecently = true;
            firstOfflineTime = 0;                 // Reset offline timer
            lastBackoffResetTime = currentMillis; // Reset backoff timer
        }
    }
    else
    {
        // We are currently offline
        if (hasBeenOnlineRecently)
        {
            // We just went offline
            Logger.warn(LOG_TAG_SYSTEM, "SAFETY: Device went offline, starting offline time tracking");
            firstOfflineTime = currentMillis;
            hasBeenOnlineRecently = false;
            lastBackoffResetTime = currentMillis; // Initialize backoff reset timer
        }

        // Check if we've been offline too long
        if (firstOfflineTime > 0)
        {
            unsigned long offlineTime = currentMillis - firstOfflineTime;

            // Safety Mechanism 1: Maximum Total Offline Time (1 hour)
            if (offlineTime >= MAX_OFFLINE_TIME)
            {
                Logger.error(LOG_TAG_SYSTEM, "SAFETY: Device offline for %.1f hours. FORCING COMPLETE RESTART!",
                             offlineTime / 3600000.0);

                // Log some diagnostics before restart
                Logger.error(LOG_TAG_SYSTEM, "SAFETY: Connection failure count: %d", connectionFailureCount);
                Logger.error(LOG_TAG_SYSTEM, "SAFETY: Emergency recovery mode: %s", emergencyRecoveryMode ? "true" : "false");
                Logger.error(LOG_TAG_SYSTEM, "SAFETY: HTTP throttled: %s", httpClient.isConnectionThrottled() ? "true" : "false");

                delay(1000);   // Give time for logs to be sent to serial
                ESP.restart(); // Force complete system restart
                return;        // This line won't be reached, but good practice
            }

            // Safety Mechanism 2: Backoff Reset Timer (every 30 minutes while offline)
            if (currentMillis - lastBackoffResetTime >= BACKOFF_RESET_INTERVAL)
            {
                Logger.warn(LOG_TAG_SYSTEM, "SAFETY: Been offline for %.1f minutes. Resetting HTTP backoff to force retry.",
                            offlineTime / 60000.0);

                // Reset the HTTP client backoff mechanism
                httpClient.resetBackoffForSafety();
                lastBackoffResetTime = currentMillis;

                // Also reset connection failure count to allow new attempts
                if (connectionFailureCount > 0)
                {
                    Logger.warn(LOG_TAG_SYSTEM, "SAFETY: Resetting connection failure count from %d to 0", connectionFailureCount);
                    connectionFailureCount = 0;
                    lastConnectionFailureTime = 0;
                }

                // Exit emergency recovery mode if active
                if (emergencyRecoveryMode)
                {
                    Logger.warn(LOG_TAG_SYSTEM, "SAFETY: Exiting emergency recovery mode to allow new connection attempts");
                    emergencyRecoveryMode = false;
                    emergencyRecoveryStartTime = 0;
                }
            }

            // Log offline status periodically (every 5 minutes)
            static unsigned long lastOfflineLog = 0;
            if (currentMillis - lastOfflineLog >= 300000) // 5 minutes
            {
                lastOfflineLog = currentMillis;
                Logger.warn(LOG_TAG_SYSTEM, "SAFETY: Device offline for %.1f minutes (restart in %.1f minutes)",
                            offlineTime / 60000.0, (MAX_OFFLINE_TIME - offlineTime) / 60000.0);
            }
        }
    }
}

/**
 * @brief Fetches and applies remote configuration and handles remote OTA requests.
 *
 * This function centralizes the logic for updating the device's configuration
 * from the remote server. It also checks for a remote OTA flag and initiates
 * the OTA process if requested.
 */
void handleRemoteConfiguration()
{
    Logger.info(LOG_TAG_SYSTEM, "Fetching remote configuration...");

    // Initialize variables with current values to detect if they were updated
    unsigned long tempInterval = dynamicTempInterval;
    unsigned long windInterval = dynamicWindInterval;
    unsigned long windSampleInterval = dynamicWindSampleInterval;
    unsigned long diagInterval = dynamicDiagInterval;
    unsigned long timeInterval = dynamicTimeInterval;
    unsigned long restartInterval = 0; // We ignore this value but keep it for API compatibility
    int sleepStartHour = dynamicSleepStartHour;
    int sleepEndHour = dynamicSleepEndHour;
    int otaHour = dynamicOtaHour;
    int otaMinute = dynamicOtaMinute;
    int otaDuration = dynamicOtaDuration;
    bool remoteOtaRequested = false; // Flag to check for remote OTA

    Logger.debug(LOG_TAG_SYSTEM, "Before fetch - tempInterval: %lu, windInterval: %lu, windSampleInterval: %lu",
                 tempInterval, windInterval, windSampleInterval);

    if (httpClient.fetchConfiguration(DEVICE_ID, &tempInterval, &windInterval, &windSampleInterval, &diagInterval,
                                      &timeInterval, &restartInterval, &sleepStartHour, &sleepEndHour,
                                      &otaHour, &otaMinute, &otaDuration, &remoteOtaRequested))
    {
        Logger.debug(LOG_TAG_SYSTEM, "After fetch - tempInterval: %lu, windInterval: %lu, windSampleInterval: %lu",
                     tempInterval, windInterval, windSampleInterval);

        // Apply configuration if values are valid (non-zero)
        if (tempInterval > 0)
        {
            dynamicTempInterval = tempInterval;
            Logger.info(LOG_TAG_SYSTEM, "Updated temperature interval to %lu ms", dynamicTempInterval);
        }

        if (windInterval > 0)
        {
            dynamicWindInterval = windInterval;
            Logger.info(LOG_TAG_SYSTEM, "Updated wind send interval to %lu ms", dynamicWindInterval);
        }

        if (windSampleInterval > 0)
        {
            dynamicWindSampleInterval = windSampleInterval;
            windSensor.setSampleInterval(dynamicWindSampleInterval);
            Logger.info(LOG_TAG_SYSTEM, "Updated wind sample interval to %lu ms", dynamicWindSampleInterval);
        }

        if (diagInterval > 0)
        {
            dynamicDiagInterval = diagInterval;
            diagnosticsManager.setInterval(dynamicDiagInterval);
            Logger.info(LOG_TAG_SYSTEM, "Updated diagnostics interval to %lu ms", dynamicDiagInterval);
        }

        if (timeInterval > 0)
        {
            dynamicTimeInterval = timeInterval;
            Logger.info(LOG_TAG_SYSTEM, "Updated time update interval to %lu ms", dynamicTimeInterval);
        }

        // Note: restartInterval is received from server for API compatibility but ignored
        // We use a fixed uptime-based restart (UPTIME_RESTART_INTERVAL) instead
        if (restartInterval > 0)
        {
            Logger.info(LOG_TAG_SYSTEM, "Received restart interval %lu seconds from server (ignored - using fixed uptime restart)", restartInterval);
        }

        if (sleepStartHour >= 0 && sleepStartHour < 24)
        {
            dynamicSleepStartHour = sleepStartHour;
            Logger.info(LOG_TAG_SYSTEM, "Updated sleep start hour to %d", dynamicSleepStartHour);
        }

        if (sleepEndHour >= 0 && sleepEndHour < 24)
        {
            dynamicSleepEndHour = sleepEndHour;
            Logger.info(LOG_TAG_SYSTEM, "Updated sleep end hour to %d", dynamicSleepEndHour);
        }

        if (otaHour >= 0 && otaHour < 24)
        {
            dynamicOtaHour = otaHour;
            Logger.info(LOG_TAG_SYSTEM, "Updated OTA hour to %d", dynamicOtaHour);
        }

        if (otaMinute >= 0 && otaMinute < 60)
        {
            dynamicOtaMinute = otaMinute;
            Logger.info(LOG_TAG_SYSTEM, "Updated OTA minute to %d", otaMinute);
        }

        if (otaDuration > 0)
        {
            dynamicOtaDuration = otaDuration;
            Logger.info(LOG_TAG_SYSTEM, "Updated OTA duration to %d minutes", dynamicOtaDuration);
        }

        // Check for remote OTA flag after config update
        if (!otaActive && remoteOtaRequested)
        {
            Logger.info(LOG_TAG_SYSTEM, "Remote OTA flag detected, attempting to start remote OTA...");
            if (checkAndInitRemoteOta())
            {
                // If OTA started successfully, confirm with the server to clear the flag
                Logger.info(LOG_TAG_SYSTEM, "Remote OTA started, confirming with server.");
                httpClient.confirmOtaStarted(DEVICE_ID);
            }
        }

        // Check for sleep time after configuration update
        bool sleepTimeCheck = isSleepTime();
        Logger.info(LOG_TAG_SYSTEM, "Sleep check after config update: isSleepTime()=%s, currentHour=%d, sleepWindow=%02d:00-%02d:00",
                    sleepTimeCheck ? "true" : "false", currentHour, dynamicSleepStartHour, dynamicSleepEndHour);

        if (sleepTimeCheck)
        {
            Logger.info(LOG_TAG_SYSTEM, "Sleep time detected after config update. Entering deep sleep...");
            enterDeepSleepUntil(dynamicSleepEndHour, 0);
            // Note: This will cause the device to restart, so execution won't continue past this point
            return;
        }
    }
    else
    {
        Logger.warn(LOG_TAG_SYSTEM, "Failed to fetch remote configuration. Using default values.");

        // Still check for sleep time even if config fetch failed
        bool sleepTimeCheck = isSleepTime();
        Logger.info(LOG_TAG_SYSTEM, "Sleep check after failed config fetch: isSleepTime()=%s, currentHour=%d, sleepWindow=%02d:00-%02d:00",
                    sleepTimeCheck ? "true" : "false", currentHour, dynamicSleepStartHour, dynamicSleepEndHour);

        if (sleepTimeCheck)
        {
            Logger.info(LOG_TAG_SYSTEM, "Sleep time detected after failed config fetch. Entering deep sleep...");
            enterDeepSleepUntil(dynamicSleepEndHour, 0);
            // Note: This will cause the device to restart, so execution won't continue past this point
            return;
        }
    }
}

/**
 * @brief Set up watchdog timer
 */
void setupWatchdog()
{
    Logger.debug(LOG_TAG_SYSTEM, "Setting up watchdog timer...");

    // Initialize watchdog with timeout in seconds
    esp_task_wdt_init(WDT_TIMEOUT / 1000, true);
    esp_task_wdt_add(NULL); // Add current thread to WDT watch

    Logger.debug(LOG_TAG_SYSTEM, "Watchdog timer set up with %d ms timeout", WDT_TIMEOUT);
}

/**
 * @brief Reset watchdog timer
 */
void resetWatchdog()
{
    if (esp_task_wdt_reset() != ESP_OK)
    {
        Logger.warn(LOG_TAG_SYSTEM, "Failed to reset watchdog timer");
    }
}

/**
 * @brief Check if it's time to sleep
 *
 * @return true if it's sleep time
 * @return false if it's not sleep time
 */
bool isSleepTime()
{
#ifdef DEBUG_MODE
    // In debug mode, never sleep to allow for continuous monitoring and debugging.
    Logger.debug(LOG_TAG_SYSTEM, "isSleepTime(): DEBUG_MODE enabled, sleep disabled");
    return false;
#else
    // Check if we have valid time information (network time has been obtained)
    // If currentHour, currentMinute, and currentSecond are all 0, it's likely we haven't obtained network time yet
    if (currentHour == 0 && currentMinute == 0 && currentSecond == 0)
    {
        Logger.debug(LOG_TAG_SYSTEM, "isSleepTime(): No valid time information available, assuming not sleep time");
        return false;
    }

    // Check if network time is too old (more than 2 hours since last update)
    if (lastNetworkTimeUpdate > 0 && (millis() - lastNetworkTimeUpdate) > 2 * 3600 * 1000)
    {
        Logger.debug(LOG_TAG_SYSTEM, "isSleepTime(): Network time is too old (%.1f hours), assuming not sleep time",
                     (millis() - lastNetworkTimeUpdate) / 3600000.0);
        return false;
    }

    // Additional validation: check if hour values are reasonable
    if (currentHour < 0 || currentHour > 23 ||
        dynamicSleepStartHour < 0 || dynamicSleepStartHour > 23 ||
        dynamicSleepEndHour < 0 || dynamicSleepEndHour > 23)
    {
        Logger.warn(LOG_TAG_SYSTEM, "isSleepTime(): Invalid hour values detected, assuming not sleep time");
        return false;
    }

    bool inSleepWindow;

    if (dynamicSleepStartHour == dynamicSleepEndHour)
    {
        // If start and end hours are the same, no sleep window is defined
        inSleepWindow = false;
        Logger.debug(LOG_TAG_SYSTEM, "isSleepTime(): Sleep start and end hours are the same, no sleep window");
    }
    else if (dynamicSleepStartHour < dynamicSleepEndHour)
    {
        // Sleep window is within the same day (e.g., 02:00 to 06:00)
        inSleepWindow = (currentHour >= dynamicSleepStartHour && currentHour < dynamicSleepEndHour);
        Logger.debug(LOG_TAG_SYSTEM, "isSleepTime(): Same-day sleep window (%02d:00-%02d:00), currentHour=%d, inWindow=%s",
                     dynamicSleepStartHour, dynamicSleepEndHour, currentHour, inSleepWindow ? "true" : "false");
    }
    else
    {
        // Sleep window crosses midnight (e.g., 23:00 to 06:00)
        inSleepWindow = (currentHour >= dynamicSleepStartHour || currentHour < dynamicSleepEndHour);
        Logger.debug(LOG_TAG_SYSTEM, "isSleepTime(): Midnight-crossing sleep window (%02d:00-%02d:00), currentHour=%d, inWindow=%s",
                     dynamicSleepStartHour, dynamicSleepEndHour, currentHour, inSleepWindow ? "true" : "false");
    }

    return inSleepWindow;
#endif
}

/**
 * @brief Enter deep sleep until specified time
 *
 * @param hour Hour to wake up (24-hour format)
 * @param minute Minute to wake up
 */
void enterDeepSleepUntil(int hour, int minute)
{
    Logger.info(LOG_TAG_SYSTEM, "Entering deep sleep until %02d:%02d", hour, minute);

    // Validate input parameters
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59)
    {
        Logger.error(LOG_TAG_SYSTEM, "Invalid wake-up time: %02d:%02d. Aborting sleep.", hour, minute);
        return;
    }

    // Validate current time
    if (currentHour < 0 || currentHour > 23 || currentMinute < 0 || currentMinute > 59)
    {
        Logger.error(LOG_TAG_SYSTEM, "Invalid current time: %02d:%02d:%02d. Aborting sleep.",
                     currentHour, currentMinute, currentSecond);
        return;
    }

    // Calculate time to sleep
    int targetSeconds = (hour * 3600) + (minute * 60);
    int currentSeconds = (currentHour * 3600) + (currentMinute * 60) + currentSecond;

    int sleepSeconds = targetSeconds - currentSeconds;
    if (sleepSeconds < 0)
    {
        sleepSeconds += 24 * 3600; // Add one day if target time is earlier
    }

    // Validate sleep duration (minimum 1 minute, maximum 23 hours)
    if (sleepSeconds < 60)
    {
        Logger.warn(LOG_TAG_SYSTEM, "Sleep duration too short (%d seconds). Extending to 1 minute.", sleepSeconds);
        sleepSeconds = 60;
    }
    else if (sleepSeconds > 23 * 3600)
    {
        Logger.warn(LOG_TAG_SYSTEM, "Sleep duration too long (%d seconds). Limiting to 23 hours.", sleepSeconds);
        sleepSeconds = 23 * 3600;
    }

    Logger.info(LOG_TAG_SYSTEM, "Current time: %02d:%02d:%02d, Wake-up time: %02d:%02d",
                currentHour, currentMinute, currentSecond, hour, minute);
    Logger.info(LOG_TAG_SYSTEM, "Sleeping for %d seconds (%.1f hours)", sleepSeconds, sleepSeconds / 3600.0);

    // Disconnect GPRS to save power before sleeping
    modemManager.maintainConnection(false);

    // Disable watchdog timer
    esp_task_wdt_deinit();

    // End OTA mode if active
    if (otaActive)
    {
        otaManager.end();
        otaActive = false;
    }

    // Power off modem completely before deep sleep
    // This ensures a single, robust shutdown path using our fixed powerOff() function
    Logger.info(LOG_TAG_SYSTEM, "Powering off modem before deep sleep");
    modemManager.powerOff();

    // Configure deep sleep wake-up timer
    esp_sleep_enable_timer_wakeup(sleepSeconds * 1000000ULL); // Convert to microseconds

    // Enter deep sleep
    esp_deep_sleep_start();
}

/**
 * @brief Test the modem's network connectivity
 *
 * Performs a series of tests to check the modem's network connection
 * and displays various details about the connection.
 */
void testModemConnectivity()
{
    Logger.info(LOG_TAG_SYSTEM, "Starting modem connectivity test...");

    // Temporarily disable watchdog for connectivity test
    Logger.debug(LOG_TAG_SYSTEM, "Temporarily disabling watchdog for connectivity test");
    esp_task_wdt_deinit();

    // Get signal quality
    int signalQuality = modemManager.getSignalQuality();
    Logger.info(LOG_TAG_SYSTEM, "Signal quality: %d dBm", signalQuality);

    // Get network parameters
    String networkParams = modemManager.getNetworkParams();
    Logger.info(LOG_TAG_SYSTEM, "Network parameters: %s", networkParams.c_str());

    // Get network-assigned APN
    String apn = modemManager.getNetworkAPN();
    Logger.info(LOG_TAG_SYSTEM, "Network APN: %s", apn.c_str());

    // Activate network connection
    if (modemManager.activateNetwork(true))
    {
        Logger.info(LOG_TAG_SYSTEM, "Network activated successfully");

        // Get IP address
        String ip = modemManager.getLocalIP();
        Logger.info(LOG_TAG_SYSTEM, "Local IP address: %s", ip.c_str());

        // Test connectivity with a reliable host
        if (modemManager.testConnectivity("google.com", 80))
        {
            Logger.info(LOG_TAG_SYSTEM, "Connectivity test to google.com:80 successful.");
        }
        else
        {
            Logger.error(LOG_TAG_SYSTEM, "Connectivity test to google.com:80 failed.");
        }
    }
    else
    {
        Logger.error(LOG_TAG_SYSTEM, "Failed to activate network");
    }

    Logger.info(LOG_TAG_SYSTEM, "Modem connectivity test completed");

    // Re-enable watchdog after connectivity test
    Logger.debug(LOG_TAG_SYSTEM, "Re-enabling watchdog after connectivity test");
    setupWatchdog();
}

/**
 * @brief Check if it's time for scheduled OTA update and initialize OTA mode if needed
 *
 * This function checks if the current time matches the configured OTA window and
 * activates OTA mode if it does. This only handles scheduled OTA, not remote OTA.
 *
 * @return true if OTA is active
 * @return false if it's not OTA time or initialization failed
 */
bool checkAndInitOta()
{
    // If OTA is already active, just return true
    if (otaActive)
    {
        return true;
    }

    // Check if it's time for OTA
    if (OtaManager::isOtaWindowActive(currentHour, currentMinute, dynamicOtaHour, dynamicOtaMinute, dynamicOtaDuration))
    {
        Logger.info(LOG_TAG_SYSTEM, "OTA window active. Starting OTA mode...");

        // Temporarily disable watchdog during OTA initialization
        Logger.debug(LOG_TAG_SYSTEM, "Temporarily disabling watchdog for OTA initialization");
        esp_task_wdt_deinit();

        // Initialize OTA manager
        if (otaManager.init(OTA_SSID, OTA_PASSWORD, OTA_UPDATE_PASSWORD, dynamicOtaDuration * 60 * 1000))
        {
            otaActive = true;
            Logger.info(LOG_TAG_SYSTEM, "OTA mode initialized successfully");

            // Re-enable watchdog after OTA initialization
            Logger.debug(LOG_TAG_SYSTEM, "Re-enabling watchdog after OTA initialization");
            setupWatchdog();

            return true;
        }
        else
        {
            Logger.error(LOG_TAG_SYSTEM, "Failed to initialize OTA mode");

            // Re-enable watchdog after failed OTA initialization
            Logger.debug(LOG_TAG_SYSTEM, "Re-enabling watchdog after failed OTA initialization");
            setupWatchdog();

            return false;
        }
    }

    return false;
}

/**
 * @brief Check for remote OTA activation and initialize OTA mode if needed
 *
 * This function activates OTA mode for remote updates.
 *
 * @return true if remote OTA is activated
 * @return false if remote OTA is not activated or initialization failed
 */
bool checkAndInitRemoteOta()
{
    // If OTA is already active, just return true
    if (otaActive)
    {
        return true;
    }

    Logger.info(LOG_TAG_SYSTEM, "Activating Remote OTA mode...");

    // Temporarily disable watchdog during OTA initialization
    Logger.debug(LOG_TAG_SYSTEM, "Temporarily disabling watchdog for OTA initialization");
    esp_task_wdt_deinit();

    // Initialize OTA manager with remote OTA duration
    if (otaManager.init(OTA_SSID, OTA_PASSWORD, OTA_UPDATE_PASSWORD, REMOTE_OTA_DURATION * 60 * 1000))
    {
        otaActive = true;
        Logger.info(LOG_TAG_SYSTEM, "Remote OTA mode initialized successfully");

        // Re-enable watchdog after OTA initialization
        Logger.debug(LOG_TAG_SYSTEM, "Re-enabling watchdog after OTA initialization");
        setupWatchdog();

        return true;
    }
    else
    {
        Logger.error(LOG_TAG_SYSTEM, "Failed to initialize remote OTA mode");

        // Re-enable watchdog after failed OTA initialization
        Logger.debug(LOG_TAG_SYSTEM, "Re-enabling watchdog after failed OTA initialization");
        setupWatchdog();

        return false;
    }
}
