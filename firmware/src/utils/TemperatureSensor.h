/**
 * @file TemperatureSensor.h
 * @brief Utility class for DS18B20 temperature sensor management
 *
 * Provides a reusable interface for managing DS18B20 temperature sensors
 * on OneWire buses. Supports both internal and external temperature sensors
 * with automatic sensor detection and error handling.
 */

#pragma once

#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>

class TemperatureSensor
{
public:
    /**
     * @brief Initialize the temperature sensor on a given pin
     *
     * @param pin OneWire bus pin number
     * @param name Sensor name for logging purposes
     * @return true if initialization successful
     * @return false if initialization failed
     */
    bool init(uint8_t pin, const char *name = "Temperature");

    /**
     * @brief Read temperature from the sensor
     *
     * @param sensorIndex Index of the sensor on the bus (default: 0)
     * @return float Temperature in Celsius, or DEVICE_DISCONNECTED_C if failed
     */
    float readTemperature(uint8_t sensorIndex = 0);

    /**
     * @brief Start non-blocking temperature conversion
     *
     * @param sensorIndex Index of the sensor on the bus (default: 0)
     * @return true if conversion started successfully
     */
    bool startConversion(uint8_t sensorIndex = 0);

    /**
     * @brief Check if temperature conversion is complete and get result
     *
     * @param sensorIndex Index of the sensor on the bus (default: 0)
     * @return float Temperature in Celsius, or NAN if conversion not complete, or DEVICE_DISCONNECTED_C if failed
     */
    float getTemperatureNonBlocking(uint8_t sensorIndex = 0);

    /**
     * @brief Read temperature from the sensor with retry capability
     *
     * @param sensorIndex Index of the sensor on the bus (default: 0)
     * @param maxRetries Maximum number of retry attempts (default: 3)
     * @return float Temperature in Celsius, or DEVICE_DISCONNECTED_C if failed
     */
    float readTemperatureWithRetry(uint8_t sensorIndex = 0, uint8_t maxRetries = 3);

    /**
     * @brief Get the number of sensors detected on the bus
     *
     * @return uint8_t Number of sensors found
     */
    uint8_t getSensorCount();

    /**
     * @brief Check if the sensor is properly initialized
     *
     * @return true if initialized
     * @return false if not initialized
     */
    bool isInitialized() const { return _initialized; }

    /**
     * @brief Get the sensor name
     *
     * @return const char* Sensor name
     */
    const char *getName() const { return _name; }

    /**
     * @brief Destructor - cleanup resources
     */
    ~TemperatureSensor();

private:
    OneWire *_oneWire = nullptr;
    DallasTemperature *_dallasSensor = nullptr;
    bool _initialized = false;
    const char *_name = "Temperature";
    uint8_t _pin = 0;
    uint8_t _sensorCount = 0;
    unsigned long _conversionStartTime = 0; // For non-blocking operation
    bool _conversionInProgress = false;     // Track conversion state

    /**
     * @brief Detect and count sensors on the bus
     */
    void detectSensors();
};
