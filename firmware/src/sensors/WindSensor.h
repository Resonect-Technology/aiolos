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

    /**
     * @brief Start a new wind sampling period
     *
     * Resets counters and starts collecting wind data for averaging
     */
    void startSamplingPeriod();

    /**
     * @brief Get averaged wind data over the sampling period
     *
     * @param samplingPeriodMs The duration in milliseconds to sample over
     * @param avgSpeed Reference to store the averaged wind speed (m/s)
     * @param avgDirection Reference to store the averaged wind direction (degrees)
     * @return true if sampling period is complete and data is valid
     */
    bool getAveragedWindData(unsigned long samplingPeriodMs, float &avgSpeed, float &avgDirection);

    /**
     * @brief Set the internal sampling interval for wind readings
     *
     * Controls how often wind direction readings are taken during the AVERAGING period.
     * This parameter is ONLY used in averaged mode (windSendInterval > 5000ms).
     *
     * In live-stream mode (windSendInterval ≤ 5000ms), this parameter is ignored
     * because getWindSpeed() and getWindDirection() are called directly.
     *
     * @param intervalMs Interval between individual samples in milliseconds (default: 2000ms)
     *                   Only relevant for averaging mode, should be smaller than windSendInterval
     */
    void setSampleInterval(unsigned long intervalMs);

private:
    uint8_t _anemometerPin = 0;
    uint8_t _windVanePin = 0;
    volatile unsigned long _pulseCount = 0;
    unsigned long _lastMeasurementTime = 0;
    unsigned long _lastPulseCount = 0; // Track last pulse count for differential measurement

    // Wind direction stability variables
    float _lastStableDirection = 0.0;
    unsigned long _directionChangeTime = 0;
    static const unsigned long DIRECTION_CHANGE_DELAY_MS = 1000; // 1 second minimum
    static const int ADC_SAMPLE_COUNT = 5;                       // Number of samples to average

    // Wind sampling/averaging variables
    unsigned long _samplingStartTime = 0;
    float _directionSumX = 0.0; // X component sum for vector averaging
    float _directionSumY = 0.0; // Y component sum for vector averaging
    unsigned int _directionSampleCount = 0;
    unsigned long _totalPulseCount = 0;     // Total pulses during sampling period
    unsigned long _lastSampleTime = 0;      // For internal sampling rate control
    unsigned long _sampleIntervalMs = 2000; // Default: 2s (ONLY used in averaging mode, ignored in live-stream mode)

    // Constants for anemometer calibration
    // From datasheet: 2.4 km/h causes the switch to close once per second
    // 2.4 km/h = 2.4 * (1000/3600) = 0.6667 m/s per Hz
    const float ANEMOMETER_FACTOR = 0.6667; // m/s per Hz (2.4 km/h per Hz)

    /**
     * @brief Get averaged ADC reading for wind vane
     *
     * Takes multiple ADC samples and returns the average to reduce noise
     *
     * @return int Averaged ADC value
     */
    int getAveragedAdcReading();
};

// Global instance for the interrupt handler
extern WindSensor windSensor;
