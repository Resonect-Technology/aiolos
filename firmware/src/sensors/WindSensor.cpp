/**
 * @file WindSensor.cpp
 * @brief Implementation of the WindSensor class
 */

#include "WindSensor.h"
#include "../core/Logger.h"
#include <Arduino.h>     // Make sure this is included
#include <esp_adc_cal.h> // Added for ADC calibration as in the old code

#define LOG_TAG_WIND "WIND"

// Define the static constexpr array (required for C++14 and earlier)
constexpr WindSensor::WindDirectionEntry WindSensor::WIND_DIRECTIONS[];

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
    _lastMeasurementTime = millis();

    // Configure wind vane pin as analog input
    pinMode(_windVanePin, INPUT);

    // ESP32 specific - configure ADC for better readings, exactly as in the old code
    analogReadResolution(12);                        // Set ADC resolution to 12 bits (0-4095)
    analogSetPinAttenuation(_windVanePin, ADC_11db); // For 3.3V input range

    // Configure anemometer pin with pull-up and interrupt
    pinMode(_anemometerPin, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(_anemometerPin), handleAnemometerInterrupt, FALLING);

    // Optional: setup ADC calibration as in the old code
    esp_adc_cal_characteristics_t adc_chars;
    esp_adc_cal_value_t val_type = esp_adc_cal_characterize(ADC_UNIT_1, ADC_ATTEN_DB_12, ADC_WIDTH_BIT_12, 1100, &adc_chars);
    if (val_type == ESP_ADC_CAL_VAL_EFUSE_VREF)
    {
        Logger.info(LOG_TAG_WIND, "eFuse Vref: %u mV", adc_chars.vref);
    }
    else if (val_type == ESP_ADC_CAL_VAL_EFUSE_TP)
    {
        Logger.info(LOG_TAG_WIND, "Two Point --> coeff_a: %u mV coeff_b: %u mV", adc_chars.coeff_a, adc_chars.coeff_b);
    }
    else
    {
        Logger.info(LOG_TAG_WIND, "Default Vref: 1100 mV");
    }

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

    // Use direct ADC value mapping from the old working code
    float direction;

    // Log the raw ADC value for debugging
    Logger.debug(LOG_TAG_WIND, "Wind vane raw ADC value: %d", adcValue);

    // Map ADC value to wind direction based on calibrated ranges
    // Updated with calibration results from wizard
    // Calibration data (sorted by ADC):
    // SOUTHEAST(135°): 584, EAST(90°): 612, SOUTH(180°): 1023,
    // NORTHEAST(45°): 2156, SOUTHWEST(225°): 2426, NORTH(0°): 3070,
    // NORTHWEST(315°): 3583, WEST(270°): 3921

    if (adcValue < 598) // Below 598 (midpoint of 584 and 612)
    {
        direction = 90; // EAST (swapped: was SOUTHEAST)
        Logger.debug(LOG_TAG_WIND, "ADC %d -> EAST (90°)", adcValue);
    }
    else if (adcValue < 818) // 598-817 (midpoint of 612 and 1023)
    {
        direction = 135; // SOUTHEAST (swapped: was EAST)
        Logger.debug(LOG_TAG_WIND, "ADC %d -> SOUTHEAST (135°)", adcValue);
    }
    else if (adcValue < 1590) // 818-1589 (midpoint of 1023 and 2156)
    {
        direction = 180; // SOUTH
        Logger.debug(LOG_TAG_WIND, "ADC %d -> SOUTH (180°)", adcValue);
    }
    else if (adcValue < 2291) // 1590-2290 (midpoint of 2156 and 2426)
    {
        direction = 45; // NORTHEAST
        Logger.debug(LOG_TAG_WIND, "ADC %d -> NORTHEAST (45°)", adcValue);
    }
    else if (adcValue < 2748) // 2291-2747 (midpoint of 2426 and 3070)
    {
        direction = 225; // SOUTHWEST
        Logger.debug(LOG_TAG_WIND, "ADC %d -> SOUTHWEST (225°)", adcValue);
    }
    else if (adcValue < 3327) // 2748-3326 (midpoint of 3070 and 3583)
    {
        direction = 0; // NORTH
        Logger.debug(LOG_TAG_WIND, "ADC %d -> NORTH (0°)", adcValue);
    }
    else if (adcValue < 3752) // 3327-3751 (midpoint of 3583 and 3921)
    {
        direction = 315; // NORTHWEST
        Logger.debug(LOG_TAG_WIND, "ADC %d -> NORTHWEST (315°)", adcValue);
    }
    else
    {
        direction = 270; // WEST (3752+)
        Logger.debug(LOG_TAG_WIND, "ADC %d -> WEST (270°)", adcValue);
    }

    // Note: No adjustment needed since calibration already gives us correct directions
    // The old code needed -90 adjustment because it used different direction mapping
    // Our calibration wizard mapped directions correctly, so we use them directly

    // Implement minimum change time to prevent rapid direction bouncing
    unsigned long currentTime = millis();

    // Check if this is a significant direction change
    float directionDifference = abs(direction - _lastStableDirection);
    if (directionDifference > 180)
    {
        // Handle wrap-around (e.g., 350° to 10° is only 20° difference)
        directionDifference = 360 - directionDifference;
    }

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

