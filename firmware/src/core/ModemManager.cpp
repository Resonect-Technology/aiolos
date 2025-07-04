/**
 * @file ModemManager.cpp
 * @brief Implementation of the SIM7000G modem manager
 */

#include "ModemManager.h"
#include "Logger.h"

ModemManager modemManager;

bool ModemManager::init()
{
    Logger.info(LOG_TAG_MODEM, "Initializing modem...");

    if (_initialized)
    {
        Logger.info(LOG_TAG_MODEM, "Modem already initialized");
        return true;
    }

    // First initialize the hardware (Serial, pins)
    if (!_initHardware())
    {
        Logger.error(LOG_TAG_MODEM, "Failed to initialize modem hardware");
        // Continue anyway - not a fatal error
    }

    // Power on the modem - with improved power-on sequence
    bool powerOnSuccess = powerOn();
    if (!powerOnSuccess)
    {
        Logger.error(LOG_TAG_MODEM, "Failed to power on modem");
        // Important: Return true anyway to prevent system restart
        // We'll try to work with limited functionality
        _initialized = true; // Mark as initialized to prevent repeated attempts
        return true;
    }

    // Get modem information - like in examples
    String modemName = _modem.getModemName();
    String modemInfo = _modem.getModemInfo();
    Logger.info(LOG_TAG_MODEM, "Modem Name: %s", modemName.c_str());
    Logger.info(LOG_TAG_MODEM, "Modem Info: %s", modemInfo.c_str());

    // Get IMEI - important for device identification
    String imei = getIMEI();
    Logger.info(LOG_TAG_MODEM, "Device IMEI: %s", imei.c_str());

    // Check SIM card status with retries - critical fix for SIM detection issues
    SimStatus simStatus = SIM_ERROR;
    int maxSimRetries = 5; // Try several times before giving up

    for (int i = 0; i < maxSimRetries; i++)
    {
        // Add delay between SIM checks to allow the SIM interface to stabilize
        if (i > 0)
        {
            Logger.debug(LOG_TAG_MODEM, "Waiting before SIM check attempt %d...", i + 1);
            delay(2000);
        }

        simStatus = getSimStatus();
        if (simStatus == SIM_READY)
        {
            Logger.info(LOG_TAG_MODEM, "SIM card is ready on attempt %d", i + 1);
            break;
        }
        else if (simStatus == SIM_LOCKED)
        {
            Logger.warn(LOG_TAG_MODEM, "SIM card is locked with PIN on attempt %d", i + 1);
            // If SIM is locked, you could handle PIN entry here if needed
            // For now, treat as an error case
        }
        else
        {
            Logger.warn(LOG_TAG_MODEM, "SIM card error on attempt %d, retrying...", i + 1);

            // Try sending some explicit AT commands that might help with SIM detection
            // These commands can help initialize the SIM interface on some modules
            if (i >= 2)
            { // Only on later attempts
                Logger.debug(LOG_TAG_MODEM, "Sending explicit SIM initialization commands");
                _modem.sendAT("+CFUN=0"); // Turn off RF
                _modem.waitResponse(1000);
                delay(500);
                _modem.sendAT("+CFUN=1"); // Turn on RF
                _modem.waitResponse(1000);
                delay(1000);
            }
        }
    }

    // CRITICAL CHANGE: Always mark the modem as initialized and return success
    // This prevents system restarts due to SIM card errors
    _initialized = true;

    // Continue with network setup even if SIM status is not SIM_READY
    // This allows the system to still function for non-cellular operations
    if (simStatus != SIM_READY)
    {
        Logger.error(LOG_TAG_MODEM, "SIM card not ready after %d attempts", maxSimRetries);
        Logger.warn(LOG_TAG_MODEM, "Continuing with limited functionality (no cellular connection)");
        return true; // Return success to prevent system restart
    }

    // Set network modes - simplified
    _modem.setPreferredMode(3); // CAT-M and NB-IoT
    _modem.setNetworkMode(2);   // Automatic

    Logger.info(LOG_TAG_MODEM, "Modem initialized successfully");
    return true;
}

