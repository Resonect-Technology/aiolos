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
bool DiagnosticsManager::init(ModemManager &modemManager, HttpClient &httpClient, unsigned long interval)
{
    _modemManager = &modemManager;
    _httpClient = &httpClient;
    _interval = interval;

    // Initialize internal temperature sensor
    if (!_internalTempSensor.init(TEMP_BUS_INT, "internal"))
    {
        Logger.error(LOG_TAG_DIAG, "Failed to initialize internal temperature sensor");
        return false;
    }

    // Initialize external temperature sensor
    if (!_externalTempSensor.init(TEMP_BUS_EXT, "external"))
    {
        Logger.warn(LOG_TAG_DIAG, "Failed to initialize external temperature sensor (optional)");
        // Continue initialization even if external sensor fails
    }

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
bool DiagnosticsManager::sendDiagnostics()
{
    if (!_initialized || !_modemManager || !_httpClient)
    {
        Logger.error(LOG_TAG_DIAG, "Diagnostics manager not initialized");
        return false;
    }

    Logger.info(LOG_TAG_DIAG, "Collecting and sending diagnostics data...");

    // Get signal quality
    int signalQuality = _modemManager->getSignalQuality();

    // Read voltage values
    float batteryVoltage = readBatteryVoltage();
    float solarVoltage = readSolarVoltage();

    // Read internal temperature
    float internalTemp = readInternalTemperature();

    // Read external temperature (optional)
    float externalTemp = readExternalTemperature();

    // Get system uptime in seconds
    unsigned long uptime = millis() / 1000;

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
        Logger.info(LOG_TAG_DIAG, "Internal temp: %.1f°C, External temp: %.1f°C", internalTemp, externalTemp);
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
    // Configure ADC
    analogSetWidth(12);                               // Set ADC resolution to 12 bits
    analogSetPinAttenuation(ADC_SOLAR_PIN, ADC_11db); // Set attenuation for higher voltage range

    // Read multiple samples for better accuracy
    const int numSamples = 10;
    int solarRawTotal = 0;

    for (int i = 0; i < numSamples; i++)
    {
        solarRawTotal += analogRead(ADC_SOLAR_PIN);
        delay(5);
    }

    int solarRaw = solarRawTotal / numSamples;

    // Calculate solar voltage (4.4V to 6V range according to docs)
    float solarCalibration = 2.0; // This factor needs calibration with a multimeter
    float solarVoltage = (float)solarRaw * 3.3 / 4095.0 * solarCalibration;

    // Limit to expected range based on documentation
    solarVoltage = constrain(solarVoltage, 0.0, 6.5);

    // Log the raw and converted values
    Logger.debug(LOG_TAG_DIAG, "Solar ADC: %d, Voltage: %.2fV", solarRaw, solarVoltage);

    return solarVoltage;
}

/**
 * @brief Read the internal temperature sensor
 */
float DiagnosticsManager::readInternalTemperature()
{
    float temp = _internalTempSensor.readTemperature();

    if (temp == DEVICE_DISCONNECTED_C)
    {
        Logger.error(LOG_TAG_DIAG, "Failed to read internal temperature sensor");
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
    float temp = _externalTempSensor.readTemperature();

    if (temp == DEVICE_DISCONNECTED_C)
    {
        Logger.debug(LOG_TAG_DIAG, "External temperature sensor not available");
        return -127.0;
    }

    Logger.debug(LOG_TAG_DIAG, "External temperature: %.2f°C", temp);
    return temp;
}
