/**
 * @file BatteryUtils.h
 * @brief Utility functions for battery measurement using ESP32's calibrated ADC
 */

#pragma once

#include <Arduino.h>
#include "../core/Logger.h"
#include "../config/Config.h"

// The voltage divider on the T-SIM7000G board uses two 100k resistors,
// which means the voltage at the ADC pin is half of the actual battery voltage.
// This can be fine-tuned with a multimeter for better accuracy.
#define BATTERY_VOLTAGE_DIVIDER_RATIO 2.0f

class BatteryUtils
{
public:
    /**
     * @brief Initializes the battery measurement utility.
     *
     * This function configures the ADC pin and characterizes the ADC for
     * accurate, calibrated voltage readings. It should be called once in setup().
     */
    static void init()
    {
        // Configure ADC
        analogSetWidth(12);                                 // Set ADC resolution to 12 bits
        analogRead(ADC_BATTERY_PIN);                        // Core 3.x: pin must be read once before per-pin attenuation applies
        analogSetPinAttenuation(ADC_BATTERY_PIN, ADC_11db); // Set attenuation for 0-3.3V range

        Logger.info("BATTERY", "Battery ADC configured for calibrated readings.");
    }

    /**
     * @brief Read the battery voltage from ADC using calibrated conversion.
     *
     * @return float Battery voltage in volts. Returns 0.0 if ADC is not characterized.
     */
    static float readBatteryVoltage()
    {
        // Read multiple calibrated samples for better accuracy
        const int numSamples = 10;
        uint32_t voltageMvTotal = 0;
        for (int i = 0; i < numSamples; i++)
        {
            voltageMvTotal += analogReadMilliVolts(ADC_BATTERY_PIN);
            delay(2); // Small delay for stability
        }
        uint32_t voltage_mv = voltageMvTotal / numSamples;

        // Convert millivolts to volts and apply the voltage divider ratio
        float batteryVoltage = (float)voltage_mv / 1000.0f * BATTERY_VOLTAGE_DIVIDER_RATIO;

        // Log the converted value for debugging
        Logger.debug("BATTERY", "Battery ADC: %lu mV at pin, Calibrated Voltage: %.2fV", voltage_mv, batteryVoltage);

        // Check if likely running on USB power (voltage is often near max or zero)
        if (voltage_mv < 80)
        {
            Logger.warn("BATTERY", "Battery voltage reading is very low - possibly no battery connected.");
            // Return a value that indicates an issue, but isn't zero if that has meaning
            return 0.1;
        }

        return batteryVoltage;
    }
};