bool ModemManager::_initHardware()
{
    Logger.debug(LOG_TAG_MODEM, "Setting up modem hardware...");

    // Configure modem pins with proper sequence
    // First set DTR pin - important for proper modem control
    pinMode(PIN_DTR, OUTPUT);
    digitalWrite(PIN_DTR, LOW); // DTR low to keep modem awake

    // Then set power pin
    pinMode(PWR_PIN, OUTPUT);
    digitalWrite(PWR_PIN, LOW); // Initial state of the power pin must be LOW

    // Add delay to ensure pin states are stable
    delay(100);

    // Initialize Serial with proper parameters
    // Close the serial port first in case it was already open
    SerialAT.end();
    delay(100);

    // Then reopen with proper settings
    SerialAT.begin(UART_BAUD, SERIAL_8N1, PIN_RX, PIN_TX);
    delay(300); // Allow serial to initialize

    // Flush any data in the buffer
    while (SerialAT.available())
    {
        SerialAT.read();
    }

    return true;
}

bool ModemManager::powerOn()
{
    Logger.info(LOG_TAG_MODEM, "Powering on modem...");

    // Check if ESP32 is waking from deep sleep
    bool fromDeepSleep = esp_sleep_get_wakeup_cause() == ESP_SLEEP_WAKEUP_TIMER;

    if (fromDeepSleep)
    {
        Logger.info(LOG_TAG_MODEM, "Waking up after ESP32 deep sleep");
        // Wake up the modem if coming from deep sleep
        return wakeUp(true);
    }

    // Disable watchdog during modem initialization - this operation takes a long time
    _setWatchdog(true);

    // IMPORTANT: First check if the modem is already responsive
    // The modem might already be on (as indicated by the diodes)
    Logger.debug(LOG_TAG_MODEM, "Checking if modem is already responsive...");

    // Clear buffer
    while (SerialAT.available())
    {
        SerialAT.read();
    }

    // Try AT command with a simple approach first
    for (int i = 0; i < 3; i++)
    {
        _modem.sendAT();
        if (_modem.waitResponse(1000) == 1)
        {
            Logger.info(LOG_TAG_MODEM, "Modem is already on and responsive");
            _setWatchdog(false);
            return true;
        }
        delay(500);
    }

    // If we get here, restart serial completely to ensure clean state
    SerialAT.end();
    delay(100);
    SerialAT.begin(UART_BAUD, SERIAL_8N1, PIN_RX, PIN_TX);
    delay(300);

    // Clear anything in the buffer
    while (SerialAT.available())
    {
        SerialAT.read();
    }

    // Make sure modem is in a known power state before attempting to power on
    Logger.debug(LOG_TAG_MODEM, "Setting up power state...");
    pinMode(PWR_PIN, OUTPUT);
    digitalWrite(PWR_PIN, LOW);
    delay(2000);

    // Send power pulse - this is the key to proper power-on
    Logger.debug(LOG_TAG_MODEM, "Sending power pulse");
    digitalWrite(PWR_PIN, HIGH);
    delay(1500); // Stick with the datasheet recommendation of ~1.2s (plus margin)
    digitalWrite(PWR_PIN, LOW);

    // Critical: Longer wait time for boot
    Logger.debug(LOG_TAG_MODEM, "Waiting for modem to boot...");
    delay(8000); // Increased to 8 seconds - this is crucial

    // Clear any boot messages
    while (SerialAT.available())
    {
        SerialAT.read();
    }

    // Test for AT response using direct TinyGSM approach
    Logger.debug(LOG_TAG_MODEM, "Testing AT response...");
    for (int i = 0; i < 5; i++)
    {
        Logger.debug(LOG_TAG_MODEM, "AT test attempt %d", i + 1);
        _modem.sendAT();

        int res = _modem.waitResponse(3000);
        if (res == 1)
        {
            Logger.info(LOG_TAG_MODEM, "Modem responded to AT on attempt %d", i + 1);
            _setWatchdog(false);
            return true;
        }

        // If we didn't get a response, try a different approach
        if (i == 2)
        {
            // Try hardware reset in the middle of attempts
            Logger.debug(LOG_TAG_MODEM, "No response, trying hardware toggle...");
            digitalWrite(PWR_PIN, HIGH);
            delay(100); // Short pulse
            digitalWrite(PWR_PIN, LOW);
            delay(2000);
        }

        delay(1000);
    }

    // Last resort: try using TinyGSM's restart
    Logger.debug(LOG_TAG_MODEM, "Trying modem restart...");
    _modem.sendAT("+CFUN=1,1"); // Software reset command
    _modem.waitResponse(10000);

    delay(5000);

    // Final check
    _modem.sendAT();
    if (_modem.waitResponse(3000) == 1)
    {
        Logger.info(LOG_TAG_MODEM, "Modem responsive after software reset");
        _setWatchdog(false);
        return true;
    }

    _setWatchdog(false);
    Logger.error(LOG_TAG_MODEM, "Modem is not responding after all attempts");
    return false;
}

