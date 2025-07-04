/**
 * @file OtaManager.cpp
 * @brief Implementation of OTA update manager
 */

#include "OtaManager.h"
#include <esp_adc_cal.h>

// Define the instance of OtaManager that will be used globally
OtaManager otaManager;

/**
 * @brief Constructor
 */
OtaManager::OtaManager() : _server(80), _startTime(0), _timeoutMs(300000), _isInitialized(false)
{
}

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
bool OtaManager::init(const char *apName, const char *apPassword, const char *otaPassword, unsigned long timeoutMs)
{
    if (_isInitialized)
    {
        return true;
    }

    Logger.info(LOG_TAG_OTA, "Initializing OTA manager...");

    // Store OTA password
    _otaPassword = String(otaPassword);

    // Set timeout
    _timeoutMs = timeoutMs;

    // Record start time
    _startTime = millis();

    // Initialize WiFi in AP mode
    WiFi.mode(WIFI_AP);

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

    // Start access point
    if (!WiFi.softAP(apName, apPassword))
    {
        Logger.error(LOG_TAG_OTA, "Failed to start access point");
        return false;
    }

    IPAddress ip = WiFi.softAPIP();
    Logger.info(LOG_TAG_OTA, "AP started with IP: %s", ip.toString().c_str());
    Logger.info(LOG_TAG_OTA, "SSID: %s", apName);

    // Setup web server
    setupWebServer();

    // Start web server
    _server.begin();
    Logger.info(LOG_TAG_OTA, "Web server started");

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
 * @brief Handle OTA updates
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

    // Handle web server requests
    _server.handleClient();

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

    // Stop web server
    _server.stop();

    // Turn off WiFi
    WiFi.disconnect();
    WiFi.mode(WIFI_OFF);

    // Reset initialization flag
    _isInitialized = false;
}

/**
 * @brief Set up web server routes
 */
void OtaManager::setupWebServer()
{
    // Serve root page
    _server.on("/", HTTP_GET, [this]()
               { handleRoot(); });

    // Serve update page
    _server.on("/update", HTTP_GET, [this]()
               { handleUpdate(); });

    // Handle file upload
    _server.on("/update", HTTP_POST, [this]()
               {
        _server.sendHeader("Connection", "close");
        _server.send(200, "text/plain", Update.hasError() ? "Update failed" : "Update success! Rebooting...");
        delay(1000);
        ESP.restart(); }, [this]()
               { handleFileUpload(); });

    // Serve 404 for unknown URLs
    _server.onNotFound([this]()
                       { _server.send(404, "text/plain", "Not found"); });
}

/**
 * @brief Handle root page request
 */
void OtaManager::handleRoot()
{
    String html = createHtmlPage("Aiolos Weather Station",
                                 "<h2>Aiolos Weather Station</h2>"
                                 "<p>Welcome to the OTA update interface.</p>"
                                 "<p><a href='/update'>Go to update page</a></p>"
                                 "<h3>System Information</h3>" +
                                     getSystemInfo());

    _server.send(200, "text/html", html);
}

/**
 * @brief Handle update page request
 */
void OtaManager::handleUpdate()
{
    String html = createHtmlPage("Firmware Update",
                                 "<h2>Firmware Update</h2>"
                                 "<form method='POST' action='/update' enctype='multipart/form-data'>"
                                 "    <div>"
                                 "        <label>Firmware file:</label>"
                                 "        <input type='file' name='update'>"
                                 "    </div>"
                                 "    <div>"
                                 "        <label>Password:</label>"
                                 "        <input type='password' name='password'>"
                                 "    </div>"
                                 "    <div>"
                                 "        <input type='submit' value='Update'>"
                                 "    </div>"
                                 "</form>"
                                 "<p><a href='/'>Back to home</a></p>");

    _server.send(200, "text/html", html);
}

/**
 * @brief Handle file upload
 */
