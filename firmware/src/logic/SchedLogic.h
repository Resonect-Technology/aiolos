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
     * @brief Critical-battery decision with hysteresis and consecutive-read debounce
     *
     * The no-battery/USB sentinel (<= 0.15 V) never triggers hibernation and
     * resets the debounce counter - a bench-powered station must stay awake.
     * When already critical, a single reading >= recoveryV exits (the wide
     * critical->recovery band absorbs noise). When not critical, entry
     * requires requiredReads consecutive readings below criticalV so modem
     * TX sag transients cannot hibernate a healthy station.
     *
     * @param criticalActive Current hibernation state
     * @param batteryVoltage Measured battery voltage
     * @param criticalV Hibernate below this
     * @param recoveryV Resume at or above this
     * @param consecutiveLow Caller-held debounce counter (in/out)
     * @param requiredReads Consecutive low reads needed to enter
     * @return true = hibernation requested / still required
     */
    inline bool updateCriticalBattery(bool criticalActive, float batteryVoltage,
                                      float criticalV, float recoveryV,
                                      int &consecutiveLow, int requiredReads)
    {
        if (batteryVoltage <= 0.15f)
        {
            consecutiveLow = 0;
            return false; // No battery / USB power - never hibernate
        }
        if (criticalActive)
        {
            return batteryVoltage < recoveryV;
        }
        if (batteryVoltage < criticalV)
        {
            consecutiveLow++;
            return consecutiveLow >= requiredReads;
        }
        consecutiveLow = 0;
        return false;
    }

    /**
     * @brief Multi-read critical-battery decision for the boot-time guard
     *
     * Entry requires ALL n readings below criticalV (one noisy low read right
     * after wake must not latch a healthy pack into hibernation - recovery
     * needs a higher voltage, so a false entry is not "one cycle at most").
     * Recovery requires ALL n readings at or above recoveryV (one noisy high
     * read must not power the modem on a dying pack).
     *
     * @param criticalActive Current hibernation state
     * @param readings Battery readings, oldest first
     * @param n Number of readings
     * @param criticalV Hibernate below this
     * @param recoveryV Resume at or above this
     * @return true = hibernation requested / still required
     */
    inline bool criticalAtBoot(bool criticalActive, const float readings[], int n,
                               float criticalV, float recoveryV)
    {
        int consecutiveLow = 0;
        if (criticalActive)
        {
            // Any read below recoveryV keeps hibernating; sentinel reads
            // return false, so bench power still exits
            bool stayCritical = false;
            for (int i = 0; i < n; i++)
            {
                if (updateCriticalBattery(true, readings[i], criticalV, recoveryV, consecutiveLow, n))
                {
                    stayCritical = true;
                }
            }
            return stayCritical;
        }
        // The counter mechanics require all n reads low: any high/sentinel
        // read resets consecutiveLow, so the threshold can't be reached
        bool critical = false;
        for (int i = 0; i < n; i++)
        {
            critical = updateCriticalBattery(false, readings[i], criticalV, recoveryV, consecutiveLow, n);
        }
        return critical;
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
     * @brief Send interval to actually use (wind, temperature, diagnostics)
     *
     * In slow mode the interval is floored to slowFloorMs (for wind, a >5s
     * interval automatically selects the firmware's averaged-sampling path).
     */
    inline unsigned long effectiveIntervalMs(bool slowMode, unsigned long intervalMs, unsigned long slowFloorMs)
    {
        if (!slowMode)
        {
            return intervalMs;
        }
        return intervalMs > slowFloorMs ? intervalMs : slowFloorMs;
    }
}
