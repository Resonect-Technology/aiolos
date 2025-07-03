/**
 * @file BatteryUtils.h
 * @brief Utility functions for battery measurement using ESP32's calibrated ADC
 */

#pragma once

#include <Arduino.h>
#include <esp_adc_cal.h> // For calibrated ADC readings
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
        analogSetPinAttenuation(ADC_BATTERY_PIN, ADC_11db); // Set attenuation for 0-3.3V range

        // Characterize ADC for calibrated readings
        esp_adc_cal_characterize(ADC_UNIT_1, ADC_ATTEN_DB_12, ADC_WIDTH_BIT_12, 1100, &_adc_chars);
        Logger.info("BATTERY", "Battery ADC characterized for calibrated readings.");
    }

    /**
     * @brief Read the battery voltage from ADC using calibrated conversion.
     *
     * @return float Battery voltage in volts. Returns 0.0 if ADC is not characterized.
     */
    static float readBatteryVoltage()
    {
        // Read multiple samples for better accuracy
        const int numSamples = 10;
        uint32_t batteryRawTotal = 0;
        for (int i = 0; i < numSamples; i++)
        {
            batteryRawTotal += analogRead(ADC_BATTERY_PIN);
            delay(2); // Small delay for stability
        }
        int batteryRaw = batteryRawTotal / numSamples;

        // Convert raw ADC reading to millivolts using calibration data
        uint32_t voltage_mv = esp_adc_cal_raw_to_voltage(batteryRaw, &_adc_chars);

        // Convert millivolts to volts and apply the voltage divider ratio
        float batteryVoltage = (float)voltage_mv / 1000.0f * BATTERY_VOLTAGE_DIVIDER_RATIO;

        // Log the raw and converted values for debugging
        Logger.debug("BATTERY", "Battery ADC Raw: %d, Calibrated Voltage: %.2fV", batteryRaw, batteryVoltage);

        // Check if likely running on USB power (voltage is often near max or zero)
        if (batteryRaw < 100)
        {
            Logger.warn("BATTERY", "Battery voltage reading is very low - possibly no battery connected.");
            // Return a value that indicates an issue, but isn't zero if that has meaning
            return 0.1;
        }

        return batteryVoltage;
    }

private:
    // Store ADC characteristics for calibrated conversion
    static esp_adc_cal_characteristics_t _adc_chars;
};
