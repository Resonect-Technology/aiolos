/**
 * @file TemperatureSensor.cpp
 * @brief Implementation of TemperatureSensor utility class
 */

#include "TemperatureSensor.h"
#include "../core/Logger.h"

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

    // Create OneWire instance
    _oneWire = new OneWire(_pin);
    if (!_oneWire)
    {
        Logger.error(LOG_TAG_TEMP, "Failed to create OneWire instance for sensor '%s' on pin %d", _name, _pin);
        return false;
    }

    // Create DallasTemperature instance
    _dallasSensor = new DallasTemperature(_oneWire);
    if (!_dallasSensor)
    {
        Logger.error(LOG_TAG_TEMP, "Failed to create DallasTemperature instance for sensor '%s'", _name);
        delete _oneWire;
        _oneWire = nullptr;
        return false;
    }

    // Initialize the sensor library
    _dallasSensor->begin();

    // Detect sensors on the bus
    detectSensors();

    // Set resolution for all sensors on the bus to 9-bit for faster readings (~94ms)
    if (_sensorCount > 0)
    {
        _dallasSensor->setResolution(9);
        Logger.info(LOG_TAG_TEMP, "Set temperature sensor resolution to 9-bit.");
    }

    _initialized = true;
    Logger.info(LOG_TAG_TEMP, "Temperature sensor '%s' initialized on pin %d with %d sensor(s)",
                _name, _pin, _sensorCount);

    return true;
}

/**
 * @brief Read temperature from the sensor
 */
float TemperatureSensor::readTemperature(uint8_t sensorIndex)
{
    if (!_initialized || !_dallasSensor)
    {
        Logger.error(LOG_TAG_TEMP, "Temperature sensor '%s' not initialized", _name);
        return DEVICE_DISCONNECTED_C;
    }

    if (sensorIndex >= _sensorCount)
    {
        Logger.error(LOG_TAG_TEMP, "Sensor index %d out of range for '%s' (max: %d)",
                     sensorIndex, _name, _sensorCount - 1);
        return DEVICE_DISCONNECTED_C;
    }

    // Request temperature readings from all sensors
    _dallasSensor->requestTemperatures();

    // Read temperature from the specified sensor
    float temperature = _dallasSensor->getTempCByIndex(sensorIndex);

    if (temperature == DEVICE_DISCONNECTED_C)
    {
        Logger.error(LOG_TAG_TEMP, "Failed to read temperature from sensor '%s' index %d",
                     _name, sensorIndex);
        return DEVICE_DISCONNECTED_C;
    }

    Logger.debug(LOG_TAG_TEMP, "Temperature sensor '%s'[%d]: %.2f°C", _name, sensorIndex, temperature);
    return temperature;
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

    // Re-detect sensors in case they were added/removed
    detectSensors();
    return _sensorCount;
}

/**
 * @brief Detect and count sensors on the bus
 */
void TemperatureSensor::detectSensors()
{
    if (!_dallasSensor)
    {
        _sensorCount = 0;
        return;
    }

    _sensorCount = _dallasSensor->getDeviceCount();
    Logger.debug(LOG_TAG_TEMP, "Detected %d sensor(s) on bus '%s' (pin %d)",
                 _sensorCount, _name, _pin);
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
