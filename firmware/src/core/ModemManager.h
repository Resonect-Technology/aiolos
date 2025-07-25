/**
 * @file ModemManager.h
 * @brief Manages the SIM7000G modem
 *
 * Handles modem initialization, power cycling, network connection,
 * and communication. Provides access to network time and signal quality.
 */

#pragma once

#include <Arduino.h>
#include <driver/gpio.h>
#include <esp_task_wdt.h>
#include "../config/Config.h"

// Define these before including TinyGSM library
#define TINY_GSM_MODEM_SIM7000
#define TINY_GSM_USE_GPRS true
#define TINY_GSM_USE_WIFI false
#undef TINY_GSM_RX_BUFFER
#define TINY_GSM_RX_BUFFER 4096 // Set RX buffer to 4Kb

// Enable required TinyGSM features
#define TINY_GSM_ENABLE_GPRS true
#define TINY_GSM_ENABLE_SSL true
#define TINY_GSM_ENABLE_GSM_LOCATION true

#include <TinyGsmClient.h>

// Define SerialAT - this should be consistent with LilyGO examples
#define SerialAT Serial1

class ModemManager
{
public:
    // Enum for SIM status, as defined in TinyGSM but scoped here for clarity
    enum SimStatus
    {
        SIM_ERROR = 0,
        SIM_READY = 1,
        SIM_LOCKED = 2,
    };

    /**
     * @brief Initialize the ModemManager
     *
     * @return true if initialization successful
     * @return false if initialization failed
     */
    bool init();

    /**
     * @brief Power on the modem
     *
     * @return true if successful
     * @return false if failed
     */
    bool powerOn();

    /**
     * @brief Power off the modem completely
     *
     * This method implements a robust power-off sequence that fixes the persistent
     * modem restart issue. It sends multiple AT+CPOWD=1 commands and ensures the
     * PWR_PIN is set to the correct state (HIGH = LOW to modem) to maintain the
     * OFF state, preventing automatic modem restart.
     *
     * The implementation addresses GitHub issues #146, #251, and #144.
     *
     * @return true if successful
     * @return false if failed
     */
    bool powerOff();

    /**
     * @brief Check if the modem is connected to the network
     *
     * @return true if connected
     * @return false if not connected
     */
    bool isNetworkConnected();

    /**
     * @brief Connect to the cellular network
     *
     * @param maxRetries Maximum number of connection attempts
     * @return true if connection successful
     * @return false if connection failed
     */
    bool connectNetwork(int maxRetries = 3);

    /**
     * @brief Check if GPRS is connected
     *
     * @return true if connected
     * @return false if not connected
     */
    bool isGprsConnected();

    /**
     * @brief Connect to GPRS
     *
     * @param maxRetries Maximum number of connection attempts
     * @return true if connection successful
     * @return false if connection failed
     */
    bool connectGprs(int maxRetries = 3);

    /**
     * @brief Disconnect from GPRS
     *
     * @return true if disconnection successful
     * @return false if disconnection failed
     */
    bool disconnectGprs();

    /**
     * @brief Maintain the modem's connection state (network and GPRS)
     *
     * This method includes intelligent failure detection and recovery mechanisms
     * to prevent infinite connection loops and handle unresponsive modem states.
     *
     * @param active If true, ensures network and GPRS are connected.
     *               If false, disconnects GPRS to save power.
     */
    void maintainConnection(bool active);

    /**
     * @brief Check if the modem is in a failure state requiring reset
     *
     * @return true if modem needs reset due to consecutive failures
     * @return false if modem is operating normally
     */
    bool needsReset();

    /**
     * @brief Reset the modem completely (power cycle)
     *
     * @return true if reset successful
     * @return false if reset failed
     */
    bool resetModem();

