/**
 * @file test_main.cpp
 * @brief Host-run Unity tests for the pure logic in firmware/src/logic
 *
 * Run with: pio test -e native
 */

#include <unity.h>

#include "logic/ConfigLogic.h"
#include "logic/HttpLogic.h"
#include "logic/SchedLogic.h"
#include "logic/TimeLogic.h"
#include "logic/WindLogic.h"
#include "logic/WindStats.h"

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

// --- TimeLogic: ticking clock between syncs --------------------------------------

void test_advance_seconds_of_day()
{
    const long NOON = 12L * 3600;

    // Zero elapsed is identity
    TEST_ASSERT_EQUAL_INT32(NOON, TimeLogic::advanceSecondsOfDay(NOON, 0));
    // +90 s
    TEST_ASSERT_EQUAL_INT32(NOON + 90, TimeLogic::advanceSecondsOfDay(NOON, 90000));
    // Sub-second remainders truncate (999 ms -> +0 s)
    TEST_ASSERT_EQUAL_INT32(NOON, TimeLogic::advanceSecondsOfDay(NOON, 999));
    // Wrap past midnight: 23:59:30 + 60 s -> 00:00:30
    TEST_ASSERT_EQUAL_INT32(30, TimeLogic::advanceSecondsOfDay(23L * 3600 + 59 * 60 + 30, 60000));
    // More than 24 h elapsed still lands in [0, 86400)
    TEST_ASSERT_EQUAL_INT32(NOON + 60, TimeLogic::advanceSecondsOfDay(NOON, 24UL * 3600 * 1000 + 60000));
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

void test_interval_clamp()
{
    // In range -> passed through
    TEST_ASSERT_EQUAL_UINT32(300000UL, ConfigLogic::clampIntervalMs(300000UL, 1000UL, 3600000UL));
    // A seconds-scale mistake (300 "ms") is floored, not applied raw
    TEST_ASSERT_EQUAL_UINT32(1000UL, ConfigLogic::clampIntervalMs(300UL, 1000UL, 3600000UL));
    // Above cap -> capped
    TEST_ASSERT_EQUAL_UINT32(3600000UL, ConfigLogic::clampIntervalMs(7200000UL, 1000UL, 3600000UL));
    // Boundaries are inclusive
    TEST_ASSERT_EQUAL_UINT32(1000UL, ConfigLogic::clampIntervalMs(1000UL, 1000UL, 3600000UL));
    TEST_ASSERT_EQUAL_UINT32(3600000UL, ConfigLogic::clampIntervalMs(3600000UL, 1000UL, 3600000UL));
}

void test_valid_sleep_config()
{
    // The seeded production window
    TEST_ASSERT_TRUE(ConfigLogic::validSleepConfig(22, 6, 180));
    // Hour bounds
    TEST_ASSERT_FALSE(ConfigLogic::validSleepConfig(24, 6, 180));
    TEST_ASSERT_FALSE(ConfigLogic::validSleepConfig(22, -1, 180));
    // UTC offset bounds (-12:00 to +14:00)
    TEST_ASSERT_FALSE(ConfigLogic::validSleepConfig(22, 6, -721));
    TEST_ASSERT_FALSE(ConfigLogic::validSleepConfig(22, 6, 841));
    TEST_ASSERT_TRUE(ConfigLogic::validSleepConfig(22, 6, -720));
    TEST_ASSERT_TRUE(ConfigLogic::validSleepConfig(22, 6, 840));
    // (0,0,0) passes range checks - this is why callers must also check the
    // RTC validity magic (power-on zeroes RTC RAM)
    TEST_ASSERT_TRUE(ConfigLogic::validSleepConfig(0, 0, 0));
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

// --- SchedLogic: critical-battery hibernation ------------------------------------

void test_critical_battery_sentinel()
{
    // USB / no-battery sentinel never hibernates and resets the debounce counter
    int lowReads = 2;
    TEST_ASSERT_FALSE(SchedLogic::updateCriticalBattery(false, 0.1f, 3.5f, 3.7f, lowReads, 3));
    TEST_ASSERT_EQUAL_INT(0, lowReads);
    lowReads = 2;
    TEST_ASSERT_FALSE(SchedLogic::updateCriticalBattery(true, 0.1f, 3.5f, 3.7f, lowReads, 3));
    TEST_ASSERT_EQUAL_INT(0, lowReads);
}

void test_critical_battery_consecutive_reads()
{
    int lowReads = 0;
    // Two lows are not enough
    TEST_ASSERT_FALSE(SchedLogic::updateCriticalBattery(false, 3.4f, 3.5f, 3.7f, lowReads, 3));
    TEST_ASSERT_FALSE(SchedLogic::updateCriticalBattery(false, 3.4f, 3.5f, 3.7f, lowReads, 3));
    // A good read (TX sag transient over) resets the streak
    TEST_ASSERT_FALSE(SchedLogic::updateCriticalBattery(false, 3.6f, 3.5f, 3.7f, lowReads, 3));
    TEST_ASSERT_EQUAL_INT(0, lowReads);
    // Three consecutive lows hibernate
    TEST_ASSERT_FALSE(SchedLogic::updateCriticalBattery(false, 3.4f, 3.5f, 3.7f, lowReads, 3));
    TEST_ASSERT_FALSE(SchedLogic::updateCriticalBattery(false, 3.4f, 3.5f, 3.7f, lowReads, 3));
    TEST_ASSERT_TRUE(SchedLogic::updateCriticalBattery(false, 3.4f, 3.5f, 3.7f, lowReads, 3));
}

void test_critical_battery_recovery_hysteresis()
{
    int lowReads = 0;
    // While hibernating, anything below recovery stays hibernating...
    TEST_ASSERT_TRUE(SchedLogic::updateCriticalBattery(true, 3.55f, 3.5f, 3.7f, lowReads, 3));
    TEST_ASSERT_TRUE(SchedLogic::updateCriticalBattery(true, 3.69f, 3.5f, 3.7f, lowReads, 3));
    // ...and a single read at >= recovery exits
    TEST_ASSERT_FALSE(SchedLogic::updateCriticalBattery(true, 3.7f, 3.5f, 3.7f, lowReads, 3));
}

void test_critical_battery_boot_entry_debounced()
{
    // Entry needs ALL reads below critical - one noisy read must not latch
    const float allLow[3] = {3.4f, 3.4f, 3.4f};
    TEST_ASSERT_TRUE(SchedLogic::criticalAtBoot(false, allLow, 3, 3.5f, 3.6f));
    const float noisyLast[3] = {3.4f, 3.4f, 3.6f};
    TEST_ASSERT_FALSE(SchedLogic::criticalAtBoot(false, noisyLast, 3, 3.5f, 3.6f));
    const float noisyMiddle[3] = {3.4f, 3.6f, 3.4f};
    TEST_ASSERT_FALSE(SchedLogic::criticalAtBoot(false, noisyMiddle, 3, 3.5f, 3.6f));
    const float atThreshold[3] = {3.5f, 3.5f, 3.5f};
    TEST_ASSERT_FALSE(SchedLogic::criticalAtBoot(false, atThreshold, 3, 3.5f, 3.6f));
}

void test_critical_battery_boot_recovery_debounced()
{
    // Recovery needs ALL reads at/above recovery - one noisy high read must
    // not power the modem on a dying pack
    const float oneStillLow[3] = {3.65f, 3.55f, 3.65f};
    TEST_ASSERT_TRUE(SchedLogic::criticalAtBoot(true, oneStillLow, 3, 3.5f, 3.6f));
    const float allRecovered[3] = {3.62f, 3.61f, 3.65f};
    TEST_ASSERT_FALSE(SchedLogic::criticalAtBoot(true, allRecovered, 3, 3.5f, 3.6f));
    // Bench-power sentinel never hibernates in either state
    const float sentinel[3] = {0.1f, 0.1f, 0.1f};
    TEST_ASSERT_FALSE(SchedLogic::criticalAtBoot(true, sentinel, 3, 3.5f, 3.6f));
    TEST_ASSERT_FALSE(SchedLogic::criticalAtBoot(false, sentinel, 3, 3.5f, 3.6f));
}

// --- HttpLogic: status classification for backoff ---------------------------

void test_http_classify()
{
    // 2xx succeeds
    TEST_ASSERT_TRUE(HttpLogic::classify(200) == HttpLogic::Outcome::Ok);
    TEST_ASSERT_TRUE(HttpLogic::classify(204) == HttpLogic::Outcome::Ok);
    // Validation rejections were delivered - connectivity fine, no backoff
    TEST_ASSERT_TRUE(HttpLogic::classify(400) == HttpLogic::Outcome::RejectedNoBackoff);
    TEST_ASSERT_TRUE(HttpLogic::classify(404) == HttpLogic::Outcome::RejectedNoBackoff);
    TEST_ASSERT_TRUE(HttpLogic::classify(422) == HttpLogic::Outcome::RejectedNoBackoff);
    // Auth failures reject every endpoint (compile-time key) - keep the throttle
    TEST_ASSERT_TRUE(HttpLogic::classify(401) == HttpLogic::Outcome::Backoff);
    TEST_ASSERT_TRUE(HttpLogic::classify(403) == HttpLogic::Outcome::Backoff);
    // Server errors and redirects back off
    TEST_ASSERT_TRUE(HttpLogic::classify(500) == HttpLogic::Outcome::Backoff);
    TEST_ASSERT_TRUE(HttpLogic::classify(502) == HttpLogic::Outcome::Backoff);
    TEST_ASSERT_TRUE(HttpLogic::classify(503) == HttpLogic::Outcome::Backoff);
    TEST_ASSERT_TRUE(HttpLogic::classify(301) == HttpLogic::Outcome::Backoff);
    // ArduinoHttpClient transport errors are <= 0
    TEST_ASSERT_TRUE(HttpLogic::classify(0) == HttpLogic::Outcome::Backoff);
    TEST_ASSERT_TRUE(HttpLogic::classify(-1) == HttpLogic::Outcome::Backoff);
    TEST_ASSERT_TRUE(HttpLogic::classify(-3) == HttpLogic::Outcome::Backoff);
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

// --- SchedLogic: effective send interval ------------------------------------------

void test_effective_interval()
{
    const unsigned long SLOW_MS = 600000UL;

    // Normal mode passes the configured interval through
    TEST_ASSERT_EQUAL_UINT32(1000UL, SchedLogic::effectiveIntervalMs(false, 1000UL, SLOW_MS));
    // Slow mode floors a livestream cadence to 10 minutes
    TEST_ASSERT_EQUAL_UINT32(SLOW_MS, SchedLogic::effectiveIntervalMs(true, 1000UL, SLOW_MS));
    // Slow mode never speeds up an already-slower cadence
    TEST_ASSERT_EQUAL_UINT32(900000UL, SchedLogic::effectiveIntervalMs(true, 900000UL, SLOW_MS));
    // Temp/diag path: 5 min default floors to 10 min while the battery gate is active
    TEST_ASSERT_EQUAL_UINT32(SLOW_MS, SchedLogic::effectiveIntervalMs(true, 300000UL, SLOW_MS));
    TEST_ASSERT_EQUAL_UINT32(300000UL, SchedLogic::effectiveIntervalMs(false, 300000UL, SLOW_MS));
}

// --- WindStats: ring buffer + rolling/window means ------------------------------

// Calibration factor used across the WindStats tests (m/s per Hz)
static const float WS_FACTOR = 0.6667f;

void test_ring_push_and_wrap()
{
    WindStats::Ring ring;
    // A peak first, then enough calm samples to evict it
    ring.push(100, 1000);
    for (int i = 0; i < 69; i++)
    {
        ring.push(0, 1000);
    }
    TEST_ASSERT_EQUAL_INT(WindStats::RING_CAPACITY, ring.count);
    // The evicted peak must not influence any window
    TEST_ASSERT_EQUAL_FLOAT(0, WindStats::maxWindowMean(ring, 3000, 600000, WS_FACTOR));
    ring.push(9, 1000);
    TEST_ASSERT_EQUAL_UINT32(9, ring.newest(0).pulses);
}

void test_rolling_mean_exact_3s()
{
    WindStats::Ring ring;
    for (int i = 0; i < 3; i++)
    {
        ring.push(3, 1000); // 3 Hz
    }
    TEST_ASSERT_FLOAT_WITHIN(0.01, 2.0, WindStats::rollingMean(ring, 3000, WS_FACTOR));
}

void test_rolling_mean_partial_data()
{
    WindStats::Ring ring;
    ring.push(6, 1000); // 6 Hz, ring spans only 1 s
    TEST_ASSERT_FLOAT_WITHIN(0.01, 4.0, WindStats::rollingMean(ring, 3000, WS_FACTOR));
    // Empty ring is 0, not NaN
    WindStats::Ring empty;
    TEST_ASSERT_EQUAL_FLOAT(0, WindStats::rollingMean(empty, 3000, WS_FACTOR));
}

void test_rolling_mean_uses_newest()
{
    WindStats::Ring ring;
    ring.push(30, 1000); // old burst
    ring.push(0, 1000);
    ring.push(0, 1000);
    ring.push(0, 1000);
    TEST_ASSERT_EQUAL_FLOAT(0, WindStats::rollingMean(ring, 3000, WS_FACTOR));
    ring.push(9, 1000);
    TEST_ASSERT_FLOAT_WITHIN(0.01, 2.0, WindStats::rollingMean(ring, 3000, WS_FACTOR));
}

void test_gust_detects_peak()
{
    WindStats::Ring ring;
    for (int i = 0; i < 10; i++)
    {
        ring.push(1, 1000); // calm
    }
    for (int i = 0; i < 3; i++)
    {
        ring.push(9, 1000); // 3 s burst at 9 Hz
    }
    for (int i = 0; i < 5; i++)
    {
        ring.push(1, 1000); // calm again
    }
    TEST_ASSERT_FLOAT_WITHIN(0.01, 6.0, WindStats::maxWindowMean(ring, 3000, 60000, WS_FACTOR));
}

void test_gust_requires_complete_window()
{
    WindStats::Ring ring;
    ring.push(5, 1000);
    ring.push(5, 1000); // spans only 2 s < 3 s window
    TEST_ASSERT_EQUAL_FLOAT(0, WindStats::maxWindowMean(ring, 3000, 60000, WS_FACTOR));
}

void test_gust_max_age_expiry()
{
    WindStats::Ring ring;
    for (int i = 0; i < 3; i++)
    {
        ring.push(9, 1000); // old 3 s burst
    }
    for (int i = 0; i < 10; i++)
    {
        ring.push(0, 1000); // 10 s of calm since
    }
    // Trailing 5 s: burst is out of reach
    TEST_ASSERT_EQUAL_FLOAT(0, WindStats::maxWindowMean(ring, 3000, 5000, WS_FACTOR));
    // Unbounded age (period-style query) still finds it
    TEST_ASSERT_FLOAT_WITHIN(0.01, 6.0, WindStats::maxWindowMean(ring, 3000, 600000, WS_FACTOR));
}

void test_stall_long_sample_semantics()
{
    // A 12 s loop stall produces one long sample; gusts inside it are
    // smoothed to the stall average, never inflated to a phantom spike.
    WindStats::Ring ring;
    ring.push(9, 1000);   // 9 Hz second
    ring.push(36, 12000); // stall: 3 Hz average over 12 s
    ring.push(9, 1000);   // 9 Hz second
    float gust = WindStats::maxWindowMean(ring, 3000, 600000, WS_FACTOR);
    // Best complete window: (9 + 36) pulses / 13 s = 3.46 Hz -> ~2.31 m/s
    TEST_ASSERT_FLOAT_WITHIN(0.01, 2.31, gust);
    // Far below the 6.0 m/s a fabricated 9 Hz gust would read
    TEST_ASSERT_TRUE(gust < 6.0f);
}

void test_lull_symmetric()
{
    WindStats::Ring ring;
    for (int i = 0; i < 10; i++)
    {
        ring.push(9, 1000); // strong
    }
    for (int i = 0; i < 3; i++)
    {
        ring.push(1, 1000); // 3 s dip at 1 Hz
    }
    for (int i = 0; i < 5; i++)
    {
        ring.push(9, 1000); // strong again
    }
    TEST_ASSERT_FLOAT_WITHIN(0.01, 0.667, WindStats::minWindowMean(ring, 3000, 60000, WS_FACTOR));
}

void test_period_accumulate_totals()
{
    // 9 full 1 s ticks plus a residual 700 ms tick at period end — the
    // residual must count (regression for the final-subinterval undercount).
    WindStats::Period period;
    for (int i = 0; i < 9; i++)
    {
        WindStats::accumulateTick(period, 3, 1000, -1.0f);
    }
    WindStats::accumulateTick(period, 2, 700, -1.0f);
    TEST_ASSERT_EQUAL_UINT32(29, period.totalPulses);
    TEST_ASSERT_EQUAL_UINT32(9700, period.totalMs);
    TEST_ASSERT_FLOAT_WITHIN(0.01, 1.99,
                             WindLogic::pulsesToSpeed(period.totalPulses, period.totalMs, WS_FACTOR));
}

void test_period_gust_lull_and_skip()
{
    WindStats::Period period;
    WindStats::accumulateTick(period, 3, 1000, 2.0f);
    WindStats::accumulateTick(period, 8, 1000, 5.0f);
    WindStats::accumulateTick(period, 1, 1000, 1.0f);
    WindStats::accumulateTick(period, 3, 1000, -1.0f); // no 3 s window yet: skip gust/lull
    TEST_ASSERT_EQUAL_FLOAT(5.0f, period.gustMax);
    TEST_ASSERT_EQUAL_FLOAT(1.0f, period.lullMin);
    TEST_ASSERT_TRUE(period.gustMax >= period.lullMin);
    // The skipped tick still counts toward the totals
    TEST_ASSERT_EQUAL_UINT32(15, period.totalPulses);
    TEST_ASSERT_EQUAL_UINT32(4000, period.totalMs);
}

void test_period_reset_no_bleed()
{
    // Regression for the mode-switch phantom spike: a new period must not
    // inherit anything from the previous one.
    WindStats::Period period;
    WindStats::accumulateTick(period, 50, 1000, 8.0f);
    period.reset();
    WindStats::accumulateTick(period, 1, 1000, 0.5f);
    TEST_ASSERT_EQUAL_UINT32(1, period.totalPulses);
    TEST_ASSERT_EQUAL_UINT32(1000, period.totalMs);
    TEST_ASSERT_EQUAL_FLOAT(0.5f, period.gustMax);
    TEST_ASSERT_EQUAL_FLOAT(0.5f, period.lullMin);
}

void test_zero_wind()
{
    WindStats::Ring ring;
    for (int i = 0; i < 10; i++)
    {
        ring.push(0, 1000);
    }
    TEST_ASSERT_EQUAL_FLOAT(0, WindStats::rollingMean(ring, 3000, WS_FACTOR));
    TEST_ASSERT_EQUAL_FLOAT(0, WindStats::maxWindowMean(ring, 3000, 60000, WS_FACTOR));
    TEST_ASSERT_EQUAL_FLOAT(0, WindStats::minWindowMean(ring, 3000, 60000, WS_FACTOR));
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
    RUN_TEST(test_advance_seconds_of_day);
    RUN_TEST(test_sleep_window_same_day);
    RUN_TEST(test_sleep_window_midnight_wrap);
    RUN_TEST(test_sleep_window_disabled_when_equal);
    RUN_TEST(test_restart_interval_clamp);
    RUN_TEST(test_interval_clamp);
    RUN_TEST(test_valid_sleep_config);
    RUN_TEST(test_battery_gate_hysteresis);
    RUN_TEST(test_battery_gate_disabled_and_sentinel);
    RUN_TEST(test_critical_battery_sentinel);
    RUN_TEST(test_critical_battery_consecutive_reads);
    RUN_TEST(test_critical_battery_recovery_hysteresis);
    RUN_TEST(test_critical_battery_boot_entry_debounced);
    RUN_TEST(test_critical_battery_boot_recovery_debounced);
    RUN_TEST(test_http_classify);
    RUN_TEST(test_morning_slow_mode);
    RUN_TEST(test_effective_interval);
    RUN_TEST(test_ring_push_and_wrap);
    RUN_TEST(test_rolling_mean_exact_3s);
    RUN_TEST(test_rolling_mean_partial_data);
    RUN_TEST(test_rolling_mean_uses_newest);
    RUN_TEST(test_gust_detects_peak);
    RUN_TEST(test_gust_requires_complete_window);
    RUN_TEST(test_gust_max_age_expiry);
    RUN_TEST(test_stall_long_sample_semantics);
    RUN_TEST(test_lull_symmetric);
    RUN_TEST(test_period_accumulate_totals);
    RUN_TEST(test_period_gust_lull_and_skip);
    RUN_TEST(test_period_reset_no_bleed);
    RUN_TEST(test_zero_wind);
    return UNITY_END();
}
