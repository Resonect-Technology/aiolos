/**
 * @file WindSensor.h
 * @brief Wind sensor handling class for anemometer and wind vane
 *
 * Provides functionality to read wind direction and speed
 * from common wind sensor assemblies.
 */

#pragma once

#include <Arduino.h>

class WindSensor
{
public:
    /**
     * @brief Initialize the wind sensor
     *
     * @param anemometerPin Pin connected to the anemometer
     * @param windVanePin Pin connected to the wind vane
     * @return true if initialization successful
     * @return false if initialization failed
     */
    bool init(uint8_t anemometerPin, uint8_t windVanePin);

    /**
     * @brief Get the current wind direction in degrees (0-359)
     *
     * 0° = North, 90° = East, 180° = South, 270° = West
     *
     * @return float Wind direction in degrees
     */
    float getWindDirection();

    /**
     * @brief Get the current wind speed
     *
     * @param samplePeriodMs The period over which to measure wind speed
     * @return float Wind speed in meters per second
     */
    float getWindSpeed(unsigned long samplePeriodMs = 1000);

    /**
     * @brief Print wind sensor reading to serial monitor
     *
     * @param samplePeriodMs The period over which to measure wind speed
     */
    void printWindReading(unsigned long samplePeriodMs = 1000);

    /**
     * @brief Handle interrupt for anemometer pulse counting
     * This is called from the interrupt service routine
     */
    void countAnemometerPulse();

    /**
     * @brief Run a calibration routine to help determine wind vane voltage values
     *
     * This function continuously reads the wind vane and prints the readings.
     * Use this to determine the actual voltage values for each direction.
     *
     * @param durationMs How long to run the calibration routine (in milliseconds)
     */
    void calibrateWindVane(unsigned long durationMs = 30000);

private:
    uint8_t _anemometerPin = 0;
    uint8_t _windVanePin = 0;
    volatile unsigned long _pulseCount = 0;
    unsigned long _lastMeasurementTime = 0;

    // Constants for anemometer calibration
    // Standard Davis Anemometer: 1 pulse per second = 1.609 km/h (0.447 m/s)
    const float ANEMOMETER_FACTOR = 0.447; // m/s per Hz

    // Lookup table for wind vane readings (voltage to direction)
    struct WindDirectionEntry
    {
        int resistance;  // Wind vane resistance in ohms
        float voltage;   // Corresponding voltage at ADC pin
        float direction; // Wind direction in degrees
    };

    // Wind vane lookup table based on provided values
    // Direction values assigned according to standard compass directions
    static constexpr WindDirectionEntry WIND_DIRECTIONS[] = {
        {33000, 2.53, 0},     // North
        {6570, 1.31, 22.5},   // NNE
        {8200, 1.49, 45},     // NE
        {891, 0.27, 67.5},    // ENE
        {1000, 0.30, 90},     // East
        {688, 0.21, 112.5},   // ESE
        {2200, 0.60, 135},    // SE
        {1410, 0.41, 157.5},  // SSE
        {3900, 0.93, 180},    // South
        {3140, 0.79, 202.5},  // SSW
        {16000, 2.03, 225},   // SW
        {14120, 1.93, 247.5}, // WSW
        {120000, 3.05, 270},  // West
        {42120, 2.67, 292.5}, // WNW
        {64900, 2.86, 315},   // NW
        {21880, 2.26, 337.5}  // NNW
    };
    static constexpr size_t WIND_DIRECTIONS_COUNT = sizeof(WIND_DIRECTIONS) / sizeof(WIND_DIRECTIONS[0]);

    /**
     * @brief Find the closest wind direction based on the voltage reading
     *
     * @param voltage The measured voltage from the wind vane
     * @return float Wind direction in degrees (0-359)
     */
    float voltageToDirection(float voltage);
};

// Global instance for the interrupt handler
extern WindSensor windSensor;
