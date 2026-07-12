/**
 * @file WindSensor.cpp
 * @brief Implementation of the WindSensor class
 */

#include "WindSensor.h"
#include "../config/Config.h"
#include "../core/Logger.h"
#include "../logic/WindLogic.h"
#include <Arduino.h> // Make sure this is included

#define LOG_TAG_WIND "WIND"

// Global instance for the interrupt handler
WindSensor windSensor;

// Interrupt handler for anemometer pulse counting
void IRAM_ATTR handleAnemometerInterrupt()
{
    static unsigned long lastInterruptTime = 0;
    unsigned long interruptTime = millis();

    // Debounce: ignore interrupts that occur too quickly (< 10ms apart)
    if (interruptTime - lastInterruptTime > 10)
    {
        windSensor.countAnemometerPulse();
        lastInterruptTime = interruptTime;
    }
}

bool WindSensor::init(uint8_t anemometerPin, uint8_t windVanePin)
{
    _anemometerPin = anemometerPin;
    _windVanePin = windVanePin;
    _pulseCount = 0;
    _ring.clear();
    _period.reset();
    _periodActive = false;
    _lastTickMs = millis();

    // Configure wind vane pin as analog input
    pinMode(_windVanePin, INPUT);

    // ESP32 specific - configure ADC for better readings, exactly as in the old code
    analogReadResolution(12);                        // Set ADC resolution to 12 bits (0-4095)
    analogRead(_windVanePin);                        // Core 3.x: pin must be read once before per-pin attenuation applies
    analogSetPinAttenuation(_windVanePin, ADC_11db); // For 3.3V input range

    // Configure anemometer pin with pull-up and interrupt
    pinMode(_anemometerPin, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(_anemometerPin), handleAnemometerInterrupt, FALLING);

    Logger.info(LOG_TAG_WIND, "Wind sensor initialized");
    Logger.info(LOG_TAG_WIND, "Anemometer pin: %d, Wind vane pin: %d", _anemometerPin, _windVanePin);

    return true;
}

int WindSensor::getAveragedAdcReading()
{
    int total = 0;

    // Take multiple ADC readings and average them
    for (int i = 0; i < ADC_SAMPLE_COUNT; i++)
    {
        total += analogRead(_windVanePin);
        delay(2); // Small delay between readings
    }

    return total / ADC_SAMPLE_COUNT;
}

float WindSensor::getWindDirection()
{
    // Get averaged ADC value to reduce noise
    int adcValue = getAveragedAdcReading();

    // Map ADC value to wind direction based on calibrated ranges (see WindLogic.h)
    float direction = WindLogic::adcToDirection(adcValue);
    Logger.debug(LOG_TAG_WIND, "ADC %d -> %.0f°", adcValue, direction);

    // Implement minimum change time to prevent rapid direction bouncing
    unsigned long currentTime = millis();

    // Check if this is a significant direction change (handles 0°/360° wrap)
    float directionDifference = WindLogic::angularDifference(direction, _lastStableDirection);

    // If direction has changed significantly
    if (directionDifference > 11.25)
    { // Half of 22.5° (minimum meaningful change)
        if (_directionChangeTime == 0)
        {
            // First time seeing this new direction, start the timer
            _directionChangeTime = currentTime;
        }
        else if (currentTime - _directionChangeTime >= DIRECTION_CHANGE_DELAY_MS)
        {
            // Direction has been stable for the required time, accept the change
            _lastStableDirection = direction;
            _directionChangeTime = 0;
        }
        // Return the last stable direction until the change is confirmed
        direction = _lastStableDirection;
    }
    else
    {
        // Direction hasn't changed significantly, reset the change timer
        _directionChangeTime = 0;
        _lastStableDirection = direction;
    }

    // For debugging
    Logger.debug(LOG_TAG_WIND, "Wind direction: %.1f° (ADC: %d)", direction, adcValue);

    return direction;
}

void WindSensor::service(unsigned long nowMs)
{
    if (nowMs - _lastTickMs < WIND_TICK_INTERVAL_MS)
    {
        return;
    }
    takeSnapshot(nowMs);
}

