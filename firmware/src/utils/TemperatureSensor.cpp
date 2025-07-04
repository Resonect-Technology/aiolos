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
    float temperature = _dallasSensor->getTempCByIndex(sensorIndex);

    if (temperature == DEVICE_DISCONNECTED_C)
    {
        Logger.error(LOG_TAG_TEMP, "Failed to read temperature from '%s'", _name);
    }

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
