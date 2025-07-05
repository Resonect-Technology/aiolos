/**
 * @file TemperatureSensor.cpp
 * @brief Implementation of TemperatureSensor utility class
 */

#include "TemperatureSensor.h"
#include "../core/Logger.h"
#include <math.h> // For NAN

static const char *LOG_TAG_TEMP = "TEMP_SENSOR";

/**
 * @brief Initialize the temperature sensor on a given pin
 */
bool TemperatureSensor::init(uint8_t pin, const char *name)
{
    if (_initialized)
    {
        Logger.warn(LOG_TAG_TEMP, "Temperature sensor '%s' already initialized", name);
        return true;
    }

    _pin = pin;
    _name = name;

    // Configure pin and create sensor instances
    pinMode(_pin, INPUT_PULLUP);
    _oneWire = new OneWire(_pin);
    _dallasSensor = new DallasTemperature(_oneWire);

    if (!_oneWire || !_dallasSensor)
    {
        Logger.error(LOG_TAG_TEMP, "Failed to create sensor instances for '%s'", _name);
        return false;
    }

    // Initialize sensor and set 9-bit resolution
    _dallasSensor->begin();
    _dallasSensor->setResolution(9);

    // Check if sensors are using parasitic power
    bool parasiticMode = false;
    if (_dallasSensor->getDeviceCount() > 0)
    {
        DeviceAddress deviceAddress;
        if (_dallasSensor->getAddress(deviceAddress, 0))
        {
            parasiticMode = _dallasSensor->readPowerSupply(deviceAddress);
            Logger.debug(LOG_TAG_TEMP, "Sensor '%s' power mode: %s", _name, parasiticMode ? "External" : "Parasitic");
        }
    }

    delay(100);

    // Check for connected sensors
    _sensorCount = _dallasSensor->getDeviceCount();
    if (_sensorCount == 0)
    {
        Logger.warn(LOG_TAG_TEMP, "No sensors found on pin %d for '%s'", _pin, _name);
    }

    _initialized = true;
    Logger.info(LOG_TAG_TEMP, "Temperature sensor '%s' initialized on pin %d. Found %d sensor(s).", _name, _pin, _sensorCount);
    return true;
}

/**
 * @brief Read temperature from the sensor
 */
float TemperatureSensor::readTemperature(uint8_t sensorIndex)
{
    if (!_initialized || !_dallasSensor || _sensorCount == 0)
    {
        return DEVICE_DISCONNECTED_C;
    }

    _dallasSensor->requestTemperatures();

    // Wait for conversion to complete based on resolution
    // 9-bit: 94ms, 10-bit: 188ms, 11-bit: 375ms, 12-bit: 750ms
    // We're using 9-bit resolution, so wait ~100ms for safety
    delay(100);

    float temperature = _dallasSensor->getTempCByIndex(sensorIndex);

    // Validate temperature reading
    if (temperature == DEVICE_DISCONNECTED_C || temperature == 85.0 || temperature < -55.0 || temperature > 125.0)
    {
        // 85.0°C is the power-on reset value indicating sensor issues
        // -55°C to +125°C is the DS18B20 operating range
        if (temperature == 85.0)
        {
            Logger.warn(LOG_TAG_TEMP, "Sensor '%s' returned power-on reset value (85°C) - possible connection issue", _name);
        }
        else if (temperature == DEVICE_DISCONNECTED_C)
        {
            Logger.error(LOG_TAG_TEMP, "Sensor '%s' disconnected", _name);
        }
        else
        {
            Logger.error(LOG_TAG_TEMP, "Sensor '%s' reading out of range: %.2f°C", _name, temperature);
        }
        return DEVICE_DISCONNECTED_C;
    }

    Logger.debug(LOG_TAG_TEMP, "Sensor '%s' reading: %.2f°C", _name, temperature);

    return temperature;
}

/**
 * @brief Start non-blocking temperature conversion
 */
bool TemperatureSensor::startConversion(uint8_t sensorIndex)
{
    if (!_initialized || !_dallasSensor || _sensorCount == 0)
    {
        return false;
    }

    _dallasSensor->requestTemperatures();
    _conversionStartTime = millis();
    _conversionInProgress = true;

    Logger.debug(LOG_TAG_TEMP, "Started temperature conversion for '%s'", _name);
    return true;
}

/**
 * @brief Check if temperature conversion is complete and get result
 */
float TemperatureSensor::getTemperatureNonBlocking(uint8_t sensorIndex)
{
    if (!_initialized || !_dallasSensor || _sensorCount == 0 || !_conversionInProgress)
    {
        return DEVICE_DISCONNECTED_C;
    }

    // Check if enough time has passed for conversion (100ms for 9-bit resolution)
    if (millis() - _conversionStartTime < 100)
    {
        return NAN; // Conversion not complete yet
    }

    _conversionInProgress = false;
    float temperature = _dallasSensor->getTempCByIndex(sensorIndex);

    // Validate temperature reading (same validation as blocking method)
    if (temperature == DEVICE_DISCONNECTED_C || temperature == 85.0 || temperature < -55.0 || temperature > 125.0)
    {
        if (temperature == 85.0)
        {
            Logger.warn(LOG_TAG_TEMP, "Sensor '%s' returned power-on reset value (85°C) - possible connection issue", _name);
        }
        else if (temperature == DEVICE_DISCONNECTED_C)
        {
            Logger.error(LOG_TAG_TEMP, "Sensor '%s' disconnected", _name);
        }
        else
        {
            Logger.error(LOG_TAG_TEMP, "Sensor '%s' reading out of range: %.2f°C", _name, temperature);
        }
        return DEVICE_DISCONNECTED_C;
    }

    Logger.debug(LOG_TAG_TEMP, "Sensor '%s' non-blocking reading: %.2f°C", _name, temperature);
    return temperature;
}

/**
 * @brief Read temperature from the sensor with retry capability
 */
float TemperatureSensor::readTemperatureWithRetry(uint8_t sensorIndex, uint8_t maxRetries)
{
    for (uint8_t attempt = 0; attempt <= maxRetries; attempt++)
    {
        float temperature = readTemperature(sensorIndex);

        if (temperature != DEVICE_DISCONNECTED_C)
        {
            if (attempt > 0)
            {
                Logger.info(LOG_TAG_TEMP, "Sensor '%s' reading successful after %d retries", _name, attempt);
            }
            return temperature;
        }

        if (attempt < maxRetries)
        {
            Logger.warn(LOG_TAG_TEMP, "Sensor '%s' read attempt %d failed, retrying...", _name, attempt + 1);
            delay(50); // Small delay between retries
        }
    }

    Logger.error(LOG_TAG_TEMP, "Sensor '%s' failed after %d attempts", _name, maxRetries + 1);
    return DEVICE_DISCONNECTED_C;
}

/**
 * @brief Get the number of sensors detected on the bus
 */
uint8_t TemperatureSensor::getSensorCount()
{
    if (!_initialized || !_dallasSensor)
    {
        return 0;
    }
    return _dallasSensor->getDeviceCount();
}

/**
 * @brief Destructor - cleanup resources
 */
TemperatureSensor::~TemperatureSensor()
{
    if (_dallasSensor)
    {
        delete _dallasSensor;
        _dallasSensor = nullptr;
    }

    if (_oneWire)
    {
        delete _oneWire;
        _oneWire = nullptr;
    }

    _initialized = false;
}
