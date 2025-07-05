/**
 * @file Logger.cpp
 * @brief Implementation of the logging system
 */

#include "Logger.h"
#include <stdarg.h>

LoggerClass Logger;

void LoggerClass::init(uint8_t logLevel)
{
    _logLevel = logLevel;

    if (!_initialized && DEBUG_ENABLED)
    {
        Serial.begin(UART_BAUD);
        delay(100); // Short delay to ensure Serial is ready
    }

    _initialized = true;

    info(LOG_TAG_SYSTEM, "Logger initialized");
}

void LoggerClass::error(const char *tag, const char *format, ...)
{
    va_list args;
    va_start(args, format);

    char buffer[256];
    vsnprintf(buffer, sizeof(buffer), format, args);

    va_end(args);

    log(LOG_LEVEL_ERROR, tag, buffer);
}

void LoggerClass::warn(const char *tag, const char *format, ...)
{
    va_list args;
    va_start(args, format);

    char buffer[256];
    vsnprintf(buffer, sizeof(buffer), format, args);

    va_end(args);

    log(LOG_LEVEL_WARN, tag, buffer);
}

void LoggerClass::info(const char *tag, const char *format, ...)
{
    va_list args;
    va_start(args, format);

    char buffer[256];
    vsnprintf(buffer, sizeof(buffer), format, args);

    va_end(args);

    log(LOG_LEVEL_INFO, tag, buffer);
}

void LoggerClass::debug(const char *tag, const char *format, ...)
{
    va_list args;
    va_start(args, format);

    char buffer[512]; // Increased buffer size for longer debug messages
    vsnprintf(buffer, sizeof(buffer), format, args);

    va_end(args);

    log(LOG_LEVEL_DEBUG, tag, buffer);
}

void LoggerClass::verbose(const char *tag, const char *format, ...)
{
    va_list args;
    va_start(args, format);

    char buffer[256];
    vsnprintf(buffer, sizeof(buffer), format, args);

    va_end(args);

    log(LOG_LEVEL_VERBOSE, tag, buffer);
}

void LoggerClass::log(uint8_t level, const char *tag, const char *format, ...)
{
    if (!DEBUG_ENABLED || level > _logLevel)
    {
        return;
    }

    // Calculate current time (real time if available, boot time if not)
    unsigned long hours, minutes, seconds;

    if (_hasRealTime)
    {
        // Calculate elapsed time since real time was set
        unsigned long now = millis();
        unsigned long elapsedMs = now - _realTimeSetAt;
        unsigned long elapsedSeconds = elapsedMs / 1000;

        // Add elapsed seconds to the real time
        unsigned long totalSeconds = (_realHour * 3600) + (_realMinute * 60) + _realSecond + elapsedSeconds;

        // Handle day rollover
        totalSeconds %= (24 * 3600);

        hours = totalSeconds / 3600;
        minutes = (totalSeconds % 3600) / 60;
        seconds = totalSeconds % 60;
    }
    else
    {
        // Fall back to boot time
        unsigned long now = millis();
        seconds = (now / 1000) % 60;
        minutes = ((now / 1000) / 60) % 60;
        hours = (((now / 1000) / 60) / 60) % 24;
    }

    // Format the log prefix with timestamp and level
    char buffer[512]; // Increased buffer size for longer messages
    char levelChar;

    switch (level)
    {
    case LOG_LEVEL_ERROR:
        levelChar = 'E';
        break;
    case LOG_LEVEL_WARN:
        levelChar = 'W';
        break;
    case LOG_LEVEL_INFO:
        levelChar = 'I';
        break;
    case LOG_LEVEL_DEBUG:
        levelChar = 'D';
        break;
    case LOG_LEVEL_VERBOSE:
        levelChar = 'V';
        break;
    default:
        levelChar = '?';
        break;
    }

    // Use different format based on whether we have real time
    int prefixLen;
    if (_hasRealTime)
    {
        prefixLen = snprintf(buffer, sizeof(buffer), "[%02lu:%02lu:%02lu][%c][%s] ",
                             hours, minutes, seconds, levelChar, tag);
    }
    else
    {
        prefixLen = snprintf(buffer, sizeof(buffer), "[%02lu:%02lu:%02lu*][%c][%s] ",
                             hours, minutes, seconds, levelChar, tag);
    }

    // Format the log message
    va_list args;
    va_start(args, format);
    vsnprintf(buffer + prefixLen, sizeof(buffer) - prefixLen, format, args);
    va_end(args);

    // Print to serial
    Serial.println(buffer);

    // Store in recent logs
    _storeLog(buffer);
}

void LoggerClass::setRealTime(int hour, int minute, int second)
{
    _realHour = hour;
    _realMinute = minute;
    _realSecond = second;
    _realTimeSetAt = millis();
    _hasRealTime = true;
}

void LoggerClass::_storeLog(const char *message)
{
    // Store in circular buffer
    strncpy(_recentLogs[_logIndex], message, sizeof(_recentLogs[0]) - 1);
    _recentLogs[_logIndex][sizeof(_recentLogs[0]) - 1] = '\0';

    _logIndex = (_logIndex + 1) % MAX_RECENT_LOGS;
}

bool LoggerClass::getRecentLogsJson(char *buffer, size_t size)
{
    if (!buffer || size < 20)
    {
        return false;
    }

    // Start JSON array
    int offset = snprintf(buffer, size, "{\"logs\":[");
    size_t remaining = size - offset;

    // Add recent logs
    for (int i = 0; i < MAX_RECENT_LOGS; i++)
    {
        int idx = (_logIndex + i) % MAX_RECENT_LOGS;

        // Skip empty logs
        if (_recentLogs[idx][0] == '\0')
        {
            continue;
        }

        // Add comma if not first entry
        if (offset > 9)
        { // 9 is the length of {"logs":[
            buffer[offset++] = ',';
            remaining--;
        }

        // Add the log as a JSON string
        offset += snprintf(buffer + offset, remaining, "\"%s\"", _recentLogs[idx]);
        remaining = size - offset;

        // Check if buffer is almost full
        if (remaining < 20)
        {
            break;
        }
    }

    // Close JSON array
    strncat(buffer + offset, "]}", remaining);

    return true;
}