float WindSensor::voltageToDirection(float voltage)
{
    // This method is kept for reference but is no longer the primary direction calculation method
    // Find the closest voltage in the lookup table
    float minDifference = abs(voltage - WIND_DIRECTIONS[0].voltage);
    float direction = WIND_DIRECTIONS[0].direction;
    size_t matchedIndex = 0;

    for (size_t i = 1; i < WIND_DIRECTIONS_COUNT; i++)
    {
        float difference = abs(voltage - WIND_DIRECTIONS[i].voltage);
        if (difference < minDifference)
        {
            minDifference = difference;
            direction = WIND_DIRECTIONS[i].direction;
            matchedIndex = i;
        }
    }

    return direction;
}

float WindSensor::getWindSpeed(unsigned long samplePeriodMs)
{
    // Get pulse count during the sample period
    noInterrupts(); // Disable interrupts to safely read volatile variable
    unsigned long pulseCount = _pulseCount;
    _pulseCount = 0; // Reset counter
    interrupts();    // Re-enable interrupts

    // Calculate time elapsed since last measurement
    unsigned long currentTime = millis();
    unsigned long elapsedTime = currentTime - _lastMeasurementTime;
    _lastMeasurementTime = currentTime;

    // Ensure elapsed time is at least the sample period
    elapsedTime = max(elapsedTime, 1UL); // Avoid division by zero

    // Calculate frequency (pulses per second)
    float frequency = (float)pulseCount * 1000.0 / elapsedTime;

    // Convert frequency to wind speed using calibration factor
    float windSpeed = frequency * ANEMOMETER_FACTOR;

    Logger.debug(LOG_TAG_WIND, "Anemometer pulses: %lu in %lu ms, Speed: %.2f m/s",
                 pulseCount, elapsedTime, windSpeed);

    return windSpeed;
}

void WindSensor::printWindReading(unsigned long samplePeriodMs)
{
    float windSpeed = getWindSpeed(samplePeriodMs);

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
    _sampleIntervalMs = intervalMs;
    Logger.info(LOG_TAG_WIND, "Wind sample interval set to %lu ms", intervalMs);
}

void WindSensor::startSamplingPeriod()
{
    _samplingStartTime = millis();
    _lastSampleTime = _samplingStartTime;
    _directionSumX = 0.0;
    _directionSumY = 0.0;
    _directionSampleCount = 0;

    // Reset pulse counter for this sampling period
    noInterrupts();
    _totalPulseCount = 0;
    _pulseCount = 0;
    interrupts();

    Logger.debug(LOG_TAG_WIND, "Started wind sampling period (sample interval: %lu ms)", _sampleIntervalMs);
}

bool WindSensor::getAveragedWindData(unsigned long samplingPeriodMs, float &avgSpeed, float &avgDirection)
{
    unsigned long currentTime = millis();
    unsigned long elapsedTime = currentTime - _samplingStartTime;

    // Check if it's time to take a new sample (based on configured interval)
    if (currentTime - _lastSampleTime >= _sampleIntervalMs)
    {
        // Time for a new sample
        float currentDirection = getWindDirection();

        // Convert direction to X,Y components for vector averaging
        float radians = currentDirection * PI / 180.0;
        _directionSumX += cos(radians);
        _directionSumY += sin(radians);
        _directionSampleCount++;

        // Accumulate pulse count
        noInterrupts();
        _totalPulseCount += _pulseCount;
        _pulseCount = 0; // Reset for next sample
        interrupts();

        _lastSampleTime = currentTime;

        Logger.debug(LOG_TAG_WIND, "Wind sample taken: Dir=%.1f°, Samples=%d", currentDirection, _directionSampleCount);
    }

    // Check if sampling period is complete
    if (elapsedTime < samplingPeriodMs)
    {
        return false; // Sampling not complete yet
    }

    // Sampling period complete - calculate averages
    if (_directionSampleCount == 0)
    {
        Logger.error(LOG_TAG_WIND, "No direction samples collected during sampling period");
        avgSpeed = 0.0;
        avgDirection = 0.0;
        return false;
    }

    // Calculate averaged wind direction using vector averaging
    float avgX = _directionSumX / _directionSampleCount;
    float avgY = _directionSumY / _directionSampleCount;
    avgDirection = atan2(avgY, avgX) * 180.0 / PI;

    // Ensure direction is in 0-360 range
    if (avgDirection < 0)
        avgDirection += 360.0;

    // Calculate averaged wind speed
    float frequency = (float)_totalPulseCount * 1000.0 / elapsedTime;
    avgSpeed = frequency * ANEMOMETER_FACTOR;

    Logger.info(LOG_TAG_WIND, "Sampling complete: Avg Speed: %.2f m/s, Avg Direction: %.1f° (Samples: %d, Pulses: %lu)",
                avgSpeed, avgDirection, _directionSampleCount, _totalPulseCount);

    return true; // Sampling complete
}
