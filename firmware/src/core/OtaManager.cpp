/**
 * @file OtaManager.cpp
 * @brief Implementation of the OTA update manager using ESP-WebOTA library
 */

#include "OtaManager.h"
#include <esp_adc_cal.h>

// Define the instance of OtaManager that will be used globally
OtaManager otaManager;

/**
 * @brief Constructor
 */
OtaManager::OtaManager() : _startTime(0), _timeoutMs(300000), _isInitialized(false)
{
}

/**
 * @brief Initialize OTA manager using ESP-WebOTA library
 *
 * @param apName The access point name (SSID)
 * @param apPassword The access point password (for WiFi connection)
 * @param otaUpdatePassword The password for OTA authentication (separate from WiFi)
 * @param timeoutMs Timeout in milliseconds after which WiFi is turned off
 * @return true if initialization was successful
 * @return false if initialization failed
 */
bool OtaManager::init(const char *apName, const char *apPassword, const char *otaUpdatePassword, unsigned long timeoutMs)
{
    if (_isInitialized)
    {
        return true;
    }

    Logger.info(LOG_TAG_OTA, "Initializing OTA manager with ESP-WebOTA...");

    // Store OTA password and timeout
    _otaPassword = String(otaUpdatePassword);
    _timeoutMs = timeoutMs;
    _startTime = millis();

    Logger.debug(LOG_TAG_OTA, "OTA update password set to: %s", _otaPassword.c_str());

    // Check if battery voltage is OK before starting OTA (skip in debug mode)
#ifndef DEBUG_MODE
    if (!isBatteryVoltageOk(OTA_MIN_BATTERY_VOLTAGE))
    {
        Logger.error(LOG_TAG_OTA, "Battery voltage too low for OTA. Aborting.");
        return false;
    }
#else
    float voltage = getBatteryVoltage();
    if (!isBatteryVoltageOk(OTA_MIN_BATTERY_VOLTAGE))
    {
        Logger.warn(LOG_TAG_OTA, "Battery voltage low (%.2f V) but allowing OTA in debug mode", voltage);
    }
#endif

    // Initialize WiFi in AP mode
    WiFi.mode(WIFI_AP);
    if (!WiFi.softAP(apName, apPassword))
    {
        Logger.error(LOG_TAG_OTA, "Failed to start access point");
        return false;
    }

    IPAddress ip = WiFi.softAPIP();
    Logger.info(LOG_TAG_OTA, "AP started with IP: %s", ip.toString().c_str());
    Logger.info(LOG_TAG_OTA, "SSID: %s", apName); // Initialize ESP-WebOTA
    // According to the README: webota.init(port, path);
    // Default port is 8080, but we can use 80. Path defaults to "/webota"
    webota.init(80, "/update");

    // Enable HTTP digest authentication for WebOTA
    // This will prompt for credentials before allowing uploads
    webota.useAuth("admin", otaUpdatePassword);

    Logger.info(LOG_TAG_OTA, "ESP-WebOTA initialized on port 80 at path /update with authentication");
    Logger.info(LOG_TAG_OTA, "Access OTA interface at: http://192.168.4.1/update");
    Logger.info(LOG_TAG_OTA, "Login: username='admin', password='%s'", otaUpdatePassword);

    // Set initialization flag
    _isInitialized = true;

    // Flash LED to indicate OTA mode is active
    pinMode(LED_PIN, OUTPUT);
    for (int i = 0; i < 5; i++)
    {
        digitalWrite(LED_PIN, LOW);
        delay(100);
        digitalWrite(LED_PIN, HIGH);
        delay(100);
    }

    return true;
}

/**
 * @brief Handle OTA updates using ESP-WebOTA
 *
 * This method should be called regularly to handle OTA updates.
 * It checks for timeout and handles web server requests.
 *
 * @return true if OTA is still active
 * @return false if OTA has timed out
 */
bool OtaManager::handle()
{
    if (!_isInitialized)
    {
        return false;
    }

    // Check if timeout has elapsed
    if (millis() - _startTime > _timeoutMs)
    {
        Logger.info(LOG_TAG_OTA, "OTA timeout reached after %lu ms", _timeoutMs);
        end();
        return false;
    }

    // Handle ESP-WebOTA requests
    webota.handle();

    // Blink LED periodically to indicate OTA mode is active
    if ((millis() / 500) % 2 == 0)
    {
        digitalWrite(LED_PIN, LOW);
    }
    else
    {
        digitalWrite(LED_PIN, HIGH);
    }

    return true;
}

/**
 * @brief Check if a specific time matches the OTA window
 *
 * @param hour Current hour (24-hour format)
 * @param minute Current minute
 * @param otaHour Hour when OTA should be active
 * @param otaMinute Minute when OTA should be active
 * @param otaDuration Duration in minutes that OTA window should be active
 * @return true if the current time is within the OTA window
 * @return false if the current time is outside the OTA window
 */
bool OtaManager::isOtaWindowActive(int hour, int minute, int otaHour, int otaMinute, int otaDuration)
{
    // Convert current time to minutes since midnight
    int currentMinutesSinceMidnight = hour * 60 + minute;

    // Convert OTA start time to minutes since midnight
    int otaStartMinutesSinceMidnight = otaHour * 60 + otaMinute;

    // Calculate OTA end time in minutes since midnight
    int otaEndMinutesSinceMidnight = otaStartMinutesSinceMidnight + otaDuration;

    // Check if current time is within OTA window
    if (otaEndMinutesSinceMidnight <= 24 * 60)
    {
        // Normal case: OTA window doesn't cross midnight
        return (currentMinutesSinceMidnight >= otaStartMinutesSinceMidnight &&
                currentMinutesSinceMidnight < otaEndMinutesSinceMidnight);
    }
    else
    {
        // Special case: OTA window crosses midnight
        otaEndMinutesSinceMidnight -= 24 * 60;
        return (currentMinutesSinceMidnight >= otaStartMinutesSinceMidnight ||
                currentMinutesSinceMidnight < otaEndMinutesSinceMidnight);
    }
}

/**
 * @brief Get battery voltage
 *
 * @return Current battery voltage
 */
float OtaManager::getBatteryVoltage()
{
    return BatteryUtils::readBatteryVoltage();
}

/**
 * @brief Check if battery voltage is sufficient for OTA updates
 *
 * @param minVoltage Minimum voltage required for OTA updates
 * @return true if battery voltage is sufficient
 * @return false if battery voltage is too low
 */
bool OtaManager::isBatteryVoltageOk(float minVoltage)
{
    float voltage = getBatteryVoltage();
    Logger.info(LOG_TAG_OTA, "Battery voltage: %.2f V (min: %.2f V)", voltage, minVoltage);
    return voltage >= minVoltage;
}

/**
 * @brief Terminate OTA mode
 *
 * This method turns off WiFi and cleans up resources.
 */
void OtaManager::end()
{
    if (!_isInitialized)
    {
        return;
    }

    Logger.info(LOG_TAG_OTA, "Ending OTA mode");

    // Turn off WiFi
    WiFi.disconnect();
    WiFi.mode(WIFI_OFF);

    // Reset initialization flag
    _isInitialized = false;
}
