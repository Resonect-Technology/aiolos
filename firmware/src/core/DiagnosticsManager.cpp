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

    // Initialize OneWire and Dallas Temperature sensors
    _oneWireInternal = new OneWire(TEMP_BUS_INT);
    if (!_oneWireInternal)
    {
        Logger.error(LOG_TAG_DIAG, "Failed to initialize OneWire for internal temperature");
        return false;
    }

    _tempSensors = new DallasTemperature(_oneWireInternal);
    if (!_tempSensors)
    {
        Logger.error(LOG_TAG_DIAG, "Failed to initialize DallasTemperature");
        delete _oneWireInternal;
        _oneWireInternal = nullptr;
        return false;
    }

    _tempSensors->begin();

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

    // Get system uptime in seconds
    unsigned long uptime = millis() / 1000;

    // Send data to server
    bool success = _httpClient->sendDiagnostics(DEVICE_ID, batteryVoltage, solarVoltage, internalTemp, signalQuality, uptime);

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
    if (!_tempSensors)
    {
        Logger.error(LOG_TAG_DIAG, "Temperature sensors not initialized");
        return -127.0; // DEVICE_DISCONNECTED_C value
    }

    // Request temperature readings from all sensors
    _tempSensors->requestTemperatures();

    // Read temperature from the first sensor on the bus
    float temp = _tempSensors->getTempCByIndex(0);

    if (temp == DEVICE_DISCONNECTED_C)
    {
        Logger.error(LOG_TAG_DIAG, "Failed to read internal temperature sensor");
        return -127.0;
    }

    Logger.debug(LOG_TAG_DIAG, "Internal temperature: %.2f°C", temp);
    return temp;
}
