/**
 * @file OtaManager.h
 * @brief OTA update manager for Aiolos Weather Station
 *
 * This class handles OTA (Over-The-Air) updates via WiFi.
 * It provides a web interface for uploading new firmware.
 *
 * @version 1.0.0
 * @date 2025-07-02
 */

#ifndef OTA_MANAGER_H
#define OTA_MANAGER_H

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Update.h>
#include "../config/Config.h"
#include "Logger.h"
#include "../utils/BatteryUtils.h"

/**
 * @brief Class for managing OTA updates
 */
class OtaManager
{
public:
    /**
     * @brief Constructor
     */
    OtaManager();

    /**
     * @brief Initialize OTA manager
     *
     * @param apName The access point name (SSID)
     * @param apPassword The access point password
     * @param otaPassword The password for OTA updates
     * @param timeoutMs Timeout in milliseconds after which WiFi is turned off
     * @return true if initialization was successful
     * @return false if initialization failed
     */
    bool init(const char *apName, const char *apPassword, const char *otaPassword, unsigned long timeoutMs = 300000);

    /**
     * @brief Handle OTA updates
     *
     * This method should be called regularly to handle OTA updates.
     * It checks for timeout and handles web server requests.
     *
     * @return true if OTA is still active
     * @return false if OTA has timed out
     */
    bool handle();

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
    static bool isOtaWindowActive(int hour, int minute, int otaHour, int otaMinute, int otaDuration);

    /**
     * @brief Get battery voltage
     *
     * @return Current battery voltage
     */
    float getBatteryVoltage();

    /**
     * @brief Check if battery voltage is sufficient for OTA updates
     *
     * @param minVoltage Minimum voltage required for OTA updates
     * @return true if battery voltage is sufficient
     * @return false if battery voltage is too low
     */
    bool isBatteryVoltageOk(float minVoltage);

    /**
     * @brief Terminate OTA mode
     *
     * This method turns off WiFi and cleans up resources.
     */
    void end();

private:
    WebServer _server;
    unsigned long _startTime;
    unsigned long _timeoutMs;
    String _otaPassword;
    bool _isInitialized;

    /**
     * @brief Set up web server routes
     */
    void setupWebServer();

    /**
     * @brief Handle root page request
     */
    void handleRoot();

    /**
     * @brief Handle update page request
     */
    void handleUpdate();

    /**
     * @brief Handle file upload
     */
    void handleFileUpload();

    /**
     * @brief Create HTML page
     *
     * @param title Page title
     * @param content Page content
     * @return String containing the HTML page
     */
    String createHtmlPage(const String &title, const String &content);

    /**
     * @brief Get system information
     *
     * @return String containing system information
     */
    String getSystemInfo();
};

extern OtaManager otaManager;

#endif // OTA_MANAGER_H
