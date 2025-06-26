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
#include "core/Diagnostics.h"
#include <Ticker.h>

// Global variables
Ticker periodicRestartTicker;
unsigned long lastTimeUpdate = 0;
unsigned long lastDiagnosticsUpdate = 0;
int currentHour = 0, currentMinute = 0, currentSecond = 0;

// Function prototypes
void setupWatchdog();
void resetWatchdog();
void periodicRestart();
bool isSleepTime();
void enterDeepSleepUntil(int hour, int minute);
void testModemConnectivity();

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
        enterDeepSleepUntil(SLEEP_END_HOUR, 0);
        return;
    }

    // Initialize sensors here
    // TODO: Add sensor initialization code

    // Schedule periodic restart
    periodicRestartTicker.attach(RESTART_INTERVAL, periodicRestart);

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

    // Update time from network periodically
    if (currentMillis - lastTimeUpdate >= TIME_UPDATE_INTERVAL)
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
            enterDeepSleepUntil(SLEEP_END_HOUR, 0);
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

    // Read and process sensor data here
    // TODO: Add sensor reading code

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
    return (currentHour >= SLEEP_START_HOUR || currentHour < SLEEP_END_HOUR);
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