bool ModemManager::powerOff()
{
    Logger.info(LOG_TAG_MODEM, "Powering off modem...");

    // Make sure modem is responsive before attempting software power down
    bool isResponsive = _modem.testAT(1000);

    if (isResponsive)
    {
        // First try software power down command as recommended in LilyGO examples
        Logger.debug(LOG_TAG_MODEM, "Attempting software power down");
        _modem.sendAT("+CPOWD=1");

        // Timeout of 10 seconds for power down command (based on LilyGO examples)
        if (_modem.waitResponse(10000) != 1)
        {
            Logger.warn(LOG_TAG_MODEM, "Software power down command failed");
            isResponsive = false; // Fall back to hardware power down
        }
        else
        {
            Logger.info(LOG_TAG_MODEM, "Software power down successful");
            // Wait for modem to shut down completely (LilyGO examples suggest 5s)
            Logger.debug(LOG_TAG_MODEM, "Waiting for modem to complete shutdown...");
            delay(5000);
            return true;
        }
    }
    else
    {
        Logger.debug(LOG_TAG_MODEM, "Modem not responsive, skipping software power down");
    }

    // If modem is not responsive or software power down failed, use hardware power down
    if (!isResponsive)
    {
        Logger.info(LOG_TAG_MODEM, "Using hardware power down method");

        // Make sure PWR_PIN is LOW first
        digitalWrite(PWR_PIN, LOW);
        delay(1000);

        // Apply power pulse
        digitalWrite(PWR_PIN, HIGH);
        delay(1500); // Datasheet Toff time = 1.2s
        digitalWrite(PWR_PIN, LOW);

        // Wait for modem to shut down completely
        delay(5000);

        Logger.info(LOG_TAG_MODEM, "Hardware power down completed");
    }

    return true;
}

void ModemManager::sendAT(const char *cmd, unsigned long timeout)
{
    // Extract the first 10 characters of the command or less if shorter
    char cmdPrefix[11] = {0};
    strncpy(cmdPrefix, cmd, 10);

    // Check if the command contains AT+CPIN or other sensitive commands
    if (strstr(cmd, "AT+CPIN") != NULL)
    {
        Logger.verbose(LOG_TAG_MODEM, "Sending PIN command (content hidden)");
    }
    else if (strstr(cmd, "AT+CPWD") != NULL)
    {
        Logger.verbose(LOG_TAG_MODEM, "Sending password command (content hidden)");
    }
    else
    {
        Logger.verbose(LOG_TAG_MODEM, "Sending AT command: %s...", cmdPrefix);
    }

    _modem.sendAT(cmd);
}

bool ModemManager::isNetworkConnected()
{
    return _modem.isNetworkConnected();
}

