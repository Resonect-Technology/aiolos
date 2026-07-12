/**
 * @file DiagnosticsManager.cpp
 * @brief Implementation of the DiagnosticsManager class
 */

#include "DiagnosticsManager.h"
#include "../config/Config.h"
#include "Watchdog.h"

#include <esp_system.h>

#define LOG_TAG_DIAG "DIAG"

/**
 * @brief Map the ESP-IDF reset reason to a short stable string for the server
 */
static const char *resetReasonToString(esp_reset_reason_t reason)
{
    switch (reason)
    {
    case ESP_RST_POWERON:
        return "POWERON";
    case ESP_RST_EXT:
        return "EXT";
    case ESP_RST_SW:
        return "SW";
    case ESP_RST_PANIC:
        return "PANIC";
    case ESP_RST_INT_WDT:
        return "INT_WDT";
    case ESP_RST_TASK_WDT:
        return "TASK_WDT";
    case ESP_RST_WDT:
        return "WDT";
    case ESP_RST_DEEPSLEEP:
        return "DEEPSLEEP";
    case ESP_RST_BROWNOUT:
        return "BROWNOUT";
    case ESP_RST_SDIO:
        return "SDIO";
    default:
        return "UNKNOWN";
    }
}

// Global instance
DiagnosticsManager diagnosticsManager;

/**
 * @brief Initialize the DiagnosticsManager
 */
bool DiagnosticsManager::init(ModemManager &modemManager, AiolosHttpClient &httpClient, unsigned long interval)
{
    _modemManager = &modemManager;
    _httpClient = &httpClient;
    _interval = interval;
    _internalTempAvailable = false;

    // Initialize internal temperature sensor
    if (_internalTempSensor.init(TEMP_BUS_INT, "internal"))
    {
        _internalTempAvailable = true;
        Logger.info(LOG_TAG_DIAG, "Internal temperature sensor initialized successfully");
    }
    else
    {
        Logger.error(LOG_TAG_DIAG, "Failed to initialize internal temperature sensor");
        // Don't fail initialization - we can still send other diagnostics
    }

    // Configure ADC for solar voltage reading once
    configureSolarAdc();

    _initialized = true;

    Logger.info(LOG_TAG_DIAG, "Diagnostics manager initialized with interval of %lu ms", _interval);

    return true;
}

/**
 * @brief Set the diagnostics sending interval
 */
void DiagnosticsManager::setInterval(unsigned long interval)
{
    _interval = interval;
    Logger.info(LOG_TAG_DIAG, "Diagnostics interval updated to %lu ms", _interval);
}

/**
 * @brief Send current diagnostics data to the server
 */
bool DiagnosticsManager::sendDiagnostics(float internalTemp)
{
    if (!_initialized || !_modemManager || !_httpClient)
    {
        Logger.error(LOG_TAG_DIAG, "Diagnostics manager not initialized");
        return false;
    }

    Logger.info(LOG_TAG_DIAG, "Collecting and sending diagnostics data...");

    // Reset reason never changes during a boot - compute once
    static const char *resetReason = resetReasonToString(esp_reset_reason());

    AiolosHttpClient::DiagnosticsPayload payload;
    payload.batteryVoltage = readBatteryVoltage();
    payload.solarVoltage = readSolarVoltage();
    payload.internalTemperature = internalTemp;
    payload.signalQuality = _modemManager->getSignalQuality();
    payload.uptime = getSystemUptime();
    payload.firmwareVersion = FIRMWARE_VERSION;
    payload.freeHeap = esp_get_free_heap_size();
    payload.minFreeHeap = esp_get_minimum_free_heap_size();
    payload.resetReason = resetReason;

    // Log diagnostic values before sending
    Logger.info(LOG_TAG_DIAG, "Diagnostics - Battery: %.2fV, Solar: %.2fV, Signal: %d, Uptime: %lus, Internal temp: %.1f°C",
                payload.batteryVoltage, payload.solarVoltage, payload.signalQuality, payload.uptime, internalTemp);
    Logger.info(LOG_TAG_DIAG, "Health - FW: %s, Heap: %lu B (min %lu B), Reset: %s",
                FIRMWARE_VERSION, (unsigned long)payload.freeHeap, (unsigned long)payload.minFreeHeap, resetReason);

#ifdef DISABLE_WDT_FOR_MODEM
    Logger.debug(LOG_TAG_DIAG, "Relaxing watchdog for diagnostics");
    watchdogExtend();
#endif

    // Send data to server
    bool success = _httpClient->sendDiagnostics(DEVICE_ID, payload);

#ifdef DISABLE_WDT_FOR_MODEM
    Logger.debug(LOG_TAG_DIAG, "Restoring watchdog after diagnostics");
    watchdogRestore();
#endif

    if (success)
    {
        Logger.info(LOG_TAG_DIAG, "Diagnostics data sent successfully");
    }
    else
    {
        Logger.error(LOG_TAG_DIAG, "Failed to send diagnostics data");
    }

    return success;
}

