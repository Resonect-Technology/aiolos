/**
 * @file WindSensor.cpp
 * @brief Implementation of the WindSensor class
 */

#include "WindSensor.h"
#include "../core/Logger.h"
#include <Arduino.h> // Make sure this is included

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

    // ESP32 specific - configure ADC for better readings
    analogSetPinAttenuation(_windVanePin, ADC_11db); // For 3.3V input range

    // Configure anemometer pin with pull-up and interrupt
    pinMode(_anemometerPin, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(_anemometerPin), handleAnemometerInterrupt, FALLING);

    Logger.info(LOG_TAG_WIND, "Wind sensor initialized");
    Logger.info(LOG_TAG_WIND, "Anemometer pin: %d, Wind vane pin: %d", _anemometerPin, _windVanePin);

    return true;
}

float WindSensor::getWindDirection()
{
    // Read analog value from wind vane
    int adcValue = analogRead(_windVanePin);

    // Use direct ADC value mapping from the old working code
    float direction;
    
    // Log the raw ADC value for debugging
    Logger.debug(LOG_TAG_WIND, "Wind vane raw ADC value: %d", adcValue);
    
    // Map ADC value to wind direction based on calibrated ranges
    if (adcValue < 150)
        direction = 202.5;
    else if (adcValue < 300)
        direction = 180;
    else if (adcValue < 400)
        direction = 247.5;
    else if (adcValue < 600)
        direction = 225;
    else if (adcValue < 900)
        direction = 292.5;
    else if (adcValue < 1100)
        direction = 270;
    else if (adcValue < 1500)
        direction = 112.5;
    else if (adcValue < 1700)
        direction = 135;
    else if (adcValue < 2250)
        direction = 337.5;
    else if (adcValue < 2350)
        direction = 315;
    else if (adcValue < 2700)
        direction = 67.5;
    else if (adcValue < 3000)
        direction = 90;
    else if (adcValue < 3200)
        direction = 22.5;
    else if (adcValue < 3400)
        direction = 45;
    else if (adcValue < 4000)
        direction = 0;
    else
        direction = 0; // Unknown
    
    // For debugging
    Logger.debug(LOG_TAG_WIND, "Wind direction: %.1f°", direction);

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
    Logger.info(LOG_TAG_WIND, "Starting simple wind vane readings for %lu ms...", durationMs);

    unsigned long startTime = millis();
    unsigned long lastPrintTime = 0;

    while (millis() - startTime < durationMs)
    {
        // Only print every 1000ms to avoid flooding the console
        if (millis() - lastPrintTime >= 1000)
        {
            lastPrintTime = millis();

            // Read analog value from wind vane
            int adcValue = analogRead(_windVanePin);
            float voltage = (adcValue * 3.3) / 4095.0;

            Logger.info(LOG_TAG_WIND, "Wind Vane: ADC=%d, Voltage=%.3fV", adcValue, voltage);
        }

        delay(10); // Small delay to prevent excessive looping
    }

    Logger.info(LOG_TAG_WIND, "Wind vane readings complete.");
}