bool ModemManager::connectNetwork(int maxRetries)
{
    Logger.info(LOG_TAG_MODEM, "Connecting to network...");

    // Skip if SIM card wasn't detected during initialization
    if (!_initialized)
    {
        Logger.warn(LOG_TAG_MODEM, "Modem not properly initialized, skipping network connection");
        return false;
    }

    // Double-check SIM status before attempting network connection
    SimStatus simStatus = getSimStatus();
    if (simStatus != SIM_READY)
    {
        Logger.warn(LOG_TAG_MODEM, "SIM card not ready, skipping network connection");
        return false;
    }

    // Check if already connected
    if (_modem.isNetworkConnected())
    {
        Logger.info(LOG_TAG_MODEM, "Already connected to network");
        return true;
    }

    // Simple retry pattern from examples
    for (int attempt = 0; attempt < maxRetries; attempt++)
    {
        Logger.debug(LOG_TAG_MODEM, "Network connection attempt %d/%d", attempt + 1, maxRetries);

        // Disable watchdog during network connection
        _setWatchdog(true);

        // Direct approach as in LilyGO examples
        Logger.debug(LOG_TAG_MODEM, "Waiting for network registration...");
        if (_modem.waitForNetwork(60000L))
        {
            delay(1000);
            if (_modem.isNetworkConnected())
            {
                // Get network operator info for logging
                String operatorName = _modem.getOperator();
                Logger.info(LOG_TAG_MODEM, "Network connected to: %s", operatorName.c_str());

                // Log signal quality
                int csq = _modem.getSignalQuality();
                Logger.info(LOG_TAG_MODEM, "Signal quality: %d", csq);

                // Re-enable watchdog
                _setWatchdog(false);
                return true;
            }
        }

        // Re-enable watchdog
        _setWatchdog(false);

        Logger.warn(LOG_TAG_MODEM, "Network connection failed, retrying...");

        // Progressive backoff
        int delayTime = 5000 + (attempt * 1000);
        delay(delayTime);
    }

    Logger.error(LOG_TAG_MODEM, "Failed to connect to network after %d attempts", maxRetries);
    return false;
}

bool ModemManager::isGprsConnected()
{
    return _modem.isGprsConnected();
}

bool ModemManager::connectGprs(int maxRetries)
{
    Logger.info(LOG_TAG_MODEM, "Connecting to GPRS...");

    // Check if already connected
    if (_modem.isGprsConnected())
    {
        Logger.info(LOG_TAG_MODEM, "Already connected to GPRS");
        IPAddress ip = _modem.localIP();
        Logger.info(LOG_TAG_MODEM, "IP: %s", ip.toString().c_str());
        return true;
    }

    // Make sure we're connected to the network first
    if (!_modem.isNetworkConnected())
    {
        Logger.warn(LOG_TAG_MODEM, "Network not connected, attempting to connect first");
        if (!connectNetwork(1))
        {
            Logger.error(LOG_TAG_MODEM, "Network connection failed");
            return false;
        }
    }

    // Simple connection pattern from examples
    for (int attempt = 0; attempt < maxRetries; attempt++)
    {
        Logger.debug(LOG_TAG_MODEM, "GPRS connection attempt %d/%d", attempt + 1, maxRetries);

        // Disable watchdog during GPRS connection
        _setWatchdog(true);

        // Direct GPRS connection as in examples
        if (_modem.gprsConnect(APN, GPRS_USER, GPRS_PASS))
        {
            delay(1000);
            if (_modem.isGprsConnected())
            {
                IPAddress ip = _modem.localIP();
                Logger.info(LOG_TAG_MODEM, "GPRS connected with IP: %s", ip.toString().c_str());

                // Re-enable watchdog
                _setWatchdog(false);
                return true;
            }
        }

        // Re-enable watchdog
        _setWatchdog(false);

        Logger.warn(LOG_TAG_MODEM, "GPRS connection failed, retrying...");
        delay(5000);
    }

    Logger.error(LOG_TAG_MODEM, "Failed to connect to GPRS after %d attempts", maxRetries);
    return false;
}

bool ModemManager::getNetworkTime(int *year, int *month, int *day,
                                  int *hour, int *minute, int *second,
                                  float *timezone)
{
    Logger.debug(LOG_TAG_MODEM, "Getting network time...");

    if (_modem.getNetworkTime(year, month, day, hour, minute, second, timezone))
    {
        Logger.debug(LOG_TAG_MODEM, "Network time: %d-%d-%d %d:%d:%d",
                     *year, *month, *day, *hour, *minute, *second);
        return true;
    }

    Logger.warn(LOG_TAG_MODEM, "Failed to get network time");
    return false;
}

int ModemManager::getSignalQuality()
{
    int quality = _modem.getSignalQuality();
    Logger.debug(LOG_TAG_MODEM, "Signal quality: %d dBm", quality);
    return quality;
}

