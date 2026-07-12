/**
 * @file WindLogic.h
 * @brief Pure wind math — no Arduino dependencies, host-testable (pio test -e native)
 */

#pragma once

#include <cmath>

namespace WindLogic
{
    /**
     * @brief Map a wind-vane ADC reading (12-bit) to a compass heading in degrees
     *
     * Band boundaries are midpoints between the ADC values measured by the
     * calibration wizard (July 2025):
     * EAST(90°): 330, SOUTHEAST(135°): 586, SOUTH(180°): 1023,
     * NORTHEAST(45°): 1909, SOUTHWEST(225°): 2427, NORTH(0°): 3071,
     * NORTHWEST(315°): 3546, WEST(270°): 3927
     */
    inline float adcToDirection(int adcValue)
    {
        if (adcValue < 458)
            return 90; // EAST
        if (adcValue < 804)
            return 135; // SOUTHEAST
        if (adcValue < 1466)
            return 180; // SOUTH
        if (adcValue < 2168)
            return 45; // NORTHEAST
        if (adcValue < 2749)
            return 225; // SOUTHWEST
        if (adcValue < 3308)
            return 0; // NORTH
        if (adcValue < 3736)
            return 315; // NORTHWEST
        return 270; // WEST
    }

    /**
     * @brief Smallest angular difference between two headings (0-180°)
     */
    inline float angularDifference(float a, float b)
    {
        float diff = fabsf(a - b);
        if (diff > 180.0f)
        {
            diff = 360.0f - diff;
        }
        return diff;
    }

    /**
     * @brief Convert anemometer pulses over a period to wind speed
     *
     * @param pulses Pulse count during the period
     * @param elapsedMs Period length in milliseconds (must be > 0)
     * @param anemometerFactor m/s per Hz calibration factor
     */
    inline float pulsesToSpeed(unsigned long pulses, unsigned long elapsedMs, float anemometerFactor)
    {
        if (elapsedMs == 0)
        {
            return 0.0f;
        }
        float frequency = (float)pulses * 1000.0f / (float)elapsedMs;
        return frequency * anemometerFactor;
    }

    /**
     * @brief Accumulate a direction sample as a unit vector (for vector averaging)
     */
    inline void addDirectionSample(float &sumX, float &sumY, float directionDeg)
    {
        double radians = directionDeg * M_PI / 180.0;
        sumX += (float)cos(radians);
        sumY += (float)sin(radians);
    }

    /**
     * @brief Finalize a vector average into a heading in [0, 360)
     *
     * Vector averaging handles the 0°/360° wrap correctly: the average of
     * 350° and 10° is 0°, not 180°.
     */
    inline float vectorAverageDeg(float sumX, float sumY, int sampleCount)
    {
        if (sampleCount == 0)
        {
            return 0.0f;
        }
        float avg = (float)(atan2(sumY / sampleCount, sumX / sampleCount) * 180.0 / M_PI);
        if (avg < 0)
        {
            avg += 360.0f;
        }
        return avg;
    }
}