void WindSensor::takeSnapshot(unsigned long nowMs)
{
    unsigned long elapsed = nowMs - _lastTickMs;
    if (elapsed == 0)
    {
        return;
    }
    _lastTickMs = nowMs;

    // The ONLY place the ISR counter is read and reset
    noInterrupts();
    unsigned long pulses = _pulseCount;
    _pulseCount = 0;
    interrupts();

    _ring.push((uint32_t)pulses, (uint32_t)elapsed);

    if (_periodActive)
    {
        // Gust/lull need a complete 3 s window; signal "not yet" with -1
        float mean3s = -1.0f;
        if (WindStats::spanMs(_ring) >= WIND_GUST_WINDOW_MS)
        {
            mean3s = WindStats::rollingMean(_ring, WIND_GUST_WINDOW_MS, ANEMOMETER_FACTOR);
        }
        WindStats::accumulateTick(_period, (uint32_t)pulses, (uint32_t)elapsed, mean3s);

        // Raw direction sample for the vector average — deliberately bypasses
        // the live hysteresis filter, which would lag and distort the mean
        float direction = WindLogic::adcToDirection(getAveragedAdcReading());
        WindLogic::addDirectionSample(_period.dirSumX, _period.dirSumY, direction);
        _period.dirSamples++;
    }
}

float WindSensor::getLiveSpeed()
{
    return WindStats::rollingMean(_ring, WIND_GUST_WINDOW_MS, ANEMOMETER_FACTOR);
}

float WindSensor::getLiveGust()
{
    return WindStats::maxWindowMean(_ring, WIND_GUST_WINDOW_MS, WIND_LIVE_STATS_WINDOW_MS,
                                    ANEMOMETER_FACTOR);
}

float WindSensor::getLiveLull()
{
    return WindStats::minWindowMean(_ring, WIND_GUST_WINDOW_MS, WIND_LIVE_STATS_WINDOW_MS,
                                    ANEMOMETER_FACTOR);
}

void WindSensor::printWindReading()
{
    float windSpeed = getLiveSpeed();

    // Get raw ADC value for debugging
    int adcValue = analogRead(_windVanePin);
    float windDirection = getWindDirection();

    Logger.info(LOG_TAG_WIND, "------------------------------");
    Logger.info(LOG_TAG_WIND, "Wind Speed: %.2f m/s (%.2f km/h)",
                windSpeed, windSpeed * 3.6);
    Logger.info(LOG_TAG_WIND, "Wind Direction: %.1f° (ADC: %d)",
                windDirection, adcValue);
    Logger.info(LOG_TAG_WIND, "------------------------------");
}

void WindSensor::countAnemometerPulse()
{
    _pulseCount++;
}

