---
applyTo: '**'
---
# LilyGO T-SIM7000G Modem Usage Guide

This document serves as a reference guide for using the LilyGO T-SIM7000G cellular modem in the Aiolos Weather Station project. It is based on the official examples from the manufacturer and consolidates best practices for modem initialization, network connection, power management, and communication.

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

```cpp
// Power on the modem
pinMode(PWR_PIN, OUTPUT);
digitalWrite(PWR_PIN, HIGH);
delay(1000);                // At least 1 second delay (Datasheet Ton time = 1s)
digitalWrite(PWR_PIN, LOW);
delay(1000);                // Give the modem time to start up
```

### Initialize and Test

After powering on, initialize the modem and test its response:

```cpp
// Initialize the modem
if (!modem.restart()) {
    // If restart fails, try continuing without restart
    Serial.println("Failed to restart modem, attempting to continue without restarting");
}

// Test if modem is responsive
int attempts = 0;
const int maxAttempts = 10;
bool modemResponsive = false;

while (attempts < maxAttempts) {
    if (modem.testAT()) {
        modemResponsive = true;
        break;
    }
    delay(1000);
    attempts++;
}

if (!modemResponsive) {
    // Handle modem not responding
}
```

### Modem Information

Get basic information about the modem:

```cpp
// Get modem information
String modemName = modem.getModemName();
String modemInfo = modem.getModemInfo();
String imei = modem.getIMEI();
```

## Network Connection

### Setting Network Mode

Set the preferred network mode and connection type:

```cpp
// Set preferred mode for optimal connectivity
// 1=CAT-M, 2=NB-IoT, 3=CAT-M and NB-IoT
modem.setPreferredMode(3);

// Set network mode
// 2=Automatic, 13=GSM only, 38=LTE only, 51=GSM and LTE only
modem.setNetworkMode(2);
```

### Connecting to Network

Wait for network registration:

```cpp
// Wait for network with timeout (in milliseconds)
Serial.println("Waiting for network...");
if (!modem.waitForNetwork(60000L)) {
    Serial.println("Network connection failed");
    // Handle network connection failure
    return;
}

// Check if network is connected
if (modem.isNetworkConnected()) {
    Serial.println("Network connected");
} else {
    Serial.println("Network connection issue");
}
```

## GPRS Connection

### Connecting to GPRS

After network registration, connect to GPRS:

```cpp
// Connect to GPRS with APN
Serial.print("Connecting to GPRS with APN: ");
Serial.println(apn);
if (!modem.gprsConnect(apn, user, pass)) {
    Serial.println("GPRS connection failed");
    // Handle GPRS connection failure
    return;
}

// Check GPRS connection
if (modem.isGprsConnected()) {
    Serial.println("GPRS connected");
    
    // Get assigned IP address
    IPAddress localIP = modem.localIP();
    Serial.print("Local IP: ");
    Serial.println(localIP);
} else {
    Serial.println("GPRS connection issue");
}
```

### Disconnecting from GPRS

When GPRS connection is no longer needed:

```cpp
// Disconnect from GPRS
modem.gprsDisconnect();
if (!modem.isGprsConnected()) {
    Serial.println("GPRS disconnected");
} else {
    Serial.println("GPRS disconnect failed");
}
```

## Power Management

### Sleep Mode

Enter sleep mode to conserve power:

```cpp
// Pull DTR pin HIGH to enable sleep mode
pinMode(PIN_DTR, OUTPUT);
digitalWrite(PIN_DTR, HIGH);

// If using with ESP32 deep sleep, hold the GPIO state during sleep
gpio_hold_en((gpio_num_t)PIN_DTR);
gpio_deep_sleep_hold_en();

// Enable sleep mode via AT command
if (modem.sleepEnable(true)) {
    Serial.println("Modem entered sleep mode");
} else {
    Serial.println("Failed to enter sleep mode");
}
```

### Wake Up

Wake up the modem from sleep mode:

```cpp
// If waking from ESP32 deep sleep, release GPIO hold
if (fromDeepSleep) {
    gpio_hold_dis((gpio_num_t)PIN_DTR);
}

// Pull DTR pin LOW to wake up modem
pinMode(PIN_DTR, OUTPUT);
digitalWrite(PIN_DTR, LOW);
delay(1000);

// Disable sleep mode via AT command
modem.sleepEnable(false);

// Wait for modem to wake up and respond
delay(2000);
```

### Power Off

Power off the modem completely:

```cpp
// Send power down command
modem.sendAT("+CPOWD=1");
if (modem.waitResponse(10000L) != 1) {
    Serial.println("Power down command failed");
}

// Use hardware power down as backup
digitalWrite(PWR_PIN, HIGH);
delay(1500);    // Datasheet Toff time = 1.2s
digitalWrite(PWR_PIN, LOW);

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

Proper error handling is essential for robust modem operation:

```cpp
// Example of error handling pattern
if (!modem.functionCall()) {
    int retries = 0;
    const int maxRetries = 3;
    
    while (retries < maxRetries) {
        delay(1000);
        if (modem.functionCall()) {
            break;
        }
        retries++;
    }
    
    if (retries >= maxRetries) {
        // Handle persistent failure
        // Consider modem reset or system restart
    }
}
```

### Modem Reset

Reset the modem when it becomes unresponsive:

```cpp
// Hardware reset sequence
digitalWrite(PWR_PIN, HIGH);
delay(1500);
digitalWrite(PWR_PIN, LOW);
delay(1000);
digitalWrite(PWR_PIN, HIGH);
delay(1000);
digitalWrite(PWR_PIN, LOW);

// Wait for modem to restart
delay(10000);

// Re-initialize the modem
if (!modem.restart()) {
    // Handle restart failure
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

### Communication Timeouts

If AT commands time out:

1. Increase the timeout duration for critical operations
2. Check for network congestion
3. Consider the signal quality
4. Ensure watchdog timers don't interrupt long operations

---

This guide is based on the official LilyGO T-SIM7000G examples. For more specific information, refer to the SIM7000 datasheet and AT command reference.
