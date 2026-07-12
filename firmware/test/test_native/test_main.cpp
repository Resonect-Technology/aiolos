/**
 * @file test_main.cpp
 * @brief Host-run Unity tests for the pure logic in firmware/src/logic
 *
 * Run with: pio test -e native
 */

#include <unity.h>

#include "logic/ConfigLogic.h"
#include "logic/SchedLogic.h"
#include "logic/TimeLogic.h"
#include "logic/WindLogic.h"

void setUp() {}
void tearDown() {}

// --- WindLogic: ADC -> direction ---------------------------------------------

// Calibrated ADC centers from the July 2025 wizard must map to their heading
void test_adc_calibration_centers()
{
    TEST_ASSERT_EQUAL_FLOAT(90, WindLogic::adcToDirection(330));    // EAST
    TEST_ASSERT_EQUAL_FLOAT(135, WindLogic::adcToDirection(586));   // SOUTHEAST
    TEST_ASSERT_EQUAL_FLOAT(180, WindLogic::adcToDirection(1023));  // SOUTH
    TEST_ASSERT_EQUAL_FLOAT(45, WindLogic::adcToDirection(1909));   // NORTHEAST
    TEST_ASSERT_EQUAL_FLOAT(225, WindLogic::adcToDirection(2427));  // SOUTHWEST
    TEST_ASSERT_EQUAL_FLOAT(0, WindLogic::adcToDirection(3071));    // NORTH
    TEST_ASSERT_EQUAL_FLOAT(315, WindLogic::adcToDirection(3546));  // NORTHWEST
    TEST_ASSERT_EQUAL_FLOAT(270, WindLogic::adcToDirection(3927));  // WEST
}

void test_adc_band_boundaries()
{
    // Each boundary belongs to the upper band
    TEST_ASSERT_EQUAL_FLOAT(90, WindLogic::adcToDirection(457));
    TEST_ASSERT_EQUAL_FLOAT(135, WindLogic::adcToDirection(458));
    TEST_ASSERT_EQUAL_FLOAT(135, WindLogic::adcToDirection(803));
    TEST_ASSERT_EQUAL_FLOAT(180, WindLogic::adcToDirection(804));
    TEST_ASSERT_EQUAL_FLOAT(180, WindLogic::adcToDirection(1465));
    TEST_ASSERT_EQUAL_FLOAT(45, WindLogic::adcToDirection(1466));
    TEST_ASSERT_EQUAL_FLOAT(45, WindLogic::adcToDirection(2167));
    TEST_ASSERT_EQUAL_FLOAT(225, WindLogic::adcToDirection(2168));
    TEST_ASSERT_EQUAL_FLOAT(225, WindLogic::adcToDirection(2748));
    TEST_ASSERT_EQUAL_FLOAT(0, WindLogic::adcToDirection(2749));
    TEST_ASSERT_EQUAL_FLOAT(0, WindLogic::adcToDirection(3307));
    TEST_ASSERT_EQUAL_FLOAT(315, WindLogic::adcToDirection(3308));
    TEST_ASSERT_EQUAL_FLOAT(315, WindLogic::adcToDirection(3735));
    TEST_ASSERT_EQUAL_FLOAT(270, WindLogic::adcToDirection(3736));
    // Extremes of the 12-bit range
    TEST_ASSERT_EQUAL_FLOAT(90, WindLogic::adcToDirection(0));
    TEST_ASSERT_EQUAL_FLOAT(270, WindLogic::adcToDirection(4095));
}

// --- WindLogic: angular difference -------------------------------------------

void test_angular_difference()
{
    TEST_ASSERT_FLOAT_WITHIN(0.01, 0, WindLogic::angularDifference(90, 90));
    TEST_ASSERT_FLOAT_WITHIN(0.01, 45, WindLogic::angularDifference(0, 45));
    // Wrap-around: 350° vs 10° is 20°, not 340°
    TEST_ASSERT_FLOAT_WITHIN(0.01, 20, WindLogic::angularDifference(350, 10));
    TEST_ASSERT_FLOAT_WITHIN(0.01, 180, WindLogic::angularDifference(0, 180));
}

// --- WindLogic: vector averaging ----------------------------------------------

void test_vector_average_wraps_north()
{
    // The average of 350° and 10° must be 0°, not 180°
    float sumX = 0, sumY = 0;
    WindLogic::addDirectionSample(sumX, sumY, 350);
    WindLogic::addDirectionSample(sumX, sumY, 10);
    float avg = WindLogic::vectorAverageDeg(sumX, sumY, 2);
    // Result may come out as ~0 or ~360
    if (avg > 180)
    {
        avg -= 360;
    }
    TEST_ASSERT_FLOAT_WITHIN(0.1, 0, avg);
}

void test_vector_average_simple()
{
    float sumX = 0, sumY = 0;
    WindLogic::addDirectionSample(sumX, sumY, 90);
    WindLogic::addDirectionSample(sumX, sumY, 180);
    TEST_ASSERT_FLOAT_WITHIN(0.1, 135, WindLogic::vectorAverageDeg(sumX, sumY, 2));
}

