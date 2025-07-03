#include "BatteryUtils.h"

// Define the static member variable for ADC characteristics.
// This is placed in a .cpp file to prevent multiple definition errors during linking.
esp_adc_cal_characteristics_t BatteryUtils::_adc_chars;
