---
applyTo: "**/firmware/**"
---

# LilyGO T-SIM7000G Modem Usage Guide

This document serves as a reference guide for using the LilyGO T-SIM7000G cellular modem in the Aiolos Weather Station project. It is based on our optimized implementation and aligns with LilyGO's official examples, consolidating best practices for robust modem initialization, reliable network connection, power management, and error handling that allows the system to continue operating even when cellular connectivity is unavailable.

## Note on Communication Protocol

All communication with the backend is now performed using HTTP POST requests (not CoAP, UDP, or MQTT). The modem is used to establish a cellular data connection, after which the firmware sends JSON payloads to the AdonisJS REST API backend over HTTP. Any previous references to CoAP or UDP-based protocols are obsolete.

## Table of Contents

1. [Hardware Configuration](#hardware-configuration)
2. [Modem Initialization](#modem-initialization)
3. [Network Connection](#network-connection)
4. [GPRS Connection](#gprs-connection)
5. [Power Management](#power-management)
6. [AT Commands](#at-commands)
7. [Network Maintenance](#network-maintenance)
8. [Deep Sleep Integration](#deep-sleep-integration)
9. [Error Handling](#error-handling)
10. [Common Issues](#common-issues)

## Hardware Configuration

### Pin Definitions

The T-SIM7000G requires specific pins to be properly configured:

```cpp
#define PIN_DTR     25   // Data Terminal Ready pin (for sleep mode)
#define PIN_TX      27   // TX pin
#define PIN_RX      26   // RX pin
#define PWR_PIN     4    // Power key pin
#define LED_PIN     12   // LED indicator pin
```

### Serial Configuration

Serial communication must be configured with the appropriate baud rate:

```cpp
// Initialize serial communication with the modem
SerialAT.begin(UART_BAUD, SERIAL_8N1, PIN_RX, PIN_TX);
```

Standard baud rate is 115200, but other rates are also supported.

## Modem Initialization

### Power On Sequence

The correct power-on sequence for the SIM7000G is critical for reliable operation:

````cpp
// Power on the modem with proper timing according to SIM7000G datasheet
pinMode(PWR_PIN, OUTPUT);
digitalWrite(PWR_PIN, HIGH);
delay(1200);                // At least 1 second delay (Datasheet Ton time = 1s)
digitalWrite(PWR_PIN, LOW);
delay(2000);                // Give the modem time to start up

// Verify the modem is responsive with retries
bool modemResponsive = false;
for (int attempt = 0; attempt < 10; attempt++) {
    if (modem.testAT()) {
        modemResponsive = true;
        break;
    }
    delay(1000);
}

// Handle non-responsive modem without system restart
if (!modemResponsive) {
    // Log error but continue with limited functionality
    // DO NOT restart the system
}

### Initialize and Test

After powering on, initialize the modem and test its response:

```cpp
// Get basic modem information
String modemName = modem.getModemName();
String modemInfo = modem.getModemInfo();
String imei = modem.getIMEI();
Logger.info(LOG_TAG_MODEM, "Modem Name: %s", modemName.c_str());
Logger.info(LOG_TAG_MODEM, "Modem Info: %s", modemInfo.c_str());
Logger.info(LOG_TAG_MODEM, "Device IMEI: %s", imei.c_str());

// Check SIM card status with multiple methods and retries
SimStatus simStatus = SIM_ERROR;
int maxSimRetries = 5;

for (int i = 0; i < maxSimRetries; i++) {
    // Add delay between attempts to let SIM interface stabilize
    if (i > 0) delay(2000);

    simStatus = getSimStatus();
    if (simStatus == SIM_READY) {
        Logger.info(LOG_TAG_MODEM, "SIM card is ready");
        break;
    }

    // Additional SIM detection methods on later attempts
    if (i >= 2) {
        // Reset RF functionality to help with SIM detection
        modem.sendAT("+CFUN=0");
        modem.waitResponse(1000);
        delay(500);
        modem.sendAT("+CFUN=1");
        modem.waitResponse(1000);
        delay(1000);

        // Try checking CCID as alternative SIM detection method
        String ccid = getCCID();
        if (ccid.length() > 10) {
            Logger.info(LOG_TAG_MODEM, "SIM detected via CCID: %s", ccid.c_str());
            simStatus = SIM_READY;
            break;
        }
    }
}

// IMPORTANT: Always continue operation even if SIM status is not SIM_READY
// This allows the system to still function for non-cellular operations
````

### SIM Detection and Status

Multiple methods to detect SIM card presence and status:

```cpp
// Method 1: Using TinyGSM's getSimStatus()
SimStatus simStatus = getSimStatus();
if (simStatus == SIM_READY) {
    Logger.info(LOG_TAG_MODEM, "SIM card is ready");
} else if (simStatus == SIM_LOCKED) {
    Logger.warn(LOG_TAG_MODEM, "SIM card is locked with PIN");
} else {
    Logger.error(LOG_TAG_MODEM, "SIM card error");
}

// Method 2: Check SIM status via AT+CPIN?
modem.sendAT("+CPIN?");
if (modem.waitResponse(10000L, "+CPIN: READY") == 1) {
    Logger.info(LOG_TAG_MODEM, "SIM detected via CPIN command");
    // SIM is ready
}

// Method 3: Try to get CCID (SIM card ID)
String ccid = getCCID();
if (ccid.length() > 10) {
    Logger.info(LOG_TAG_MODEM, "SIM detected via CCID: %s", ccid.c_str());
    // SIM is present
}
```

## Network Connection

### Setting Network Mode

Set the preferred network mode and connection type:

```cpp
// Set preferred mode for optimal connectivity
// (1=CAT-M, 2=NB-IoT, 3=CAT-M and NB-IoT)
modem.setPreferredMode(3);

// Set network mode
// (2=Automatic, 13=GSM only, 38=LTE only, 51=GSM and LTE only)
modem.setNetworkMode(2);

// Enable or disable RF functionality as needed
modem.sendAT("+CFUN=1"); // Full functionality
modem.waitResponse();
```

### Connecting to Network

Wait for network registration with watchdog-friendly approach:

```cpp
// Temporarily disable watchdog during network connection
_setWatchdog(true);

// Wait for network with timeout
Logger.info(LOG_TAG_MODEM, "Connecting to network...");

// Check if already connected
if (_modem.isNetworkConnected()) {
    Logger.info(LOG_TAG_MODEM, "Already connected to network");
    return true;
}

// Skip if SIM card wasn't detected during initialization
if (!_initialized) {
    Logger.warn(LOG_TAG_MODEM, "Modem not properly initialized, skipping network connection");
    return false;
}

// Double-check SIM status before attempting network connection
SimStatus simStatus = getSimStatus();
if (simStatus != SIM_READY) {
    Logger.warn(LOG_TAG_MODEM, "SIM card not ready, skipping network connection");
    return false;
}

// Simple retry pattern
for (int attempt = 0; attempt < maxRetries; attempt++) {
    Logger.debug(LOG_TAG_MODEM, "Network connection attempt %d/%d", attempt + 1, maxRetries);

    // Direct approach as in LilyGO examples
    Logger.debug(LOG_TAG_MODEM, "Waiting for network registration...");
    if (_modem.waitForNetwork(60000L)) {
        delay(1000);
        if (_modem.isNetworkConnected()) {
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
```

## GPRS Connection

### Connecting to GPRS

After network registration, connect to GPRS:

```cpp
// Connect to GPRS with APN settings
Logger.info(LOG_TAG_MODEM, "Connecting to GPRS...");

// Check if already connected
if (_modem.isGprsConnected()) {
    Logger.info(LOG_TAG_MODEM, "Already connected to GPRS");
    IPAddress ip = _modem.localIP();
    Logger.info(LOG_TAG_MODEM, "IP: %s", ip.toString().c_str());
    return true;
}

// Make sure we're connected to the network first
if (!_modem.isNetworkConnected()) {
    Logger.warn(LOG_TAG_MODEM, "Network not connected, attempting to connect first");
    if (!connectNetwork(1)) {
        Logger.error(LOG_TAG_MODEM, "Failed to connect to network, cannot establish GPRS");
        return false;
    }
}

// Simple connection pattern with retries
for (int attempt = 0; attempt < maxRetries; attempt++) {
    Logger.debug(LOG_TAG_MODEM, "GPRS connection attempt %d/%d", attempt + 1, maxRetries);

    // Disable watchdog during GPRS connection
    _setWatchdog(true);

    // Direct GPRS connection
    if (_modem.gprsConnect(APN, GPRS_USER, GPRS_PASS)) {
        delay(1000);
        if (_modem.isGprsConnected()) {
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
```

### Disconnecting from GPRS

When GPRS connection is no longer needed:

```cpp
// Disconnect from GPRS
// NOTE: The current ModemManager implementation doesn't include a separate
// gprsDisconnect method, as GPRS connections are managed through
// the connectGprs method and disconnected during power off/sleep operations
```

## Power Management

### Sleep Mode

Enter sleep mode to conserve power:

```cpp
// Method 1: Using DTR pin (recommended)
pinMode(PIN_DTR, OUTPUT);
digitalWrite(PIN_DTR, HIGH);  // HIGH = sleep mode enabled

// Method 2: Using AT commands
if (!_modem.sleepEnable(true)) {
    Logger.error(LOG_TAG_MODEM, "Failed to put modem to sleep via AT command");
    return false;
}

// Wait for sleep mode to take effect
delay(2000);

// Verify the modem is actually in sleep mode by checking responsiveness
if (isResponsive()) {
    Logger.warn(LOG_TAG_MODEM, "Modem still responsive after sleep command");
    return false;
}

Logger.info(LOG_TAG_MODEM, "Modem successfully entered sleep mode");

// For ESP32 deep sleep integration, preserve pin state
// Use this when entering deep sleep
gpio_hold_en((gpio_num_t)PIN_DTR);
gpio_deep_sleep_hold_en();
```

### Wake Up

Wake up the modem from sleep mode:

```cpp
// If waking from ESP32 deep sleep, release GPIO hold
if (fromDeepSleep) {
    // Disable GPIO hold if waking from deep sleep
    gpio_hold_dis((gpio_num_t)PIN_DTR);
    gpio_deep_sleep_hold_dis(); // Disable the hold feature completely

    // Re-initialize serial after deep sleep
    SerialAT.end();
    delay(100);
    SerialAT.begin(UART_BAUD, SERIAL_8N1, PIN_RX, PIN_TX);
    delay(300);
}

// Method 1: Using DTR pin (recommended)
pinMode(PIN_DTR, OUTPUT);
digitalWrite(PIN_DTR, LOW);  // LOW = normal operation
delay(1000);  // Give the modem time to register the DTR change

// Clear any pending serial data
while (SerialAT.available()) {
    SerialAT.read();
}

// Try to wake up the modem with progressively more aggressive methods
// First try a simple AT command
_modem.sendAT();
if (_modem.waitResponse(3000) == 1) {
    Logger.info(LOG_TAG_MODEM, "Modem responded immediately to AT");
    return true;
}

// Then try disabling sleep mode via AT command
_modem.sleepEnable(false);
delay(2000);

// Check responsiveness with multiple attempts
for (int i = 0; i < 5; i++) {
    _modem.sendAT();
    if (_modem.waitResponse(2000) == 1) {
        Logger.info(LOG_TAG_MODEM, "Modem woke up after sleep disable on attempt %d", i + 1);
        return true;
    }
    delay(1000);
}

// If still not responsive, try more aggressive wake-up with power pin toggle
digitalWrite(PWR_PIN, HIGH);
delay(100); // Just a short pulse to nudge the modem
digitalWrite(PWR_PIN, LOW);
delay(3000);

// Final check for responsiveness
for (int i = 0; i < 5; i++) {
    _modem.sendAT();
    if (_modem.waitResponse(2000) == 1) {
        Logger.info(LOG_TAG_MODEM, "Modem woke up after power toggle on attempt %d", i + 1);
        return true;
    }
    delay(1000);
}
```

### Power Off

Power off the modem completely:

```cpp
// Make sure modem is responsive before attempting software power down
bool isResponsive = _modem.testAT(1000);

if (isResponsive) {
    // First try software power down command as recommended in LilyGO examples
    Logger.debug(LOG_TAG_MODEM, "Attempting software power down");
    _modem.sendAT("+CPOWD=1");

    // Timeout of 10 seconds for power down command (based on LilyGO examples)
    if (_modem.waitResponse(10000) != 1) {
        Logger.warn(LOG_TAG_MODEM, "Software power down command failed");
        // Fall back to hardware power down
    } else {
        Logger.info(LOG_TAG_MODEM, "Software power down successful");
        // Wait for modem to shut down completely
        delay(5000);
        return true;
    }
} else {
    Logger.debug(LOG_TAG_MODEM, "Modem not responsive, skipping software power down");
}

// If modem is not responsive or software power down failed, use hardware power down
Logger.info(LOG_TAG_MODEM, "Using hardware power down method");

// Make sure PWR_PIN is LOW first
digitalWrite(PWR_PIN, LOW);
delay(1000);

// Apply power pulse
digitalWrite(PWR_PIN, HIGH);
delay(1500);    // Datasheet Toff time = 1.2s
digitalWrite(PWR_PIN, LOW);

// Wait for modem to shut down completely
delay(5000);

Logger.info(LOG_TAG_MODEM, "Hardware power down completed");
return true;

// Wait for modem to shut down
delay(5000);
```

## AT Commands

### Sending AT Commands

Send AT commands directly to the modem:

```cpp
// Send AT command
modem.sendAT("+COMMAND");

// Wait for response
int8_t response = modem.waitResponse();
if (response == 1) {
    // Success (OK response)
} else if (response == 2) {
    // Error response
} else if (response == 3) {
    // Custom response (specified in waitResponse parameters)
} else {
    // Timeout
}

// Wait for specific response with timeout
modem.waitResponse(10000L, "+RESPONSE");
```

### Debug AT Commands

Enable AT command debugging:

```cpp
#define DUMP_AT_COMMANDS  // Define this before including TinyGSM

#ifdef DUMP_AT_COMMANDS
#include <StreamDebugger.h>
StreamDebugger debugger(SerialAT, Serial);
TinyGsm modem(debugger);
#else
TinyGsm modem(SerialAT);
#endif
```

## Network Maintenance

### Checking Connection Status

Regularly check if the network is still connected:

```cpp
// Check if still connected to network
if (!modem.isNetworkConnected()) {
    Serial.println("Network disconnected, attempting to reconnect");

    // Try to reconnect
    if (!modem.waitForNetwork(180000L, true)) {
        Serial.println("Network reconnection failed");
        // Handle reconnection failure
    } else {
        Serial.println("Network reconnected");
    }
}

// Check if GPRS is still connected
if (!modem.isGprsConnected()) {
    Serial.println("GPRS disconnected, attempting to reconnect");

    // Try to reconnect
    if (!modem.gprsConnect(apn, user, pass)) {
        Serial.println("GPRS reconnection failed");
        // Handle reconnection failure
    } else {
        Serial.println("GPRS reconnected");
    }
}
```

### Signal Quality

Check the signal quality:

```cpp
// Get signal quality
int signalQuality = modem.getSignalQuality();
Serial.print("Signal quality: ");
Serial.println(signalQuality);
```

## Deep Sleep Integration

### Preparing for ESP32 Deep Sleep

Before entering ESP32 deep sleep, prepare the modem:

```cpp
// Put modem into sleep mode with GPIO hold enabled
pinMode(PIN_DTR, OUTPUT);
digitalWrite(PIN_DTR, HIGH);
gpio_hold_en((gpio_num_t)PIN_DTR);
gpio_deep_sleep_hold_en();
modem.sleepEnable(true);

// Setup ESP32 deep sleep
esp_sleep_enable_timer_wakeup(sleepSeconds * 1000000ULL);

// Enter deep sleep
esp_deep_sleep_start();
```

### Handling Wakeup from Deep Sleep

After ESP32 wakes from deep sleep:

```cpp
// Check if wakeup was from deep sleep
if (esp_sleep_get_wakeup_cause() == ESP_SLEEP_WAKEUP_TIMER) {
    // Release GPIO hold
    gpio_hold_dis((gpio_num_t)PIN_DTR);

    // Wake up the modem
    pinMode(PIN_DTR, OUTPUT);
    digitalWrite(PIN_DTR, LOW);
    delay(1000);
    modem.sleepEnable(false);

    // Wait for modem to wake up fully
    delay(2000);
} else {
    // Normal power-on sequence
    // ...
}
```

## Error Handling

### Common Error Patterns

Robust error handling is essential for reliable modem operation:

```cpp
// Robust error handling pattern with graceful degradation
bool performModemOperation() {
    // First verify network status
    if (!isNetworkConnected() || !isGprsConnected()) {
        Logger.warn(LOG_TAG_MODEM, "Network connection lost, attempting to reconnect");

        // Try to reconnect network
        if (!connectNetwork() || !connectGprs()) {
            Logger.error(LOG_TAG_MODEM, "Reconnection failed, trying power cycle");

            // Try power cycling the modem
            powerOff();
            delay(5000);
            powerOn();

            // Try connecting again after power cycle
            if (!connectNetwork() || !connectGprs()) {
                Logger.error(LOG_TAG_MODEM, "Reconnection failed after power cycle");
                return false;
            }
        }
    }

    // Proceed with operation now that connection is verified
    // ...

    return true;
}

// IMPORTANT: Never restart the system due to modem errors
// Instead, continue with limited functionality
```

### Modem Reset

Reset the modem when it becomes unresponsive:

```cpp
// Hardware reset sequence aligned with datasheet timings
bool resetModem() {
    Logger.info(LOG_TAG_MODEM, "Performing hardware reset of modem");

    // Power down sequence
    digitalWrite(PWR_PIN, HIGH);
    delay(1500);  // Minimum 1.2s for Toff according to datasheet
    digitalWrite(PWR_PIN, LOW);
    delay(5000);  // Wait for full shutdown

    // Power up sequence
    digitalWrite(PWR_PIN, HIGH);
    delay(1200);  // Minimum 1s for Ton according to datasheet
    digitalWrite(PWR_PIN, LOW);
    delay(2000);  // Wait for modem to initialize

    // Verify modem is responsive
    for (int attempt = 0; attempt < 5; attempt++) {
        if (modem.testAT()) {
            Logger.info(LOG_TAG_MODEM, "Modem reset successful");
            return true;
        }
        delay(1000);
    }

    Logger.error(LOG_TAG_MODEM, "Modem reset failed");
    return false;
}
```

## Common Issues

### Modem Not Responding

If the modem doesn't respond:

1. Check the power sequence timing
2. Verify the serial connections and baud rate
3. Ensure the SIM card is properly inserted
4. Try a hardware reset

### Network Connection Failures

If network connection fails:

1. Check signal strength (`modem.getSignalQuality()`)
2. Verify SIM card activation status
3. Confirm APN settings are correct
4. Check antenna connections
5. Try setting a different network mode

### Power Consumption Issues

If battery drains too quickly:

1. Ensure sleep mode is properly implemented
2. Check DTR pin configuration and state
3. Verify GPIO hold during deep sleep
4. Consider longer deep sleep intervals
5. Reduce network activity frequency

## Handling Watchdog Timer

The ESP32's watchdog timer needs special consideration when working with the modem:

```cpp
// Setup watchdog timer
void setupWatchdog() {
    esp_task_wdt_init(WATCHDOG_TIMEOUT_SECONDS, true);
    esp_task_wdt_add(NULL);
    Logger.debug(LOG_TAG_SYSTEM, "Watchdog initialized with timeout of %d seconds",
                 WATCHDOG_TIMEOUT_SECONDS);
}

// Reset watchdog timer
void resetWatchdog() {
    esp_task_wdt_reset();
}

// Temporarily disable watchdog during long modem operations
esp_task_wdt_deinit();

// Perform long operation like modem initialization or network connection
// ...

// Re-enable watchdog after operation completes
setupWatchdog();
```

## Graceful Degradation

The system should continue operating even when cellular connectivity is unavailable:

```cpp
// In initialization code
bool modemInitSuccess = modemManager.init();
if (!modemInitSuccess) {
    Logger.warn(LOG_TAG_SYSTEM, "Modem initialization failed, continuing with limited functionality");
    // Continue operation - don't restart system
}

// In main loop
void loop() {
    // Check if it's time to send data
    if (isTimeToSendData()) {
        // First check if modem is connected
        if (modemManager.isNetworkConnected() && modemManager.isGprsConnected()) {
            // Send data via cellular connection
            sendDataOverCellular();
        } else {
            // Store data locally since cellular connection is unavailable
            Logger.warn(LOG_TAG_SYSTEM, "Cellular connection unavailable, storing data locally");
            storeDataLocally();

            // Optionally try to reconnect
            if (shouldAttemptReconnect()) {
                reconnectModem();
            }
        }
    }

    // Continue with other operations regardless of modem status
    readSensors();
    managePower();
    delay(100);
}
```

## ModemManager Integration

A complete `ModemManager` class provides a clean interface for all modem operations:

```cpp
class ModemManager {
public:
    // Core functions
    bool init();
    bool powerOn();
    bool powerOff();

    // Network functions
    bool connectNetwork(int maxRetries = 3);
    bool connectGprs(int maxRetries = 3);
    bool isNetworkConnected();
    bool isGprsConnected();

    // Client access for data transfer
    TinyGsmClient* getClient();

    // Power management
    bool enterSleepMode(bool enable);

    // Utilities
    int getSignalQuality();
    bool getNetworkTime(int *year, int *month, int *day, int *hour, int *minute, int *second, float *timezone);
    String getIMEI();
    String getCCID();
    String getOperator();
    IPAddress getLocalIP();

private:
    // Implementation details
    TinyGsm _modem;
    TinyGsmClient _client;
    bool _initialized = false;
    // ...
};

// Global instance
extern ModemManager modemManager;
```
