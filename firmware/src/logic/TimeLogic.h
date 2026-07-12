/**
 * @file TimeLogic.h
 * @brief Pure time math — no Arduino dependencies, host-testable (pio test -e native)
 */

#pragma once

#include <cmath>

namespace TimeLogic
{
    /**
     * @brief Normalize minutes-of-day into [0, 1440)
     */
    inline int normalizeMinutesOfDay(int minutes)
    {
        minutes %= 1440;
        if (minutes < 0)
        {
            minutes += 1440;
        }
        return minutes;
    }

    /**
     * @brief Convert modem-reported local time to UTC minutes-of-day
     *
     * The SIM7000 reports operator-local time plus a timezone offset
     * (TinyGSM exposes it as float hours, quarter-hour resolution).
     *
     * @param hour Modem-reported local hour (0-23)
     * @param minute Modem-reported local minute (0-59)
     * @param timezoneHours Modem-reported offset from UTC in hours (e.g. 3.0, -4.5)
     */
    inline int modemLocalToUtcMinutes(int hour, int minute, float timezoneHours)
    {
        int tzMinutes = (int)lroundf(timezoneHours * 60.0f);
        return normalizeMinutesOfDay(hour * 60 + minute - tzMinutes);
    }

    /**
     * @brief Convert UTC minutes-of-day to station-local minutes-of-day
     */
    inline int utcToLocalMinutes(int utcMinutesOfDay, int utcOffsetMinutes)
    {
        return normalizeMinutesOfDay(utcMinutesOfDay + utcOffsetMinutes);
    }

    /**
     * @brief Check whether an hour falls inside a sleep window
     *
     * Window is [startHour, endHour), supports crossing midnight
     * (e.g. 23 → 6). Equal start and end means no window.
     */
    inline bool isInSleepWindow(int currentHour, int startHour, int endHour)
    {
        if (startHour == endHour)
        {
            return false;
        }
        if (startHour < endHour)
        {
            return currentHour >= startHour && currentHour < endHour;
        }
        return currentHour >= startHour || currentHour < endHour;
    }
}
