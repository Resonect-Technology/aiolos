#define TINY_GSM_MODEM_SIM7000

#include <ArduinoJson.h>
#include <esp_adc_cal.h>
#include <TinyGsmClient.h>
#include <PubSubClient.h>
#include <Ticker.h>
#include <SPI.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <esp_task_wdt.h> // Include Watchdog Timer library

// Set serial for debug console (to the Serial Monitor, default speed 115200)
#define SerialMon Serial

// Set serial for AT commands (to the module)
// Use Hardware Serial on Mega, Leonardo, Micro
#define SerialAT Serial1

// Define the serial console for debug prints, if needed
#define TINY_GSM_DEBUG SerialMon

// Add a reception delay, if needed.
#define TINY_GSM_YIELD() \
    {                    \
        delay(2);        \
    }

#define TINY_GSM_USE_GPRS true
#define TINY_GSM_USE_WIFI false

// Your GPRS credentials, if any
const char apn[] = "simbase";
const char gprsUser[] = "";
const char gprsPass[] = "";

// MQTT details
const char *broker = "aiolos.resonect.cz";
const char *mqttUser = "Aiolos";
const char *mqttPassword = "Vasiliki2000";

const char *topicInit = "aiolos/vasiliki/diagnostics";
const char *topicTemperature = "aiolos/vasiliki/temperature";
const char *topicWind = "aiolos/vasiliki/wind";
const char *topicControl = "aiolos/vasiliki/control";
const char *topicDiagnostics = "aiolos/vasiliki/diagnostics";

#define ADC_PIN 35

#define UART_BAUD 115200
#define PIN_DTR 25
#define PIN_TX 27
#define PIN_RX 26
#define PWR_PIN 4
#define LED_PIN 12
#define ANEMOMETER_PIN 14 // GPIO14 for anemometer
#define WIND_VANE_PIN 2   // GPIO2 for wind vane (ADC2_CH2)
#define ONE_WIRE_BUS 13   // GPIO4 for DS18B20 data

int ledStatus = LOW;
uint32_t lastReconnectAttempt = 0;
unsigned long lastWindMeasurementTime = 0;
unsigned long lastTemperatureMeasurementTime = 0;
unsigned long windPublishFrequency = 60000; // Default to 1 minute
unsigned long lastBatteryMeasurementTime = 0;
unsigned long lastSignalMeasurementTime = 0;
unsigned long lastDiagnosticsMeasurementTime = 0;
unsigned long mqttReconnectAttempts = 0;
const unsigned long maxMqttReconnectAttempts = 6; // Max attempts before reboot (e.g., 6 attempts with 10 seconds delay)

unsigned long lastTimeUpdate = 0;
unsigned long timeUpdateInterval = 300000; // 5 minutes in milliseconds
int currentHour = 0, currentMinute = 0, currentSecond = 0;

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
TinyGsm modem(SerialAT);
TinyGsmClient client(modem);
PubSubClient mqtt(client);

volatile unsigned long switchCount = 0;
volatile unsigned long lastDebounceTime = 0; // For debouncing

int vref = 1100;

Ticker periodicRestartTicker; // Ticker object for scheduling periodic restarts

void IRAM_ATTR handleInterrupt()
{
    unsigned long currentTime = millis();
    if (currentTime - lastDebounceTime > 10)
    { // Debounce interval in milliseconds
        switchCount++;
        lastDebounceTime = currentTime;
    }
}

void mqttCallback(char *topic, byte *payload, unsigned int len)
{
    SerialMon.print("Message arrived [");
    SerialMon.print(topic);
    SerialMon.print("]: ");
    SerialMon.write(payload, len);
    SerialMon.println();

    if (String(topic) == topicControl)
    {
        StaticJsonDocument<200> doc;
        DeserializationError error = deserializeJson(doc, payload, len);
        if (error)
        {
            SerialMon.print("deserializeJson() failed: ");
            SerialMon.println(error.f_str());
            return;
        }

        if (doc.containsKey("wind_freq"))
        {
            windPublishFrequency = doc["wind_freq"].as<unsigned long>() * 1000;
            SerialMon.print("Updated wind publish frequency: ");
            SerialMon.println(windPublishFrequency);
        }

        if (doc.containsKey("restart") && doc["restart"] == true)
        {
            SerialMon.println("Restart command received.");
            ESP.restart(); // Restart the ESP32
        }
    }
}

