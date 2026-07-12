/**
 * @file HttpLogic.h
 * @brief Pure HTTP response classification — no Arduino dependencies, host-testable
 */

#pragma once

namespace HttpLogic
{
    enum class Outcome
    {
        Ok,                // 2xx - success
        RejectedNoBackoff, // 4xx validation rejection - delivered, connectivity fine
        Backoff            // transport error, 3xx, 401/403, 5xx - throttle retries
    };

    /**
     * @brief Classify an HTTP status code for backoff purposes
     *
     * A 4xx means the request was delivered and rejected - backing off would
     * starve the config fetch needed to fix the cause (and previously also
     * tripped the offline-safety restart loop). 401/403 are the exception:
     * with a mismatched compile-time API key every endpoint is rejected, so
     * throttling loses nothing and full-cadence retries would only burn
     * cellular data.
     */
    inline Outcome classify(int statusCode)
    {
        if (statusCode >= 200 && statusCode < 300)
        {
            return Outcome::Ok;
        }
        if (statusCode >= 400 && statusCode < 500 && statusCode != 401 && statusCode != 403)
        {
            return Outcome::RejectedNoBackoff;
        }
        return Outcome::Backoff; // Transport errors (<= 0), 3xx, 401/403, 5xx
    }
}
