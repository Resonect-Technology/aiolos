/**
 * @file main.cpp
 * @brief Main application for the Aiolos Weather Station
 *
 * This is the entry point for the Aiolos Weather Station firmware.
 * It initializes all components and manages the main operation loop.
 *
 * @version 1.0.0
 * @date 2025-06-25
 */

#include <Arduino.h>
#include <esp_task_wdt.h>
#include "config/Config.h"
#include "core/Logger.h"
#include "core/ModemManager.h"
#include "core/HttpClient.h"
#include "core/DiagnosticsManager.h"
#include "core/OtaManager.h"
#include "sensors/WindSensor.h"
#include <Ticker.h>
#include <WiFi.h>

// Global variables
Ticker periodicRestartTicker;
unsigned long lastTimeUpdate = 0;
unsigned long lastDiagnosticsUpdate = 0;
unsigned long lastWindUpdate = 0;
unsigned long lastConfigUpdate = 0;
int currentHour = 0, currentMinute = 0, currentSecond = 0;
bool otaActive = false;
unsigned long lastOtaCheck = 0;

// Dynamic interval settings (can be updated via remote config)
unsigned long dynamicTempInterval = TEMP_INTERVAL;
unsigned long dynamicWindInterval = WIND_INTERVAL;
unsigned long dynamicDiagInterval = DIAG_INTERVAL;
unsigned long dynamicTimeInterval = TIME_UPDATE_INTERVAL;
unsigned long dynamicRestartInterval = RESTART_INTERVAL;
int dynamicSleepStartHour = SLEEP_START_HOUR;
int dynamicSleepEndHour = SLEEP_END_HOUR;
int dynamicOtaHour = OTA_HOUR;
int dynamicOtaMinute = OTA_MINUTE;
int dynamicOtaDuration = OTA_DURATION;

// Optional: Set to true to run wind vane calibration on startup
const bool CALIBRATION_MODE = false;
const unsigned long CALIBRATION_DURATION = 30000; // 30 seconds

// Function prototypes
void setupWatchdog();
void resetWatchdog();
void periodicRestart();
bool isSleepTime();
void enterDeepSleepUntil(int hour, int minute);
void testModemConnectivity();
bool checkAndInitOta();
bool checkAndInitRemoteOta(); // New function to check for remote OTA activation

/**
 * @brief Initial setup function
 *
 * Initializes all components and prepares the system for operation.
 */