boolean mqttConnect()
{
    SerialMon.print("Connecting to ");
    SerialMon.print(broker);

    // Connect to MQTT Broker with username and password
    boolean status = mqtt.connect("Aiolos-Vasiliki", mqttUser, mqttPassword);

    if (status == false)
    {
        SerialMon.println(" fail");
        return false;
    }
    SerialMon.println(" success");
    mqtt.publish(topicInit, "{\"message\": \"Aiolos-Station started\"}", true); // Retained message
    mqtt.subscribe(topicControl);
    return mqtt.connected();
}

void powerOnModem()
{
    SerialMon.println("Powering on modem...");
    digitalWrite(PWR_PIN, LOW);
    delay(1200);
    digitalWrite(PWR_PIN, HIGH);
    delay(300);
    digitalWrite(PWR_PIN, LOW);
    delay(10000);

    SerialAT.begin(UART_BAUD, SERIAL_8N1, PIN_RX, PIN_TX);

    // Initialize the modem
    for (int i = 0; i < 3; i++)
    {
        if (modem.restart())
        {
            SerialMon.println("Modem restarted successfully.");
            return;
        }
        SerialMon.println("Failed to restart modem, retrying...");
        delay(5000);
    }

    SerialMon.println("Failed to restart modem after multiple attempts.");
}

float getWindDirection(int vin)
{
    float direction;
    if (vin < 150)
        direction = 202.5;
    else if (vin < 300)
        direction = 180;
    else if (vin < 400)
        direction = 247.5;
    else if (vin < 600)
        direction = 225;
    else if (vin < 900)
        direction = 292.5;
    else if (vin < 1100)
        direction = 270;
    else if (vin < 1500)
        direction = 112.5;
    else if (vin < 1700)
        direction = 135;
    else if (vin < 2250)
        direction = 337.5;
    else if (vin < 2350)
        direction = 315;
    else if (vin < 2700)
        direction = 67.5;
    else if (vin < 3000)
        direction = 90;
    else if (vin < 3200)
        direction = 22.5;
    else if (vin < 3400)
        direction = 45;
    else if (vin < 4000)
        direction = 0;
    else
        direction = 0; // Unknown

    // Adjust direction to have 0 degrees as North
    direction -= 90;
    if (direction < 0)
        direction += 360;

    return direction;
}

void periodicRestart()
{
    SerialMon.println("Periodic restart initiated.");
    ESP.restart();
}

void enterDeepSleepUntil(int hour, int minute)
{
    SerialMon.printf("Entering deep sleep until %02d:%02d.\n", hour, minute);

    // Calculate time to sleep until the specified hour and minute
    int year, month, day, currentHour, currentMinute, currentSecond;
    float timezone;
    if (!modem.getNetworkTime(&year, &month, &day, &currentHour, &currentMinute, &currentSecond, &timezone))
    {
        SerialMon.println("Failed to obtain time from network");
        return;
    }

    // Disable the watchdog timer
    esp_task_wdt_deinit();

    modem.sendAT("+CPOWD=1");
    if (modem.waitResponse(10000L) != 1)
    {
        SerialMon.println("+CPOWD=1 failed");
    }
    modem.poweroff();
    delay(6000); // Ensure that SIM7000 is powered off after a long delay

    int targetSeconds = (hour * 3600) + (minute * 60);
    int currentSeconds = (currentHour * 3600) + (currentMinute * 60) + currentSecond;

    int sleepSeconds = targetSeconds - currentSeconds;
    if (sleepSeconds < 0)
    {
        sleepSeconds += 24 * 3600; // Adjust for next day
    }

    // Configure the wake-up timer
    esp_sleep_enable_timer_wakeup(sleepSeconds * 1000000ULL); // Convert seconds to microseconds
    esp_deep_sleep_start();
}

