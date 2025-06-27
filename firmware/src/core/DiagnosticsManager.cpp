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

    // Get system uptime in seconds
    unsigned long uptime = millis() / 1000;

    // Send data to server
    bool success = _httpClient->sendDiagnostics(DEVICE_ID, batteryVoltage, solarVoltage, signalQuality, uptime);

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
    // Read battery voltage from ADC_BATTERY_PIN (GPIO35)
    // ESP32 ADC has 12-bit resolution (0-4095)
    // Note: According to LilyGo docs, battery voltage cannot be read when connected to USB

    // Configure ADC
    analogSetWidth(12);                                 // Set ADC resolution to 12 bits
    analogSetPinAttenuation(ADC_BATTERY_PIN, ADC_11db); // Set attenuation for higher voltage range

    // Read multiple samples for better accuracy
    const int numSamples = 10;
    int batteryRawTotal = 0;

    for (int i = 0; i < numSamples; i++)
    {
        batteryRawTotal += analogRead(ADC_BATTERY_PIN);
        delay(5);
    }

    int batteryRaw = batteryRawTotal / numSamples;

    // Calculate battery voltage (3.5V - 4.2V range according to docs)
    // ESP32 ADC is non-linear, especially at extremes
    // Calibration factor may need adjustment for your specific board
    float batteryCalibration = 1.73; // This factor needs calibration with a multimeter
    float batteryVoltage = (float)batteryRaw * 3.3 / 4095.0 * batteryCalibration;

    // Limit to expected range based on documentation
    batteryVoltage = constrain(batteryVoltage, 3.0, 4.5);

    // Log the raw and converted values
    Logger.debug(LOG_TAG_DIAG, "Battery ADC: %d, Voltage: %.2fV", batteryRaw, batteryVoltage);

    // Check if likely running on USB power
    if (batteryVoltage < 3.4 || batteryRaw < 100)
    {
        Logger.warn(LOG_TAG_DIAG, "Battery voltage reading may be incorrect - possibly running on USB power");
    }

    return batteryVoltage;
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
