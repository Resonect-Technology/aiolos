/**
 * @file WindStats.h
 * @brief Pure wind statistics — ring buffer of per-second pulse samples,
 *        rolling means and gust/lull windows. No Arduino dependencies,
 *        host-testable (pio test -e native).
 *
 * The WindSensor drains the anemometer ISR counter (at most) once per second
 * into a Ring of (pulses, durationMs) samples. All speed statistics are
 * derived from those samples:
 *  - reported wind speed = 3 s rolling mean (WMO shortest meaningful wind)
 *  - gust = max 3 s mean, lull = min 3 s mean, over a trailing window
 *
 * A sample normally spans ~1 s, but when loop() stalls (blocking HTTP) the
 * first sample after the stall covers the whole gap. Means stay exact; a
 * window ending at a long sample is that sample alone, so gusts inside a
 * stall are smoothed down — never fabricated.
 */

#pragma once

#include <cstdint>

#include "WindLogic.h"

namespace WindStats
{
    struct Sample
    {
        uint32_t pulses;
        uint32_t durationMs;
    };

    // >= 60 s of >= 1 s ticks (~512 B of RAM)
    static const int RING_CAPACITY = 64;

    struct Ring
    {
        Sample samples[RING_CAPACITY];
        int head = 0;  // next write slot
        int count = 0; // valid entries (saturates at RING_CAPACITY)

        void clear()
        {
            head = 0;
            count = 0;
        }

        void push(uint32_t pulses, uint32_t durationMs)
        {
            samples[head] = {pulses, durationMs};
            head = (head + 1) % RING_CAPACITY;
            if (count < RING_CAPACITY)
            {
                count++;
            }
        }

        // k-th newest sample (k = 0 is the most recent)
        const Sample &newest(int k) const
        {
            int idx = head - 1 - k;
            while (idx < 0)
            {
                idx += RING_CAPACITY;
            }
            return samples[idx];
        }
    };

    /**
     * @brief Total time span covered by the ring's samples (ms)
     */
    inline uint32_t spanMs(const Ring &r)
    {
        uint32_t total = 0;
        for (int k = 0; k < r.count; k++)
        {
            total += r.newest(k).durationMs;
        }
        return total;
    }

    /**
     * @brief Mean speed (m/s) of the newest samples spanning >= windowMs
     *
     * If the ring spans less than windowMs, returns the mean of what is
     * available (partial data beats reporting 0). Empty ring returns 0.
     */
    inline float rollingMean(const Ring &r, uint32_t windowMs, float factor)
    {
        uint32_t sumPulses = 0;
        uint32_t sumMs = 0;
        for (int k = 0; k < r.count && sumMs < windowMs; k++)
        {
            sumPulses += r.newest(k).pulses;
            sumMs += r.newest(k).durationMs;
        }
        return WindLogic::pulsesToSpeed(sumPulses, sumMs, factor);
    }

    namespace detail
    {
        /**
         * @brief Extreme (max or min) mean over every complete window
         *
         * A window "ends" at each sample whose age (summed durations of newer
         * samples) is <= maxAgeMs, and extends backwards until it spans
         * >= windowMs. Only complete windows count — prevents a single short
         * sample (coarsely quantized) from producing phantom gusts.
         * Returns -1 if no complete window exists.
         */
        inline float extremeWindowMean(const Ring &r, uint32_t windowMs, uint32_t maxAgeMs,
                                       float factor, bool wantMax)
        {
            float best = -1.0f;
            uint32_t age = 0;
            for (int k = 0; k < r.count; k++)
            {
                if (k > 0)
                {
                    age += r.newest(k - 1).durationMs;
                }
                if (age > maxAgeMs)
                {
                    break;
                }
                uint32_t sumPulses = 0;
                uint32_t sumMs = 0;
                for (int j = k; j < r.count && sumMs < windowMs; j++)
                {
                    sumPulses += r.newest(j).pulses;
                    sumMs += r.newest(j).durationMs;
                }
                if (sumMs < windowMs)
                {
                    // Windows ending at older samples are even shorter
                    break;
                }
                float mean = WindLogic::pulsesToSpeed(sumPulses, sumMs, factor);
                if (best < 0 || (wantMax ? mean > best : mean < best))
                {
                    best = mean;
                }
            }
            return best;
        }
    }

    /**
     * @brief Gust: max windowMs-mean ending within the trailing maxAgeMs.
     *        Returns 0 while no complete window exists yet.
     */
    inline float maxWindowMean(const Ring &r, uint32_t windowMs, uint32_t maxAgeMs, float factor)
    {
        float best = detail::extremeWindowMean(r, windowMs, maxAgeMs, factor, true);
        return best < 0 ? 0.0f : best;
    }

    /**
     * @brief Lull: min windowMs-mean ending within the trailing maxAgeMs.
     *        Returns 0 while no complete window exists yet.
     */
    inline float minWindowMean(const Ring &r, uint32_t windowMs, uint32_t maxAgeMs, float factor)
    {
        float best = detail::extremeWindowMean(r, windowMs, maxAgeMs, factor, false);
        return best < 0 ? 0.0f : best;
    }

    /**
     * @brief Accumulator for one averaged-mode sampling period
     *
     * Totals give the exact scalar mean (totalPulses / totalMs); gust/lull are
     * tracked incrementally from the 3 s rolling mean at each tick; direction
     * is vector-summed (WindLogic::addDirectionSample) by the caller.
     */
    struct Period
    {
        uint32_t totalPulses = 0;
        uint32_t totalMs = 0;
        float gustMax = -1.0f; // < 0 = no complete 3 s window seen yet
        float lullMin = -1.0f; // < 0 = no complete 3 s window seen yet
        float dirSumX = 0.0f;
        float dirSumY = 0.0f;
        int dirSamples = 0;

        void reset()
        {
            totalPulses = 0;
            totalMs = 0;
            gustMax = -1.0f;
            lullMin = -1.0f;
            dirSumX = 0.0f;
            dirSumY = 0.0f;
            dirSamples = 0;
        }
    };

    /**
     * @brief Fold one tick into a period
     *
     * @param mean3s Current 3 s rolling mean, or < 0 when no complete 3 s
     *               window exists yet (skips gust/lull, totals still count)
     */
    inline void accumulateTick(Period &p, uint32_t pulses, uint32_t durationMs, float mean3s)
    {
        p.totalPulses += pulses;
        p.totalMs += durationMs;
        if (mean3s >= 0)
        {
            if (p.gustMax < 0 || mean3s > p.gustMax)
            {
                p.gustMax = mean3s;
            }
            if (p.lullMin < 0 || mean3s < p.lullMin)
            {
                p.lullMin = mean3s;
            }
        }
    }
}
