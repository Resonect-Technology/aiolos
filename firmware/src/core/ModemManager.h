/**
 * @file ModemManager.h
 * @brief Manages the SIM7000G cellular modem
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
#define TINY_GSM_RX_BUFFER 1024 // Set RX buffer to 1Kb

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
    // SIM card status enum
    enum SimStatus
    {
        SIM_ERROR,
        SIM_READY,
        SIM_LOCKED
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
     * @brief Power off the modem
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
     * @brief Send a test HTTP request to check connectivity
     *
     * @param url The URL to connect to
     * @return true if successful
     * @return false if failed
     */
    bool sendTestRequest(const char *url);

    /**
     * @brief Send a test ping to check connectivity
     *
     * @param host The host to ping
     * @param count Number of pings to send
     * @return true if successful
     * @return false if failed
     */
    bool pingHost(const char *host, int count = 4);

    /**
     * @brief Get the SIM card status
     *
     * @return SimStatus enum value indicating SIM status
     */
    SimStatus getSimStatus();

    /**
     * @brief Get the IMEI of the modem
     *
     * @return String containing the IMEI
     */
    String getIMEI();

    /**
     * @brief Set the preferred network mode
     *
     * @param mode 1=CAT-M, 2=NB-IoT, 3=CAT-M and NB-IoT
     * @return true if successful
     * @return false if failed
     */
    bool setPreferredMode(uint8_t mode);

    /**
     * @brief Set the network mode
     *
     * @param mode 2=Automatic, 13=GSM only, 38=LTE only, 51=GSM and LTE only
     * @return true if successful
     * @return false if failed
     */
    bool setNetworkMode(uint8_t mode);

    /**
     * @brief Get the APN assigned by the network
     *
     * @return String containing the APN
     */
    String getNetworkAPN();

    /**
     * @brief Activate the network connection
     *
     * @param on true to activate, false to deactivate
     * @return true if successful
     * @return false if failed
     */
    bool activateNetwork(bool on = true);

    /**
     * @brief Get the local IP address assigned to the modem
     *
     * @return String containing the IP address
     */
    String getLocalIP();

    /**
     * @brief Get detailed network parameters
     *
     * @return String containing the network parameters
     */
    String getNetworkParams();

    /**
     * @brief Send a UDP packet to a specified host
     *
     * @param host The host to send the packet to
     * @param port The port to send the packet to
     * @param message The message to send
     * @return true if successful
     * @return false if failed
     */
    bool sendUdpPacket(const char *host, uint16_t port, const char *message);

private:
    TinyGsm _modem = TinyGsm(SerialAT);
    TinyGsmClient _client = TinyGsmClient(_modem);
    bool _initialized = false;
    int _restartAttempts = 0;

    /**
     * @brief Initialize the modem hardware
     *
     * @return true if successful
     * @return false if failed
     */
    bool _initHardware();

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