bool isSleepTime()
{
    // Check if the current time is between 22:00 and 09:00
    return (currentHour >= 22 || currentHour < 9);
}

void setup()
{
    Serial.begin(115200); // Set console baud rate

    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, HIGH);

    pinMode(PWR_PIN, OUTPUT);
    digitalWrite(PWR_PIN, HIGH);
    // Starting the machine requires at least 1 second of low level, and with a level conversion, the levels are opposite
    delay(1000);
    digitalWrite(PWR_PIN, LOW);

    Serial.println("\nWait...");

    delay(1000);

    powerOnModem();

    SerialMon.print("Waiting for network...");
    if (!modem.waitForNetwork())
    {
        SerialMon.println(" fail");
        delay(10000);
        return;
    }
    SerialMon.println(" success");

    if (modem.isNetworkConnected())
    {
        SerialMon.println("Network connected");
    }

    if (!modem.gprsConnect(apn, gprsUser, gprsPass))
    {
        SerialMon.println(" fail");
        delay(10000);
        return;
    }
    SerialMon.println(" success");

    if (modem.isGprsConnected())
    {
        SerialMon.println("GPRS connected");
    }

    // Check if it's sleep time
    int year, month, day;
    float timezone;
    if (!modem.getNetworkTime(&year, &month, &day, &currentHour, &currentMinute, &currentSecond, &timezone))
    {
        SerialMon.println("Failed to obtain time from network");
    }
    if (isSleepTime())
    {
        char sleepJson[50];
        snprintf(sleepJson, sizeof(sleepJson), "{\"message\": \"going to sleep\"}");
        mqtt.publish(topicDiagnostics, sleepJson, true); // Retained message
        delay(1000);                                     // Ensure message is sent before sleeping
        enterDeepSleepUntil(9, 0);                       // Sleep until 09:00
    }

    mqtt.setServer(broker, 1883);
    mqtt.setCallback(mqttCallback);
    mqtt.setKeepAlive(60); // Set keepalive to 60 seconds

    pinMode(ANEMOMETER_PIN, INPUT_PULLUP); // Enable internal pull-up resistor
    attachInterrupt(digitalPinToInterrupt(ANEMOMETER_PIN), handleInterrupt, FALLING);
    analogReadResolution(12); // Set ADC resolution to 12 bits (0-4095)
    sensors.begin();

    esp_adc_cal_characteristics_t adc_chars;
    esp_adc_cal_value_t val_type = esp_adc_cal_characterize(ADC_UNIT_1, ADC_ATTEN_DB_11, ADC_WIDTH_BIT_12, 1100, &adc_chars);
    if (val_type == ESP_ADC_CAL_VAL_EFUSE_VREF)
    {
        Serial.printf("eFuse Vref: %u mV\n", adc_chars.vref);
        vref = adc_chars.vref;
    }
    else if (val_type == ESP_ADC_CAL_VAL_EFUSE_TP)
    {
        Serial.printf("Two Point --> coeff_a: %u mV coeff_b: %u mV\n", adc_chars.coeff_a, adc_chars.coeff_b);
    }
    else
    {
        Serial.println("Default Vref: 1100 mV");
    }

    // Initialize Watchdog Timer with configuration
    esp_task_wdt_config_t wdt_config = {
        .timeout_ms = 10000, // 10 seconds timeout
        .trigger_panic = true};
    esp_task_wdt_init(&wdt_config);
    esp_task_wdt_add(NULL); // Add current thread to WDT watch

    // Schedule a periodic restart every 6 hours
    periodicRestartTicker.attach(21600, periodicRestart); // 6 hours = 21600 seconds
}

