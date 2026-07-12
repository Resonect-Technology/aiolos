/**
 * @file Watchdog.h
 * @brief Single owner of task-watchdog configuration
 *
 * All watchdog state changes go through these helpers so the timeout is
 * defined in exactly one place (WDT_TIMEOUT_S, seconds). The previous code
 * re-derived units at each call site, which left the watchdog armed with a
 * ~33 hour timeout after any modem operation.
 */

#pragma once

#include <esp_task_wdt.h>

#include "../config/Config.h"

// TWDT init state, tracked so init vs reconfigure is called in the right order
// (probing with the wrong one makes IDF print scary task_wdt error logs).
// Starts true: the Arduino core initializes the TWDT during startup.
inline bool &watchdogInitialized()
{
    static bool initialized = true;
    return initialized;
}

/**
 * @brief Apply a task-watchdog timeout, initializing the TWDT if needed
 */
inline void watchdogConfigure(uint32_t timeoutS, bool panic)
{
    esp_task_wdt_config_t config = {
        .timeout_ms = timeoutS * 1000,
        .idle_core_mask = 0,
        .trigger_panic = panic,
    };
    if (watchdogInitialized())
    {
        esp_task_wdt_reconfigure(&config);
    }
    else if (esp_task_wdt_init(&config) == ESP_OK)
    {
        watchdogInitialized() = true;
    }
}

/**
 * @brief Arm the watchdog at WDT_TIMEOUT_S and subscribe the current task
 */
inline void watchdogEnable()
{
    watchdogConfigure(WDT_TIMEOUT_S, true);
    if (esp_task_wdt_status(NULL) != ESP_OK)
    {
        esp_task_wdt_add(NULL);
    }
}

/**
 * @brief Relax the watchdog to 2x timeout (no panic) for long modem operations
 */
inline void watchdogExtend()
{
    if (!watchdogInitialized())
    {
        return; // Fully disabled is already more relaxed than extended
    }
    esp_task_wdt_reset();
    watchdogConfigure(WDT_TIMEOUT_S * 2, false);
}

/**
 * @brief Fully disable the watchdog (OTA sessions, deep-sleep preparation)
 */
inline void watchdogDisable()
{
    if (!watchdogInitialized())
    {
        return;
    }
    if (esp_task_wdt_status(NULL) == ESP_OK)
    {
        esp_task_wdt_delete(NULL); // Unsubscribe first; deinit fails while tasks are subscribed
    }
    esp_task_wdt_deinit();
    watchdogInitialized() = false;
}