void OtaManager::handleFileUpload()
{
    HTTPUpload &upload = _server.upload();

    // Check password
    if (upload.status == UPLOAD_FILE_START)
    {
        String password = _server.arg("password");
        if (password != _otaPassword)
        {
            Logger.error(LOG_TAG_OTA, "Invalid OTA password");
            _server.send(403, "text/plain", "Invalid password");
            return;
        }

        Logger.info(LOG_TAG_OTA, "Update started: %s", upload.filename.c_str());

        // Start update
        if (!Update.begin(UPDATE_SIZE_UNKNOWN))
        {
            Logger.error(LOG_TAG_OTA, "Not enough space for update");
            Update.printError(Serial);
        }
    }
    else if (upload.status == UPLOAD_FILE_WRITE)
    {
        // Write update data
        if (Update.write(upload.buf, upload.currentSize) != upload.currentSize)
        {
            Logger.error(LOG_TAG_OTA, "Error writing update");
            Update.printError(Serial);
        }
    }
    else if (upload.status == UPLOAD_FILE_END)
    {
        // Finish update
        if (Update.end(true))
        {
            Logger.info(LOG_TAG_OTA, "Update success: %u bytes", upload.totalSize);
        }
        else
        {
            Logger.error(LOG_TAG_OTA, "Update failed");
            Update.printError(Serial);
        }
    }
}

/**
 * @brief Create HTML page
 *
 * @param title Page title
 * @param content Page content
 * @return String containing the HTML page
 */
String OtaManager::createHtmlPage(const String &title, const String &content)
{
    return String("<!DOCTYPE html>"
                  "<html>"
                  "<head>"
                  "    <meta charset='UTF-8'>"
                  "    <meta name='viewport' content='width=device-width, initial-scale=1.0'>"
                  "    <title>") +
           title + "</title>"
                   "    <style>"
                   "        body { font-family: Arial, sans-serif; margin: 20px; }"
                   "        h2 { color: #333; }"
                   "        div { margin-bottom: 15px; }"
                   "        input[type='file'], input[type='password'], input[type='submit'] { padding: 8px; }"
                   "        a { color: #0066cc; text-decoration: none; }"
                   "        a:hover { text-decoration: underline; }"
                   "    </style>"
                   "</head>"
                   "<body>" +
           content +
           "</body>"
           "</html>";
}

/**
 * @brief Get system information
 *
 * @return String containing system information
 */
String OtaManager::getSystemInfo()
{
    String info = "<ul>";

    // Firmware version
    info += "<li>Firmware Version: " FIRMWARE_VERSION "</li>";

    // Uptime
    unsigned long uptimeSeconds = millis() / 1000;
    unsigned long uptimeMinutes = uptimeSeconds / 60;
    unsigned long uptimeHours = uptimeMinutes / 60;
    unsigned long uptimeDays = uptimeHours / 24;

    uptimeSeconds %= 60;
    uptimeMinutes %= 60;
    uptimeHours %= 24;

    char uptimeStr[50];
    sprintf(uptimeStr, "%lu days, %02lu:%02lu:%02lu", uptimeDays, uptimeHours, uptimeMinutes, uptimeSeconds);
    info += "<li>Uptime: " + String(uptimeStr) + "</li>";

    // Battery voltage
    float voltage = getBatteryVoltage();
    info += "<li>Battery Voltage: " + String(voltage, 2) + " V</li>";

    // Free heap
    info += "<li>Free Heap: " + String(ESP.getFreeHeap()) + " bytes</li>";

    // CPU frequency
    info += "<li>CPU Frequency: " + String(ESP.getCpuFreqMHz()) + " MHz</li>";

    // Flash size
    info += "<li>Flash Size: " + String(ESP.getFlashChipSize() / 1024 / 1024) + " MB</li>";

    // SDK version
    info += "<li>ESP-IDF Version: " + String(ESP.getSdkVersion()) + "</li>";

    info += "</ul>";
    return info;
}