bool ModemManager::isResponsive()
{
    Logger.debug(LOG_TAG_MODEM, "Checking if modem is responsive...");

    // First flush any pending data
    while (SerialAT.available())
    {
        SerialAT.read();
    }

    // More direct approach to test AT command
    _modem.sendAT();
    int res = _modem.waitResponse(1000);

    if (res == 1)
    {
        Logger.debug(LOG_TAG_MODEM, "Modem is responsive");
        return true;
    }
    else if (res == 2)
    {
        Logger.debug(LOG_TAG_MODEM, "Modem returned ERROR but is responsive");
        return true; // Still consider responsive if it returns ERROR
    }
    else
    {
        Logger.debug(LOG_TAG_MODEM, "Modem is not responsive");
        return false;
    }
}

bool ModemManager::enterSleepMode(bool enableHold)
{
    Logger.info(LOG_TAG_MODEM, "Putting modem into sleep mode...");

    // Pull up DTR to put the modem into sleep as recommended in LilyGO examples
    pinMode(PIN_DTR, OUTPUT);
    digitalWrite(PIN_DTR, HIGH);

    // If hold is enabled, set DTR to keep high level during ESP32 deep sleep
    // This is important for power saving across deep sleep cycles
    if (enableHold)
    {
        Logger.debug(LOG_TAG_MODEM, "Enabling GPIO hold for DTR pin");
        gpio_hold_en((gpio_num_t)PIN_DTR);
        gpio_deep_sleep_hold_en();
    }

    // Send sleep command to modem via AT command
    // LilyGO examples use this approach for more reliable sleep mode entry
    if (!_modem.sleepEnable(true))
    {
        Logger.error(LOG_TAG_MODEM, "Failed to put modem to sleep via AT command");
        return false;
    }

    // Wait for sleep mode to take effect (LilyGO examples suggest 2 seconds)
    delay(2000);

    // Verify the modem is actually in sleep mode by checking responsiveness
    if (isResponsive())
    {
        Logger.warn(LOG_TAG_MODEM, "Modem still responsive after sleep command");
        return false;
    }

    Logger.info(LOG_TAG_MODEM, "Modem successfully entered sleep mode");
    return true;
}

bool ModemManager::wakeUp(bool fromDeepSleep)
{
    Logger.info(LOG_TAG_MODEM, "Waking up modem...");

    // Disable watchdog during wake-up process
    _setWatchdog(true);

    if (fromDeepSleep)
    {
        // Disable GPIO hold if waking from deep sleep
        Logger.debug(LOG_TAG_MODEM, "Disabling GPIO hold after deep sleep");
        gpio_hold_dis((gpio_num_t)PIN_DTR);
        gpio_deep_sleep_hold_dis(); // Disable the hold feature completely

        // Re-initialize serial after deep sleep
        SerialAT.end();
        delay(100);
        SerialAT.begin(UART_BAUD, SERIAL_8N1, PIN_RX, PIN_TX);
        delay(300);
    }

    // Pull down DTR to wake up modem as recommended in LilyGO examples
    pinMode(PIN_DTR, OUTPUT);
    digitalWrite(PIN_DTR, LOW);
    delay(1000); // Give the modem time to register the DTR change

    // Clear any pending serial data
    while (SerialAT.available())
    {
        SerialAT.read();
    }

    // Try to wake up the modem with progressively more aggressive methods
    Logger.debug(LOG_TAG_MODEM, "Sending wake commands...");

    // First try a simple AT command
    _modem.sendAT();
    if (_modem.waitResponse(3000) == 1)
    {
        Logger.info(LOG_TAG_MODEM, "Modem responded immediately to AT");
        _setWatchdog(false);
        return true;
    }

    // Then try disabling sleep mode via AT command
    Logger.debug(LOG_TAG_MODEM, "Sending sleep disable command");
    _modem.sleepEnable(false);
    delay(2000);

    // Check responsiveness with multiple attempts
    for (int i = 0; i < 5; i++)
    {
        _modem.sendAT();
        if (_modem.waitResponse(2000) == 1)
        {
            Logger.info(LOG_TAG_MODEM, "Modem woke up after sleep disable on attempt %d", i + 1);
            _setWatchdog(false);
            return true;
        }
        delay(1000);
    }

    // If still not responsive, try more aggressive wake-up with power pin toggle
    Logger.debug(LOG_TAG_MODEM, "Still not responsive, trying power pin toggle...");

    // Send a short pulse to the power pin (shorter than power-on)
    digitalWrite(PWR_PIN, HIGH);
    delay(100); // Just a short pulse to nudge the modem
    digitalWrite(PWR_PIN, LOW);
    delay(3000);

    // Final check for responsiveness
    for (int i = 0; i < 5; i++)
    {
        _modem.sendAT();
        if (_modem.waitResponse(2000) == 1)
        {
            Logger.info(LOG_TAG_MODEM, "Modem woke up after power pin toggle on attempt %d", i + 1);
            _setWatchdog(false);
            return true;
        }
        delay(1000);
    }

    // If we get here, the modem failed to wake up
    Logger.error(LOG_TAG_MODEM, "Failed to wake up modem after multiple attempts");
    _setWatchdog(false);
    return false;
}

