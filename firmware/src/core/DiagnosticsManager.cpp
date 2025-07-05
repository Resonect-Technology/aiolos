/**
 * @file DiagnosticsManager.cpp
 * @brief Implementation of the DiagnosticsManager class
 */

#include "DiagnosticsManager.h"
#include "../config/Config.h"

#define LOG_TAG_DIAG "DIAG"

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
    _externalTempAvailable = false;

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

    // Initialize external temperature sensor
    if (_externalTempSensor.init(TEMP_BUS_EXT, "external"))
    {
        _externalTempAvailable = true;
        Logger.info(LOG_TAG_DIAG, "External temperature sensor initialized successfully");
    }
    else
    {
        Logger.warn(LOG_TAG_DIAG, "Failed to initialize external temperature sensor (optional)");
        // Continue initialization even if external sensor fails
    }

    // Configure ADC for solar voltage reading once
    configureSolarAdc();

    _initialized = true;

    Logger.info(LOG_TAG_DIAG, "Diagnostics manager initialized with interval of %lu ms", _interval);
    Logger.info(LOG_TAG_DIAG, "Temperature sensors - Internal: %s, External: %s",
                _internalTempAvailable ? "available" : "unavailable",
                _externalTempAvailable ? "available" : "unavailable");

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
bool DiagnosticsManager::sendDiagnostics()
{
    if (!_initialized || !_modemManager || !_httpClient)
    {
        Logger.error(LOG_TAG_DIAG, "Diagnostics manager not initialized");
        return false;
    }

    // Read internal temperature if available
    float internalTemp = _internalTempAvailable ? readInternalTemperature() : -127.0f;

    // Read external temperature if available
    float externalTemp = _externalTempAvailable ? readExternalTemperature() : -127.0f;

    return sendDiagnosticsInternal(internalTemp, externalTemp);
}

/**
 * @brief Send diagnostics with external temperature readings
 */
bool DiagnosticsManager::sendDiagnostics(float internalTemp, float externalTemp)
{
    if (!_initialized || !_modemManager || !_httpClient)
    {
        Logger.error(LOG_TAG_DIAG, "Diagnostics manager not initialized");
        return false;
    }

    return sendDiagnosticsInternal(internalTemp, externalTemp);
}

/**
 * @brief Internal method to send diagnostics data
 */
bool DiagnosticsManager::sendDiagnosticsInternal(float internalTemp, float externalTemp)
{
    Logger.info(LOG_TAG_DIAG, "Collecting and sending diagnostics data...");

    // Get signal quality
    int signalQuality = _modemManager->getSignalQuality();

    // Read voltage values
    float batteryVoltage = readBatteryVoltage();
    float solarVoltage = readSolarVoltage();

    // Get system uptime in seconds
    unsigned long uptime = getSystemUptime();

    // Log diagnostic values before sending
    Logger.info(LOG_TAG_DIAG, "Diagnostics - Battery: %.2fV, Solar: %.2fV, Signal: %d, Uptime: %lus",
                batteryVoltage, solarVoltage, signalQuality, uptime);
    Logger.info(LOG_TAG_DIAG, "Diagnostics - Internal temp: %.1f°C, External temp: %.1f°C",
                internalTemp, externalTemp);

#ifdef DISABLE_WDT_FOR_MODEM
    Logger.debug(LOG_TAG_DIAG, "Disabling watchdog for diagnostics");
    esp_task_wdt_deinit();
#endif

    // Send data to server
    bool success = _httpClient->sendDiagnostics(DEVICE_ID, batteryVoltage, solarVoltage, internalTemp, signalQuality, uptime);

#ifdef DISABLE_WDT_FOR_MODEM
    Logger.debug(LOG_TAG_DIAG, "Re-enabling watchdog after diagnostics");
    esp_task_wdt_init(WDT_TIMEOUT / 1000, true);
    esp_task_wdt_add(NULL);
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

/**
 * @brief Read the external temperature sensor
 */
float DiagnosticsManager::readExternalTemperature()
{
    if (!_externalTempAvailable)
    {
        Logger.debug(LOG_TAG_DIAG, "External temperature sensor not available");
        return -127.0;
    }

    float temp = _externalTempSensor.readTemperature();

    if (temp == DEVICE_DISCONNECTED_C)
    {
        Logger.debug(LOG_TAG_DIAG, "External temperature sensor disconnected");
        return -127.0;
    }

    // Validate temperature reading is within reasonable range
    if (temp < -40.0 || temp > 85.0)
    {
        Logger.warn(LOG_TAG_DIAG, "External temperature reading out of range: %.2f°C", temp);
        return -127.0;
    }

    Logger.debug(LOG_TAG_DIAG, "External temperature: %.2f°C", temp);
    return temp;
}
