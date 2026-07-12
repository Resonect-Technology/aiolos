/**
 * @file SchedLogic.h
 * @brief Pure power-aware scheduling decisions — no Arduino dependencies, host-testable
 */

#pragma once

namespace SchedLogic
{
    /**
     * @brief Update the low-battery gate state with hysteresis
     *
     * Enters below (threshold - hysteresis), exits at >= threshold, so the
     * gate cannot flap when the voltage hovers around the threshold.
     *
     * @param gateActive Current gate state
     * @param batteryVoltage Measured battery voltage; values <= 0.15 V are the
     *        "no battery connected" sentinel (0.1) and keep the current state
     * @param thresholdV Gate threshold in volts; <= 0 disables the gate
     * @param hysteresisV Hysteresis band in volts
     * @return New gate state (true = slow mode requested)
     */
    inline bool updateBatteryGate(bool gateActive, float batteryVoltage, float thresholdV, float hysteresisV)
    {
        if (thresholdV <= 0.0f)
        {
            return false;
        }
        if (batteryVoltage <= 0.15f)
        {
            return gateActive; // Unreliable reading - keep previous state
        }
        if (gateActive)
        {
            return batteryVoltage < thresholdV; // Exit at >= threshold
        }
        return batteryVoltage < thresholdV - hysteresisV; // Enter below threshold - hysteresis
    }

    /**
     * @brief Morning slow mode: true before the livestream start hour
     *
     * @param localHour Station-local hour (0-23)
     * @param livestreamStartHour Hour livestreaming should start; outside 0-23
     *        (e.g. -1) disables morning slow mode
     */
    inline bool isMorningSlow(int localHour, int livestreamStartHour)
    {
        if (livestreamStartHour < 0 || livestreamStartHour > 23)
        {
            return false;
        }
        return localHour < livestreamStartHour;
    }

    /**
     * @brief Wind send interval to actually use
     *
     * In slow mode the interval is floored to slowFloorMs (a >5s interval
     * automatically selects the firmware's averaged-sampling path).
     */
    inline unsigned long effectiveWindIntervalMs(bool slowMode, unsigned long windIntervalMs, unsigned long slowFloorMs)
    {
        if (!slowMode)
        {
            return windIntervalMs;
        }
        return windIntervalMs > slowFloorMs ? windIntervalMs : slowFloorMs;
    }
}