void WindSensor::calibrateWindVane(unsigned long durationMs)
{
    Logger.info(LOG_TAG_WIND, "=========================================");
    Logger.info(LOG_TAG_WIND, "=== WIND VANE CALIBRATION WIZARD ===");
    Logger.info(LOG_TAG_WIND, "=========================================");
    Logger.info(LOG_TAG_WIND, "");
    Logger.info(LOG_TAG_WIND, "This wizard will guide you through calibrating");
    Logger.info(LOG_TAG_WIND, "your wind vane for 8 cardinal directions.");
    Logger.info(LOG_TAG_WIND, "");
    Logger.info(LOG_TAG_WIND, "Instructions:");
    Logger.info(LOG_TAG_WIND, "1. Point wind vane to the direction shown");
    Logger.info(LOG_TAG_WIND, "2. Hold steady until 'STABLE' appears");
    Logger.info(LOG_TAG_WIND, "3. Wait for automatic progression to next direction");
    Logger.info(LOG_TAG_WIND, "4. At the end, you'll get a summary table");
    Logger.info(LOG_TAG_WIND, "");
    Logger.info(LOG_TAG_WIND, "Starting calibration in 3 seconds...");
    Logger.info(LOG_TAG_WIND, "=========================================");

    delay(3000); // Give user time to read instructions

    // Structure to store calibration results
    struct CalibrationResult
    {
        const char *direction;
        float degrees;
        int adcValue;
        float voltage;
        bool success;
    };

    // Define the 8 cardinal directions to test
    CalibrationResult results[] = {
        {"NORTH", 0.0, 0, 0.0, false},
        {"NORTHEAST", 45.0, 0, 0.0, false},
        {"EAST", 90.0, 0, 0.0, false},
        {"SOUTHEAST", 135.0, 0, 0.0, false},
        {"SOUTH", 180.0, 0, 0.0, false},
        {"SOUTHWEST", 225.0, 0, 0.0, false},
        {"WEST", 270.0, 0, 0.0, false},
        {"NORTHWEST", 315.0, 0, 0.0, false}};

    const int numDirections = sizeof(results) / sizeof(results[0]);
    const int STABLE_THRESHOLD = 15;      // ADC value must be stable within ±15
    const int STABLE_READINGS_NEEDED = 6; // Need 6 stable readings (3 seconds)
    const int MEASUREMENT_TIME = 8;       // 8 seconds to measure each direction

    // Calibrate each direction
    for (int dir = 0; dir < numDirections; dir++)
    {
        Logger.info(LOG_TAG_WIND, "");
        Logger.info(LOG_TAG_WIND, "========================================");
        Logger.info(LOG_TAG_WIND, "Direction %d of %d: %s (%.0f°)",
                    dir + 1, numDirections, results[dir].direction, results[dir].degrees);
        Logger.info(LOG_TAG_WIND, "========================================");
        Logger.info(LOG_TAG_WIND, "");
        Logger.info(LOG_TAG_WIND, ">>> Point the wind vane to %s <<<", results[dir].direction);
        Logger.info(LOG_TAG_WIND, ">>> Hold steady and wait for STABLE readings <<<");
        Logger.info(LOG_TAG_WIND, "");

        unsigned long directionStartTime = millis();
        unsigned long lastPrintTime = 0;
        int lastAdcValue = -1;
        int stableCount = 0;
        int totalReadings = 0;
        long adcSum = 0;
        bool gotStableReading = false;

        while (millis() - directionStartTime < (MEASUREMENT_TIME * 1000))
        {
            // Print every 500ms
            if (millis() - lastPrintTime >= 500)
            {
                lastPrintTime = millis();
                totalReadings++;

                // Get averaged ADC reading for more stability
                int adcValue = getAveragedAdcReading();
                float voltage = (adcValue * 3.3) / 4095.0;

                // Check if reading is stable
                bool isStable = false;
                if (abs(adcValue - lastAdcValue) <= STABLE_THRESHOLD)
                {
                    stableCount++;
                    if (stableCount >= STABLE_READINGS_NEEDED)
                    {
                        isStable = true;
                        gotStableReading = true;
                    }
                }
                else
                {
                    stableCount = 0;
                }

                // Accumulate ADC values for averaging
                adcSum += adcValue;

                // Calculate remaining time
                unsigned long elapsed = millis() - directionStartTime;
                int remaining = MEASUREMENT_TIME - (elapsed / 1000);

                // Print the reading with stability indicator
                if (isStable)
                {
                    Logger.info(LOG_TAG_WIND, "ADC=%4d, V=%.3f **STABLE** (Time: %ds)",
                                adcValue, voltage, remaining);
                }
                else
                {
                    Logger.info(LOG_TAG_WIND, "ADC=%4d, V=%.3f (Stabilizing... %ds)",
                                adcValue, voltage, remaining);
                }

                lastAdcValue = adcValue;
            }

            delay(10);
        }

        // Store results
        if (totalReadings > 0)
        {
            results[dir].adcValue = adcSum / totalReadings;
            results[dir].voltage = (results[dir].adcValue * 3.3) / 4095.0;
            results[dir].success = gotStableReading;
        }

        if (gotStableReading)
        {
            Logger.info(LOG_TAG_WIND, "");
            Logger.info(LOG_TAG_WIND, "✓ %s calibration COMPLETE", results[dir].direction);
        }
        else
        {
            Logger.info(LOG_TAG_WIND, "");
            Logger.info(LOG_TAG_WIND, "⚠ %s calibration completed (but readings were unstable)", results[dir].direction);
        }

        // Short pause before next direction
        if (dir < numDirections - 1)
        {
            Logger.info(LOG_TAG_WIND, "");
            Logger.info(LOG_TAG_WIND, "Moving to next direction in 2 seconds...");
            delay(2000);
        }
    }

    // Print summary table
    Logger.info(LOG_TAG_WIND, "");
    Logger.info(LOG_TAG_WIND, "");
    Logger.info(LOG_TAG_WIND, "=========================================");
    Logger.info(LOG_TAG_WIND, "=== CALIBRATION SUMMARY TABLE ===");
    Logger.info(LOG_TAG_WIND, "=========================================");
    Logger.info(LOG_TAG_WIND, "Direction     | Degrees | ADC  | Voltage | Status");
    Logger.info(LOG_TAG_WIND, "------------- | ------- | ---- | ------- | ------");

    for (int i = 0; i < numDirections; i++)
    {
        Logger.info(LOG_TAG_WIND, "%-13s | %7.0f | %4d | %7.3f | %s",
                    results[i].direction,
                    results[i].degrees,
                    results[i].adcValue,
                    results[i].voltage,
                    results[i].success ? "STABLE" : "UNSTABLE");
    }

    Logger.info(LOG_TAG_WIND, "=========================================");
    Logger.info(LOG_TAG_WIND, "");
    Logger.info(LOG_TAG_WIND, "=== NEXT STEPS ===");
    Logger.info(LOG_TAG_WIND, "1. Copy the ADC values above");
    Logger.info(LOG_TAG_WIND, "2. Update getWindDirection() method with new ranges:");
    Logger.info(LOG_TAG_WIND, "   if (adcValue < XXX) direction = YYY;");
    Logger.info(LOG_TAG_WIND, "3. Sort ADC values from lowest to highest");
    Logger.info(LOG_TAG_WIND, "4. Create ranges between adjacent ADC values");
    Logger.info(LOG_TAG_WIND, "5. Test with aiolos-esp32dev-debug environment");
    Logger.info(LOG_TAG_WIND, "");
    Logger.info(LOG_TAG_WIND, "=== CALIBRATION WIZARD COMPLETE ===");
    Logger.info(LOG_TAG_WIND, "====================================");
}

