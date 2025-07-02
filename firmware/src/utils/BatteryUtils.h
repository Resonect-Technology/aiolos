/**
 * @file BatteryUtils.h
 * @brief Utility functions for battery measurement
 */

#pragma once

#include <Arduino.h>
#include "../core/Logger.h"
#include "../config/Config.h"

class BatteryUtils
{
public:
    /**
     * @brief Read the battery voltage from ADC
     *
     * @return float Battery voltage in volts
     */
    static float readBatteryVoltage()
    {
        // Configure ADC
        analogSetWidth(12);                                 // Set ADC resolution to 12 bits
        analogSetPinAttenuation(ADC_BATTERY_PIN, ADC_11db); // Set attenuation for higher voltage range

        // Read multiple samples for better accuracy
        const int numSamples = 10;
        int batteryRawTotal = 0;

        for (int i = 0; i < numSamples; i++)
        {
            batteryRawTotal += analogRead(ADC_BATTERY_PIN);
            delay(5);
        }

        int batteryRaw = batteryRawTotal / numSamples;

        // Calculate battery voltage (3.5V - 4.2V range according to docs)
        // ESP32 ADC is non-linear, especially at extremes
        float batteryCalibration = 1.73; // This factor needs calibration with a multimeter
        float batteryVoltage = (float)batteryRaw * 3.3 / 4095.0 * batteryCalibration;

        // Limit to expected range based on documentation
        batteryVoltage = constrain(batteryVoltage, 3.0, 4.5);

        // Log the raw and converted values
        Logger.debug("BATTERY", "Battery ADC: %d, Voltage: %.2fV", batteryRaw, batteryVoltage);

        // Check if likely running on USB power
        if (batteryVoltage < 3.4 || batteryRaw < 100)
        {
            Logger.warn("BATTERY", "Battery voltage reading may be incorrect - possibly running on USB power");
        }

        return batteryVoltage;
    }
};