/**
 * @brief Send a test HTTP request to check connectivity
 *
 * @param url The URL to connect to
 * @return true if successful
 * @return false if failed
 */
bool ModemManager::sendTestRequest(const char *url)
{
    Logger.info(LOG_TAG_MODEM, "Sending test HTTP request to %s", url);

    if (!isNetworkConnected() || !isGprsConnected())
    {
        Logger.error(LOG_TAG_MODEM, "Network or GPRS not connected");
        return false;
    }

    // Use the existing client in _client field instead of creating a new one
    TinyGsmClient &client = _client;

    // Parse URL to extract host and path
    String host, path;
    int port = 80;

    // Simple URL parser, assumes http:// protocol
    String urlStr = String(url);
    int hostStart = urlStr.indexOf("://");
    if (hostStart > 0)
    {
        hostStart += 3; // Skip "://"
    }
    else
    {
        hostStart = 0;
    }

    int pathStart = urlStr.indexOf("/", hostStart);
    if (pathStart > 0)
    {
        host = urlStr.substring(hostStart, pathStart);
        path = urlStr.substring(pathStart);
    }
    else
    {
        host = urlStr.substring(hostStart);
        path = "/";
    }

    // Check for port specification
    int portPos = host.indexOf(":");
    if (portPos > 0)
    {
        port = host.substring(portPos + 1).toInt();
        host = host.substring(0, portPos);
    }

    Logger.debug(LOG_TAG_MODEM, "Connecting to %s:%d%s", host.c_str(), port, path.c_str());

    // Connect to server
    if (!client.connect(host.c_str(), port))
    {
        Logger.error(LOG_TAG_MODEM, "Failed to connect to server");
        return false;
    }

    // Send HTTP GET request
    client.print(String("GET ") + path + " HTTP/1.1\r\n");
    client.print(String("Host: ") + host + "\r\n");
    client.print("Connection: close\r\n\r\n");

    // Wait for response
    unsigned long timeout = millis();
    while (client.connected() && millis() - timeout < 10000L)
    {
        while (client.available())
        {
            char c = client.read();
            // Only print first few characters to avoid flooding the log
            if (millis() - timeout < 1000)
            {
                Logger.verbose(LOG_TAG_MODEM, "%c", c);
            }
            timeout = millis();
        }
    }

    client.stop();
    Logger.info(LOG_TAG_MODEM, "Test request completed");
    return true;
}