void test_vector_average_no_samples()
{
    TEST_ASSERT_EQUAL_FLOAT(0, WindLogic::vectorAverageDeg(0, 0, 0));
}

// --- WindLogic: pulses -> speed ------------------------------------------------

void test_pulses_to_speed()
{
    // 30 pulses in 10 s = 3 Hz; at 0.6667 m/s per Hz -> ~2 m/s
    TEST_ASSERT_FLOAT_WITHIN(0.01, 2.0, WindLogic::pulsesToSpeed(30, 10000, 0.6667f));
    // No pulses -> 0
    TEST_ASSERT_EQUAL_FLOAT(0, WindLogic::pulsesToSpeed(0, 10000, 0.6667f));
    // Guard against division by zero
    TEST_ASSERT_EQUAL_FLOAT(0, WindLogic::pulsesToSpeed(30, 0, 0.6667f));
}

// --- TimeLogic: normalization & conversions ------------------------------------

void test_normalize_minutes_of_day()
{
    TEST_ASSERT_EQUAL_INT(0, TimeLogic::normalizeMinutesOfDay(0));
    TEST_ASSERT_EQUAL_INT(0, TimeLogic::normalizeMinutesOfDay(1440));
    TEST_ASSERT_EQUAL_INT(1439, TimeLogic::normalizeMinutesOfDay(-1));
    TEST_ASSERT_EQUAL_INT(60, TimeLogic::normalizeMinutesOfDay(1500));
    TEST_ASSERT_EQUAL_INT(1380, TimeLogic::normalizeMinutesOfDay(-60));
}

void test_modem_local_to_utc()
{
    // Greek summer: operator reports 14:30 at UTC+3 -> 11:30 UTC
    TEST_ASSERT_EQUAL_INT(11 * 60 + 30, TimeLogic::modemLocalToUtcMinutes(14, 30, 3.0f));
    // Wrap below midnight: 01:00 at UTC+3 -> 22:00 UTC previous day
    TEST_ASSERT_EQUAL_INT(22 * 60, TimeLogic::modemLocalToUtcMinutes(1, 0, 3.0f));
    // Negative offset with wrap: 23:00 at UTC-4:30 -> 03:30 UTC next day
    TEST_ASSERT_EQUAL_INT(3 * 60 + 30, TimeLogic::modemLocalToUtcMinutes(23, 0, -4.5f));
    // Zero offset is identity
    TEST_ASSERT_EQUAL_INT(12 * 60, TimeLogic::modemLocalToUtcMinutes(12, 0, 0.0f));
}

void test_utc_to_local()
{
    // 11:30 UTC + 180 min -> 14:30 local
    TEST_ASSERT_EQUAL_INT(14 * 60 + 30, TimeLogic::utcToLocalMinutes(11 * 60 + 30, 180));
    // Wrap past midnight
    TEST_ASSERT_EQUAL_INT(60, TimeLogic::utcToLocalMinutes(23 * 60, 120));
}

// --- TimeLogic: sleep window -----------------------------------------------------

void test_sleep_window_same_day()
{
    // Window 02:00-06:00
    TEST_ASSERT_FALSE(TimeLogic::isInSleepWindow(1, 2, 6));
    TEST_ASSERT_TRUE(TimeLogic::isInSleepWindow(2, 2, 6));
    TEST_ASSERT_TRUE(TimeLogic::isInSleepWindow(5, 2, 6));
    TEST_ASSERT_FALSE(TimeLogic::isInSleepWindow(6, 2, 6));
    TEST_ASSERT_FALSE(TimeLogic::isInSleepWindow(23, 2, 6));
}

void test_sleep_window_midnight_wrap()
{
    // Window 23:00-06:00
    TEST_ASSERT_TRUE(TimeLogic::isInSleepWindow(23, 23, 6));
    TEST_ASSERT_TRUE(TimeLogic::isInSleepWindow(0, 23, 6));
    TEST_ASSERT_TRUE(TimeLogic::isInSleepWindow(5, 23, 6));
    TEST_ASSERT_FALSE(TimeLogic::isInSleepWindow(6, 23, 6));
    TEST_ASSERT_FALSE(TimeLogic::isInSleepWindow(12, 23, 6));
    TEST_ASSERT_FALSE(TimeLogic::isInSleepWindow(22, 23, 6));
}

void test_sleep_window_disabled_when_equal()
{
    TEST_ASSERT_FALSE(TimeLogic::isInSleepWindow(3, 3, 3));
    TEST_ASSERT_FALSE(TimeLogic::isInSleepWindow(0, 0, 0));
}

// --- ConfigLogic: restart interval clamp ---------------------------------------