/**
 * @brief Read the battery voltage from ADC
 */
float DiagnosticsManager::readBatteryVoltage()
{
    return BatteryUtils::readBatteryVoltage();
}

/**
 * @brief Read the solar panel voltage from ADC
 */
float DiagnosticsManager::readSolarVoltage()
{
    // Read multiple samples for better accuracy
    const int numSamples = 5; // Reduced from 10 to minimize blocking time
    int solarRawTotal = 0;

    for (int i = 0; i < numSamples; i++)
    {
        int reading = analogRead(ADC_SOLAR_PIN);

        // Validate reading is within expected ADC range
        if (reading < 0 || reading > 4095)
        {
            Logger.warn(LOG_TAG_DIAG, "Invalid solar ADC reading: %d", reading);
            continue;
        }

        solarRawTotal += reading;
        delay(2); // Reduced delay from 5ms to 2ms
    }

    int solarRaw = solarRawTotal / numSamples;

    // Calculate solar voltage with calibration factor
    float solarVoltage = (float)solarRaw * 3.3 / 4095.0 * _solarVoltageCalibration;

    // Limit to expected range based on documentation (0V to 6.5V)
    solarVoltage = constrain(solarVoltage, 0.0, 6.5);

    // Log the raw and converted values
    Logger.debug(LOG_TAG_DIAG, "Solar ADC: %d, Voltage: %.2fV (cal: %.2f)",
                 solarRaw, solarVoltage, _solarVoltageCalibration);

    return solarVoltage;
}

/**
 * @brief Configure ADC for solar voltage reading
 */
void DiagnosticsManager::configureSolarAdc()
{
    static bool adcConfigured = false;

    if (!adcConfigured)
    {
        // Configure ADC
        analogSetWidth(12);                               // Set ADC resolution to 12 bits
        analogRead(ADC_SOLAR_PIN);                        // Core 3.x: pin must be read once before per-pin attenuation applies
        analogSetPinAttenuation(ADC_SOLAR_PIN, ADC_11db); // Set attenuation for higher voltage range

        adcConfigured = true;
        Logger.debug(LOG_TAG_DIAG, "Solar ADC configured (12-bit, 11dB attenuation)");
    }
}

/**
 * @brief Get system uptime in seconds
 */
unsigned long DiagnosticsManager::getSystemUptime() const
{
    return millis() / 1000;
}

/**
 * @brief Read the internal temperature sensor
 */
float DiagnosticsManager::readInternalTemperature()
{
    if (!_internalTempAvailable)
    {
        Logger.debug(LOG_TAG_DIAG, "Internal temperature sensor not available");
        return -127.0;
    }

    float temp = _internalTempSensor.readTemperature();

    if (temp == DEVICE_DISCONNECTED_C)
    {
        Logger.warn(LOG_TAG_DIAG, "Failed to read internal temperature sensor");
        return -127.0;
    }

    // Validate temperature reading is within reasonable range
    if (temp < -40.0 || temp > 85.0)
    {
        Logger.warn(LOG_TAG_DIAG, "Internal temperature reading out of range: %.2f°C", temp);
        return -127.0;
    }

    Logger.debug(LOG_TAG_DIAG, "Internal temperature: %.2f°C", temp);
    return temp;
}