ModemManager::SimStatus ModemManager::getSimStatus()
{
    Logger.debug(LOG_TAG_MODEM, "Checking SIM card status...");

    // Ensure the modem is responsive before checking SIM status
    if (!_modem.testAT(1000))
    {
        Logger.warn(LOG_TAG_MODEM, "Modem not responsive for SIM status check");
        return SIM_ERROR;
    }

    // First try CPIN? command - this is more reliable for SIM detection
    _modem.sendAT("+CPIN?");
    String response = "";
    int res = _modem.waitResponse(3000, response);

    // Log the raw response for debugging
    if (response.length() > 0)
    {
        Logger.debug(LOG_TAG_MODEM, "CPIN response: %s", response.c_str());
    }

    // Detect SIM based on response
    if (res == 1)
    {
        // Success response
        if (response.indexOf("READY") >= 0)
        {
            Logger.info(LOG_TAG_MODEM, "SIM card reports READY via CPIN");
            return SIM_READY;
        }
        else if (response.indexOf("SIM PIN") >= 0)
        {
            Logger.warn(LOG_TAG_MODEM, "SIM card is PIN locked");
            return SIM_LOCKED;
        }
    }

    // If CPIN didn't work, try alternate method
    Logger.debug(LOG_TAG_MODEM, "Using alternate SIM detection method");

    // Try CCID (SIM card ID) as a way to detect if SIM is present
    _modem.sendAT("+CCID");
    response = "";
    res = _modem.waitResponse(3000, response);

    if (res == 1 && response.length() > 10)
    {
        // If we got a long response, there's likely a SIM installed
        Logger.info(LOG_TAG_MODEM, "SIM detected via CCID");
        return SIM_READY;
    }

    // As a last resort, try TinyGSM's built-in method
    int gsmSimStatus = _modem.getSimStatus();

    Logger.debug(LOG_TAG_MODEM, "TinyGSM SIM status code: %d", gsmSimStatus);

    if (gsmSimStatus == 3)
    { // SIM_READY in TinyGSM
        Logger.info(LOG_TAG_MODEM, "SIM card is ready according to TinyGSM");
        return SIM_READY;
    }
    else if (gsmSimStatus == 2)
    { // SIM_LOCKED in TinyGSM
        Logger.warn(LOG_TAG_MODEM, "SIM card is locked with PIN according to TinyGSM");
        return SIM_LOCKED;
    }

    // If all methods failed, report error
    Logger.error(LOG_TAG_MODEM, "SIM card error or not present");
    return SIM_ERROR;
}

String ModemManager::getIMEI()
{
    Logger.debug(LOG_TAG_MODEM, "Getting modem IMEI...");
    String imei = _modem.getIMEI();
    Logger.info(LOG_TAG_MODEM, "Modem IMEI: %s", imei.c_str());
    return imei;
}

bool ModemManager::setPreferredMode(uint8_t mode)
{
    Logger.debug(LOG_TAG_MODEM, "Setting preferred network mode to %d", mode);

    // Set the mobile operation band first
    sendAT("+CBAND=ALL_MODE");
    if (_modem.waitResponse() != 1)
    {
        Logger.warn(LOG_TAG_MODEM, "Failed to set mobile operation band");
    }

    // Set the preferred mode
    if (_modem.setPreferredMode(mode))
    {
        Logger.info(LOG_TAG_MODEM, "Preferred mode set successfully");
        return true;
    }
    else
    {
        Logger.error(LOG_TAG_MODEM, "Failed to set preferred mode");
        return false;
    }
}

bool ModemManager::setNetworkMode(uint8_t mode)
{
    Logger.debug(LOG_TAG_MODEM, "Setting network mode to %d", mode);

    if (_modem.setNetworkMode(mode))
    {
        Logger.info(LOG_TAG_MODEM, "Network mode set successfully");
        return true;
    }
    else
    {
        Logger.error(LOG_TAG_MODEM, "Failed to set network mode");
        return false;
    }
}

String ModemManager::getNetworkAPN()
{
    Logger.debug(LOG_TAG_MODEM, "Getting network-assigned APN...");

    String res;
    sendAT("+CGNAPN");
    if (_modem.waitResponse(3000, res) != 1)
    {
        Logger.warn(LOG_TAG_MODEM, "Failed to send CGNAPN command");
        return "";
    }
    if (_modem.waitResponse(3000, res) == 1)
    {
        // Extract APN from response
        res = res.substring(res.indexOf(",") + 1);
        res.replace("\"", "");
        res.replace("\r", "");
        res.replace("\n", "");
        res.replace("OK", "");
        Logger.info(LOG_TAG_MODEM, "Network-assigned APN: %s", res.c_str());
    }
    else
    {
        Logger.warn(LOG_TAG_MODEM, "Failed to get network-assigned APN");
        res = "";
    }

    return res;
}