void setup()
{
    // Initialize logger
    Logger.init();
    Logger.info(LOG_TAG_SYSTEM, "Aiolos Weather Station starting...");
    Logger.info(LOG_TAG_SYSTEM, "Firmware version: " FIRMWARE_VERSION);

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

    Logger.info(LOG_TAG_SYSTEM, "Connecting to network...");
    if (!modemManager.connectNetwork())
    {
        Logger.error(LOG_TAG_SYSTEM, "Failed to connect to network. Restarting...");
        delay(5000);
        ESP.restart();
        return;
    }

    Logger.info(LOG_TAG_SYSTEM, "Connecting to GPRS...");
    if (!modemManager.connectGprs())
    {
        Logger.error(LOG_TAG_SYSTEM, "Failed to connect to GPRS. Restarting...");
        delay(5000);
        ESP.restart();
        return;
    }

    // Re-enable watchdog after modem initialization
    Logger.debug(LOG_TAG_SYSTEM, "Re-enabling watchdog after modem initialization");
    setupWatchdog();

    // Run modem connectivity test
    testModemConnectivity();

    // Get network time
    int year, month, day;
    float timezone;
    if (modemManager.getNetworkTime(&year, &month, &day, &currentHour, &currentMinute, &currentSecond, &timezone))
    {
        Logger.info(LOG_TAG_SYSTEM, "Current time: %02d:%02d:%02d", currentHour, currentMinute, currentSecond);
    }
    else
    {
        Logger.warn(LOG_TAG_SYSTEM, "Failed to get network time");
    }

    // Check if it's sleep time
    if (isSleepTime())
    {
        Logger.info(LOG_TAG_SYSTEM, "It's sleep time. Entering deep sleep...");
        enterDeepSleepUntil(dynamicSleepEndHour, 0);
        return;
    }

    // Initialize HTTP client
    if (!httpClient.init(modemManager))
    {
        Logger.error(LOG_TAG_SYSTEM, "Failed to initialize HTTP client. Continuing without HTTP...");
    }
    else
    {
        // Initialize diagnostics manager with interval from config
        diagnosticsManager.init(modemManager, httpClient, dynamicDiagInterval);

        // Send initial diagnostics data
        diagnosticsManager.sendDiagnostics();

        // Initialize configuration update time
        lastConfigUpdate = millis();

        // Fetch initial configuration
        Logger.info(LOG_TAG_SYSTEM, "Fetching initial remote configuration...");
        unsigned long tempInterval, windInterval, diagInterval, timeInterval, restartInterval;
        int sleepStartHour, sleepEndHour, otaHour, otaMinute, otaDuration;

        if (httpClient.fetchConfiguration(DEVICE_ID, &tempInterval, &windInterval, &diagInterval,
                                          &timeInterval, &restartInterval, &sleepStartHour, &sleepEndHour,
                                          &otaHour, &otaMinute, &otaDuration))
        {
            // Apply configuration if values are valid (non-zero)
            if (tempInterval > 0)
            {
                dynamicTempInterval = tempInterval;
                Logger.info(LOG_TAG_SYSTEM, "Set temperature interval to %lu ms", dynamicTempInterval);
            }

            if (windInterval > 0)
            {
                dynamicWindInterval = windInterval;
                Logger.info(LOG_TAG_SYSTEM, "Set wind interval to %lu ms", dynamicWindInterval);
            }

            if (diagInterval > 0)
            {
                dynamicDiagInterval = diagInterval;
                diagnosticsManager.setInterval(dynamicDiagInterval);
                Logger.info(LOG_TAG_SYSTEM, "Set diagnostics interval to %lu ms", dynamicDiagInterval);
            }

            if (timeInterval > 0)
            {
                dynamicTimeInterval = timeInterval;
                Logger.info(LOG_TAG_SYSTEM, "Set time update interval to %lu ms", dynamicTimeInterval);
            }

            if (restartInterval > 0)
            {
                dynamicRestartInterval = restartInterval;
                // Update the restart ticker with the new interval
                periodicRestartTicker.detach();
                periodicRestartTicker.attach(dynamicRestartInterval, periodicRestart);
                Logger.info(LOG_TAG_SYSTEM, "Set restart interval to %lu seconds", dynamicRestartInterval);
            }

            if (sleepStartHour >= 0 && sleepStartHour < 24)
            {
                dynamicSleepStartHour = sleepStartHour;
                Logger.info(LOG_TAG_SYSTEM, "Set sleep start hour to %d", dynamicSleepStartHour);
            }

            if (sleepEndHour >= 0 && sleepEndHour < 24)
            {
                dynamicSleepEndHour = sleepEndHour;
                Logger.info(LOG_TAG_SYSTEM, "Set sleep end hour to %d", dynamicSleepEndHour);
            }

            if (otaHour >= 0 && otaHour < 24)
            {
                dynamicOtaHour = otaHour;
                Logger.info(LOG_TAG_SYSTEM, "Set OTA hour to %d", dynamicOtaHour);
            }

            if (otaMinute >= 0 && otaMinute < 60)
            {
                dynamicOtaMinute = otaMinute;
                Logger.info(LOG_TAG_SYSTEM, "Set OTA minute to %d", dynamicOtaMinute);
            }

            if (otaDuration > 0)
            {
                dynamicOtaDuration = otaDuration;
                Logger.info(LOG_TAG_SYSTEM, "Set OTA duration to %d minutes", dynamicOtaDuration);
            }
        }
        else
        {
            Logger.warn(LOG_TAG_SYSTEM, "Failed to fetch initial remote configuration. Using default values.");
        }

        // Check for remote OTA flag after initial config
        if (!otaActive)
        {
            bool remoteOtaRequested = false;
            if (httpClient.fetchConfiguration(DEVICE_ID, &tempInterval, &windInterval, &diagInterval,
                                              &timeInterval, &restartInterval, &sleepStartHour, &sleepEndHour,
                                              &otaHour, &otaMinute, &otaDuration, &remoteOtaRequested))
            {
                if (remoteOtaRequested)
                {
                    Logger.info(LOG_TAG_SYSTEM, "Remote OTA flag detected during initial configuration");
                    checkAndInitRemoteOta();

                    // Clear the flag after activation attempt
                    remoteOtaRequested = false;
                    httpClient.fetchConfiguration(DEVICE_ID, &tempInterval, &windInterval, &diagInterval,
                                                  &timeInterval, &restartInterval, &sleepStartHour, &sleepEndHour,
                                                  &otaHour, &otaMinute, &otaDuration, &remoteOtaRequested);
                }
            }
        }
    }

    // Initialize wind sensor
    if (windSensor.init(ANEMOMETER_PIN, WIND_VANE_PIN))
    {
        Logger.info(LOG_TAG_SYSTEM, "Wind sensor initialized successfully");

        // Run calibration if enabled
        if (CALIBRATION_MODE)
        {
            Logger.info(LOG_TAG_SYSTEM, "Starting wind vane calibration mode");
            // Temporarily disable watchdog during calibration
            esp_task_wdt_deinit();
            windSensor.calibrateWindVane(CALIBRATION_DURATION);
            // Re-enable watchdog after calibration
            setupWatchdog();
        }

        // Just print a single wind reading at initialization
        windSensor.printWindReading();
    }
    else
    {
        Logger.error(LOG_TAG_SYSTEM, "Failed to initialize wind sensor");
    }

    // Schedule periodic restart
    periodicRestartTicker.attach(dynamicRestartInterval, periodicRestart);

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

    // Handle OTA if active
    if (otaActive)
    {
        if (!otaManager.handle())
        {
            // OTA has timed out or ended
            otaActive = false;
            Logger.info(LOG_TAG_SYSTEM, "OTA mode ended");
        }
        else
        {
            // If OTA is active, only handle OTA and skip other operations
            delay(100);
            return;
        }
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
            Logger.info(LOG_TAG_SYSTEM, "Updated time: %02d:%02d:%02d", currentHour, currentMinute, currentSecond);
        }
        else
        {
            Logger.warn(LOG_TAG_SYSTEM, "Failed to update time from network");
        }

        // Check if it's sleep time
        if (isSleepTime())
        {
            Logger.info(LOG_TAG_SYSTEM, "It's sleep time. Entering deep sleep...");
            enterDeepSleepUntil(dynamicSleepEndHour, 0);
            return;
        }
    }

    // Check network connectivity
    if (!modemManager.isNetworkConnected() || !modemManager.isGprsConnected())
    {
        Logger.warn(LOG_TAG_SYSTEM, "Network connection lost. Reconnecting...");

        // Temporarily disable watchdog for reconnection
        Logger.debug(LOG_TAG_SYSTEM, "Temporarily disabling watchdog for network reconnection");
        esp_task_wdt_deinit();

        if (!modemManager.connectNetwork() || !modemManager.connectGprs())
        {
            Logger.error(LOG_TAG_SYSTEM, "Failed to reconnect. Restarting modem...");
            modemManager.powerOff();
            delay(1000);
            modemManager.powerOn();

            if (!modemManager.connectNetwork() || !modemManager.connectGprs())
            {
                Logger.error(LOG_TAG_SYSTEM, "Failed to reconnect after modem restart. Rebooting...");
                delay(5000);
                ESP.restart();
                return;
            }
        }

        // Re-enable watchdog after reconnection
        Logger.debug(LOG_TAG_SYSTEM, "Re-enabling watchdog after network reconnection");
        setupWatchdog();
    }

    // Send diagnostics data periodically
    if (currentMillis - lastDiagnosticsUpdate >= dynamicDiagInterval)
    {
        lastDiagnosticsUpdate = currentMillis;
        diagnosticsManager.sendDiagnostics();
    }

    // Fetch remote configuration periodically
    if (currentMillis - lastConfigUpdate >= CONFIG_UPDATE_INTERVAL)
    {
        lastConfigUpdate = currentMillis;

        Logger.info(LOG_TAG_SYSTEM, "Fetching remote configuration...");
        unsigned long tempInterval, windInterval, diagInterval, timeInterval, restartInterval;
        int sleepStartHour, sleepEndHour, otaHour, otaMinute, otaDuration;
        bool remoteOtaRequested = false;

        if (httpClient.fetchConfiguration(DEVICE_ID, &tempInterval, &windInterval, &diagInterval,
                                          &timeInterval, &restartInterval, &sleepStartHour, &sleepEndHour,
                                          &otaHour, &otaMinute, &otaDuration))
        {
            // Apply configuration if values are valid (non-zero)
            if (tempInterval > 0)
            {
                dynamicTempInterval = tempInterval;
                Logger.info(LOG_TAG_SYSTEM, "Updated temperature interval to %lu ms", dynamicTempInterval);
            }

            if (windInterval > 0)
            {
                dynamicWindInterval = windInterval;
                Logger.info(LOG_TAG_SYSTEM, "Updated wind interval to %lu ms", dynamicWindInterval);
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

            if (restartInterval > 0)
            {
                dynamicRestartInterval = restartInterval;
                // Update the restart ticker with the new interval
                periodicRestartTicker.detach();
                periodicRestartTicker.attach(dynamicRestartInterval, periodicRestart);
                Logger.info(LOG_TAG_SYSTEM, "Updated restart interval to %lu seconds", dynamicRestartInterval);
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
                Logger.info(LOG_TAG_SYSTEM, "Updated OTA minute to %d", dynamicOtaMinute);
            }

            if (otaDuration > 0)
            {
                dynamicOtaDuration = otaDuration;
                Logger.info(LOG_TAG_SYSTEM, "Updated OTA duration to %d minutes", dynamicOtaDuration);
            }
        }
        else
        {
            Logger.warn(LOG_TAG_SYSTEM, "Failed to fetch remote configuration. Using default values.");
        }

        // Check for remote OTA flag after config update
        if (!otaActive)
        {
            bool remoteOtaRequested = false;
            if (httpClient.fetchConfiguration(DEVICE_ID, &tempInterval, &windInterval, &diagInterval,
                                              &timeInterval, &restartInterval, &sleepStartHour, &sleepEndHour,
                                              &otaHour, &otaMinute, &otaDuration, &remoteOtaRequested))
            {
                if (remoteOtaRequested)
                {
                    Logger.info(LOG_TAG_SYSTEM, "Remote OTA flag detected during configuration check");
                    checkAndInitRemoteOta();

                    // Clear the flag after activation attempt
                    remoteOtaRequested = false;
                    httpClient.fetchConfiguration(DEVICE_ID, &tempInterval, &windInterval, &diagInterval,
                                                  &timeInterval, &restartInterval, &sleepStartHour, &sleepEndHour,
                                                  &otaHour, &otaMinute, &otaDuration, &remoteOtaRequested);
                }
            }
        }
    }

    // Measure and print wind data periodically
    if (currentMillis - lastWindUpdate >= dynamicWindInterval)
    {
        lastWindUpdate = currentMillis;

        // Read and print wind data
        windSensor.printWindReading(dynamicWindInterval);
    }

    // Small delay to prevent excessive looping
    delay(100);
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
 * @brief Periodic restart function
 */
void periodicRestart()
{
    Logger.info(LOG_TAG_SYSTEM, "Periodic restart initiated");
    ESP.restart();
}

/**
 * @brief Check if it's time to sleep
 *
 * @return true if it's sleep time
 * @return false if it's not sleep time
 */
bool isSleepTime()
{
    return (currentHour >= dynamicSleepStartHour || currentHour < dynamicSleepEndHour);
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

    // Calculate time to sleep
    int targetSeconds = (hour * 3600) + (minute * 60);
    int currentSeconds = (currentHour * 3600) + (currentMinute * 60) + currentSecond;

    int sleepSeconds = targetSeconds - currentSeconds;
    if (sleepSeconds < 0)
    {
        sleepSeconds += 24 * 3600; // Add one day if target time is earlier
    }

    Logger.info(LOG_TAG_SYSTEM, "Sleeping for %d seconds", sleepSeconds);

    // Disable watchdog timer
    esp_task_wdt_deinit();

    // End OTA mode if active
    if (otaActive)
    {
        otaManager.end();
        otaActive = false;
    }

    // Put modem into sleep mode with GPIO hold enabled
    if (modemManager.enterSleepMode(true))
    {
        Logger.info(LOG_TAG_SYSTEM, "Modem entered sleep mode successfully");
    }
    else
    {
        Logger.warn(LOG_TAG_SYSTEM, "Failed to put modem to sleep, powering off instead");
        modemManager.powerOff();
    }

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

        // Try pinging a reliable host
        if (modemManager.pingHost("8.8.8.8", 4))
        {
            Logger.info(LOG_TAG_SYSTEM, "Ping test successful");

            // If ping works, try HTTP too
            if (modemManager.sendTestRequest("http://aiolos.resonect.cz"))
            {
                Logger.info(LOG_TAG_SYSTEM, "Test HTTP request successful");
            }
            else
            {
                Logger.warn(LOG_TAG_SYSTEM, "Test HTTP request failed but ping worked");
            }
        }
        else
        {
            Logger.error(LOG_TAG_SYSTEM, "Ping test failed");
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
        if (otaManager.init(OTA_SSID, OTA_PASSWORD, OTA_PASSWORD, dynamicOtaDuration * 60 * 1000))
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
    if (otaManager.init(OTA_SSID, OTA_PASSWORD, OTA_PASSWORD, REMOTE_OTA_DURATION * 60 * 1000))
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