void test_restart_interval_clamp()
{
    const uint32_t DEFAULT_MS = 4UL * 3600UL * 1000UL; // 4h firmware default

    // 0 = not set -> default
    TEST_ASSERT_EQUAL_UINT32(DEFAULT_MS, ConfigLogic::clampRestartIntervalMs(0, DEFAULT_MS));
    // Below the 1h floor -> floored to 1h
    TEST_ASSERT_EQUAL_UINT32(3600000UL, ConfigLogic::clampRestartIntervalMs(1800, DEFAULT_MS));
    // In range -> passed through (seconds -> ms)
    TEST_ASSERT_EQUAL_UINT32(7200000UL, ConfigLogic::clampRestartIntervalMs(7200, DEFAULT_MS));
    // Above the one-week cap -> capped (also guards 32-bit ms overflow)
    TEST_ASSERT_EQUAL_UINT32(604800000UL, ConfigLogic::clampRestartIntervalMs(10000000UL, DEFAULT_MS));
}

// --- SchedLogic: battery gate hysteresis --------------------------------------

void test_battery_gate_hysteresis()
{
    const float threshold = 4.0f;
    const float hys = 0.1f;

    // Inactive: stays off above (threshold - hysteresis)
    TEST_ASSERT_FALSE(SchedLogic::updateBatteryGate(false, 4.2f, threshold, hys));
    TEST_ASSERT_FALSE(SchedLogic::updateBatteryGate(false, 3.95f, threshold, hys)); // In the band - no flap
    // Enters below threshold - hysteresis
    TEST_ASSERT_TRUE(SchedLogic::updateBatteryGate(false, 3.89f, threshold, hys));
    // Active: stays on inside the band, exits at >= threshold
    TEST_ASSERT_TRUE(SchedLogic::updateBatteryGate(true, 3.95f, threshold, hys));
    TEST_ASSERT_FALSE(SchedLogic::updateBatteryGate(true, 4.0f, threshold, hys));
}

void test_battery_gate_disabled_and_sentinel()
{
    // Threshold <= 0 disables the gate entirely
    TEST_ASSERT_FALSE(SchedLogic::updateBatteryGate(true, 3.0f, 0.0f, 0.1f));
    TEST_ASSERT_FALSE(SchedLogic::updateBatteryGate(false, 3.0f, -1.0f, 0.1f));
    // The 0.1 no-battery sentinel keeps the previous state
    TEST_ASSERT_TRUE(SchedLogic::updateBatteryGate(true, 0.1f, 4.0f, 0.1f));
    TEST_ASSERT_FALSE(SchedLogic::updateBatteryGate(false, 0.1f, 4.0f, 0.1f));
}

// --- SchedLogic: morning slow mode ----------------------------------------------

void test_morning_slow_mode()
{
    // Livestream starts at 11 local
    TEST_ASSERT_TRUE(SchedLogic::isMorningSlow(9, 11));
    TEST_ASSERT_TRUE(SchedLogic::isMorningSlow(10, 11));
    TEST_ASSERT_FALSE(SchedLogic::isMorningSlow(11, 11));
    TEST_ASSERT_FALSE(SchedLogic::isMorningSlow(15, 11));
    // -1 (and out-of-range) disables the feature
    TEST_ASSERT_FALSE(SchedLogic::isMorningSlow(9, -1));
    TEST_ASSERT_FALSE(SchedLogic::isMorningSlow(9, 24));
}

// --- SchedLogic: effective wind interval ------------------------------------------

void test_effective_wind_interval()
{
    const unsigned long SLOW_MS = 600000UL;

    // Normal mode passes the configured interval through
    TEST_ASSERT_EQUAL_UINT32(1000UL, SchedLogic::effectiveWindIntervalMs(false, 1000UL, SLOW_MS));
    // Slow mode floors a livestream cadence to 10 minutes
    TEST_ASSERT_EQUAL_UINT32(SLOW_MS, SchedLogic::effectiveWindIntervalMs(true, 1000UL, SLOW_MS));
    // Slow mode never speeds up an already-slower cadence
    TEST_ASSERT_EQUAL_UINT32(900000UL, SchedLogic::effectiveWindIntervalMs(true, 900000UL, SLOW_MS));
}

int main()
{
    UNITY_BEGIN();
    RUN_TEST(test_adc_calibration_centers);
    RUN_TEST(test_adc_band_boundaries);
    RUN_TEST(test_angular_difference);
    RUN_TEST(test_vector_average_wraps_north);
    RUN_TEST(test_vector_average_simple);
    RUN_TEST(test_vector_average_no_samples);
    RUN_TEST(test_pulses_to_speed);
    RUN_TEST(test_normalize_minutes_of_day);
    RUN_TEST(test_modem_local_to_utc);
    RUN_TEST(test_utc_to_local);
    RUN_TEST(test_sleep_window_same_day);
    RUN_TEST(test_sleep_window_midnight_wrap);
    RUN_TEST(test_sleep_window_disabled_when_equal);
    RUN_TEST(test_restart_interval_clamp);
    RUN_TEST(test_battery_gate_hysteresis);
    RUN_TEST(test_battery_gate_disabled_and_sentinel);
    RUN_TEST(test_morning_slow_mode);
    RUN_TEST(test_effective_wind_interval);
    return UNITY_END();
}