void loop()
{
    // Reset the WDT
    if (esp_task_wdt_reset() != ESP_OK)
    {
        SerialMon.println("Failed to reset watchdog timer.");
    }

    // Periodically update the time from the network
    unsigned long currentMillis = millis();
    if (currentMillis - lastTimeUpdate >= timeUpdateInterval)
    {
        lastTimeUpdate = currentMillis;

        int year, month, day;
        float timezone;
        if (!modem.getNetworkTime(&year, &month, &day, &currentHour, &currentMinute, &currentSecond, &timezone))
        {
            SerialMon.println("Failed to obtain time from network");
        }
        else
        {
            SerialMon.printf("Updated time: %02d:%02d:%02d\n", currentHour, currentMinute, currentSecond);
        }
    }

    // Periodically check the time to enter deep sleep
    if (isSleepTime())
    {
        char sleepJson[50];
        snprintf(sleepJson, sizeof(sleepJson), "{\"message\": \"going to sleep\"}");
        mqtt.publish(topicDiagnostics, sleepJson, true); // Retained message
        delay(1000);                                     // Ensure message is sent before sleeping
        enterDeepSleepUntil(9, 0);                       // Sleep until 09:00
    }

    if (!modem.isNetworkConnected())
    {
        SerialMon.println("Network disconnected");
        if (!modem.waitForNetwork(180000L, true))
        {
            SerialMon.println(" fail");
            powerOnModem(); // Re-initialize the modem
            delay(10000);
            return;
        }
        if (modem.isNetworkConnected())
        {
            SerialMon.println("Network re-connected");
        }

        if (!modem.isGprsConnected())
        {
            SerialMon.println("GPRS disconnected!");
            SerialMon.print(F("Connecting to "));
            SerialMon.print(apn);
            if (!modem.gprsConnect(apn, gprsUser, gprsPass))
            {
                SerialMon.println(" fail");
                powerOnModem(); // Re-initialize the modem
                delay(10000);
                return;
            }
            if (modem.isGprsConnected())
            {
                SerialMon.println("GPRS reconnected");
            }
        }
    }

    if (!mqtt.connected())
    {
        SerialMon.println("=== MQTT NOT CONNECTED ===");
        uint32_t t = millis();
        if (t - lastReconnectAttempt > 10000L)
        {
            lastReconnectAttempt = t;
            mqttReconnectAttempts++;

            // Ensure GPRS is connected before attempting MQTT connection
            if (!modem.isGprsConnected())
            {
                SerialMon.println("GPRS disconnected! Attempting to reconnect...");
                if (!modem.gprsConnect(apn, gprsUser, gprsPass))
                {
                    SerialMon.println(" fail");
                    powerOnModem(); // Re-initialize the modem
                    delay(10000);
                    return;
                }
                if (modem.isGprsConnected())
                {
                    SerialMon.println("GPRS reconnected");
                }
            }

            if (mqttConnect())
            {
                lastReconnectAttempt = 0;
                mqttReconnectAttempts = 0; // Reset attempts counter on successful connection
            }
            else
            {
                powerOnModem(); // Re-initialize the modem if MQTT connection fails
                delay(10000);
                return;
            }
        }

        if (mqttReconnectAttempts >= maxMqttReconnectAttempts)
        {
            SerialMon.println("Max MQTT reconnect attempts reached. Rebooting...");
            ESP.restart(); // Reboot the device
        }

        delay(100);
        return;
    }

    mqtt.loop();

    // Read and publish temperature and battery voltage every 5 minutes
    if (currentMillis - lastTemperatureMeasurementTime >= 300000)
    { // 300000 ms = 5 minutes
        lastTemperatureMeasurementTime = currentMillis;

        // Temperature reading
        sensors.requestTemperatures();
        float temperatureC = sensors.getTempCByIndex(0);

        if (temperatureC != DEVICE_DISCONNECTED_C)
        {
            SerialMon.print("Temperature: ");
            SerialMon.print(temperatureC);
            SerialMon.println("°C");

            char temperatureJson[50];
            snprintf(temperatureJson, sizeof(temperatureJson), "{\"temperature\": %.2f}", temperatureC);
            mqtt.publish(topicTemperature, temperatureJson, true); // Retained message
        }
        else
        {
            SerialMon.println("Error: Could not read temperature data");
        }

        // Battery voltage reading
        uint16_t v = analogRead(ADC_PIN);
        float battery_voltage = ((float)v / 4095.0) * 2.0 * 3.3 * (vref / 1000.0);

        SerialMon.print("Battery Voltage: ");
        SerialMon.print(battery_voltage);
        SerialMon.println(" V");

        if (battery_voltage < 3.4)
        {
            char batteryLowJson[50];
            snprintf(batteryLowJson, sizeof(batteryLowJson), "{\"message\": \"battery low, going to sleep\"}");
            mqtt.publish(topicDiagnostics, batteryLowJson, true); // Retained message
            delay(1000);                                          // Ensure message is sent before sleeping
            enterDeepSleepUntil(currentHour + 2, currentMinute);  // Sleep for 2 more hours
        }

        char batteryJson[50];
        snprintf(batteryJson, sizeof(batteryJson), "{\"battery_voltage\": %.2f}", battery_voltage);
        mqtt.publish(topicDiagnostics, batteryJson, true); // Retained message
    }

    // Read and publish wind speed and direction at the specified frequency
    if (currentMillis - lastWindMeasurementTime >= windPublishFrequency)
    {
        lastWindMeasurementTime = currentMillis;

        // Anemometer readings
        unsigned long count;
        noInterrupts();
        count = switchCount;
        switchCount = 0;
        interrupts();

        SerialMon.print("Switch count: ");
        SerialMon.println(count);

        // Each switch closure per second equals 2.4 km/h
        // Calculate wind speed normalized to the interval length
        float windSpeedKmh = (count * 2.4) * (1000.0 / windPublishFrequency); // Wind speed in km/h per interval
        float windSpeedMs = windSpeedKmh * 0.27778;                           // Convert km/h to m/s

        // Wind vane readings
        int windDirDigital = analogRead(WIND_VANE_PIN);
        float windDirection = getWindDirection(windDirDigital);

        // Combine wind speed and direction into a JSON array and publish
        char windJson[50];
        snprintf(windJson, sizeof(windJson), "[%.2f, %.1f]", windSpeedMs, windDirection);
        mqtt.publish(topicWind, windJson, true); // Retained message

        SerialMon.print("Wind Speed (km/h): ");
        SerialMon.print(windSpeedKmh);
        SerialMon.println(" km/h");
        SerialMon.print("Wind Speed (m/s): ");
        SerialMon.print(windSpeedMs);
        SerialMon.println(" m/s");
        SerialMon.print("Wind Direction: ");
        SerialMon.print(windDirection);
        SerialMon.println(" degrees");
    }

    // Read and publish diagnostics (signal and battery) every 5 minutes
    if (currentMillis - lastDiagnosticsMeasurementTime >= 300000)
    { // 300000 ms = 5 minutes
        lastDiagnosticsMeasurementTime = currentMillis;

        // Signal strength
        int signalQuality = modem.getSignalQuality();
        SerialMon.print("Signal Quality: ");
        SerialMon.print(signalQuality);
        SerialMon.println(" dBm");

        // Battery voltage reading
        uint16_t v = analogRead(ADC_PIN);
        float battery_voltage = ((float)v / 4095.0) * 2.0 * 3.3 * (vref / 1000.0);

        SerialMon.print("Battery Voltage: ");
        SerialMon.print(battery_voltage);
        SerialMon.println(" V");

        if (battery_voltage < 3.4)
        {
            char batteryLowJson[50];
            snprintf(batteryLowJson, sizeof(batteryLowJson), "{\"message\": \"battery low, going to sleep\"}");
            mqtt.publish(topicDiagnostics, batteryLowJson, true); // Retained message
            delay(1000);                                          // Ensure message is sent before sleeping
            enterDeepSleepUntil(currentHour + 2, currentMinute);  // Sleep for 2 more hours
        }

        // Combine signal and battery into a single JSON message
        char diagnosticsJson[100];
        snprintf(diagnosticsJson, sizeof(diagnosticsJson), "{\"signal_quality\": %d, \"battery_voltage\": %.2f}", signalQuality, battery_voltage);
        mqtt.publish(topicDiagnostics, diagnosticsJson, true); // Retained message
    }

    delay(100); // Small delay to prevent excessive looping
}