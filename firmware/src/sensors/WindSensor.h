/**
 * @file WindSensor.h
 * @brief Wind sensor handling class for anemometer and wind vane
 *
 * Provides functionality to read wind direction and speed
 * from common wind sensor assemblies.
 *
 * Measurement architecture: service() drains the anemometer ISR pulse
 * counter (at most) once per second into a WindStats::Ring — it is the ONLY
 * place the counter is read or reset, so livestream and averaged mode can
 * never corrupt each other's state. Live statistics (3 s rolling mean,
 * trailing gust/lull) come straight from the ring; averaged mode adds a
 * WindStats::Period accumulator with an explicit start/finalize/abandon
 * lifecycle.
 */

#pragma once

#include <Arduino.h>

#include "../logic/WindStats.h"

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
     * @brief Per-loop tick: snapshot the ISR pulse counter into the ring
     *
     * Call every loop() iteration (cheap no-op between 1 s boundaries).
     * Must run regardless of connectivity so measurement continues offline.
     *
     * @param nowMs Current millis()
     */
    void service(unsigned long nowMs);

    /**
     * @brief Get the current wind direction in degrees (0-359)
     *
     * 0° = North, 90° = East, 180° = South, 270° = West
     * Applies a stability filter (hysteresis) suited to the live stream.
     *
     * @return float Wind direction in degrees
     */
    float getWindDirection();

    /**
     * @brief Live wind speed: 3 s rolling mean (m/s)
     */
    float getLiveSpeed();

    /**
     * @brief Live gust: max 3 s mean over the trailing 60 s (m/s)
     */
    float getLiveGust();

    /**
     * @brief Live lull: min 3 s mean over the trailing 60 s (m/s)
     */
    float getLiveLull();

    /**
     * @brief Print wind sensor reading to serial monitor
     */
    void printWindReading();

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
     * @brief Start a new averaged-mode sampling period
     *
     * Resets only the period accumulator — the pulse counter and live ring
     * are untouched, so live statistics stay valid across mode switches.
     */
    void startSamplingPeriod();

    /**
     * @brief Discard an in-progress sampling period (averaged -> live switch)
     */
    void abandonSamplingPeriod();

    /**
     * @brief Get averaged wind data over the sampling period
     *
     * @param samplingPeriodMs The duration in milliseconds to sample over
     * @param avgSpeed Averaged wind speed over the period (m/s)
     * @param avgDirection Vector-averaged wind direction (degrees)
     * @param gustSpeed Max 3 s mean during the period (m/s)
     * @param minSpeed Min 3 s mean during the period (m/s)
     * @return true if sampling period is complete and data is valid
     */
    bool getAveragedWindData(unsigned long samplingPeriodMs, float &avgSpeed, float &avgDirection,
                             float &gustSpeed, float &minSpeed);

    /**
     * @brief Legacy remote-config hook for the averaging sample interval
     *
     * Direction/pulse sampling now runs at a fixed 1 Hz (service()), so this
     * only logs the requested value. Kept so the config protocol and
     * windSampleInterval server field remain valid.
     */
    void setSampleInterval(unsigned long intervalMs);

private:
    uint8_t _anemometerPin = 0;
    uint8_t _windVanePin = 0;
    volatile unsigned long _pulseCount = 0;

    // Wind direction stability variables (live mode)
    float _lastStableDirection = 0.0;
    unsigned long _directionChangeTime = 0;
    static const unsigned long DIRECTION_CHANGE_DELAY_MS = 1000; // 1 second minimum
    static const int ADC_SAMPLE_COUNT = 5;                       // Number of samples to average

    // Measurement state (see WindStats.h)
    WindStats::Ring _ring;
    WindStats::Period _period;
    bool _periodActive = false;
    unsigned long _periodStartMs = 0;
    unsigned long _lastTickMs = 0;

    // Constants for anemometer calibration
    // From datasheet: 2.4 km/h causes the switch to close once per second
    // 2.4 km/h = 2.4 * (1000/3600) = 0.6667 m/s per Hz
    const float ANEMOMETER_FACTOR = 0.6667; // m/s per Hz (2.4 km/h per Hz)

    /**
     * @brief Drain the ISR counter into the ring and period accumulator
     *
     * @param nowMs Current millis(); uses whatever time elapsed since the
     *              last snapshot (also folds residual sub-second intervals
     *              when finalizing a period)
     */
    void takeSnapshot(unsigned long nowMs);

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
