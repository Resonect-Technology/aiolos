/**
 * @file ModemManager.cpp
 * @brief Implementation of the SIM7000G modem manager
 */

#include "ModemManager.h"
#include "Logger.h"
#include "config/Config.h" // Include config for APN constant
#include <Arduino.h>       // For Arduino types and functions

ModemManager modemManager;

// Static const member definitions
const int ModemManager::MAX_CONSECUTIVE_FAILURES;
const unsigned long ModemManager::MIN_BACKOFF_DELAY;
const unsigned long ModemManager::MAX_BACKOFF_DELAY;
const unsigned long ModemManager::MIN_RESET_INTERVAL;
const unsigned long ModemManager::UNRESPONSIVE_TIMEOUT;

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

    // Get and log IMEI as recommended by instructions
    String imei = _modem.getIMEI();
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
    // _modem.setPreferredMode(3); // CAT-M and NB-IoT
    // _modem.setNetworkMode(2);   // Automatic

    // Set network modes as per reference code for better reliability
    Logger.info(LOG_TAG_MODEM, "Configuring network modes...");

    _modem.sendAT("+CFUN=0");
    if (_modem.waitResponse(10000L) != 1)
    {
        Logger.warn(LOG_TAG_MODEM, "Failed to set CFUN=0");
    }
    delay(200);

    if (!_modem.setNetworkMode(2)) // Automatic
    {
        Logger.warn(LOG_TAG_MODEM, "Failed to set network mode");
    }
    delay(200);

    if (!_modem.setPreferredMode(3)) // CAT-M and NB-IoT
    {
        Logger.warn(LOG_TAG_MODEM, "Failed to set preferred mode");
    }
    delay(200);

    _modem.sendAT("+CFUN=1");
    if (_modem.waitResponse(10000L) != 1)
    {
        Logger.warn(LOG_TAG_MODEM, "Failed to set CFUN=1");
    }
    delay(200);

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

    // Then set power pin - CRITICAL: Based on issue #251, pin logic is INVERTED
    // Due to NPN transistor: GPIO HIGH = LOW to modem, GPIO LOW = HIGH to modem
    // NOTE: Reset pin also has inverted levels (issue #251 comment)
    pinMode(PWR_PIN, OUTPUT);
    digitalWrite(PWR_PIN, HIGH); // This sends LOW to modem (default off state)

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

    // CRITICAL: Use correct power-on sequence with inverted logic understanding
    // Based on issue #251: GPIO levels are inverted due to NPN transistor
    Logger.debug(LOG_TAG_MODEM, "Setting up power-on sequence...");
    pinMode(PWR_PIN, OUTPUT);

    // Power-on sequence: LOW pulse (which becomes HIGH to modem for power-on)
    digitalWrite(PWR_PIN, HIGH); // Start with modem OFF (LOW to modem)
    delay(100);                  // Ensure stable state
    digitalWrite(PWR_PIN, LOW);  // Send power-on pulse (HIGH to modem)
    delay(1000);                 // Hold for at least 1 second (SIM7000 requirement)
    digitalWrite(PWR_PIN, HIGH); // Return to default state (LOW to modem)

    // Critical: Wait for boot
    Logger.debug(LOG_TAG_MODEM, "Waiting for modem to boot...");
    delay(3000);

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
            // Try hardware power toggle (considering inverted logic)
            Logger.debug(LOG_TAG_MODEM, "No response, trying hardware toggle...");
            digitalWrite(PWR_PIN, LOW);  // Send power pulse (HIGH to modem)
            delay(100);                  // Short pulse
            digitalWrite(PWR_PIN, HIGH); // Return to default (LOW to modem)
            delay(2000);
        }

        delay(1000);
    }

    // Last resort: try using TinyGSM's restart like manufacturer
    Logger.debug(LOG_TAG_MODEM, "Trying modem restart...");
    if (!_modem.restart())
    {
        Logger.warn(LOG_TAG_MODEM, "Modem restart failed, trying init...");
        if (!_modem.init())
        {
            Logger.error(LOG_TAG_MODEM, "Modem init also failed");
            _setWatchdog(false);
            return false;
        }
    }

    // Final check
    _modem.sendAT();
    if (_modem.waitResponse(3000) == 1)
    {
        Logger.info(LOG_TAG_MODEM, "Modem responsive after restart/init");
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

    /*
     * CRITICAL MODEM POWER-OFF SEQUENCE
     *
     * This implementation fixes the persistent modem power-off issue described in:
     * - GitHub issue #146: Modem restarts after power-off
     * - GitHub issue #251: Pin logic is inverted due to NPN transistor
     * - GitHub issue #144: Related power management issues
     *
     * Key fixes applied:
     * 1. Send AT+CPOWD=1 command twice for enhanced reliability
     * 2. Use TinyGSM's poweroff() method for additional AT+CPOWD=1
     * 3. CRITICAL: Set PWR_PIN to HIGH (LOW to modem) to maintain OFF state
     * 4. NO validation via AT commands (could wake up the modem)
     *
     * Pin logic understanding (confirmed by LilyGO ModemSleep example):
     * - ESP32 GPIO HIGH = LOW to modem (OFF state)
     * - ESP32 GPIO LOW = HIGH to modem (ON state)
     * This is due to NPN transistor inversion on the PWR_KEY line.
     */

    // Make sure modem is responsive before attempting software power down
    bool isResponsive = _modem.testAT(1000);

    if (isResponsive)
    {
        // OPTIMIZED: Fast shutdown sequence to prevent modem restart
        Logger.debug(LOG_TAG_MODEM, "Attempting fast software power down");

        // CRITICAL: Set PWR_PIN to correct state IMMEDIATELY before sending commands
        // This prevents the modem from restarting during the shutdown sequence
        pinMode(PWR_PIN, OUTPUT);
        digitalWrite(PWR_PIN, HIGH); // This is LOW to the modem due to transistor inversion (keeps OFF)

        // Step 1: Send rapid +CPOWD=1 commands with minimal delay
        Logger.debug(LOG_TAG_MODEM, "Sending rapid AT+CPOWD=1 commands");

        _modem.sendAT("+CPOWD=1");
        delay(100); // Minimal delay, don't wait for response

        _modem.sendAT("+CPOWD=1");
        delay(100); // Minimal delay, don't wait for response

        _modem.sendAT("+CPOWD=1");
        delay(100); // Minimal delay, don't wait for response

        // Step 2: Call TinyGSM's poweroff method immediately (sends another +CPOWD=1)
        Logger.debug(LOG_TAG_MODEM, "Calling TinyGSM poweroff immediately");
        _modem.poweroff();

        // Step 3: Ensure PWR_PIN stays HIGH (already set above, but reinforce)
        digitalWrite(PWR_PIN, HIGH); // This is LOW to modem due to transistor inversion (keeps OFF)

        // Step 4: Minimal wait - just enough for shutdown to take effect
        Logger.debug(LOG_TAG_MODEM, "Brief wait for shutdown to take effect...");
        delay(1000); // Reduced from 3000ms to 1000ms

        // CRITICAL: NO HARDWARE PULSES AFTER SHUTDOWN
        // Any hardware pulse after software shutdown could wake the modem
        // PWR_PIN is already HIGH (OFF state) from Step 3 above

        // NOTE: We do NOT validate power-off by sending AT commands or hardware pulses
        // as this could wake up the modem. The software shutdown sequence is sufficient.

        Logger.info(LOG_TAG_MODEM, "Fast software power off completed, PWR_PIN secured to HIGH (LOW to modem)");
        return true;
    }
    else
    {
        Logger.debug(LOG_TAG_MODEM, "Modem not responsive, using fast hardware power down");

        // OPTIMIZED: Fast hardware power down using power pin
        // CRITICAL: Based on issue #251, pin logic is INVERTED
        pinMode(PWR_PIN, OUTPUT);

        // Send decisive power-off pulse: LOW for sufficient time (per SIM7000 spec)
        digitalWrite(PWR_PIN, LOW); // This becomes HIGH to modem (power off command)
        delay(1200);                // Hold for minimum required time (1.2s per spec)

        // CRITICAL: Immediately set final state to HIGH to maintain modem OFF state
        // This prevents the modem from restarting due to incorrect pin state
        digitalWrite(PWR_PIN, HIGH); // This is LOW to modem (maintains OFF state)

        Logger.debug(LOG_TAG_MODEM, "Fast hardware power down pulse sent, PWR_PIN set to HIGH (LOW to modem)");
        delay(1000); // Reduced wait time

        // NOTE: We do NOT validate power-off by sending AT commands as this could wake up the modem.
        // The hardware power-off sequence (LOW pulse + correct final PWR_PIN state) should be sufficient.

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
        _updateResponsiveTime(); // Update responsive time
        return true;
    }
    else if (res == 2)
    {
        Logger.debug(LOG_TAG_MODEM, "Modem returned ERROR but is responsive");
        _updateResponsiveTime(); // Update responsive time
        return true;             // Still consider responsive if it returns ERROR
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

    // Send a short pulse to the power pin (considering inverted logic)
    digitalWrite(PWR_PIN, LOW);  // Send wake pulse (HIGH to modem)
    delay(100);                  // Just a short pulse to nudge the modem
    digitalWrite(PWR_PIN, HIGH); // Return to default (LOW to modem)
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

bool ModemManager::testConnectivity(const char *host, int port)
{
    Logger.info(LOG_TAG_MODEM, "Testing connectivity to %s:%d...", host, port);

    if (!isGprsConnected())
    {
        Logger.warn(LOG_TAG_MODEM, "GPRS not connected, attempting to connect...");
        if (!connectGprs())
        {
            Logger.error(LOG_TAG_MODEM, "GPRS connection failed, cannot test connectivity.");
            return false;
        }
    }

    // Use the existing client
    TinyGsmClient &client = _client;

    Logger.debug(LOG_TAG_MODEM, "Attempting to connect to host...");
    bool connected = client.connect(host, port);

    if (connected)
    {
        Logger.info(LOG_TAG_MODEM, "Successfully connected to %s:%d", host, port);
        client.stop(); // Close the connection immediately
        return true;
    }
    else
    {
        Logger.error(LOG_TAG_MODEM, "Failed to connect to %s:%d", host, port);
        return false;
    }
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

String ModemManager::getNetworkParams()
{
    return _modem.getOperator();
}

String ModemManager::getNetworkAPN()
{
    return APN; // Return the configured APN from Config.h
}

bool ModemManager::activateNetwork(bool state)
{
    if (state)
    {
        return _modem.gprsConnect(APN, GPRS_USER, GPRS_PASS);
    }
    else
    {
        return _modem.gprsDisconnect();
    }
}

String ModemManager::getLocalIP()
{
    return _modem.getLocalIP();
}

void ModemManager::maintainConnection(bool active)
{
    if (active)
    {
        // Check if we should attempt connection based on failure tracking
        if (!_shouldAttemptConnection())
        {
            Logger.debug(LOG_TAG_MODEM, "Skipping connection attempt due to backoff (failures: %d)", _consecutiveFailures);
            return;
        }

        // Check if modem needs reset due to being unresponsive
        if (needsReset())
        {
            Logger.warn(LOG_TAG_MODEM, "Modem requires reset due to consecutive failures or unresponsiveness");
            if (!resetModem())
            {
                Logger.error(LOG_TAG_MODEM, "Modem reset failed");
                _recordConnectionFailure();
                return;
            }
        }

        // If we need an active connection, ensure network and GPRS are up
        if (!isNetworkConnected())
        {
            Logger.info(LOG_TAG_MODEM, "Network not connected, attempting to connect...");
            if (!connectNetwork(1)) // Only try once to avoid loops
            {
                _recordConnectionFailure();
                return;
            }
        }

        if (!isGprsConnected())
        {
            Logger.info(LOG_TAG_MODEM, "GPRS not connected, attempting to connect...");
            if (!connectGprs(1)) // Only try once to avoid loops
            {
                _recordConnectionFailure();
                return;
            }
        }

        // If we reach here, connection is successful
        _recordConnectionSuccess();
    }
    else
    {
        // If we want to be inactive, just disconnect GPRS
        if (isGprsConnected())
        {
            disconnectGprs();
        }
    }
}

bool ModemManager::disconnectGprs()
{
    Logger.info(LOG_TAG_MODEM, "Disconnecting from GPRS...");

    // Make sure modem is responsive before attempting to disconnect
    bool isResponsive = _modem.testAT(1000);

    if (isResponsive)
    {
        // Directly use TinyGSM's disconnect method
        _modem.gprsDisconnect();
        Logger.info(LOG_TAG_MODEM, "GPRS disconnected");
    }
    else
    {
        Logger.warn(LOG_TAG_MODEM, "Modem not responsive, cannot disconnect GPRS");
    }

    return true;
}

/**
 * @brief Check if we should attempt a connection based on failure tracking
 */
bool ModemManager::_shouldAttemptConnection()
{
    unsigned long currentTime = millis();

    // Always allow first attempt
    if (_lastConnectionAttempt == 0)
    {
        _lastConnectionAttempt = currentTime;
        return true;
    }

    // Check if we're still in backoff period
    if (_backoffDelay > 0 && (currentTime - _lastConnectionAttempt) < _backoffDelay)
    {
        return false;
    }

    // Update last attempt time
    _lastConnectionAttempt = currentTime;
    return true;
}

/**
 * @brief Record a connection failure and update backoff
 */
void ModemManager::_recordConnectionFailure()
{
    _consecutiveFailures++;

    // Calculate exponential backoff
    _backoffDelay = MIN_BACKOFF_DELAY * (1 << min(_consecutiveFailures - 1, 4)); // Max 16x multiplier
    _backoffDelay = min(_backoffDelay, MAX_BACKOFF_DELAY);

    Logger.warn(LOG_TAG_MODEM, "Connection failure #%d, backoff: %lu ms", _consecutiveFailures, _backoffDelay);
}

/**
 * @brief Record a successful connection and reset failure tracking
 */
void ModemManager::_recordConnectionSuccess()
{
    if (_consecutiveFailures > 0)
    {
        Logger.info(LOG_TAG_MODEM, "Connection successful after %d failures", _consecutiveFailures);
    }

    _consecutiveFailures = 0;
    _backoffDelay = 0;
    _updateResponsiveTime();
}

/**
 * @brief Check if modem needs reset due to consecutive failures
 */
bool ModemManager::needsReset()
{
    unsigned long currentTime = millis();

    // Check consecutive failures
    if (_consecutiveFailures >= MAX_CONSECUTIVE_FAILURES)
    {
        // Only reset if enough time has passed since last reset
        if (currentTime - _lastModemReset >= MIN_RESET_INTERVAL)
        {
            Logger.warn(LOG_TAG_MODEM, "Modem reset needed due to %d consecutive failures", _consecutiveFailures);
            return true;
        }
    }

    // Check if modem has been unresponsive for too long
    if (_lastResponsiveTime > 0 && (currentTime - _lastResponsiveTime) > UNRESPONSIVE_TIMEOUT)
    {
        if (currentTime - _lastModemReset >= MIN_RESET_INTERVAL)
        {
            Logger.warn(LOG_TAG_MODEM, "Modem reset needed due to unresponsiveness (%lu ms)",
                        currentTime - _lastResponsiveTime);
            return true;
        }
    }

    return false;
}

/**
 * @brief Reset the modem completely (power cycle)
 */
bool ModemManager::resetModem()
{
    Logger.warn(LOG_TAG_MODEM, "Performing emergency modem reset...");

    unsigned long currentTime = millis();
    _lastModemReset = currentTime;

    // Disable watchdog for reset operation
    _setWatchdog(true);

    // Step 1: Force power off
    Logger.debug(LOG_TAG_MODEM, "Emergency power off...");
    pinMode(PWR_PIN, OUTPUT);
    digitalWrite(PWR_PIN, HIGH); // OFF state
    delay(2000);

    // Step 2: Send power-off pulse
    digitalWrite(PWR_PIN, LOW); // Power off pulse
    delay(1500);
    digitalWrite(PWR_PIN, HIGH); // Return to OFF state
    delay(3000);

    // Step 3: Re-initialize hardware
    Logger.debug(LOG_TAG_MODEM, "Re-initializing hardware...");
    _initHardware();
    delay(1000);

    // Step 4: Power on sequence
    Logger.debug(LOG_TAG_MODEM, "Emergency power on...");
    digitalWrite(PWR_PIN, LOW); // Power on pulse
    delay(1000);
    digitalWrite(PWR_PIN, HIGH); // Return to default state
    delay(3000);

    // Step 5: Test responsiveness
    Logger.debug(LOG_TAG_MODEM, "Testing modem responsiveness...");
    bool responsive = false;
    for (int i = 0; i < 10; i++)
    {
        if (isResponsive())
        {
            responsive = true;
            break;
        }
        delay(1000);
    }

    // Re-enable watchdog
    _setWatchdog(false);

    if (responsive)
    {
        Logger.info(LOG_TAG_MODEM, "Emergency modem reset successful");
        _consecutiveFailures = 0; // Reset failure count
        _updateResponsiveTime();
        return true;
    }
    else
    {
        Logger.error(LOG_TAG_MODEM, "Emergency modem reset failed - modem still unresponsive");
        return false;
    }
}

/**
 * @brief Update the last responsive time
 */
void ModemManager::_updateResponsiveTime()
{
    _lastResponsiveTime = millis();
}

/**
 * @brief Internal method to perform modem reset
 */
bool ModemManager::_performModemReset()
{
    return resetModem();
}