void WindSensor::setSampleInterval(unsigned long intervalMs)
{
    // Sampling now runs at a fixed 1 Hz in service(); keep the config hook
    // so the windSampleInterval server field remains accepted.
    Logger.info(LOG_TAG_WIND, "Wind sample interval %lu ms requested (fixed 1 Hz sampling in use)",
                intervalMs);
}

void WindSensor::startSamplingPeriod()
{
    // Only the period accumulator resets — the pulse counter and live ring
    // are untouched, so a mode switch can never corrupt live statistics.
    _period.reset();
    _periodActive = true;
    _periodStartMs = millis();

    Logger.debug(LOG_TAG_WIND, "Started wind sampling period");
}

void WindSensor::abandonSamplingPeriod()
{
    _period.reset();
    _periodActive = false;

    Logger.debug(LOG_TAG_WIND, "Abandoned wind sampling period");
}

bool WindSensor::getAveragedWindData(unsigned long samplingPeriodMs, float &avgSpeed, float &avgDirection,
                                     float &gustSpeed, float &minSpeed)
{
    if (!_periodActive)
    {
        Logger.debug(LOG_TAG_WIND, "No active sampling period - call startSamplingPeriod() first");
        return false;
    }

    unsigned long currentTime = millis();
    if (currentTime - _periodStartMs < samplingPeriodMs)
    {
        return false; // Sampling not complete yet
    }

    // Fold the residual sub-second interval since the last 1 Hz tick so the
    // period covers its full duration (no final-subinterval undercount)
    takeSnapshot(currentTime);

    if (_period.totalMs == 0 || _period.dirSamples == 0)
    {
        // Degenerate (should not happen with 1 Hz ticks): restart the period
        // so the caller's sampling state machine cannot get stuck
        Logger.error(LOG_TAG_WIND, "No samples collected during sampling period, restarting it");
        _period.reset();
        _periodStartMs = currentTime;
        avgSpeed = 0.0;
        avgDirection = 0.0;
        gustSpeed = 0.0;
        minSpeed = 0.0;
        return false;
    }

    _periodActive = false;

    avgSpeed = WindLogic::pulsesToSpeed(_period.totalPulses, _period.totalMs, ANEMOMETER_FACTOR);
    avgDirection = WindLogic::vectorAverageDeg(_period.dirSumX, _period.dirSumY, _period.dirSamples);
    gustSpeed = _period.gustMax < 0 ? avgSpeed : _period.gustMax;
    minSpeed = _period.lullMin < 0 ? avgSpeed : _period.lullMin;

    Logger.info(LOG_TAG_WIND,
                "Sampling complete: Avg %.2f m/s, Gust %.2f m/s, Lull %.2f m/s, Dir %.1f° (Samples: %d, Pulses: %lu)",
                avgSpeed, gustSpeed, minSpeed, avgDirection, _period.dirSamples,
                (unsigned long)_period.totalPulses);

    _period.reset();

    return true; // Sampling complete
}
