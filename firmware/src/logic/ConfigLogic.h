/**
 * @file ConfigLogic.h
 * @brief Pure remote-config validation rules — no Arduino dependencies, host-testable
 */

#pragma once

#include <stdint.h>

namespace ConfigLogic
{
    /**
     * @brief Clamp the server-provided restart interval to a safe range
     *
     * The server sends restartInterval in seconds; 0 (or absent) keeps the
     * firmware default. A one-hour floor protects against a config typo
     * putting the station into a restart loop; a one-week cap keeps the
     * millisecond value well inside 32-bit range.
     *
     * @param restartIntervalS Interval from remote config in seconds (0 = use default)
     * @param defaultMs Firmware default in milliseconds
     * @return Interval to apply, in milliseconds
     */
    inline uint32_t clampRestartIntervalMs(uint32_t restartIntervalS, uint32_t defaultMs)
    {
        if (restartIntervalS == 0)
        {
            return defaultMs;
        }
        const uint32_t FLOOR_S = 3600;
        const uint32_t CAP_S = 7 * 24 * 3600;
        if (restartIntervalS < FLOOR_S)
        {
            restartIntervalS = FLOOR_S;
        }
        if (restartIntervalS > CAP_S)
        {
            restartIntervalS = CAP_S;
        }
        return restartIntervalS * 1000UL;
    }
}