bool ModemManager::activateNetwork(bool on)
{
    Logger.debug(LOG_TAG_MODEM, "Activating network connection: %s", on ? "true" : "false");

    String cmd = "+CNACT=";
    cmd += on ? "1" : "0";

    sendAT(cmd.c_str());
    if (_modem.waitResponse(10000L) != 1)
    {
        Logger.error(LOG_TAG_MODEM, "Failed to send network activation command");
        return false;
    }
    if (_modem.waitResponse(10000L) == 1)
    {
        Logger.info(LOG_TAG_MODEM, "Network activation %s successful", on ? "on" : "off");
        return true;
    }
    else
    {
        Logger.error(LOG_TAG_MODEM, "Network activation %s failed", on ? "on" : "off");
        return false;
    }
}

String ModemManager::getLocalIP()
{
    Logger.debug(LOG_TAG_MODEM, "Getting local IP address...");

    String res;
    sendAT("+CNACT?");
    if (_modem.waitResponse("+CNACT: ") != 1)
    {
        Logger.warn(LOG_TAG_MODEM, "Failed to send CNACT query");
        return "";
    }
    if (_modem.waitResponse("+CNACT: ") == 1)
    {
        _modem.stream.read(); // Skip first character
        _modem.stream.read(); // Skip second character
        res = _modem.stream.readStringUntil('\n');
        res.replace("\"", "");
        res.replace("\r", "");
        res.replace("\n", "");
        _modem.waitResponse();
        Logger.info(LOG_TAG_MODEM, "Local IP address: %s", res.c_str());
    }
    else
    {
        Logger.warn(LOG_TAG_MODEM, "Failed to get local IP address");
        res = "";
    }

    return res;
}

String ModemManager::getNetworkParams()
{
    Logger.debug(LOG_TAG_MODEM, "Getting network parameters...");

    String res;
    sendAT("+CPSI?");
    if (_modem.waitResponse("+CPSI: ") != 1)
    {
        Logger.warn(LOG_TAG_MODEM, "Failed to send CPSI query");
        return "";
    }
    if (_modem.waitResponse("+CPSI: ") == 1)
    {
        res = _modem.stream.readStringUntil('\n');
        res.replace("\r", "");
        res.replace("\n", "");
        _modem.waitResponse();
        Logger.info(LOG_TAG_MODEM, "Network parameters: %s", res.c_str());
    }
    else
    {
        Logger.warn(LOG_TAG_MODEM, "Failed to get network parameters");
        res = "";
    }

    return res;
}

bool ModemManager::pingHost(const char *host, int count)
{
    Logger.info(LOG_TAG_MODEM, "Pinging host %s (%d times)", host, count);

    if (!isNetworkConnected() || !isGprsConnected())
    {
        Logger.error(LOG_TAG_MODEM, "Network or GPRS not connected");
        return false;
    }

    // Format ping command with timeout of 10 seconds and specified count
    String cmd = "+CIPPING=\"";
    cmd += host;
    cmd += "\",1,4,10";

    int successCount = 0;

    for (int i = 0; i < count; i++)
    {
        Logger.debug(LOG_TAG_MODEM, "Sending ping %d of %d", i + 1, count);

        sendAT(cmd.c_str());
        if (_modem.waitResponse(5000) != 1)
        {
            Logger.warn(LOG_TAG_MODEM, "Failed to send ping command");
            continue;
        }

        // Wait for ping response with timeout
        unsigned long start = millis();
        bool pingSuccess = false;
        String response;

        while (millis() - start < 15000)
        {
            if (_modem.stream.available())
            {
                response = _modem.stream.readString();

                // Check for success response
                if (response.indexOf("+CIPPING: 1,") >= 0)
                {
                    pingSuccess = true;
                    successCount++;
                    Logger.debug(LOG_TAG_MODEM, "Ping successful");
                    break;
                }

                // Check for error
                if (response.indexOf("ERROR") >= 0)
                {
                    Logger.debug(LOG_TAG_MODEM, "Ping error");
                    break;
                }
            }

            delay(100);
        }

        if (!pingSuccess)
        {
            Logger.debug(LOG_TAG_MODEM, "Ping timeout or failed");
        }

        // Wait between pings
        delay(1000);
    }

    // Consider success if at least one ping worked
    bool result = (successCount > 0);

    Logger.info(LOG_TAG_MODEM, "Ping test %s (%d/%d successful)",
                result ? "passed" : "failed", successCount, count);

    return result;
}
