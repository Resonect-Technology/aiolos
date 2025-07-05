/**
 * @file Logger.h
 * @brief Logging system for the Aiolos Weather Station
 *
 * Provides consistent logging functionality with different severity levels.
 * Logs can be output to Serial and optionally buffered for transmission
 * to the server as diagnostic information.
 */

#pragma once

#include <Arduino.h>
#include "../config/Config.h"

// Log levels
#define LOG_LEVEL_NONE 0
#define LOG_LEVEL_ERROR 1
#define LOG_LEVEL_WARN 2
#define LOG_LEVEL_INFO 3
#define LOG_LEVEL_DEBUG 4
#define LOG_LEVEL_VERBOSE 5

// Log category tags
#define LOG_TAG_SYSTEM "SYSTEM"
#define LOG_TAG_MODEM "MODEM"
#define LOG_TAG_COAP "COAP"
#define LOG_TAG_SENSOR "SENSOR"
#define LOG_TAG_POWER "POWER"
#define LOG_TAG_OTA "OTA"

class LoggerClass
{
public:
    /**
     * @brief Initialize the logger
     *
     * @param logLevel The minimum log level to display
     */
    void init(uint8_t logLevel = LOG_LEVEL);

    /**
     * @brief Log an error message
     *
     * @param tag Category tag for the message
     * @param format Format string
     * @param ... Variable arguments
     */
    void error(const char *tag, const char *format, ...);

    /**
     * @brief Log a warning message
     *
     * @param tag Category tag for the message
     * @param format Format string
     * @param ... Variable arguments
     */
    void warn(const char *tag, const char *format, ...);

    /**
     * @brief Log an info message
     *
     * @param tag Category tag for the message
     * @param format Format string
     * @param ... Variable arguments
     */
    void info(const char *tag, const char *format, ...);

    /**
     * @brief Log a debug message
     *
     * @param tag Category tag for the message
     * @param format Format string
     * @param ... Variable arguments
     */
    void debug(const char *tag, const char *format, ...);

    /**
     * @brief Log a verbose message
     *
     * @param tag Category tag for the message
     * @param format Format string
     * @param ... Variable arguments
     */
    void verbose(const char *tag, const char *format, ...);

    /**
     * @brief Format and log a message (printf style)
     *
     * @param level Log level
     * @param tag Category tag
     * @param format Format string
     * @param ... Variable arguments
     */
    void log(uint8_t level, const char *tag, const char *format, ...);

    /**
     * @brief Get recent log entries as JSON
     *
     * @param buffer Buffer to store the JSON
     * @param size Size of the buffer
     * @return true if successful, false otherwise
     */
    bool getRecentLogsJson(char *buffer, size_t size);

    /**
     * @brief Set the current real time for accurate timestamps
     *
     * @param hour Current hour (0-23)
     * @param minute Current minute (0-59)
     * @param second Current second (0-59)
     */
    void setRealTime(int hour, int minute, int second);

private:
    uint8_t _logLevel = LOG_LEVEL_INFO;
    bool _initialized = false;

    // Real time tracking
    bool _hasRealTime = false;
    unsigned long _realTimeSetAt = 0; // millis() when real time was set
    int _realHour = 0;
    int _realMinute = 0;
    int _realSecond = 0;

    // Circular buffer for recent logs
    static const uint8_t MAX_RECENT_LOGS = 10;
    char _recentLogs[MAX_RECENT_LOGS][128];
    uint8_t _logIndex = 0;

    /**
     * @brief Store a log message in the recent logs buffer
     *
     * @param message The message to store
     */
    void _storeLog(const char *message);
};

// Global instance
extern LoggerClass Logger;