    /**
     * @brief Get the current time from the network
     *
     * @param year Pointer to store year
     * @param month Pointer to store month
     * @param day Pointer to store day
     * @param hour Pointer to store hour
     * @param minute Pointer to store minute
     * @param second Pointer to store second
     * @param timezone Pointer to store timezone
     * @return true if successful
     * @return false if failed
     */
    bool getNetworkTime(int *year, int *month, int *day,
                        int *hour, int *minute, int *second,
                        float *timezone);

    /**
     * @brief Get the signal quality
     *
     * @return int Signal quality in dBm
     */
    int getSignalQuality();

    /**
     * @brief Get the underlying TinyGSM modem instance
     *
     * @return TinyGsm* Pointer to the modem instance
     */
    TinyGsm *getModem() { return &_modem; }

    /**
     * @brief Get the TinyGSM client for network communication
     *
     * @return TinyGsmClient* Pointer to the client
     */
    TinyGsmClient *getClient() { return &_client; }

    /**
     * @brief Send an AT command to the modem
     *
     * @param cmd The AT command to send
     * @param timeout Timeout in milliseconds
     * @return void
     */
    void sendAT(const char *cmd, unsigned long timeout = 10000L);

    /**
     * @brief Put the modem into sleep mode
     *
     * @param enableHold If true, will keep DTR pin state during ESP32 deep sleep
     * @return true if successful
     * @return false if failed
     */
    bool enterSleepMode(bool enableHold = true);

    /**
     * @brief Wake up the modem from sleep mode
     *
     * @param fromDeepSleep True if waking up after ESP32 deep sleep
     * @return true if successful
     * @return false if failed
     */
    bool wakeUp(bool fromDeepSleep = false);

    /**
     * @brief Check if the modem is responsive
     *
     * @return true if modem responds to AT commands
     * @return false if no response
     */
    bool isResponsive();

    /**
     * @brief Test connectivity by connecting to a host and port.
     *
     * @param host The hostname or IP address to connect to.
     * @param port The port to connect to.
     * @return true if connection is successful, false otherwise.
     */
    bool testConnectivity(const char *host, int port);

    String getNetworkParams();
    String getNetworkAPN();
    bool activateNetwork(bool state);
    String getLocalIP();

private:
    TinyGsm _modem = TinyGsm(SerialAT);
    TinyGsmClient _client = TinyGsmClient(_modem);
    bool _initialized = false;
    unsigned long _lastReconnectAttempt = 0;

    // Connection failure tracking and recovery
    unsigned long _lastConnectionAttempt = 0;
    int _consecutiveFailures = 0;
    unsigned long _backoffDelay = 0;
    unsigned long _lastModemReset = 0;
    unsigned long _lastResponsiveTime = 0;
    static const int MAX_CONSECUTIVE_FAILURES = 5;
    static const unsigned long MIN_BACKOFF_DELAY = 30000;     // 30 seconds
    static const unsigned long MAX_BACKOFF_DELAY = 300000;    // 5 minutes
    static const unsigned long MIN_RESET_INTERVAL = 300000;   // 5 minutes between resets
    static const unsigned long UNRESPONSIVE_TIMEOUT = 180000; // 3 minutes of unresponsiveness

    bool _initHardware();     // Declaration for the private hardware init function
    SimStatus getSimStatus(); // Declaration for getSimStatus

    // Connection management methods
    bool _shouldAttemptConnection();
    void _recordConnectionFailure();
    void _recordConnectionSuccess();
    bool _performModemReset();
    void _updateResponsiveTime();

    /**
     * @brief Temporarily disable the watchdog for long modem operations
     *
     * @param disable true to disable, false to re-enable
     */
    void _setWatchdog(bool disable)
    {
#ifdef DISABLE_WDT_FOR_MODEM
        if (disable)
        {
            esp_task_wdt_reset();
            esp_task_wdt_init(WDT_TIMEOUT * 2, false);
        }
        else
        {
            esp_task_wdt_init(WDT_TIMEOUT, true);
        }
#endif
    }
};

extern ModemManager modemManager;
